#!/usr/bin/env python3
"""
BeTalent local vocal analysis worker – 100% free, no API costs.
Uses librosa + ffmpeg on your machine. Config via env (see README).

Usage:
  export INTERNAL_AUDIO_ANALYSIS_API_KEY=your-secret-key
  export BETALENT_BASE_URL=http://localhost:3000
  pip install -r requirements.txt   # once
  ffmpeg must be installed (brew install ffmpeg / apt install ffmpeg)
  python worker.py
"""

import os
import sys
import time
import tempfile
import subprocess
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from urllib.parse import urlparse

try:
    import numpy as np
    import librosa
    import requests
except ImportError as e:
    print("Install deps: pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1) from e

# ---------------------------------------------------------------------------
# Config (env overrides) – keep in sync with src/constants/audio-analysis.ts
# ---------------------------------------------------------------------------
BASE_URL = os.environ.get("BETALENT_BASE_URL", "http://localhost:3000").rstrip("/")
API_KEY = os.environ.get("INTERNAL_AUDIO_ANALYSIS_API_KEY", "")
POLL_INTERVAL_SEC = max(5, int(os.environ.get("AUDIO_WORKER_POLL_SEC", "15")))
MEDIA_FETCH_TIMEOUT_SEC = max(10, int(os.environ.get("AUDIO_ANALYSIS_MEDIA_FETCH_TIMEOUT_MS", "90000")) // 1000)
FFMPEG_TIMEOUT_SEC = max(15, int(os.environ.get("AUDIO_ANALYSIS_FFMPEG_TIMEOUT_MS", "120000")) // 1000)
CALLBACK_TIMEOUT_SEC = max(5, int(os.environ.get("AUDIO_ANALYSIS_CALLBACK_TIMEOUT_MS", "15000")) // 1000)
ANALYSIS_TIMEOUT_SEC = max(30, int(os.environ.get("AUDIO_ANALYSIS_ANALYSIS_TIMEOUT_MS", "180000")) // 1000)
MAX_MEDIA_DURATION_SEC = max(60, int(os.environ.get("AUDIO_ANALYSIS_MAX_DURATION_SEC", "600")))
MAX_ATTEMPTS = max(1, int(os.environ.get("AUDIO_ANALYSIS_MAX_RETRIES", "3")))
ANALYSIS_VERSION = os.environ.get("AUDIO_ANALYSIS_VERSION", "1.0")

# ---------------------------------------------------------------------------
# Media URL safety: do NOT process arbitrary public URLs.
# Only http(s) and host in allowlist. Reject/flag unexpected URLs (SSRF / abuse risk).
# ---------------------------------------------------------------------------
ALLOWED_SCHEMES = ("http", "https")

def _allowed_domains() -> list[str]:
    raw = os.environ.get("AUDIO_ANALYSIS_ALLOWED_DOMAINS", "").strip()
    if not raw:
        return ["res.cloudinary.com", "cloudinary.com", "localhost", "127.0.0.1"]
    return [d.strip().lower() for d in raw.split(",") if d.strip()]

_ALLOWED_DOMAINS: list[str] | None = None

def get_allowed_domains() -> list[str]:
    global _ALLOWED_DOMAINS
    if _ALLOWED_DOMAINS is None:
        _ALLOWED_DOMAINS = _allowed_domains()
    return _ALLOWED_DOMAINS

def validate_media_url(url: str) -> tuple[bool, str]:
    """
    Validate URL for analysis: non-empty, http(s) only, host in allowlist.
    Returns (allowed, reason). reason is the lastError code when allowed=False.
    """
    if not url or not isinstance(url, str) or not url.strip():
        return False, "URL_EMPTY"
    try:
        parsed = urlparse(url.strip())
        scheme = (parsed.scheme or "").lower()
        if scheme not in ALLOWED_SCHEMES:
            return False, "URL_SCHEME_NOT_ALLOWED"
        host = (parsed.hostname or "").lower()
        if not host:
            return False, "URL_INVALID"
        domains = get_allowed_domains()
        if not domains:
            return False, "URL_ALLOWLIST_EMPTY"
        if not any(host == d or host.endswith("." + d) for d in domains):
            return False, "URL_NOT_ALLOWED"
        return True, ""
    except Exception:
        return False, "URL_INVALID"

def is_allowed_media_url(url: str) -> bool:
    """True only if URL is valid, http(s), and host is in the configured allowlist."""
    return validate_media_url(url)[0]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(f"[worker] {msg}", flush=True)

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def fetch_pending() -> dict | None:
    url = f"{BASE_URL}/api/internal/audio-analysis/pending"
    try:
        r = requests.get(
            url,
            headers={"x-internal-api-key": API_KEY},
            timeout=CALLBACK_TIMEOUT_SEC,
        )
    except requests.RequestException as e:
        log(f"pending request failed: {e}")
        return None
    if r.status_code == 204:
        return None
    if r.status_code != 200:
        log(f"pending: {r.status_code} {r.text}")
        return None
    data = r.json()
    if not data.get("ok"):
        return None
    return {
        "videoId": data["videoId"],
        "videoUrl": data["videoUrl"],
        "styleCategoryId": data.get("styleCategoryId"),
        "attemptCount": data.get("attemptCount", 1),
    }

def submit_result(
    video_id: str,
    scores: dict,
    analysis_version: str,
    *,
    flag_reason: str | None = None,
    raw_payload: dict | None = None,
) -> bool:
    url = f"{BASE_URL}/api/internal/audio-analysis/result"
    body: dict = {"videoId": video_id, "analysisVersion": analysis_version, **scores}
    if flag_reason is not None:
        body["flagReason"] = flag_reason
    if raw_payload is not None:
        body["rawPayload"] = raw_payload
    try:
        r = requests.post(
            url,
            json=body,
            headers={"x-internal-api-key": API_KEY},
            timeout=CALLBACK_TIMEOUT_SEC,
        )
    except requests.RequestException as e:
        log(f"result callback failed: {e}")
        return False
    if r.status_code != 200:
        log(f"result callback: {r.status_code} {r.text}")
        return False
    return True

def submit_failed(
    video_id: str,
    reason: str,
    *,
    retryable: bool = False,
    attempt_count: int | None = None,
) -> None:
    url = f"{BASE_URL}/api/internal/audio-analysis/failed"
    payload = {"videoId": video_id, "reason": reason, "retryable": retryable}
    if attempt_count is not None:
        payload["attemptCount"] = attempt_count
    try:
        r = requests.post(
            url,
            json=payload,
            headers={"x-internal-api-key": API_KEY},
            timeout=CALLBACK_TIMEOUT_SEC,
        )
        if r.status_code != 200:
            log(f"failed callback: {r.status_code} {r.text}")
    except requests.RequestException as e:
        log(f"failed callback request error: {e}")

# ---------------------------------------------------------------------------
# Media fetch – separate timeout; avoid ffmpeg pulling arbitrary URLs
# ---------------------------------------------------------------------------
def fetch_media_to_temp(video_url: str) -> str | None:
    """Download media to a temp file with timeout. Returns path or None. Caller must unlink."""
    try:
        r = requests.get(
            video_url,
            timeout=MEDIA_FETCH_TIMEOUT_SEC,
            stream=True,
            headers={"User-Agent": "BeTalent-AudioWorker/1.0"},
        )
        r.raise_for_status()
    except requests.RequestException as e:
        log(f"media fetch failed: {e}")
        return None
    fd, path = tempfile.mkstemp(suffix=".media")
    try:
        with os.fdopen(fd, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
        return path
    except Exception as e:
        log(f"media write failed: {e}")
        try:
            os.unlink(path)
        except OSError:
            pass
        return None

# ---------------------------------------------------------------------------
# Audio extraction (ffmpeg) – local file input, timeout + cleanup
# ---------------------------------------------------------------------------
def extract_audio_to_wav(input_path: str) -> str | None:
    """Extract mono 22.05kHz wav from local file. Returns path to temp wav or None. Caller must unlink."""
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    cmd = [
        "ffmpeg", "-y", "-v", "quiet",
        "-i", input_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
        path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SEC)
        return path
    except subprocess.TimeoutExpired:
        log(f"ffmpeg timeout after {FFMPEG_TIMEOUT_SEC}s")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        log(f"ffmpeg error: {e}")
    if os.path.exists(path):
        try:
            os.unlink(path)
        except OSError:
            pass
    return None

# ---------------------------------------------------------------------------
# Analysis (librosa) – timeout, duration check, optional FLAGGED
# ---------------------------------------------------------------------------
def _analyze_audio_impl(wav_path: str) -> dict | None:
    """Core analysis. Returns scores dict with optional 'flagReason' and 'rawPayload', or None / _error."""
    try:
        y, sr = librosa.load(wav_path, sr=22050, mono=True)
    except Exception as e:
        log(f"librosa load: {e}")
        return None
    duration_sec = len(y) / float(sr)
    if duration_sec > MAX_MEDIA_DURATION_SEC:
        return {"_error": "MAX_DURATION_EXCEEDED"}
    if len(y) < sr * 2:
        return None

    hop = 512
    n_fft = 2048
    flag_reason: str | None = None
    raw_payload: dict = {}

    try:
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr, hop_length=hop, n_fft=n_fft)
        pitch_vals = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            p = pitches[idx, t]
            if p > 0:
                pitch_vals.append(float(p))
        if pitch_vals:
            pitch_std = np.std(pitch_vals)
            pitch_accuracy = max(0, 100 - min(100, pitch_std * 0.5))
        else:
            pitch_accuracy = 50.0
            flag_reason = flag_reason or "NO_VOCAL"
    except Exception:
        pitch_accuracy = 50.0

    try:
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
        rhythm_score = min(100, float(np.clip(np.mean(onset_env) * 30, 0, 100)))
    except Exception:
        rhythm_score = 50.0

    try:
        cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
        cent_std = np.std(cent)
        tone_stability = max(0, 100 - min(100, cent_std * 0.02))
    except Exception:
        tone_stability = 50.0

    try:
        zcr = librosa.feature.zero_crossing_rate(y, hop_length=hop)[0]
        zcr_mean = float(np.mean(zcr))
        clarity = max(0, 100 - min(100, zcr_mean * 500))
        if clarity < 20:
            flag_reason = flag_reason or "EXTREME_NOISE"
    except Exception:
        clarity = 50.0

    try:
        rms = librosa.feature.rms(y=y, sr=sr, hop_length=hop)[0]
        rms_std = float(np.std(rms))
        dynamic = min(100, rms_std * 200)
    except Exception:
        dynamic = 50.0

    try:
        rms = librosa.feature.rms(y=y, sr=sr, hop_length=hop)[0]
        conf = min(100, float(np.mean(rms)) * 150) + min(50, float(np.std(rms)) * 100)
        confidence = min(100, conf)
        if confidence < 15:
            flag_reason = flag_reason or "LOW_VOICE_ACTIVITY"
    except Exception:
        confidence = 50.0

    def round_score(s: float) -> float:
        return round(max(0, min(100, s)) * 10) / 10

    out = {
        "pitchAccuracyScore": round_score(pitch_accuracy),
        "rhythmTimingScore": round_score(rhythm_score),
        "toneStabilityScore": round_score(tone_stability),
        "clarityScore": round_score(clarity),
        "dynamicControlScore": round_score(dynamic),
        "performanceConfidenceScore": round_score(confidence),
    }
    if flag_reason:
        out["flagReason"] = flag_reason
    if raw_payload:
        out["rawPayload"] = raw_payload
    return out


def analyze_audio(wav_path: str) -> dict | None:
    """Run analysis with hard timeout. Returns scores (+ optional flagReason/rawPayload) or None/_error dict."""
    with ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(_analyze_audio_impl, wav_path)
        try:
            return fut.result(timeout=ANALYSIS_TIMEOUT_SEC)
        except FuturesTimeoutError:
            log(f"analysis timeout after {ANALYSIS_TIMEOUT_SEC}s")
            return None
        except Exception as e:
            log(f"analysis exception: {e}")
            return None

# ---------------------------------------------------------------------------
# Process one job: fetch -> extract -> analyze -> callback; all temp files cleaned
# ---------------------------------------------------------------------------
def process_one(job: dict) -> bool:
    video_id = job["videoId"]
    video_url = job["videoUrl"]
    attempt_count = job.get("attemptCount", 1)
    log(f"Processing {video_id} (attempt {attempt_count})")

    allowed, reject_reason = validate_media_url(video_url)
    if not allowed:
        log(f"Rejected: media URL safety ({reject_reason}): {video_url[:60]}...")
        submit_failed(video_id, reject_reason, retryable=False, attempt_count=attempt_count)
        return False

    media_path = fetch_media_to_temp(video_url)
    if not media_path:
        log(f"Media fetch failed for {video_id}")
        submit_failed(video_id, "MEDIA_FETCH_FAILED", retryable=True, attempt_count=attempt_count)
        return False

    wav_path = None
    try:
        wav_path = extract_audio_to_wav(media_path)
        if not wav_path:
            log(f"ffmpeg extraction failed for {video_id}")
            submit_failed(video_id, "FFMPEG_EXTRACT_FAILED", retryable=True, attempt_count=attempt_count)
            return False

        result = analyze_audio(wav_path)
        if result is None:
            submit_failed(video_id, "ANALYSIS_FAILED", retryable=True, attempt_count=attempt_count)
            return False
        if result.get("_error"):
            err = result["_error"]
            log(f"Analysis rejected: {err} for {video_id}")
            submit_failed(video_id, err, retryable=(err != "MAX_DURATION_EXCEEDED"), attempt_count=attempt_count)
            return False

        scores = {k: v for k, v in result.items() if k not in ("_error", "flagReason", "rawPayload")}
        flag_reason = result.get("flagReason")
        raw_payload = result.get("rawPayload")
        ok = submit_result(
            video_id, scores, ANALYSIS_VERSION,
            flag_reason=flag_reason, raw_payload=raw_payload,
        )
        if ok:
            log(f"Done {video_id}" + (f" (FLAGGED: {flag_reason})" if flag_reason else " -> overall computed server-side"))
        return ok
    except Exception as e:
        log(f"Analysis exception: {e}")
        submit_failed(video_id, f"ANALYSIS_EXCEPTION: {e!s}", retryable=True, attempt_count=attempt_count)
        return False
    finally:
        for path in (wav_path, media_path):
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    if not API_KEY:
        log("Set INTERNAL_AUDIO_ANALYSIS_API_KEY in env (and in .env for Next.js)")
        sys.exit(1)
    log(f"Starting worker: {BASE_URL} poll={POLL_INTERVAL_SEC}s ffmpeg_timeout={FFMPEG_TIMEOUT_SEC}s max_attempts={MAX_ATTEMPTS}")
    while True:
        try:
            job = fetch_pending()
            if job:
                process_one(job)
            else:
                time.sleep(POLL_INTERVAL_SEC)
        except KeyboardInterrupt:
            log("Stopped")
            break
        except Exception as e:
            log(f"Error: {e}")
            time.sleep(POLL_INTERVAL_SEC)

if __name__ == "__main__":
    main()
