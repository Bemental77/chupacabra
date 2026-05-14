# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start            # Expo dev server (press a / i / w to launch platform)
npm run android      # react-native run-android
npm run ios          # react-native run-ios
npm run web          # expo start --web
npm start -- --reset-cache   # clear Metro cache when bundles look stale
```

There is **no `test` or `lint` script** in `package.json`. `src/__tests__/MazeGame.test.ts` exists but its `setup.ts` imports `@testing-library/jest-dom` / `@testing-library/react-native`, neither of which is installed, and the test file mocks its own `MazeGame` class rather than importing the real one. Treat the tests directory as stale leftovers from the Kotlin → RN port — running them requires installing test deps and writing a Jest config first.

`.eslintrc.json` is configured but `eslint` itself is not a declared dependency.

## Architecture

### Two games live in `src/game/`, only one is wired up

- **`WorldGame.ts`** — the active game. Open-world top-down explorer (10000×5000 px world) with continuous joystick movement, velocity/acceleration physics, and AABB/circle collision against static obstacles. The static world (towns, walls, buildings, trees, rocks) is defined as exported `const` arrays at the top of this file and consumed directly by the renderers.
- **`MazeGame.ts` + `MazeGenerator.ts`** — original grid-maze game from the Kotlin port. Still imported only for the `Direction` enum (referenced in `ControlPanel`'s prop types). `MazeCanvas.tsx` is dead code. Don't extend the maze code — new features go on `WorldGame`.

`App.tsx` → `MazeGameScreen` (misleadingly named) → renders `WorldCanvas` + `ControlPanel` + `MapOverlay` against a `WorldGame` instance.

### Input flow uses refs, not state

The screen holds two refs: `gameRef` (the `WorldGame` instance) and `inputRef` (`{ dx, dy }` joystick vector). `ControlPanel.onMoveContinuous` writes into `inputRef.current`; `WorldCanvas`'s `requestAnimationFrame` loop reads it each frame and calls `game.moveByDelta(dx, dy, delta)`. State (`isPaused`) is only used for things that need to trigger re-renders. Don't convert input to React state — it would re-render every frame.

`moveByDelta` takes a `delta` arg (frames-elapsed-since-last-tick, clamped to 3). Acceleration/deceleration are scaled by `delta` and `DECELERATION` is `Math.pow`'d so physics is framerate-independent.

### Platform-specific renderers via `.web.tsx`

Metro/Expo auto-resolves `WorldCanvas.web.tsx` on web and `WorldCanvas.tsx` on native — same exported component, different implementations:

- **Native (`WorldCanvas.tsx`)** — renders every world element as an absolutely-positioned `<View>` inside an `Animated.View` whose `translateX/Y` follow the camera. Uses viewport culling (`CULL_MARGIN = 300`) to skip off-screen elements, and throttles cull-region state updates to once every 150px of camera movement to avoid re-rendering on every frame.
- **Web (`WorldCanvas.web.tsx`)** — pre-renders the entire static world once to an offscreen `<canvas>` (`drawStaticWorld`) then each frame does `clearRect` + `drawImage(offscreen, ox, oy)` + draws the player. Much simpler because canvas doesn't pay React's reconciliation cost.

Both share the same data imported from `WorldGame.ts`, so adding a new obstacle type means: (1) export an array from `WorldGame.ts`, (2) add it to `collidesAt`, (3) render it in **both** `WorldCanvas.tsx` and `WorldCanvas.web.tsx`, (4) optionally add it to `MapOverlay.tsx`. The `MAIN_ROADS` and `TRAILS` arrays are currently duplicated between `WorldCanvas.tsx`, `WorldCanvas.web.tsx`, and `MapOverlay.tsx` — keep them in sync.

### Confirmed-working WorldCanvas pattern

(From prior session memory.) The native `WorldCanvas` pattern is: `useRef` for `Animated.Value`s, inline static elements inside the animated transform wrapper, viewport-based culling with throttled state updates. Pixel/PNG asset loading must be guarded by a `Platform.OS` check — the web renderer does not handle native `require('./foo.png')` the same way. The 16MB `map.png` at the repo root is currently unreferenced.

### Theme

`src/theme/Colors.ts` exports `Colors`, `Spacing`, `Typography` for UI chrome (ControlPanel, etc.). World rendering uses its own hardcoded color constants at the top of each canvas file — those are scene colors, not theme tokens, and intentionally not pulled from `Colors`.

## TypeScript / module config notes

- `tsconfig.json` uses `"module": "Node16"` + `"moduleResolution": "node16"` and `"allowImportingTsExtensions": true`. Imports in this repo are extensionless and work fine; don't add `.ts`/`.tsx` extensions to imports unless you have a reason.
- Path alias `@/*` → `./src/*` is configured but unused — existing code uses relative imports.
- `src/declarations.d.ts` declares `*.png` modules for native bundler imports.
