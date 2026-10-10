# FORGE React Native Port: Audit and Blueprint

Date: 2026-10-09. Web app source: `~/workspace/gym-3d-v10` (v11.75). RN app: `~/workspace/forge-mobile` (Expo SDK 57, React 19, expo-router, expo-updates on preview channel).
Strategy: cut ONE kitchen-sink native EAS build with every native module the finished app will need, then port features as JavaScript via OTA updates.

Rule of thumb used throughout: **OTA** = pure JavaScript shippable via `eas update`. **NEEDS NATIVE** = requires native code in the build (new library, permission, or native config); adding it later forces a rebuild.

---

## 1. Feature inventory (from source, not filenames)

Difficulty: S = 1-2 days, M = 3-7 days, L = 1-3 weeks.

### App shell, routing, home
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Hash router, 11 views | `#/` routes: home, exercises, detail, body, programs, program, workout, favorites, progress, builder, privacy | - | S (expo-router already in RN) |
| Home hero | Time-of-day greeting, CTA buttons (3D body, browse, check-in), stats (243 exercises, 17 groups), hero 3D preview canvas | exercises count, check-in | S |
| Reminder banner | Daily workout reminder banner (in-app only, NOT a system notification) | `settings.reminder` | S |
| Recovery/goals dashboards | Home cards summarizing readiness and goal progress | check-in, goals, logs | M |
| Muscle grid | 17 tappable muscle group cards linking to filtered library | MUSCLE_INFO | S (RN has chips; grid is easy) |
| Settings modal (18 settings) | Accent color, units kg/lb, goal (cut/maintain/bulk), big text, high contrast, my equipment, language EN/FR, rest sound, auto-rest, voice cues, haptics, advanced tools gate, reduce motion, 3D body finish (standard/chrome/xray/matte), daily reminder time, demo autoplay, demo speed. Plus: export JSON, export CSV, backup, restore, reset, storage meter | `forge-settings`, `forge-accent` | M |
| i18n EN/FR | `data-i18n` attributes, `applyI18n()` | `settings.lang` | S |
| In-app dialogs | `appAlert/appConfirm/appPrompt` replace native dialogs | - | S |

### Exercise library and detail
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Library filters | Text search (name/muscle/equipment/level), muscle chips, equipment select, level, "my equipment only" toggle | settings.myEquipment | S (RN already has search + chips; add equipment select + myEq toggle) |
| Favorites | Heart/save toggle, favorites view with count badge | `forge-favs` | S |
| Detail subsections | Steps, form cues, common mistakes + fixes, variations (easier/harder tappable), muscles, similar exercises (4), equipment swaps, est 1RM (Epley, if logged), progression chart (canvas 1RM-over-time, 2+ sessions), mini 3D viewer, scrubbable demo | logs for 1RM/chart | M (RN has steps/cues/mistakes/variations/warmup; add similar, swaps, 1RM, chart, demo) |
| Custom exercises | Create (name, primary, secondary, equipment, level), delete; badge "Custom" | `forge-custom-exercises` | S |
| Anatomy deep-dives | Muscle name/desc/function text (from MUSCLE_INFO) shown on 3D body sheet | static | S |

### 3D body map
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Mannequin | ~109 procedural meshes (~77 clickable muscle meshes, 17 material ids), MeshStandardMaterial, 4 lights, no shadows | - | L (see section 4) |
| Interactions | Tap select (raycast), long-press bottom sheet, drag rotate (eased), pinch/wheel zoom, front/back eased transitions, auto-rotate after 3s idle (pauses during transitions), reduce-motion support | settings | L |
| Modes | Muscles / Recovery heat / Fatigue heat / Soreness, with heat legend | logs, soreness | M (needs 3D first) |
| Muscle panel | Name, desc, recovery state ("Trained N days ago"), soreness label + clear, tappable exercise list | logs, soreness | M |
| Soreness tap-to-cycle | Tap muscle cycles none > mild > sore > very-sore > injured, tinted per level, date-keyed | `forge-sore` | S (needs 3D) |
| Workout replay | Stepper replaying a past workout on the body (`#/body?replay=1`) | logs | M |

