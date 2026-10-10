# FORGE Mobile

A React Native (Expo) port of **FORGE**, the gym training app. The production web app
remains the static site at [superagenticuser/gym-3d](https://github.com/superagenticuser/gym-3d).
This is a full native port of every web app feature.

## Features

- Exercise library: all **243 exercises** across 17 muscle groups, with search, muscle, equipment, and level filters, favorites, custom exercises, and similar exercise swaps.
- Exercise detail: steps, form cues, common mistakes with fixes, tappable easier/harder variations, and 1RM calculator.
- Programs: all **14 training programs** with per-day plans, sets x reps, deep-linked to exercise detail.
- Workout player: start free, program, or exercise-seeded workouts; set logging with RPE; rest timer with notification, sound, haptics, and voice; swap, add, and reorder exercises.
- Interactive 3D body map: native three.js mannequin with tap-to-select muscles, front/back views, muscle highlight, soreness overlay, and finish options (Standard, Chrome, X-ray, Matte).
- Progress: workout history, charts, PR timeline, progress photos with ghost overlay and before/after slider compare, and achievement badges.
- Camera: form check video recording and progress photos.
- Voice: voice commands for workout control.
- Data portability: backup to JSON, restore, and web backup import.
- Settings: 6 accent themes, appearance controls, all applied app-wide instantly.
- OTA updates via Expo Updates on the preview channel.

## How to run

Requirements: Node 20+ and the Expo Go app on your phone (or a development build for native modules).

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` / `i` for an emulator.

Note: OTA updates require `--platform android` (expo-sqlite has no web build).

## Data

`src/data/exercises.ts` and `src/data/programs.ts` are generated from the web app's canonical
data files. Do not hand-edit them; regenerate with:

```bash
node scripts/convert-data.mjs
```

## Code standards

- TypeScript, strict mode. `npx tsc --noEmit` must pass.
- Prettier: single quotes, ES5 trailing commas (`npx prettier --write .`).
- Never use em-dashes in user-facing copy, comments, or docs.
- Expo Router: never pass a style array to a direct child of `<Link asChild>`. Use `StyleSheet.flatten`.
- Every full-screen screen and modal must respect safe areas via `useSafeAreaInsets()` or `SafeAreaView`.
