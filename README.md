# Futurium

Futurium is a cross-platform Expo app that helps students explore frontier technology careers through short, futuristic simulations.

## Stack

- Expo SDK 57 and React Native 0.86
- TypeScript in strict mode
- Expo Router
- iOS and Android support

## Get started

Use the current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env
npm start
```

From the Expo terminal, press `i` for iOS Simulator or `a` for an Android emulator. You can also run `npm run ios` or `npm run android` directly.

## Quality checks

```bash
npm run validate
```

This checks formatting, Expo lint rules, and TypeScript types.

## Project layout

```text
assets/          Static images, fonts, and store artwork
src/app/         Expo Router routes and layouts
src/components/  Reusable interface building blocks
src/constants/   Copy, theme values, and app constants
src/data/        Local typed seed data
src/screens/     Screen-level presentation
```

Environment variables are not required yet. When they are introduced, document only safe placeholders in `.env.example`; never commit credentials.

## License

[MIT](LICENSE)
