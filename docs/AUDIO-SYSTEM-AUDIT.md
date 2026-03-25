# BeTalent Audio System Audit

**Date:** March 2026  
**Scope:** Uploaded video audio, live audio, creator presets, pre-live mic check.  
**Context:** Premium talent discovery platform – singers, performers, 1-min videos, weekly live challenges.

---

## 1. Audio System Audit – Current BeTalent Codebase

### A. Uploaded Video Audio Pipeline

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **Audio extraction** | PARTIALLY IMPLEMENTED | `scripts/audio_analysis_worker/worker.py` | FFmpeg extracts mono 22.05kHz WAV from video for **analysis only** (not playback). No normalization, no cleanup, no re-encode for playback. | No – extraction is for ML pipeline, not for playback quality |
| **Loudness normalization** | MISSING | — | No loudness (LUFS) or peak normalization. Videos play as-uploaded. | — |
| **Clipping prevention** | MISSING | — | No peak limiting or soft clipping. | — |
| **Light cleanup (phone issues)** | MISSING | — | No noise reduction, de-essing, or phone-specific fixes. | — |
| **Vocal character preservation** | N/A | — | No processing applied; raw upload is preserved. | — |
| **Consistent playback quality** | MISSING | — | No transcoding; playback uses original file. Quality varies by device/recording. | — |

**Summary:** Uploaded video audio is stored and played **as-is**. The only audio processing is for **AI vocal scoring** (extract → analyze → score). No playback-oriented audio pipeline exists.

---

### B. Live Audio Pipeline

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **WebRTC transport** | MISSING | — | Live page (`/live/[slug]`) shows "Live stream placeholder". No WebRTC, HLS, or streaming. | — |
| **Opus codec** | MISSING | — | No live audio codec configuration. | — |
| **Echo cancellation** | MISSING | — | No AEC. | — |
| **Noise suppression** | MISSING | — | No NS. | — |
| **Automatic gain control** | MISSING | — | No AGC. | — |
| **Low latency** | N/A | — | No live path. | — |
| **Vocal clarity** | N/A | — | No live path. | — |

**Summary:** Live event page exists (countdown, LIVE NOW badge, leaderboard) but has **no real streaming**. Placeholder only.

---

### C. Creator Presets (Standard / Singing / Studio Clean)

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **Standard preset** | MISSING | — | No preset system. | — |
| **Singing / Vocal preset** | MISSING | — | No preset system. | — |
| **Studio Clean preset** | MISSING | — | No preset system. | — |

**Summary:** No creator audio presets anywhere in the codebase.

---

### D. Pre-Live Mic Check

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **Microphone access check** | MISSING | — | No `getUserMedia` or mic permission flow. | — |
| **Signal level measurement** | MISSING | — | No level meter. | — |
| **Too low / too high detection** | MISSING | — | No volume feedback. | — |
| **Echo warning** | MISSING | — | No echo detection. | — |
| **Headphones recommendation** | MISSING | — | No UX for recommending headphones. | — |

**Summary:** No pre-live mic check. Upload README mentions Phase 2 camera+mic recording but it is not implemented.

---

### E. AI Vocal Scoring (Existing – Different from Playback Audio)

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **Job queue & claim** | ACTUALLY IMPLEMENTED | `vocal-scoring.service.ts`, `claimNextPendingJob()` | Atomic claim of PENDING/RETRYABLE jobs. URL allowlist, duration check. | Yes |
| **Worker (Python)** | ACTUALLY IMPLEMENTED | `scripts/audio_analysis_worker/worker.py` | Polls `/api/internal/audio-analysis/pending`, fetches media, FFmpeg extract → librosa analyze → callback. | Yes (local dev) |
| **Extraction for analysis** | ACTUALLY IMPLEMENTED | `worker.py` `extract_audio_to_wav()` | FFmpeg: `-vn -acodec pcm_s16le -ar 22050 -ac 1`. For ML only. | Yes |
| **Sub-scores** | ACTUALLY IMPLEMENTED | `worker.py` `_analyze_audio_impl()` | Pitch, rhythm, tone stability, clarity, dynamic control, confidence. Librosa-based. | Partial – heuristic, not production ML |
| **Result persistence** | ACTUALLY IMPLEMENTED | `saveAnalysisResult()`, `/api/internal/audio-analysis/result` | Saves to `VideoAudioAnalysis`, updates `Video.processingStatus`. | Yes |
| **Ranking integration** | ACTUALLY IMPLEMENTED | `ranking.service.ts`, `getNormalizedVocalScoreForRanking()` | Vocal score used in For You, challenge floor. | Yes |
| **Dashboard summary** | ACTUALLY IMPLEMENTED | `getDashboardSummary()` | Overall + sub-scores, strengths, areas to improve. | Yes |