### Programs and builder
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Programs list/detail | 14 programs, active-program banner ("Up next"), start/continue/stop, ICS calendar export, delete custom | `forge-active`, `forge-custom-programs` | S-M (RN has list/detail; add active flow, ICS) |
| Mesocycle view | Periodized week view with deload week 4 | program data | S |
| Quiz matcher | 3 questions (days, equipment, goal), scored recommendations, EN/FR | settings.myEquipment | S |
| Create Program builder | Day blocks, drag-to-reorder exercises, sets/reps/weight inputs, exercise picker (search, 60 cap), save-as-template, from-template, autofill 75% 1RM, save | `forge-custom-programs`, `forge-templates` | M (drag reorder needs gesture handler) |
| Generators | Pyramid builder, 20-min Express, Dungeon (random 5), Coach (weakest muscles) | logs for coach | S-M |
| Plate calculator | Bar + target weight, greedy plate math, SVG plate diagram, kg/lb | - | S |

### Workout player
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Set logging | Per-set check/fail, editable reps/weight, bodyweight + added kg, set types (Std/Drop/R-P/Clu/Myo), RPE 6-10, "last time" comparison, "beating last time" badge, haptic + flash on log | `forge-log`, `forge-rpe` | L (core screen, many states) |
| Rest timer | SVG ring countdown, auto-rest (30s supersets, per-exercise memory, barbell=long), rotating form cues every 15s, beep + vibration + spoken "Rest over" on finish, mini sticky bar, manual buttons | `settings.autoRest/sound/voiceCues`, `forge-restmem` | M (needs expo-audio, expo-speech) |
| Mid-workout actions | Form guide (steps list), tempo coach, warm-up (ported), form recorder, clips library, superset linking (A1/A2), per-exercise notes | `forge-note-<id>`, `forge-tempo` | M |
| Tempo coach | Eccentric/pause/concentric inputs, phase timer with beep + spoken phase names | `forge-tempo` | S (needs expo-audio/speech) |
| Session flow | Elapsed timer, low-energy banner (drop last exercise), star rating + note, XP/PR/volume celebrations + confetti, text share + PNG share card | `forge-log`, `forge-xp` | M |
| Voice commands | "next set", "start/stop timer", "next exercise" via SpeechRecognition | mic permission | M (needs @react-native-voice/voice) |
| Voice logging | Parses "10 reps 60 kilos" (number words, unit detection) into set inputs | - | M (same module; parsing is pure JS) |
| Travel mode | Equipment-aware exercise swaps mid-workout | settings.myEquipment | S |

### Progress (13 tabs)
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Overview | Stat grid (workouts, streak, sets, volume, recovery, level/XP, freezes, rating, pace), deload banner, 16-week heatmap, tappable session-volume line chart with popups | logs, XP | M |
| History | Reverse-chron log, expandable day detail | logs | S |
| Records | PR timeline (heaviest set per exercise, chronological scan), current records, volume records | logs | M |
| Standards | Est 1RM vs bodyweight, Beginner-Elite segmented bars | logs, measures | S |
| Volume | Sets per muscle, last 28 days, bar list | logs | S |
| Body | Measurement form, weight trend chart, progress photos + compare | `forge-measures`, photos | M |
| Badges | 20 badges grid, earned/locked, celebration modal | `forge-badges` | S |
| Year | Annual review stats | logs | S |
| Board | Monthly XP leaderboard | `forge-xp-log` | S |
| Challenges | 3 progress bars (20t volume/week, 5 sessions/week, 14-day streak) | logs | S |
| Insights | DOTS score, push/pull + quad/ham ratios, movement radar (SVG), plateau detector, correlations, RPE trend (SVG) | logs | M |
| Coach | Q&A answers, mesocycle generator, warm-up calc, WOD timers, virtual meet | logs | M |
| Calendar | Month grid intensity 0-4, tap day for detail (stats, rating, sets) | logs | S-M |
| Charts | Canvas 2D line (volume, weight) with tap tooltips; SVG radar, SVG RPE trend | logs | M (react-native-svg) |

