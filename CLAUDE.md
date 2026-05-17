# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn start            # Expo dev server (press a / i / w to launch platform)
yarn android          # react-native run-android
yarn ios              # react-native run-ios
yarn web              # expo start --web
yarn start --reset-cache   # clear Metro cache when bundles look stale
```

Use **yarn**, not npm — the lockfile is `yarn.lock` and that's the project convention.

There is **no `test` or `lint` script** in `package.json`. `src/__tests__/MazeGame.test.ts` exists but its `setup.ts` imports `@testing-library/jest-dom` / `@testing-library/react-native`, neither of which is installed, and the test mocks its own `MazeGame` class rather than importing the real one. Treat that directory as stale Kotlin-port leftovers.

`.eslintrc.json` is configured but `eslint` itself is not a declared dependency.

## Architecture

### Skia is the renderer on every platform

`App.tsx` boots Skia first: on web it awaits `LoadSkiaWeb()` to fetch the CanvasKit WASM, then mounts `MazeGameScreen`; on native Skia is synchronous so it renders immediately. The whole world is drawn through `@shopify/react-native-skia` — `WorldCanvas.tsx` is the only renderer (no `.web.tsx` split). Static world geometry is pre-recorded once into a Skia `Picture` via `createPicture` and replayed each frame; dynamic things (player, enemies, projectiles, flashes, loot, damage numbers) are drawn imperatively.

### One game, one state contract

`WorldGame.ts` (~3k lines) is the entire game model — physics, combat, AI, loot, progression, activities, NPC interaction, persistence. `MazeGame.ts` + `MazeGenerator.ts` are mostly dead; `MazeGenerator.generateMaze` is only still used by `DungeonGen.ts` for activity arenas. `MazeCanvas.tsx` is dead code. **New features extend `WorldGame`; do not touch `MazeGame`.**

Renderers and UI never call mutating methods directly per-frame except `moveByDelta` — they call action methods (`attack`, `dash`, `ultimate`, `spender`, `castSlot`, `startTrial`, `interactWithNearbyNpc`, …) and read the full `WorldState` returned by `moveByDelta` or `getState`. `WorldState` is the union of everything UI needs in one frame (enemies, projectiles, pending meteors, DoT zones, orbs, flashes, damage numbers, loot, arena walls, inventory, equipped, cooldowns, derived stats, activity state, nearest NPC, …). When adding a new visual effect or stat, the path is: store it in WorldGame internals → expose on WorldState → render in WorldCanvas / Hud.

### `App.tsx` → `MazeGameScreen` → `WorldCanvas` + chrome

`MazeGameScreen` (misleadingly named) owns:
- `gameRef` — the singleton `WorldGame` instance.
- `inputRef = { dx, dy }` — the joystick / WASD vector, written by `FloatingJoystick` and `useDesktopInput`, read inside `WorldCanvas`'s `requestAnimationFrame` loop.
- Modal visibility state (Map, Inventory, Skills, Blacksmith, Personal Bests) and the **pause-snapshot pattern**: opening a modal pauses the game and remembers whether it was already paused; closing restores prior state. Don't unconditionally unpause on close.

`isPaused` is the only React state derived from `WorldGame` that updates synchronously on action. Everything else is polled at 4Hz (`unspentPoints`, activity button labels) — modal screens do their own polling. Do not convert frame-level state into React state.

### Input flow uses refs, not state

`FloatingJoystick.onMove` writes into `inputRef.current`. `useDesktopInput` (web only — `Platform.OS` guarded) attaches `keydown`/`keyup`/`mousedown` to `document` and writes the same ref. WASD/arrows recompute the movement vector on each key event, normalized so diagonals aren't faster. Key bindings live in `useDesktopInput.ts`:

| Action | Key |
|---|---|
| Move | WASD / arrows |
| Attack | F or left-click on canvas |
| Spender (Smash) | Q or right-click on canvas |
| Dash | Space |
| Loadout slots 1–4 | `1`, `2`, `3`, `4` |
| Ultimate | R |
| Pause | Esc or P |
| Map / Bag / Skills / Trial / Talk | M / B / K / T / E |

Mouse handlers filter on `target.tagName === 'CANVAS'` so clicks on ControlPanel buttons don't fire attacks. Reset is deliberately unbound — destructive actions require a chip tap. `blur` clears the keys map so a held W doesn't strand the player.

### `moveByDelta(dx, dy, delta)` — framerate-independent tick

`WorldCanvas`'s rAF loop computes `delta = clamp((now - last) / 16.667, max 3)` and passes it through. Acceleration scales by `delta`; deceleration is `Math.pow(DECELERATION, delta)` so physics matches at any framerate. Anything time-based inside WorldGame uses `Date.now()` directly (cooldown end timestamps, flash TTLs) — those are framerate-free already.

### ARPG systems map (where things live)

- **`Enemy.ts`** — enemy data, tier profiles (normal/elite/champion), all combat tunables (player skills, projectiles, DoTs, orbs, dash, ult), difficulty scaling, damage numbers, flash/projectile/zone types.
- **`Item.ts`** — `Item`, affix system, rarity drop table, `makeRandomItem`, `rerollAffixValue`, rarity colors. Affixes are summed across all equipped items inside `WorldGame`'s derived-stat getters.
- **`SkillTree.ts`** — `SKILL_NODES`, `SkillRanks`, branch gating (`combat` / `survival` / `movement`), XP curve. Each rank's effect is a flat additive applied at the stat-read site, same pipeline as item affixes.
- **`Loadout.ts`** — 4-slot loadout config + `SKILL_META` table (label/color/description for all six skills: smash, lance, fireball, meteor, hailstorm, orbs). Primary / Dash / Ultimate are always-on; the 4 loadout slots are picked from these six. PC hotkeys 1–4 and the ControlPanel cluster both dispatch via `game.castSlot(index)`.
- **`Activity.ts`** — `ActivityState` (`idle` | `running` | `complete`), per-tier scoreboard storage (`chupacabra:scores:<id>:t<tier>`, top 20), sort direction (Trial = lower duration wins, Survival = higher wins).
- **`DungeonGen.ts`** — wraps `MazeGenerator` into AABB walls + passable cell centers anchored at fixed world coords (`ARENA_ORIGIN_X/Y`). Players are teleported in on `startTrial()` and back out via `returnFromActivity()`.

### Persistence: `src/storage/storage.ts`

Platform-aware wrapper around `AsyncStorage` (native) and `localStorage` (web), exposing the same async API on both. All keys are namespaced `chupacabra:*`. Current keys:

- `chupacabra:loadout`, `chupacabra:difficultyTier`, `chupacabra:materials`, `chupacabra:inventory`, `chupacabra:equipped`
- `chupacabra:scores:<activityId>:t<tier>`
- `chupacabra-world-seed` (legacy unprefixed — keep as-is for save compatibility)

All writes are best-effort: a quota error or unavailable storage must not crash the game (the wrappers swallow errors silently). Persisted data must stay JSON-serializable. `MazeGameScreen` hydrates loadout / difficulty / materials / inventory / equipped on mount via `WorldGame.loadStored*` methods.

### World generation is seeded and rebuildable

`SESSION_SEED` is loaded from `localStorage` (or freshly generated and saved) at module load. All world content — roads, terrain noise, trees, rocks, buildings, resource nodes, NPCs — is generated from this seed XOR'd with per-system constants (`SESSION_SEED ^ 0xa1` etc.). `regenerateWorld()` exists for forcing a new seed. World size is 50000×25000 px; player spawns at `(25500, 13500)`.

### Adding a new world element

1. Add or extend a generator in `WorldGame.ts` that produces an exported `const` array (`FIELD_TREES`, `ALL_BUILDINGS`, `NPCS`, …) seeded off `SESSION_SEED`.
2. If solid, add it to `collidesAt` inside `WorldGame`.
3. Render it inside `WorldCanvas.tsx` — either inside the static `createPicture` block (if it never moves) or in the per-frame draw section.
4. Optionally add it to `MapOverlay.tsx` for the map view.

### Theme

`src/theme/Colors.ts` exports `Colors`, `Spacing`, `Typography` for UI chrome (ControlPanel, Hud, modal screens). World scene colors are intentionally hardcoded at the top of `WorldCanvas.tsx` — those are art-direction constants, not theme tokens, and shouldn't be replaced with Colors entries.

## TypeScript / module config notes

- `tsconfig.json` uses `"module": "Node16"` + `"moduleResolution": "node16"` with `"allowImportingTsExtensions": true`. Imports are extensionless; don't add `.ts`/`.tsx` extensions unless you have a reason.
- Path alias `@/*` → `./src/*` is configured but unused — existing code uses relative imports.
- `src/declarations.d.ts` declares `*.png` modules for native bundler imports.
- The 16MB `map.png` at the repo root is unreferenced; the in-repo asset is `src/assets/map.png`.
