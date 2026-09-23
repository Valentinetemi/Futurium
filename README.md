# Futurium

Futurium is a cross-platform visual memory assistant with a simple promise:
**Sweep now. Ask later.** Record one short video of a room, keep it as a saved
memory, and prepare useful frames for a future “last seen” search.

This version includes durable on-device memories and a local FastAPI frame
processing service. Semantic search and object retrieval are intentionally not
implemented yet, so the app never claims that a saved memory is searchable.

## Stack

- Expo SDK 57, React Native 0.86, Expo Router and strict TypeScript
- `expo-camera` for one continuous, maximum 30-second room sweep
- `expo-video` for preview and saved-memory playback
- `expo-sqlite` for the durable local memory and processing index
- FastAPI, FFmpeg and OpenCV for local upload and frame preparation
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
connections to Python. Restart Metro after changing `.env`. The app has no API
URL fallback, so it never silently routes a physical phone to localhost.

The processing API has no authentication and is intended only for trusted local
development. Do not expose it to the public internet.

See [backend/README.md](backend/README.md) for endpoints, configuration,
processing thresholds and API examples.

## Upload privacy behavior

Uploading is always a separate, confirmed action on a saved-memory detail
screen. The configured server receives a temporary copy of the room video. It
deletes that uploaded source after processing succeeds or fails and retains
only the processed frames needed for later search development. The original
saved video remains in the app's private document directory for replay.

This prototype does not claim end-to-end encryption or medical compliance.

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
then exercise migration, repository and API mapping behavior. Backend tests
generate a small MP4 at runtime, so no video fixture is committed.

## Routes

- `/` — home and focus-refreshed recent memories
- `/capture` — permissions, recording, preview, room naming and durable save
- `/memories/[id]` — replay, upload/processing status, retained frames and delete
- `/find` — visual retrieval placeholder
- `/plus` — Free/Plus comparison and RevenueCat preview status

Deleting a saved memory removes its SQLite row and local video. Missing or
damaged video files are reported without crashing. Upload failures are retryable
on the same local sweep. Future retrieval will describe where an object was
**last seen** in a recorded sweep; it will not claim the object is currently
there.

## Project layout

```text
assets/                 Static images, fonts and store artwork
backend/                FastAPI processing service and generated-video tests
src/app/                Expo Router routes and root layout
src/components/         Reusable interface building blocks
src/constants/          Design tokens
src/database/           SQLite schema, mappings, repository and tests
src/lib/                Processing API client and RevenueCat setup
src/screens/            Screen-level presentation and behavior
src/services/           Coordinated local file and database operations
src/types/              Shared typed processing contracts
src/utils/              Display formatting helpers
```

## License

[MIT](LICENSE)