### Recovery, goals, gamification
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Daily check-in modal | Sleep hours, energy 1-5, HRV, water +/-, protein grams, supplement checklist; 7-day history with edit/clear | `forge-checkin`, `forge-water`, `forge-protein`, `forge-supp`, `forge-supp-log` | M |
| Cycle tracking | Phase computation + training tip | `forge-cycle` | S (no UI in web; add small UI or skip) |
| Goal tracker | Exercise PR goals, progress | `forge-goals` | S-M |
| Badges (20) | First/10/50/100 workouts, streaks 7/30/365, bench 100kg, deadlift 140kg, volume sessions, exercise variety, PR counts, early-bird/night-owl/weekend-warrior/perfect-week | logs | S (logic ports directly) |
| XP/level | `level = floor(sqrt(xp/100)) + 1`; awards 2/set, 50/PR, 25 streak, 100 dungeon, 75 meet; streak freezes | `forge-xp`, `forge-xp-log` | S |

### Camera
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Progress photos | Front camera, pose tabs (front/side/back), ghost overlay of last photo, 800px JPEG q0.7, 1.5MB cap | IDB `forge-db`/`photos` | M (expo-camera) |
| Form recorder | Rear camera, MediaRecorder (webm/vp9), 5-min cap, rep counter (tap video), switch camera; clips library with speed controls, delete; auto-fills next set reps | IDB `forge-clips`/`clips` (NOT in backup) | L (expo-camera video + file storage) |
| Mirror mode | Front camera live preview + HUD (exercise, set x of y, rest countdown), "Set done" button drives the player | camera | S-M |

### Data management
| Feature | What it does | Data | Difficulty |
|---|---|---|---|
| Export JSON | `forge-export.json`: favs, log, done, settings, accent (no photos) | - | S (file-system + share) |
| Export CSV | Sets as CSV rows | logs | S |
| Backup | `forge-backup-<date>.json`: every `forge-*` key as raw strings + IDB photos/logs as JSON strings; clips NOT included | all | M |
| Restore | Replaces (not merges) from backup or export format | all | M |
| Reset | Wipes IDB photos/logs + all localStorage (clips survive: bug) | - | S |

### Exercise demos
80 SVG stick-figure movement patterns, 114 exercise mappings, player with play/pause, click-step-to-frame, autoplay, 0.25-2x scrub slider with frame counter. Pure JS + SVG. Difficulty: M (port animation engine to react-native-svg + reanimated).

---

## 2. Port approach per feature

**Already in RN:** tabs/home/exercises/programs/about, exercise detail (steps, cues, mistakes, variations, warm-up generator), OTA updates with foreground check.

| Feature | RN implementation | Class |
|---|---|---|
| Navigation (11 views) | expo-router (have it); views become stacks/tabs/modals | JS-ONLY |
| All list/form UI | RN core components + theme | JS-ONLY |
| Favorites, custom exercises | state + sqlite (section 3) | JS-ONLY |
| Detail additions (similar, swaps, 1RM, progression chart) | RN + react-native-svg for chart | NEEDS NATIVE (svg) |
| Workout player | RN + reanimated; beep via expo-audio, buzz via expo-haptics, voice cues via expo-speech | NEEDS NATIVE (audio, haptics, speech) |
| Rest timer | RN; finish fanfare needs the same three modules | NEEDS NATIVE (same) |
| Tempo coach | RN; phase beeps/speech | NEEDS NATIVE (audio, speech) |
| Charts (line/bar/radar) | react-native-svg, custom components (no chart lib needed; web charts are hand-drawn) | NEEDS NATIVE (svg) |
| Heatmap, calendar | RN Views | JS-ONLY |
| 3D body | expo-gl + three (recommended, section 4) | NEEDS NATIVE (gl) |
| Exercise demos | Port ANIMS data + player to react-native-svg + reanimated; scrub via gesture-handler slider | NEEDS NATIVE (svg) |
| Progress photos | expo-camera (photo), expo-file-system (store), sqlite (metadata) | NEEDS NATIVE (camera, fs) |
| Form recorder | expo-camera video recording; expo-video playback; clips as files + sqlite metadata | NEEDS NATIVE (camera, video, fs) |
| Mirror mode | expo-camera preview only | NEEDS NATIVE (camera) |
| Voice commands + logging | @react-native-voice/voice (native STT) + ported JS parsers | NEEDS NATIVE (voice) |
| TTS voice cues | expo-speech | NEEDS NATIVE (speech) |
| Storage (all) | expo-sqlite (single engine, section 3) | NEEDS NATIVE (sqlite) |
| Backup/export/share files | expo-file-system + expo-sharing | NEEDS NATIVE (fs, sharing) |
| Share workout text | RN core `Share` API | JS-ONLY |
| Share card PNG | react-native-view-shot capture of a card view + expo-sharing | NEEDS NATIVE (view-shot) |
| Copy to clipboard | expo-clipboard | NEEDS NATIVE (clipboard) |
| Drag reorder (builder) | react-native-gesture-handler + reanimated (already have reanimated) | NEEDS NATIVE (gesture-handler) |
| 3D gestures (if native 3D) | react-native-gesture-handler (pan/pinch) driving three camera | NEEDS NATIVE (same) |
| Keep-awake in workouts | expo-keep-awake | NEEDS NATIVE (keep-awake) |
| Badges/XP/streaks/leaderboard | Port logic verbatim; pure JS + sqlite | JS-ONLY |
| Check-in/water/protein/supp | RN forms + sqlite | JS-ONLY |
| Goals, plateau, 1RM, DOTS, ratios | Port math verbatim; pure JS | JS-ONLY |
| Quiz, generators, plate calc | Port logic verbatim; pure JS | JS-ONLY |
| ICS calendar export | Generate .ics text + expo-file-system + expo-sharing | NEEDS NATIVE (fs, sharing) |
| i18n EN/FR | Simple string map (no lib needed) | JS-ONLY |
| Confetti | JS confetti (e.g. react-native-confetti-cannon, pure JS) | JS-ONLY |
| Icons | Port vendored Lucide path map to react-native-svg components (keeps exact icon set) | NEEDS NATIVE (svg) |
| Reminders | Keep in-app banner (JS-ONLY); optional upgrade to expo-notifications (section 7) | JS-ONLY as-is |