**Summary:** AI vocal scoring is implemented end-to-end. It is **analysis-only** – no playback audio processing.

---

### F. Media Integrity (Audio Fingerprinting – Different from Quality)

| Component | Status | Location | What It Does | Production-Ready? |
|-----------|--------|----------|--------------|-------------------|
| **Architecture** | PARTIALLY IMPLEMENTED | `lib/media-integrity-architecture.ts` | Contract for future detectors; header documents what actually runs vs schema-only. | Design + honesty pass |
| **Service** | PARTIALLY IMPLEMENTED | `media-integrity.service.ts` | Persists `MediaIntegrityAnalysis`. `runPostUploadIntegrityAnalysis` runs after upload (metadata fingerprint + same-user duration/size duplicate heuristic). `recordAnalysis` is called from that path. | Heuristic only |
| **Audio fingerprint** | MISSING | — | Schema has `audioFingerprint`; no worker hashes audio content. | — |
| **AI voice / lip-sync scores** | NOT WIRED | — | Fields exist; no in-repo model populates them. | Do not market as live |

**Summary:** Post-upload integrity v1 runs (metadata + duplicate heuristic). Content fingerprints and AI/lip detectors are not implemented in this codebase.

---

## 2. Missing vs Existing – Summary Table

| Area | ACTUALLY IMPLEMENTED | PARTIALLY IMPLEMENTED | MISSING |
|------|----------------------|------------------------|---------|
| **Upload audio pipeline** | — | Extraction for analysis (worker) | Loudness, clipping prevention, cleanup, transcoding, playback consistency |
| **Live audio** | — | — | WebRTC, Opus, AEC, NS, AGC, low latency, vocal clarity |
| **Creator presets** | — | — | Standard, Singing, Studio Clean |
| **Pre-live mic check** | — | — | Mic access, level meter, volume/echo detection, headphones recommendation |
| **AI vocal scoring** | Queue, worker, persistence, ranking, dashboard | Librosa heuristics (not production ML) | — |
| **Media integrity** | Schema, service, post-upload `recordAnalysis` (heuristic dup + structural hash) | Architecture for AI/lip/audio fingerprint | Perceptual / ML detectors, audio fingerprint worker |

---

## 3. Target Production-Grade Architecture

### A. Uploaded Video Audio Pipeline (Post-Upload)

```
[Uploaded Video] → [Storage] → [Processing Job]
                                    ↓
                    ┌───────────────────────────────────┐
                    │ 1. Download / stream from storage │
                    │ 2. FFmpeg: extract audio          │
                    │ 3. Loudness normalize (e.g. -14 LUFS) │
                    │ 4. Peak limit / soft clip         │
                    │ 5. Optional: light noise gate      │
                    │ 6. Re-mux: video + processed audio │
                    │ 7. Upload processed file to storage│
                    │ 8. Update Video.videoUrl (or add processedUrl) │
                    └───────────────────────────────────┘
```

**Libraries/Services:**
- **FFmpeg** (loudnorm filter, limiter) – free, proven
- **Worker:** Node.js (Bull/BullMQ) or Python (Celery) – same pattern as thumbnail
- **Storage:** Existing R2/S3; processed file overwrites or new key

