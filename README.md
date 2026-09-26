# FoundIt

**Your space remembers where you left it.**

FoundIt is a mobile visual-memory assistant. Record a short sweep of a room,
then ask where an object was last seen in that recording. FoundIt returns the
most relevant saved frame, the room, the saved time, and the moment within the
video, with alternatives when they are useful.

Misplacing an everyday object often means retracing the same steps and searching
the same space again. FoundIt is designed to reduce that friction for anyone,
including caregivers and people experiencing everyday memory difficulties. It
does not diagnose, treat, or manage dementia or any other medical condition.

## How it works

1. Record one room sweep of up to 30 seconds.
2. Name and save the video privately on the device.
3. Choose **Upload for processing**. The local FastAPI service samples the
   video, rejects blurry and near-duplicate frames, and indexes retained frames
   with OpenCLIP.
4. Type a question such as “Where are my glasses?” or optionally record a short
   voice query. FoundIt ranks frames from Ready memories and shows where the
   object may have been last seen.

The current build includes camera capture, local video and SQLite persistence,
saved-memory playback and deletion, FastAPI upload and background processing,
FFmpeg frame extraction, OpenCV quality filtering, OpenCLIP semantic retrieval,
typed search, optional Gemini transcription, and a RevenueCat Plus preview.

Text-based retrieval was physically verified on an iPhone on September 26, 2026. Voice input and the weak/missing-object experience have automated coverage
but still require physical-device verification.

## Demo media

- App screenshots: **to be added before submission**
- Short demo video: **to be added before submission**
- Judge walkthrough: [docs/DEMO.md](docs/DEMO.md)

## Technology

- Expo SDK 57, React Native, Expo Router, and strict TypeScript
- `expo-camera`, `expo-video`, `expo-audio`, and `expo-sqlite`
- FastAPI, FFmpeg, FFprobe, OpenCV, and NumPy
- OpenCLIP `ViT-B-32` with `laion2b_s34b_b79k` weights
- Gemini `gemini-3.5-transcribe` for optional server-side transcription
- RevenueCat React Native SDK with Preview API Mode in Expo Go

OpenCLIP is loaded once per backend process. Its weights download on the first
real processing run, which requires internet access and can make that run slower.
Tests inject fake embedding and transcription providers, so tests do not
download weights or call Gemini.

Endpoint contracts, processing thresholds, ranking behavior, and backend
environment variables are documented in [backend/README.md](backend/README.md).

## Repository structure

```text
assets/                 Static images and future submission media
backend/                FastAPI processing, search, and transcription service
docs/                   Hackathon demo guidance
src/app/                Expo Router routes
src/components/         Shared interface components
src/constants/          Design tokens
src/database/           SQLite schema and sweep repository
src/lib/                Processing, search, transcription, and RevenueCat clients
src/screens/            Mobile screens and interaction logic
src/services/           Local video and database coordination
src/types/              Typed client/API contracts
```

## Local setup

Prerequisites:

- A current Node.js LTS release and npm
- Python 3.11 or newer
- FFmpeg and FFprobe (`brew install ffmpeg` on macOS)
- Expo Go on a physical iOS or Android device
- `cloudflared` only if HTTPS tunnel testing is needed

Install the mobile dependencies and create a local environment file:

```bash
npm install
cp .env.example .env
```

Install the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
cp .env.example .env
```

For voice transcription, add a Gemini API key only to `backend/.env`:

```dotenv
GEMINI_API_KEY=replace_with_your_server_side_key
```

Never put the Gemini key in an `EXPO_PUBLIC_` variable; Expo public variables
are embedded in the mobile bundle.

## Three-terminal development workflow

Terminal 1 — start FastAPI:

```bash
cd backend
source .venv/bin/activate
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

Confirm `http://localhost:8000/health` reports FFmpeg and FFprobe as available.

Terminal 2 — create an optional HTTPS Quick Tunnel:

```bash
cloudflared tunnel --url http://localhost:8000
```

Quick Tunnel hostnames change every time the tunnel restarts. Copy the new HTTPS
hostname into the mobile `.env`; do not reuse an expired hostname:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://your-current-tunnel.trycloudflare.com
```

For same-Wi-Fi testing, a Mac LAN URL such as `http://192.168.1.100:8000` can be
used instead. A physical phone cannot reach the Mac through `localhost`.

Terminal 3 — restart Expo with a clean cache after changing `.env`:

```bash
# From the repository root
npm run start:clean
```

Scan the QR code with Expo Go. Camera, microphone, and saved-file behavior should
be checked on a physical phone.

## RevenueCat preview

Set a public Test Store or browser-compatible SDK key in the mobile `.env`:

```dotenv
EXPO_PUBLIC_REVENUECAT_API_KEY=test_replace_with_your_public_sdk_key
```

Expo Go uses RevenueCat Preview API Mode. The Plus interface can be demonstrated,
but no real App Store or Play Store purchase occurs. Real purchases require
configured store products and a development or production build.

## Privacy and limitations

- Room videos stay in the app's private document directory until the user
  explicitly chooses processing.
- The backend deletes the temporary uploaded room video after processing and
  retains the selected frames, thumbnails, manifests, and embeddings needed for
  search.
- Optional voice audio is sent to Gemini for transcription. The backend removes
  its temporary copy and requests deletion of the Gemini Files API copy whether
  transcription succeeds or fails.
- Logs exclude room video, audio contents, transcripts, embeddings, private file
  paths, and credentials.
- Search is whole-frame similarity, not object detection. There are no bounding
  boxes or generated location descriptions.
- A score above the default `0.23` threshold is still a heuristic. Weak results
  are labeled **No confident match** rather than claiming an object was found.
- Results describe where something may have been **last seen**; they do not claim
  it is currently there.
- The local development API has no user authentication and should not be exposed
  beyond a controlled demo environment.
- There is no cloud memory sync, account system, or end-to-end encryption claim.

## Testing

Frontend checks:

```bash
npm ci
npm run validate
npx expo install --check
npx expo-doctor@latest
npx expo export --platform ios --output-dir /tmp/foundit-ios
npx expo export --platform android --output-dir /tmp/foundit-android
```

Backend checks:

```bash
cd backend
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

Backend fixtures generate short videos at runtime. One fixture verifies blur and
duplicate filtering; another contains distinguishable glasses, mug, and keys
frames and verifies semantic ranking. No video fixture, model weight, user
database, or generated processing artifact is committed.

## Compatibility notes

The public product name, Expo slug, scheme, and npm package name are FoundIt.
Several legacy technical identifiers intentionally remain unchanged so upgrades
continue to find existing data and developer integrations:

- iOS and Android application IDs: `com.valentinetemi.futurium`
- SQLite filename: `futurium.db`
- Python import/distribution names: `futurium_api` and `futurium-api`
- backend environment variables with the `FUTURIUM_*` prefix
- the existing GitHub repository name

Routes, API request and response contracts, database schema, and stored memories
are unchanged.

## Attribution and license

Semantic retrieval uses [OpenCLIP](https://github.com/mlfoundations/open_clip)
and the
[`laion2b_s34b_b79k` ViT-B-32 weights](https://huggingface.co/laion/CLIP-ViT-B-32-laion2B-s34B-b79K).
Review the upstream model card and terms before redistribution. FoundIt is
released under the [MIT License](LICENSE).