---

## 3. Storage audit

### 3a. Everything the web app persists

**IndexedDB** (large/unbounded data):
- DB `forge-db` v1: store `photos` (keyPath `id` autoIncrement; `{id, date, ts, src: jpegDataUrl, pose?}`), store `logs` (keyPath `id` autoIncrement; workout entries).
- DB `forge-clips` v1 (camera.js only): store `clips` (keyPath `id` autoIncrement, index on `exId`; `{id, exId, exName, date, ts, reps, blob: Blob, mime}`). **Not included in backup/restore/reset (gap).**

**localStorage** (all `forge-*` keys; shapes verified):
| Key | Shape |
|---|---|
| `forge-settings` | JSON object over DEFAULT_SETTINGS: units, sound, demoAutoplay, demoSpeed, reduceMotion, myEquipment[], lang, autoRest, restShort (60), restLong (180), voiceCues, reminder, advanced, haptics, bodyFinish |
| `forge-accent` | string, default "volt" |
| `forge-favs` | JSON array of exercise ids |
| `forge-log` | legacy log array (post-v11.66: IDB only, localStorage is fallback) |
| `forge-photos` | legacy photo array (fallback only) |
| `forge-done` | JSON `{programId:dayIdx: [dateStrings]}` |
| `forge-badges` | JSON `{badgeId: earnedTimestamp}` |
| `forge-badges-seen` | string timestamp |
| `forge-active` | string program id |
| `forge-custom-exercises` | JSON array of exercise objects |
| `forge-custom-programs` | JSON array of program objects |
| `forge-templates` | JSON array `{name, exercises[]}` |
| `forge-goals` | JSON array of goal objects |
| `forge-measures` | JSON array of measurement entries |
| `forge-meets` | JSON array (capped at 20) |
| `forge-cycle` | JSON object `{lastStart, length}` |
| `forge-checkin` | JSON `{dateKey: record}` (sleep, energy, HRV) |
| `forge-water` / `forge-protein` | JSON `{dateKey: number}` |
| `forge-supp` | JSON array `{id, name}`; `forge-supp-log`: JSON `{dateKey: [ids]}` |
| `forge-sore` | JSON `{muscleGroup: level}` date-keyed; `forge-pain` legacy (removed) |
| `forge-restmem` | JSON `{exId: seconds}` |
| `forge-tempo` | JSON `{exId: [ecc, pause, con]}` |
| `forge-rpe` | JSON `{dateKey: entries}` |
| `forge-xp` | JSON `{xp, freeze}`; `forge-xp-log`: JSON array of `{date, xp}` |
| `forge-note-<exId>` | one plain-string key per exercise |
| `forge-progress-tab` | string, default "overview" |