**Backend responsibilities:**
- Job queue (after thumbnail, before or parallel to audio analysis)
- FFmpeg pipeline: extract → normalize → limit → re-mux
- Replace `videoUrl` with processed URL (or add `processedVideoUrl`)

**Frontend responsibilities:**
- None for processing; playback uses final URL

---

### B. Live Audio Pipeline

```
[Creator Browser]                    [Viewer Browsers]
     │                                      │
     │  getUserMedia(audio)                  │
     │  → MediaStreamTrack                   │
     │  → RTCPeerConnection (send)            │
     │  → SFU/Media Server (e.g. LiveKit)    │
     │         │                             │
     │         └─────────────────────────────┼→ RTCPeerConnection (receive)
     │                                      │
     │  Client-side:                        │
     │  - echoCancellation: true              │
     │  - noiseSuppression: true             │
     │  - autoGainControl: true              │
     │  - Opus (default in WebRTC)           │
```

**Libraries/Services:**
- **LiveKit** (recommended): SFU, WebRTC, Opus, built-in AEC/NS/AGC via browser
- **Alternatives:** Daily.co, Mux, Agora – all handle transport; quality depends on client constraints
- **Frontend:** `@livekit/components-react`, `livekit-client` – room connect, track publish/subscribe

**Frontend responsibilities:**
- `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`
- Publish audio track to room
- Optional: apply `AudioContext` filters for "Singing" preset (light compression)

**Backend responsibilities:**
- LiveKit (or similar) project/API key
- Token generation for room join
- Webhook for recording (optional)

---

### C. Creator Presets

| Preset | Effect | Implementation |
|--------|--------|----------------|
| **Standard** | Default WebRTC constraints (AEC, NS, AGC on) | `getUserMedia` defaults |
| **Singing / Vocal** | Slight compression, clarity boost | `AudioContext` → `DynamicsCompressorNode` + optional high-shelf |
| **Studio Clean** | Minimal processing, flat | AEC/NS on, AGC off or low; no extra filters |

**Storage:** `Creator.audioPreset` (enum: STANDARD, SINGING, STUDIO_CLEAN) or per-session selection.

---

### D. Pre-Live Mic Check

```
[User clicks "Check mic"]
    → getUserMedia({ audio: true })
    → AudioContext + AnalyserNode
    → Measure RMS / peak over 3–5 seconds
    → Show: level bar, "Too quiet" / "Good" / "Too loud"
    → Optional: play back short loop, detect likely echo (delay correlation)
    → If echo risk: "Use headphones for best quality"
```

**Frontend only.** No backend. Use `AnalyserNode.getByteFrequencyData()` or `getFloatTimeDomainData()` for level; simple threshold logic.

---

## 4. Phased Implementation Plan

### Phase 1 – MVP (Realistic, Affordable)

**Goal:** Reliable upload playback + basic live streaming.

1. **Upload audio (minimal):**
   - Add FFmpeg loudness normalization (-14 LUFS) + peak limit in a post-upload job.
   - Run after thumbnail, before or in parallel with audio analysis.
   - No heavy cleanup; keep it simple.

2. **Live streaming:**
   - Integrate LiveKit (or Daily.co) for weekly live challenge.
   - Creator: `getUserMedia` with AEC/NS/AGC (browser defaults).
   - Replace placeholder on `/live/[slug]` with LiveKit `LiveKitRoom` + `VideoTrack`.

3. **Pre-live mic check:**
   - Simple level meter: `getUserMedia` → `AnalyserNode` → show bar.
   - "Too quiet" / "Good" / "Too loud" labels.
   - "Use headphones" hint when joining live (static for MVP).

**Cost:** LiveKit free tier (10k participant-minutes/mo) or Daily.co free tier. FFmpeg = $0.

---

### Phase 2 – Improved Live Quality

1. **Live audio:**
   - Opus bitrate tuning (e.g. 64–128 kbps for voice).
   - Optional: server-side recording for replay.

