This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md
- **Never pass a style array to a direct child of `<Link asChild>` (or any Slot).** expo-router's Slot cannot merge style arrays: dev throws, production silently drops the styles (2026-10-09: this broke the Home cards in v0.4). Always pass a single flattened object: `style={StyleSheet.flatten([styles.card, { backgroundColor: colors.surface }])}`.
- **Every full-screen screen and modal must respect safe areas.** Never rely on fixed bottom padding (`paddingBottom: spacing.xxl` is not enough on devices with tall nav bars). Use `useSafeAreaInsets()` for ScrollView content (`paddingBottom: insets.bottom + spacing.lg`) or `SafeAreaView` for modals, with sticky footers for action buttons (2026-10-09: exercise detail, program detail, settings, and the custom-exercise modal were all clipped).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## 3D body (expo-gl + three.js)

- The mannequin is native: `src/three/bodyScene.ts` (pure three.js port of the
  web `createBodyViewer`) driven by `src/components/BodyViewer.tsx`
  (`GLView` + react-native-gesture-handler). The WebView fallback was not
  needed.
- three.js needs a fake canvas with the real expo-gl context:
  `new THREE.WebGLRenderer({ canvas: fakeCanvas, context: gl })`, then
  `gl.endFrameEXP()` after every `renderer.render()`. Set
  `THREE.ColorManagement.enabled = false` and
  `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` to match the web
  app's three r147 look.
- GestureHandlerRootView wraps the root layout; without it gestures misbehave
  on Android.
- `theme.accent` is the accent id ('volt'); the hex is `colors.accent`.
  The scene needs the hex.