**Backup formats:**
- Export (`forge-export.json`): `{favs, log, done, settings, accent, exportedAt}`. Partial: no photos.
- CSV (`forge-export.csv`): `date,exercise,sets,reps,weight` rows.
- Full backup (`forge-backup-<date>.json`): every `forge-*` localStorage key as raw strings + `forge-idb-photos` / `forge-idb-logs` as JSON strings. Clips excluded.
- Restore **replaces** (never merges). Reset wipes IDB photos/logs + all localStorage (clips survive: web bug, do not replicate).

### 3b. RN design (expo-sqlite, single engine)

No AsyncStorage needed; one sqlite database covers everything.

```sql
CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT);       -- all small keys below
CREATE TABLE logs (id INTEGER PRIMARY KEY, date TEXT, ts INTEGER, data TEXT);
CREATE TABLE photos (id INTEGER PRIMARY KEY, date TEXT, ts INTEGER, pose TEXT, src TEXT);
CREATE TABLE clips (id INTEGER PRIMARY KEY, exId TEXT, exName TEXT, date TEXT,
                    ts INTEGER, reps INTEGER, mime TEXT, uri TEXT);  -- video file on disk
```

Key mapping (`forge-*` > `kv.key`): settings, accent, favs, done, badges, badges-seen, active, custom-exercises, custom-programs, templates, goals, measures, meets, cycle, checkin, water, protein, supp, supp-log, sore, restmem, tempo, rpe, xp, xp-log, progress-tab all map 1:1 (strip the `forge-` prefix or keep it; keeping the prefix makes backup import trivial). Per-exercise notes become `kv` rows with key `note:<exId>`. Logs/photos/clips go to their tables. Video blobs are stored as files via expo-file-system (`FileSystem.documentDirectory + 'clips/'`), with only the `uri` in sqlite (better than web, which stores Blobs in IDB).

### 3c. Web backup import: feasible

Yes. The backup JSON is `{key: stringValue}` where every value is a JSON string. Import algorithm: for each key, JSON-parse the string, then route by key: `forge-idb-logs` > `logs` table rows, `forge-idb-photos` > `photos` table rows, everything else > `kv` (keeping the `forge-` prefix preserves round-trip fidelity). The export format (`{favs, log, done, settings, accent}`) maps the same way. Recommend building an "Import web backup" option in the RN restore flow (section 7, open question 2). CSV is one-way (export only), same as web.

---

## 4. The 3D body decision

The signature feature and the highest-risk port. Facts from source: `createBodyViewer` is ~563 lines; ~109 meshes total (~77 clickable muscle meshes across 17 material ids); all `MeshStandardMaterial`; 4 lights, no shadows; custom gesture math (no OrbitControls): tap raycast select, 500ms long-press sheet, eased drag-rotate (yaw/pitch), pinch/wheel zoom (3.6-9.5), eased front/back transitions, idle auto-rotate (paused during transitions); highlight/heat/soreness APIs mutate per-id emissive; RAF loop with ResizeObserver; renderer `antialias: true`, pixelRatio capped at 2. DOM dependencies to replace: container sizing, canvas injection, pointer events, `getBoundingClientRect` for raycast NDC, runtime `CanvasTexture` for the blob shadow (replace with `THREE.DataTexture` from generated pixels), overlay divs (replay label), settings/accent reads.

### Option A: expo-gl + three.js, rendered natively (RECOMMENDED)

- **Effort:** M (1-2 weeks). The ~560 lines of scene construction and highlight/heat/soreness APIs are pure three.js and move almost verbatim (three 0.186 API is compatible: CapsuleGeometry, emissive, LatheGeometry all present). Only ~100-150 lines of DOM glue need RN equivalents: `onLayout` for sizing, react-native-gesture-handler for tap/long-press/drag/pinch driving the same yaw/pitch/dolly math, touch coords for raycast NDC, DataTexture for the shadow.
- **Visual fidelity:** high, with two known deltas to verify: three r152+ color management defaults differ from r147 (may need `THREE.ColorManagement` tuning to match), and MSAA availability differs per device. The finish presets (standard/chrome/xray/matte) are just material params and port directly.
- **Touch performance:** best of the options. Direct GL surface, no compositor overhead, and we can halve the generous sphere segment counts (26x20) for mobile with no visible loss, cutting the ~60-90k tri/frame budget significantly.
- **Maintenance:** one codebase; the 3D JS ships via OTA like everything else once expo-gl is in the build.
- **Risks:** expo-gl is in maintenance mode (still shipped at 57.0.2, verified), and the port needs side-by-side visual verification against the web version before it ships.