2. **Creator presets:**
   - Add `audioPreset` to Creator or session.
   - "Singing" preset: light `DynamicsCompressorNode` in `AudioContext`.
   - "Studio Clean": AGC off, minimal processing.

3. **Echo detection:**
   - Simple heuristic: play test tone, measure feedback. If detected → "Use headphones."

---

### Phase 3 – Premium Creator Audio

1. **Upload pipeline:**
   - Light noise reduction (FFmpeg `afftdn` or similar).
   - Optional: de-essing for vocal.
   - Preset-aware processing (future).

2. **Advanced presets:**
   - "Studio Clean" with optional high-pass, gentle de-esser.
   - Per-preset FFmpeg params for upload pipeline.

3. **Mic check:**
   - Echo likelihood score.
   - Device capability hints (sample rate, channel count).

---

## 5. File/Folder Plan

```
src/
├── lib/
│   ├── audio-analysis-architecture.ts    # existing
│   ├── audio-processing-architecture.ts # NEW: playback pipeline contract
│   └── live-audio-constants.ts           # NEW: preset enums, constraints
├── services/
│   ├── vocal-scoring.service.ts           # existing
│   ├── audio-processing.service.ts        # NEW: enqueue, job status for upload audio
│   └── live-token.service.ts             # NEW: LiveKit token generation
├── workers/                               # NEW (or use existing scripts/)
│   └── audio-processing/
│       ├── index.ts                       # Bull/BullMQ job processor
│       └── ffmpeg-pipeline.ts             # loudness + limit
├── app/
│   ├── api/
│   │   ├── internal/
│   │   │   └── audio-analysis/            # existing
│   │   ├── live/
│   │   │   └── token/route.ts             # NEW: LiveKit token
│   │   └── upload/
│   │       └── ...                        # existing
│   └── (protected)/
│       └── live/
│           └── [slug]/
│               └── page.tsx               # NEW: pre-live mic check + LiveKit room
├── components/
│   ├── live/
│   │   ├── LiveRoom.tsx                   # NEW: LiveKit room wrapper
│   │   ├── MicCheckModal.tsx             # NEW: pre-live level meter
│   │   └── AudioPresetSelector.tsx       # NEW: Phase 2
│   └── ...
└── constants/
    ├── audio-analysis.ts                  # existing
    ├── audio-processing.ts               # NEW: LUFS target, limits
    └── live-audio.ts                     # NEW: preset ids, level thresholds

scripts/
├── audio_analysis_worker/                  # existing
└── audio_processing_worker/               # NEW: optional Python/Node worker for upload audio
```

---

## 6. Pseudocode for Key Parts

### 6.1 Upload Audio Processing (FFmpeg Pipeline)

```typescript
// workers/audio-processing/ffmpeg-pipeline.ts (pseudocode)

async function processUploadAudio(
  inputUrl: string,
  outputPath: string,
  options: { targetLUFS?: number; peakLimitDb?: number }
): Promise<{ ok: boolean; error?: string }> {
  const { targetLUFS = -14, peakLimitDb = -1 } = options;

  // 1. Download to temp file (or stream from URL if ffmpeg supports)
  const tempInput = await downloadToTemp(inputUrl);

  // 2. Two-pass loudness normalization (ffmpeg loudnorm)
  // First pass: measure
  const measure = await exec(`ffmpeg -i ${tempInput} -af loudnorm=I=${targetLUFS}:TP=${peakLimitDb}:LRA=11:print_format=json -f null -`);
  const params = parseLoudnormJson(measure.stderr);

  // Second pass: apply
  await exec(`ffmpeg -i ${tempInput} -af loudnorm=I=${targetLUFS}:TP=${peakLimitDb}:measured_I=${params.I}:measured_TP=... -c:v copy -c:a aac -b:a 128k ${outputPath}`);

  // 3. Upload outputPath to R2, update Video.videoUrl
  return { ok: true };
}
```

