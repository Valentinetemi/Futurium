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

`npm run validate` checks formatting, Expo lint rules, and TypeScript types.

## Routes

- `/` — home and empty recent memories
- `/capture` — permissions, room-sweep recording, playback, discard and save
- `/find` — visual retrieval placeholder
- `/plus` — Free/Plus comparison and RevenueCat preview status

Saved videos are copied to the app's private document directory. There is no
memory index yet, so the home screen intentionally remains empty after saving.

## Project layout

```text
assets/          Static images, fonts and store artwork
src/app/         Expo Router routes and root layout
src/components/  Reusable interface building blocks
src/constants/   Design tokens
src/lib/         Service setup such as RevenueCat
src/screens/     Screen-level presentation and behavior
```

## License

[MIT](LICENSE)