### Option B: react-native-webview embedding the existing web 3D code

- **Effort:** S (2-4 days). Bundle three.min.js + a trimmed core.js (3D parts) + an HTML shell as app assets; bridge selection/highlight/soreness/finish via `injectedJavaScript`/`onMessage`.
- **Visual fidelity:** guaranteed parity, since it is literally the same code.
- **Touch performance:** acceptable but capped at what mobile Chrome does today (he already uses the 3D body in mobile Chrome, so parity with today). WebView GL has compositor overhead and less control over MSAA/pixel ratio; gesture math works inside the WebView but nested-scroll and bridge latency add small rough edges.
- **Maintenance:** two paradigms forever; every 3D improvement must be made in web-style code and re-bundled; debugging spans the bridge.
- **Risks:** low implementation risk, moderate long-term drag.

### Recommendation

**Go with A (expo-gl + three.js native).** The port is mostly mechanical because the hard parts are pure three.js, touch feel will be strictly better than the WebView route, and it keeps a single OTA-shippable codebase. Keep B as the fallback: if the native port's visuals do not satisfy side-by-side comparison with the web version, the WebView shell can be built in days from the existing code. Either way the native module (expo-gl or webview) must be in the kitchen-sink build, so no rebuild is risked by deferring the final call until the port is attempted.


---

## 5. Kitchen-sink native module list (one build)

Install everything with `npx expo install` (resolves SDK-compatible versions; never hand-pin). Versions below verified against npm on 2026-10-09 for SDK 57.

**Already in the build:** expo ~57.0.27, expo-router, expo-updates, expo-splash-screen, expo-status-bar, expo-font, expo-constants, expo-linking, expo-symbols, expo-web-browser, @expo/vector-icons, react-native-reanimated 4.5.1, react-native-safe-area-context, react-native-screens.

**To add (all NEEDS NATIVE):**

| Package | Version | For | Permissions / config |
|---|---|---|---|
| expo-sqlite | ~57.0.4 | All storage (section 3) | none |
| expo-camera | ~57.0.6 | Progress photos, form recorder video, mirror mode | CAMERA + RECORD_AUDIO (video); config plugin with permission strings |
| expo-video | ~57.0.5 | Clip playback in library | none |
| expo-file-system | ~57.0.7 | Backup/export/ICS files, clip video files on disk | none (app storage) |
| expo-sharing | ~57.0.22 | Share backup/CSV/ICS/workout card | none |
| expo-speech | ~57.0.3 | TTS voice cues (rest, tempo) | none |
| expo-audio | ~57.0.5 | Beeps (rest timer, tempo) | none |
| expo-haptics | ~57.0.3 | Vibration patterns (set log, timer finish) | none (VIBRATE is normal-level) |
| expo-clipboard | ~57.0.2 | Copy workout summary fallback | none |
| expo-keep-awake | ~57.0.2 | Screen stays on during workouts | none |
| expo-gl | ~57.0.2 | 3D body, native route (section 4) | none |
| three | 0.186.1 (pure JS) | 3D scene (with expo-gl) | none |
| react-native-svg | via expo install (~15.12+) | Charts, demos, ported Lucide icons | none |
| react-native-gesture-handler | via expo install (~2.28+) | Builder drag-reorder, 3D gestures, demo scrub | none |
| react-native-view-shot | via expo install (~4.x) | Workout share card PNG capture | none |
| @react-native-voice/voice | 3.2.4 | Voice commands + voice logging (STT) | RECORD_AUDIO; ships its own Expo config plugin (no custom plugin needed; verified 2026-10-09) |
| expo-notifications | ~57.0.22 | Optional: upgrade reminders to real notifications (section 7) | POST_NOTIFICATIONS; config plugin |