### 6.2 Pre-Live Mic Check (Frontend)

```typescript
// components/live/MicCheckModal.tsx (pseudocode)

function MicCheckModal({ onReady, onCancel }: Props) {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<'checking' | 'ok' | 'low' | 'high'>('checking');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const rms = Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length);
        setLevel(rms);
        if (rms < 10) setStatus('low');
        else if (rms > 200) setStatus('high');
        else setStatus('ok');
        requestAnimationFrame(tick);
      };
      tick();
    });
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return (
    <Modal>
      <LevelBar value={level} max={255} />
      <p>{status === 'low' && 'Speak closer or increase mic level'}
         {status === 'high' && 'Lower volume to avoid clipping'}
         {status === 'ok' && 'Level looks good'}</p>
      <p className="text-muted">Use headphones for best quality during live</p>
      <Button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onReady(); }}>Continue</Button>
    </Modal>
  );
}
```

### 6.3 LiveKit Room + Audio Constraints

```typescript
// components/live/LiveRoom.tsx (pseudocode)

import { LiveKitRoom, useTracks } from '@livekit/components-react';

function LiveRoom({ slug, token }: { slug: string; token: string }) {
  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      audio={true}
      video={false}
      options={{
        publishDefaults: {
          simulcast: false,
        },
        videoCaptureDefaults: {},
      }}
    >
      <LiveAudioPlayer />
    </LiveKitRoom>
  );
}

// When publishing local mic (creator):
// getUserMedia with:
// { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
// LiveKit/browser handles Opus by default.
```

### 6.4 LiveKit Token (Backend)

```typescript
// app/api/live/token/route.ts (pseudocode)

import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: Request) {
  const { slug } = await req.json(); // challenge slug
  const user = await requireAuth();
  const roomName = `challenge-${slug}`;

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: user.id,
      name: user.displayName,
      metadata: JSON.stringify({ role: 'creator' | 'viewer' }),
    }
  );
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  return NextResponse.json({ token: await token.toJwt() });
}
```

---

## 7. Dependencies on Processing vs Microphone Quality

| Factor | Processing | User Microphone |
|--------|------------|-----------------|
| **Loudness consistency** | ✅ Normalization (LUFS) | — |
| **Clipping** | ✅ Peak limiting | User should avoid shouting |
| **Echo** | ⚠️ AEC helps | Headphones eliminate |
| **Background noise** | ⚠️ NS helps | Quiet room best |
| **Vocal clarity** | ⚠️ Light cleanup | Mic quality, distance, room |
| **Tone/timbre** | ❌ Don't alter | Inherent to voice + mic |

**Recommendation:** Emphasize creator education (quiet room, headphones, decent mic) in UI. Processing improves consistency; it cannot fully fix a bad recording environment.

---

## 8. Sensible Defaults

| Context | Default |
|---------|---------|
| **Mobile creators** | AEC/NS/AGC on; "Standard" preset; recommend headphones for live |
| **Desktop creators** | Same; optional "Studio Clean" for external mics |
| **Upload LUFS target** | -14 LUFS (streaming standard) |
| **Upload peak limit** | -1 dBTP |
| **Live Opus bitrate** | 64–96 kbps (voice); 128 kbps for music |

---

## 9. Implementation Checklist

- [ ] **Phase 1.1** Add `audio-processing.service.ts` + FFmpeg loudness job (after thumbnail)
- [ ] **Phase 1.2** Integrate LiveKit (or Daily) for live page
- [ ] **Phase 1.3** Pre-live mic check modal (level meter + headphones hint)
- [ ] **Phase 2.1** Creator audio presets (Standard, Singing, Studio Clean)
- [ ] **Phase 2.2** Opus bitrate tuning for live
- [ ] **Phase 2.3** Echo detection heuristic
- [ ] **Phase 3.1** Light noise reduction in upload pipeline
- [ ] **Phase 3.2** Preset-aware upload processing
- [ ] **Phase 3.3** Advanced mic check (echo score, device hints)
