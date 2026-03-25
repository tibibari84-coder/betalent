# BeTalent Premium Audio System – Architecture

**Date:** March 2026  
**Scope:** Studio-quality audio for uploaded videos, live sessions, creator presets, mic check.  
**Quality bar:** Premium, singer-first, creator-friendly. NOT optimized for speech-call quality.

---

## Singer-First Principles

BeTalent is a **singer-first** platform. Audio is tuned for:

| Priority | Implementation |
|----------|----------------|
| **Vocal clarity** | LRA 12 (preserves dynamics), highpass 75Hz (keeps low-mid body), no over-compression |
| **Low noise** | Highpass, optional denoise; Singing preset keeps NS for room noise |
| **Low clipping** | -1 dBTP limiter; mic check catches peaks before live |
| **Consistent loudness** | -14 LUFS normalization across feed |
| **Low-latency live** | WebRTC/Opus; Singing preset: AGC off for expression |
| **Creator confidence** | Mic check: "Sing a line at performance volume"; preset guidance |

**Do NOT** optimize only for speech-call quality. Singers need dynamics (soft → belted), harmonic richness, and expression. AGC off for Singing preset; LRA 12 for uploads.

---

## 1. BeTalent Audio System Audit – Current Real Status

### ACTUALLY IMPLEMENTED

| Component | Location | What It Does | Production-Grade? |
|-----------|----------|--------------|-------------------|
| **AI vocal scoring queue** | `vocal-scoring.service.ts` | Atomic claim, URL allowlist, duration check | Yes |
| **Audio analysis worker** | `scripts/audio_analysis_worker/worker.py` | FFmpeg extract (22.05kHz mono WAV) → librosa analyze → callback | Yes (local) |
| **Extraction for analysis** | `worker.py` `extract_audio_to_wav()` | For ML only; no playback processing | Yes |
| **Vocal sub-scores** | `worker.py` `_analyze_audio_impl()` | Pitch, rhythm, tone, clarity, dynamic, confidence | Partial (heuristic) |
| **Result persistence** | `saveAnalysisResult()`, internal API | VideoAudioAnalysis, ranking integration | Yes |
| **Thumbnail pipeline** | `thumbnail.service.ts` | FFmpeg frame extract → R2 upload | Yes |
| **Storage** | `lib/storage/` | R2/S3 presign, playback URL, thumbnail upload | Yes |

### PARTIALLY IMPLEMENTED

| Component | Location | Gap |
|-----------|----------|-----|
| **Upload audio** | Analysis worker extracts only | No loudness, limiter, EQ, denoise for playback |
| **Media integrity** | Schema + service | No fingerprint pipeline |

### MISSING

| Component | Required For |
|-----------|--------------|
| Loudness normalization | Consistent playback across feed |
| Limiter / anti-clipping | No harsh peaks |
| Gentle EQ cleanup | Vocal clarity, less muddiness |
| Optional light denoise | Phone-recorded issues |
| Live WebRTC transport | Weekly challenge sessions |
| Opus, AEC, NS, AGC | Live vocal clarity |
| Creator presets | Standard, Singing, Studio Clean |
| Pre-live mic check | Level, clipping, echo, headphones hint |
| Playback codec/bitrate strategy | Mobile + headphone quality |

### NEEDS REWORK

| Component | Issue |
|-----------|-------|
| **Processing pipeline order** | Thumbnail → ANALYZING_AUDIO. Must insert PROCESSING_AUDIO (loudness, limiter) before analysis so we analyze the processed audio. |
| **Live page** | Placeholder only; needs real streaming. |

---

## 2. Premium Target Architecture

### 2.1 Upload Audio Pipeline (Post-Upload)

```
[Uploaded Video] → R2
        ↓
[Thumbnail Step] (existing)
        ↓
[PROCESSING_AUDIO] ← NEW
  1. Download from videoUrl (or stream)
  2. FFmpeg: loudnorm (EBU R128 -14 LUFS, -1 dBTP)
  3. Limiter (prevent clipping)
  4. Optional: highpass 80Hz (reduce rumble), gentle de-esser
  5. Re-mux: video copy + processed AAC 128k
  6. Upload to R2 (overwrite or new key)
  7. Update Video.videoUrl
  8. → ANALYZING_AUDIO (existing)
```

**Design principles:**
- Preserve vocal character; avoid over-processing
- Vocal intelligibility > loudness wars
- Consistent LUFS across platform
- Phone speaker + headphone friendly

### 2.2 Live Audio Pipeline

```
[Creator] getUserMedia({ audio: preset constraints })
    → MediaStreamTrack
    → RTCPeerConnection → SFU (LiveKit)
    → Opus (browser default)
    → AEC, NS, AGC (browser)

[Viewer] Subscribe to room → receive Opus → play
```

**Tradeoffs:**
- **Low latency vs quality:** Opus 64–96 kbps for voice; 128 kbps for music. Latency ~100–200 ms typical.
- **Browser DSP:** AEC/NS/AGC are device-dependent. Good on Chrome/Safari; recommend headphones for echo.
- **Server-side:** LiveKit handles transport; no custom server DSP in Phase 1–2.

### 2.3 Creator Presets

| Preset | Use Case | Capture | Post-Processing | When to Recommend |
|--------|----------|---------|-----------------|-------------------|
| **Standard** | General, phone/laptop | AEC, NS, AGC on | Default | Default for most |
| **Singing / Vocal** | Singing, spoken word | AEC, NS on, AGC moderate | Light compression, clarity | Singers, performers |
| **Studio Clean** | External mic, quiet room | AEC on, NS light, AGC off | Minimal | Pro mics, treated room |

### 2.4 Pre-Live Mic Check

