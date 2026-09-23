# Futurium

Futurium is a cross-platform visual memory assistant with a simple promise:
**Sweep now. Ask later.** Record one short video of a room, then return to that
visual memory when you need to find something.

This foundation includes the on-device recording flow and a clearly marked
search placeholder. Visual retrieval, frame extraction, accounts, cloud storage
and a backend are intentionally not implemented yet.

## Stack

- Expo SDK 57 and React Native 0.86
- TypeScript in strict mode
- Expo Router
- `expo-camera` for one continuous, maximum 30-second room sweep
- `expo-video` for playback preview
- `expo-sqlite` for the durable local saved-memory index
- RevenueCat React Native SDK with Expo Go Preview API Mode support
- iOS and Android support

## Run locally

Use the current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env
npm start
```

Scan the QR code with Expo Go on a physical iOS or Android phone. Camera and
microphone behavior should be tested on a physical device. You can also press
`i` for iOS Simulator or `a` for an Android emulator, but their camera behavior
may be limited.

## RevenueCat preview setup

1. Create or open the app in RevenueCat and enable the Test Store.
2. Copy its **public** Test Store SDK key into `.env`:

   ```dotenv
   EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_public_sdk_key
   ```

3. Restart Metro after changing `.env`.

In Expo Go, the SDK automatically uses its browser-compatible Preview API Mode.
Only Test Store (`test_`) or browser-compatible (`rcb_`) keys are accepted there.
The Plus screen labels this as a preview, and no real App Store or Play Store
purchase is attempted. Real purchases require store products configured in
RevenueCat and a development or production build.

## Quality checks

```bash
npm run validate
npx expo-doctor@latest
```

`npm run validate` checks formatting, Expo lint rules, strict TypeScript, and
the database repository tests. The tests initialize a clean in-memory SQLite
database before exercising migrations and CRUD behavior.

## Routes

- `/` — home and focus-refreshed recent memories
- `/capture` — permissions, recording, preview, room naming and durable save
- `/memories/[id]` — saved-memory metadata, video replay and deletion
- `/find` — visual retrieval placeholder
- `/plus` — Free/Plus comparison and RevenueCat preview status

Saved videos are copied to the app's private document directory and indexed in
the local `sweeps` SQLite table. Deleting a saved memory removes both resources.
Missing or damaged video files are reported without crashing the detail screen.
Object search is still a placeholder; a saved memory is not searchable yet.

## Project layout

```text
assets/          Static images, fonts and store artwork
src/app/         Expo Router routes and root layout
src/components/  Reusable interface building blocks
src/constants/   Design tokens
src/database/    SQLite schema, mappings, repository and tests
src/lib/         Service setup such as RevenueCat
src/screens/     Screen-level presentation and behavior
src/services/    Coordinated local file and database operations
src/utils/       Display formatting helpers
```

## License

[MIT](LICENSE)
