# BeTalent – helyi AI vokális elemző (ingyenes)

Ez a worker **a te gépeden** futtatja a vokális pontozást. **Nincs külső API költség** – csak ffmpeg + librosa (ingyenes, open source).

## Követelmények

- **Python 3.10+**
- **ffmpeg** a gépen (pl. `brew install ffmpeg` vagy `apt install ffmpeg`)
- Next.js app fusson (pl. `npm run dev` vagy `npm run start`)

## Telepítés

```bash
cd scripts/audio_analysis_worker
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Konfiguráció

1. **API kulcs** (kötelező): a Next.js `.env` fájlban add hozzá:
   ```
   INTERNAL_AUDIO_ANALYSIS_API_KEY=valami-titkos-kulcs
   ```
   Ugyanezt a kulcsot add meg a workernek is (lásd lent).

2. **Worker környezeti változók** (futtatás előtt):
   ```bash
   export INTERNAL_AUDIO_ANALYSIS_API_KEY=valami-titkos-kulcs
   export BETALENT_BASE_URL=http://localhost:3000
   ```

### Opcionális env (timeouts, retries, allowlist)

| Env | Jelentés | Alap |
|-----|----------|------|
| `AUDIO_WORKER_POLL_SEC` | Hány másodpercenként kérdezzen | 15 |
| `AUDIO_ANALYSIS_MEDIA_FETCH_TIMEOUT_MS` | Media letöltés timeout (ms) | 90000 |
| `AUDIO_ANALYSIS_FFMPEG_TIMEOUT_MS` | FFmpeg futtatás timeout (ms) | 120000 |
| `AUDIO_ANALYSIS_CALLBACK_TIMEOUT_MS` | API callback timeout (ms) | 15000 |
| `AUDIO_ANALYSIS_MAX_RETRIES` | Max próbálkozás egy job-ra | 3 |
| `AUDIO_ANALYSIS_VERSION` | Elemzés verzió (verziózás) | 1.0 |
| `AUDIO_ANALYSIS_ALLOWED_DOMAINS` | Engedélyezett hosztok (vesszővel); csak ezek a média URL-ek kerülnek feldolgozásra | cloudinary, localhost |

**Media safety:** A worker és a szerver is csak az engedélyezett domainekre mutató URL-eket dolgoz fel. Tetszőleges nyilvános URL-eket nem (SSRF / abuse védelem).

## Futtatás

```bash
python worker.py
```

A worker atomikusan lefoglal egy PENDING vagy retryable jobot, letölti a videó hangját (ffmpeg), elemzi (librosa), és visszaküldi az eredményt az appnak. Sikertelenség esetén `retryable=true`-val jelzi, és a szerver újra be tudja tenni a sort (RETRYABLE_FAILED → következő próbálkozás). Kilépés: Ctrl+C.