1. Request mic permission
2. Measure RMS/peak over 3–5 s
3. Detect: too low, good, too high, clipping
4. Echo heuristic: play tone, measure feedback → recommend headphones
5. Noise floor: if high → "Room may be too noisy"
6. Suggest best preset based on signal

---

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UPLOAD PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Client Upload → R2 (presigned) → Complete                               │
│       → Thumbnail (FFmpeg frame)                                          │
│       → PROCESSING_AUDIO (FFmpeg loudnorm + limiter + optional EQ)        │
│       → Replace video in R2, update videoUrl                              │
│       → ANALYZING_AUDIO (existing worker)                                 │
│       → READY                                                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         LIVE PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Creator: MicCheck → Preset → getUserMedia → LiveKit publish             │
│  Viewer:  LiveKit subscribe → play                                        │
│  Backend: Token generation (room + identity)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Recommended Libraries / Tools

| Area | Tool | Purpose |
|------|------|---------|
| **Upload audio** | FFmpeg | loudnorm, limiter, highpass, afftdn (denoise) |
| **Live transport** | LiveKit | WebRTC SFU, Opus, token auth |
| **Frontend live** | @livekit/components-react, livekit-client | Room, tracks, publish/subscribe |
| **Mic check** | Web Audio API (AnalyserNode) | Level, frequency analysis |
| **Storage** | Existing R2/S3 | Processed video overwrite |

---

## 5. Frontend vs Backend Responsibilities

| Responsibility | Owner |
|----------------|-------|
| Upload: select file, metadata, progress | Frontend |
| Upload: presign, storage, pipeline | Backend |
| Audio processing (FFmpeg) | Backend |
| Mic check: permission, level, echo hint | Frontend |
| Live: getUserMedia with preset | Frontend |
| Live: token generation | Backend |
| Live: transport (WebRTC) | LiveKit (external) |
| Playback: consistent volume | Backend (normalized files) |

---

## 6. Database / Data Model Additions

- **ProcessingStatus:** Add `PROCESSING_AUDIO` enum value
- **Video:** Optional `audioProcessingMetadata` Json? (input LUFS, output LUFS, processing version) – Phase 2
- **Creator:** Optional `audioPreset` enum – Phase 2

---

## 7. Deployment / Scaling Notes

- **FFmpeg:** Must be on PATH for audio processing. Same server as Next.js or separate worker.
- **Processing time:** ~2–3× realtime for 1-min video (loudnorm 2-pass). Consider background job for production.
- **LiveKit:** Hosted; scale via their infra. Token endpoint is lightweight.
- **Storage:** Processed video overwrites original; ensure sufficient R2 capacity.

---

## 8. Phased Implementation Plan

### Phase 1: Premium Upload Audio Pipeline
- [ ] Add PROCESSING_AUDIO to schema
- [ ] Create `audio-processing.service.ts` (FFmpeg pipeline)
- [ ] Create `uploadProcessedVideo` in storage
- [ ] Integrate: Thumbnail → PROCESSING_AUDIO → ANALYZING_AUDIO
- [ ] Update upload-status labels

### Phase 2: Premium Live Audio + Mic Check
- [ ] LiveKit integration (token API, room)
- [ ] MicCheckModal component
- [ ] Creator presets constants
- [ ] Replace live page placeholder with LiveKit room

### Phase 3: Advanced Creator Audio
- [ ] Preset selector in live flow
- [ ] Echo detection heuristic
- [ ] Optional light denoise in upload pipeline
- [ ] audioProcessingMetadata storage

---

## 10. Implementation Checklist (Current Status)

| Item | Status |
|------|--------|
| PROCESSING_AUDIO enum + migration | ✅ Done |
| audio-processing.service.ts (FFmpeg loudnorm + limiter) | ✅ Done |
| uploadProcessedVideo in storage | ✅ Done |
| Thumbnail → PROCESSING_AUDIO → ANALYZING_AUDIO flow | ✅ Done |
| upload-status "Enhancing audio…" label | ✅ Done |
| live-audio constants (presets, thresholds) | ✅ Done |
| MicCheckModal component | ✅ Done |
| Live page "Check mic" button | ✅ Done |
| LiveKit integration | ⏳ Phase 2 |
| Echo detection | ⏳ Phase 2 |
| Light denoise (afftdn) | ⏳ Phase 3 |

---

## 11. File/Folder Summary (Implemented)

```
src/
├── constants/
│   ├── audio-processing.ts       ✅ NEW – LUFS, peak limit, AAC bitrate
│   └── live-audio.ts             ✅ NEW – presets, thresholds
├── lib/
│   └── audio-processing-architecture.ts  ✅ NEW – contract
├── services/
│   └── audio-processing.service.ts       ✅ NEW – FFmpeg pipeline
├── components/
│   └── live/
│       └── MicCheckModal.tsx     ✅ NEW – level meter, presets
├── app/(public)/live/[slug]/
│   └── page.tsx                  ✅ UPDATED – mic check button
└── lib/
    ├── storage/upload.ts         ✅ UPDATED – uploadProcessedVideo
    └── upload-status.ts          ✅ UPDATED – PROCESSING_AUDIO label

prisma/
├── schema.prisma                 ✅ UPDATED – PROCESSING_AUDIO enum
└── migrations/
    └── 20260322000000_add_processing_audio/  ✅ NEW
```

---

## 12. Honest Limitations

| What Software Can Improve | What Depends on User |
|--------------------------|----------------------|
| Loudness consistency | Microphone quality |
| Clipping prevention | Recording level discipline |
| Light denoise | Room acoustics |
| AEC/NS/AGC (browser) | Headphones for echo |
| Consistent codec/bitrate | Network quality (live) |
| Vocal clarity (EQ) | Distance to mic, room tone |

**Platform maxim:** Do everything possible in software; educate creators on environment (quiet room, headphones, decent mic).
