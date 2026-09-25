# Futurium

Futurium is a cross-platform visual memory assistant with a simple promise:
**Sweep now. Ask later.** Record one short video of a room, keep it as a saved
memory, prepare useful frames, and later ask where something was last seen.

This version includes durable on-device memories, a local FastAPI processing
service, OpenCLIP text-to-frame retrieval, and optional Gemini voice-query
transcription. Search results are visual similarity candidates—not proof that
an object was found or that it is currently in a location.

## Stack

- Expo SDK 57, React Native 0.86, Expo Router and strict TypeScript
- `expo-camera` for one continuous, maximum 30-second room sweep
- `expo-video` for preview and saved-memory playback
- `expo-sqlite` for the durable local memory and processing index
- FastAPI, FFmpeg and OpenCV for local upload and frame preparation
- OpenCLIP `ViT-B-32` with `laion2b_s34b_b79k` weights for frame and text
  embeddings
- Gemini `gemini-3.5-transcribe` for optional short voice transcription
- RevenueCat React Native SDK with Expo Go Preview API Mode support
- iOS and Android support

## Run the mobile app

Use the current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env
npm start
```

Scan the QR code with Expo Go on a physical iOS or Android phone. Camera and
microphone behavior should be tested on a physical device. You can also press
`i` for iOS Simulator or `a` for an Android emulator, though their camera
behavior may be limited.

## Run the processing API

Install Python 3.11 or later and FFmpeg first. On macOS with Homebrew:

```bash
brew install ffmpeg
```

Then start the API in a second terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
cp .env.example .env
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

Set a server-only Gemini key in `backend/.env` to enable voice transcription:

```dotenv
GEMINI_API_KEY=replace_with_your_gemini_api_key
```

Never use an `EXPO_PUBLIC_` variable for the Gemini key. The first real sweep
processed after setup downloads the configured OpenCLIP weights, so it is
slower and needs an internet connection. Later processing reuses the model in
the same server process.

Confirm it is ready from the Mac:

```bash
curl http://localhost:8000/health
```

For a physical phone, `localhost` points to the phone—not the Mac. Find the
Mac's LAN address (often with `ipconfig getifaddr en0`) and set the mobile
environment variable to that address:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000
```

The iPhone and Mac must be on the same network, and macOS must allow incoming
connections to Python. Expo public variables are inlined into the JavaScript
bundle, so Fast Refresh is not enough after changing `.env`. Stop the existing
Metro process and restart it with a clean transform cache:

```bash
npm run start:clean
```

In development, the Metro console prints the effective public API base URL when
the app starts. The app has no API URL fallback, so it never silently routes a
physical phone to localhost.

The processing API has no user authentication and is intended only for trusted
local development. If a tunnel is needed for HTTPS device testing, keep its URL
private and stop the tunnel afterward.

See [backend/README.md](backend/README.md) for endpoints, configuration,
processing thresholds and API examples.

## Upload privacy behavior

Uploading is always a separate, confirmed action on a saved-memory detail
screen. The configured server receives a temporary copy of the room video. It
deletes that uploaded source after processing succeeds or fails and retains
only the processed frames needed for semantic search. The original
saved video remains in the app's private document directory for replay.

This prototype does not claim end-to-end encryption or medical compliance.

Voice input is optional. The app records at most 12 seconds and uploads it only
after the user chooses voice input. The backend sends the temporary audio to
Gemini for transcription, requests deletion of the Gemini Files API copy, and
always removes its own temporary upload. The transcript is placed into the
normal search field for review or editing; it does not trigger a search by
itself.

## Semantic search behavior and limitations

- Newly processed retained frames receive normalized OpenCLIP embeddings.
- Each job stores one compressed `embeddings.npz` containing schema version,
  model identifier, stable frame IDs, and a float32 embedding matrix.
- A normalized text embedding is compared with every eligible frame by cosine
  similarity (a dot product between normalized vectors).
- Only local sweeps marked `ready` are included. The API returns at most three
  ranked candidates.
- The top result is confident only when its similarity is at least the
  configurable threshold (`0.23` by default). Lower scores are labeled as
  closest visual candidates rather than a found object.
- Memories processed before embedding support do not have an index. Upload them
  for processing again if they need to become searchable.
- This is whole-frame retrieval. There are no bounding boxes, object counts,
  location descriptions, Grounding DINO, or language-model reasoning.

## RevenueCat preview setup

1. Create or open the app in RevenueCat and enable the Test Store.
2. Copy its **public** Test Store SDK key into `.env`:

   ```dotenv
   EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_public_sdk_key
   ```

3. Restart Metro after changing `.env`.

In Expo Go, the SDK uses browser-compatible Preview API Mode. Only Test Store
(`test_`) or browser-compatible (`rcb_`) keys are accepted there. The Plus
screen labels this as a preview, and no real App Store or Play Store purchase is
attempted. Real purchases require store products and a development or
production build.

## Quality checks

```bash
npm run validate
npx expo-doctor@latest
npx expo export --platform ios --output-dir /tmp/futurium-ios
npx expo export --platform android --output-dir /tmp/futurium-android

cd backend
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

The frontend tests initialize clean and version-one in-memory SQLite databases,
then exercise migration, repository, multipart upload, search response, and
transcription response behavior. Backend tests generate small MP4 files at
runtime and inject fake embedding/transcription providers, so no video fixture
is committed and tests never download model weights or call Gemini.

## Physical-phone test flow

1. Start FastAPI with `GEMINI_API_KEY` configured and confirm `/health` from the
   phone browser.
2. Put the phone-reachable HTTPS or Mac LAN URL in
   `EXPO_PUBLIC_API_BASE_URL`, then stop Metro and run `npm run start:clean`.
3. In Expo Go, record and save a sweep containing several distinct objects.
4. Open the saved memory, approve the upload notice, choose **Upload for
   processing**, and wait for **Ready**. The first run may pause while OpenCLIP
   weights download on the Mac.
5. Open **Find something**, type a query such as “Where are my glasses?”, and
   confirm the strongest frame, room, saved time, frame timestamp, score, and no
   more than two alternatives appear.
6. Tap **Voice**, approve microphone permission, speak a query, and either stop
   early or allow the 12-second limit. Confirm the transcription appears in the
   same editable field. Edit it if needed, then tap **Search memories**.
7. Cancel a second recording and confirm no search runs. Deny microphone access
   once and confirm typed search remains usable.

## Routes

- `/` — home and focus-refreshed recent memories
- `/capture` — permissions, recording, preview, room naming and durable save
- `/memories/[id]` — replay, upload/processing status, retained frames and delete
- `/find` — typed semantic search and optional editable voice transcription
- `/plus` — Free/Plus comparison and RevenueCat preview status

Deleting a saved memory removes its SQLite row and local video. Missing or
damaged video files are reported without crashing. Upload failures are retryable
on the same local sweep. Retrieval describes where an object may have been
**last seen** in a recorded sweep; it does not claim the object is currently
there.

## Project layout

```text
assets/                 Static images, fonts and store artwork
backend/                FastAPI processing service and generated-video tests
src/app/                Expo Router routes and root layout
src/components/         Reusable interface building blocks
src/constants/          Design tokens
src/database/           SQLite schema, mappings, repository and tests
src/lib/                Processing, search, transcription and RevenueCat clients
src/screens/            Screen-level presentation and behavior
src/services/           Coordinated local file and database operations
src/types/              Shared typed processing contracts
src/utils/              Display formatting helpers
```

## License

[MIT](LICENSE)
