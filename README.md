# FORGE Mobile (experiment v0.1)

A React Native rewrite experiment of **FORGE**, the gym training app. The production app
remains the static web app at [superagenticuser/gym-3d](https://github.com/superagenticuser/gym-3d).
This repo is an experiment to see how FORGE feels as a native mobile app.

## What v0.1 includes

- Exercise library: all **243 exercises** with search, muscle-group, equipment, and level filters.
- Exercise detail: steps, form cues, common mistakes with fixes, and tappable easier/harder variations.
- Programs: all **14 training programs** with per-day plans, sets x reps, deep-linked to exercise detail.
- FORGE dark theme shared across every screen.
- Bottom-tab navigation: Home, Exercises, Programs, About.

## What is not ported yet

- Interactive 3D body map
- Workout player (set logging, rest timer)
- Progress charts and history
- Local storage and sync
- Camera form checks and progress photos
- Voice commands
- Achievement badges

## Roadmap

- v0.2: workout player with set logging and rest timer
- v0.3: local progress storage and charts
- v0.4: 3D body map (evaluate three.js on native vs. WebView)
- Later: camera, voice, achievements, sync

## How to run

Requirements: Node 20+ and the Expo Go app on your phone (or an emulator).

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` / `i` for an emulator.

## Data

`src/data/exercises.ts` and `src/data/programs.ts` are generated from the web app's canonical
data files (`~/workspace/gym-3d-v10/js/data-exercises.js` and `data-programs.js`). Do not hand-edit
them; regenerate with:

```bash
node scripts/convert-data.mjs
```

## Code standards

- TypeScript, strict mode. `npx tsc --noEmit` must pass.
- Prettier: single quotes, ES5 trailing commas (`npx prettier --write .`).
- Never use em-dashes in user-facing copy, comments, or docs.