**app.json additions:** `expo-camera` plugin (`cameraPermission`, `microphonePermission` strings), `@react-native-voice/voice` plugin (permission strings; ships with the package), `expo-notifications` plugin if included. No other plugins required.

**Cross-check:** every NEEDS NATIVE item in section 2 is covered above. Deliberately excluded: expo-media-library (web app never writes to the OS gallery), AsyncStorage (expo-sqlite covers all storage), expo-av (dead in SDK 57; expo-audio/expo-video replace it), react-native-webview (only needed if the WebView 3D route is chosen instead of expo-gl; do not include both).

**Note:** adding any native module later forces a rebuild, so when in doubt include it now. The APK will grow (expect ~120-140MB); acceptable for the experiment.

---

## 6. Phased port plan (each phase shippable via OTA)

Assumes the kitchen-sink build from section 5 is cut first.

- **v0.4 (L): Storage + kitchen-sink build.** expo-sqlite schema (section 3b), kv/log/photo/clip data layer, settings screen (18 settings), accent/theme system. Then the EAS native build with every module in section 5. *Dependency: everything below.*
- **v0.5 (M): Library completion.** Favorites, custom exercises, equipment-select + my-equipment filters, detail additions (similar, swaps, est 1RM, progression chart via svg, demo viewer placeholder).
- **v0.6 (L): Workout player core.** Set logging (all set types, RPE, fail, last-time compare), rest timer (audio/haptics/speech), superset linking, notes, elapsed timer, finish flow (rating, XP, PR detection, confetti, text share).
- **v0.7 (M): Workout extras.** Tempo coach, plate calculator, form guide, exercise demos (SVG port), share card PNG, travel mode.
- **v0.8 (L): Progress I.** Overview stats, history, calendar, records/PR timeline, volume tab, body tab (measures + weight chart).
- **v0.9 (M): Progress II.** SVG charts (volume line with tap popups, RPE trend, movement radar), standards, insights (DOTS, ratios, plateaus), year, board, challenges, coach tab.
- **v0.10 (L): 3D body.** Native expo-gl port (section 4A): body map view with modes, detail mini-viewers, soreness mode, settings finish preview, workout replay.
- **v0.11 (M): Recovery + gamification.** Check-in modal, water/protein/supplements, goals, badges grid + celebrations, XP/level UI, leaderboard, home dashboards.
- **v0.12 (M): Programs advanced.** Builder with drag reorder, quiz, pyramid/express/dungeon/coach generators, ICS export, active program flow, mesocycle view.
- **v0.13 (L): Camera.** Progress photos (poses, ghost overlay, compare), form recorder + clips library, mirror mode with HUD.
- **v0.14 (M): Voice.** Voice commands, voice logging, spoken cues (all gated behind mic permission + settings).
- **v0.15 (S): Data portability.** Backup/restore/reset, web-backup import, CSV export, storage meter. Final polish pass.

---

## 7. Open questions (need his decisions)

1. **3D approach:** expo-gl native port (recommended, section 4) vs WebView embedding the existing web code (faster, guaranteed parity). Deferrable until v0.10, but the call shapes that phase.
2. **Web backup import:** build the "import web backup" path (feasible, section 3c)? Recommended yes, so his years of web logs carry over.
3. **Reminders:** keep the in-app banner (faithful port, no new module) or upgrade to real local notifications (expo-notifications is in the kitchen sink either way)?
4. **Voice for v1:** @react-native-voice/voice ships its own config plugin and needs mic permission. Keep voice in v1 or defer to a later version?
5. **French i18n:** port EN+FR now, or English-first with the string map structured for FR later? (Recommend English-first.)
6. **Simplify/drop for v1:** candidates to cut or slim - virtual meet, dungeon generator, WOD timers, challenges board/leaderboard, mesocycle planner UI (cycle tracking has no UI in web either), share-card PNG (text share is enough?).
7. **"Advanced training tools" gate:** keep the web setting that hides travel mode + tempo coach by default?
8. **Photo/video retention:** web clips are excluded from backup and survive reset (arguably a bug). In RN: include clips in backup (large!) or keep web behavior?

---

*End of audit. Next step: his answers to section 7, then v0.4 (storage + kitchen-sink build).*
