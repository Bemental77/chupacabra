// Dungeons are generated on the SAME pipeline as the overworld's rocky
// terrain: a per-trial noise field thresholded into rock vs. floor, then
// marching squares + polygon stitching for organic outlines. Player walks a
// cavern of curved rock outcrops, not a tile maze. The cell-aligned wall
// AABBs are kept for collision (rest of the engine is built on rects).
//
// The arena is anchored at a fixed world coord chosen to be outside any town
// or POI. Players are teleported here on `startTrial()`, and back on exit.

import type { Rect } from './WorldGame'

export const ARENA_ORIGIN_X = 43500
export const ARENA_ORIGIN_Y = 13500
// 40 noise-field cells across, ~58 world units per cell → polygons read as
// natural rocky outlines, comparable to the overworld's TERRAIN_POLYGONS.
export const ARENA_FIELD_RES = 40
export const ARENA_CELL = 58
export const ARENA_WIDTH  = ARENA_FIELD_RES * ARENA_CELL
export const ARENA_HEIGHT = ARENA_FIELD_RES * ARENA_CELL
export const ARENA_END_X = ARENA_ORIGIN_X + ARENA_WIDTH
export const ARENA_END_Y = ARENA_ORIGIN_Y + ARENA_HEIGHT

// Tuning for the dungeon field. Higher threshold → more open space. Tuned
// to leave most of the arena traversable; rocks form scattered outcrops
// rather than dense maze walls (so enemies can actually reach the player).
const FIELD_THRESHOLD = 0.62
const NOISE_PERIOD    = 6.5
const WARP_PERIOD     = 9
const WARP_AMT        = 2.4
// Carve a guaranteed clear zone around the spawn so the player never starts
// inside a rock blob.
const SPAWN_CLEAR_RADIUS = 4   // in field cells

// --- Tiny noise utilities (duplicated from WorldGame; small + self-contained)
function hash2(x: number, y: number, seed: number): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 2147483647
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
function smoothstep(t: number): number { return t * t * (3 - 2 * t) }
function valueNoise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const a = hash2(xi,     yi,     seed)
  const b = hash2(xi + 1, yi,     seed)
  const c = hash2(xi,     yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  const u = smoothstep(xf)
  const v = smoothstep(yf)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}
function fbm(x: number, y: number, seed: number, octaves: number): number {
  let total = 0, amp = 1, freq = 1, maxAmp = 0
  for (let i = 0; i < octaves; i++) {
    total += valueNoise2(x * freq, y * freq, seed + i * 1031) * amp
    maxAmp += amp
    amp *= 0.5
    freq *= 2
  }
  return total / maxAmp
}

// --- Marching squares (duplicated from WorldGame; same algorithm) -----------
interface Segment { x1: number; y1: number; x2: number; y2: number }

function lerpCross(va: number, vb: number, threshold: number): number {
  if (Math.abs(vb - va) < 1e-9) return 0.5
  const t = (threshold - va) / (vb - va)
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function emitSegments(field: Float32Array, cols: number, rows: number, cellW: number, originX: number, originY: number, threshold: number): Segment[] {
  const segments: Segment[] = []
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c
      const tl = field[i]
      const tr = field[i + 1]
      const bl = field[i + cols]
      const br = field[i + cols + 1]
      const code = (tl > threshold ? 1 : 0) | (tr > threshold ? 2 : 0) | (br > threshold ? 4 : 0) | (bl > threshold ? 8 : 0)
      if (code === 0 || code === 15) continue
      const x0 = originX + c * cellW, y0 = originY + r * cellW
      const nX = x0 + lerpCross(tl, tr, threshold) * cellW, nY = y0
      const eX = x0 + cellW,                                 eY = y0 + lerpCross(tr, br, threshold) * cellW
      const sX = x0 + lerpCross(bl, br, threshold) * cellW,  sY = y0 + cellW
      const wX = x0,                                          wY = y0 + lerpCross(tl, bl, threshold) * cellW
      switch (code) {
        case 1:  segments.push({ x1: nX, y1: nY, x2: wX, y2: wY }); break
        case 2:  segments.push({ x1: eX, y1: eY, x2: nX, y2: nY }); break
        case 3:  segments.push({ x1: eX, y1: eY, x2: wX, y2: wY }); break
        case 4:  segments.push({ x1: sX, y1: sY, x2: eX, y2: eY }); break
        case 5:
          segments.push({ x1: nX, y1: nY, x2: wX, y2: wY })
          segments.push({ x1: sX, y1: sY, x2: eX, y2: eY })
          break
        case 6:  segments.push({ x1: sX, y1: sY, x2: nX, y2: nY }); break
        case 7:  segments.push({ x1: sX, y1: sY, x2: wX, y2: wY }); break
        case 8:  segments.push({ x1: wX, y1: wY, x2: sX, y2: sY }); break
        case 9:  segments.push({ x1: nX, y1: nY, x2: sX, y2: sY }); break
        case 10:
          segments.push({ x1: eX, y1: eY, x2: nX, y2: nY })
          segments.push({ x1: wX, y1: wY, x2: sX, y2: sY })
          break
        case 11: segments.push({ x1: eX, y1: eY, x2: sX, y2: sY }); break
        case 12: segments.push({ x1: wX, y1: wY, x2: eX, y2: eY }); break
        case 13: segments.push({ x1: nX, y1: nY, x2: eX, y2: eY }); break
        case 14: segments.push({ x1: wX, y1: wY, x2: nX, y2: nY }); break
      }
    }
  }
  return segments
}

function stitchPolygons(segments: Segment[]): number[][] {
  const startKey = (s: Segment) => `${Math.round(s.x1)},${Math.round(s.y1)}`
  const endKey   = (s: Segment) => `${Math.round(s.x2)},${Math.round(s.y2)}`
  const byStart = new Map<string, number[]>()
  segments.forEach((s, i) => {
    const k = startKey(s)
    const list = byStart.get(k)
    if (list) list.push(i)
    else byStart.set(k, [i])
  })
  const used = new Set<number>()
  const polygons: number[][] = []
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue
    const poly: number[] = []
    let cur = i
    let safety = segments.length + 4
    while (!used.has(cur) && safety-- > 0) {
      used.add(cur)
      const s = segments[cur]
      poly.push(s.x1, s.y1)
      const next = byStart.get(endKey(s))
      if (!next) break
      const nextIdx = next.find((idx) => !used.has(idx))
      if (nextIdx === undefined) break
      cur = nextIdx
    }
    if (poly.length >= 6) polygons.push(poly)
  }
  return polygons
}

// --- Dungeon generator ------------------------------------------------------

export interface DungeonLayout {
  walls: Rect[]                       // cell-aligned AABBs for collision
  polygons: number[][]                // organic outlines for rendering
  passableCenters: { x: number; y: number }[]
  entryX: number                      // world-space spawn point
  entryY: number
}

// Build a fresh dungeon per-trial. Seed varies the layout.
export function generateDungeonLayout(seed: number = Date.now() & 0x7fffffff): DungeonLayout {
  const RES = ARENA_FIELD_RES
  const field = new Float32Array(RES * RES)

  // Player spawns at south-center of the arena (a few cells in from the wall
  // edge). Carve a guaranteed clear zone around it.
  const spawnFC = Math.floor(RES / 2)               // field column for spawn
  const spawnFR = RES - 4                            // field row for spawn (a few cells up from the south edge)
  const entryX = ARENA_ORIGIN_X + (spawnFC + 0.5) * ARENA_CELL
  const entryY = ARENA_ORIGIN_Y + (spawnFR + 0.5) * ARENA_CELL

  // Generate the noise field. Warp + fbm matches the overworld's recipe so
  // the rocks read as belonging to the same world.
  for (let r = 0; r < RES; r++) {
    for (let c = 0; c < RES; c++) {
      // Carve the spawn clear zone — force open floor in a small radius.
      const dc = c - spawnFC
      const dr = r - spawnFR
      if (dc * dc + dr * dr <= SPAWN_CLEAR_RADIUS * SPAWN_CLEAR_RADIUS) {
        field[r * RES + c] = 0
        continue
      }
      // Force the outer-most ring of cells to be solid rock — the arena's
      // outer wall. Player can never walk off the edge.
      if (r === 0 || c === 0 || r === RES - 1 || c === RES - 1) {
        field[r * RES + c] = 1
        continue
      }
      const wu = c / WARP_PERIOD
      const wv = r / WARP_PERIOD
      const warpX = (valueNoise2(wu,       wv,       seed + 5101) - 0.5) * WARP_AMT
      const warpY = (valueNoise2(wu + 100, wv + 100, seed + 7307) - 0.5) * WARP_AMT
      const n = fbm(c / NOISE_PERIOD + warpX, r / NOISE_PERIOD + warpY, seed, 3)
      field[r * RES + c] = n
    }
  }

  // Per-cell walls + passable list.
  const walls: Rect[] = []
  const passable: { x: number; y: number }[] = []
  for (let r = 0; r < RES; r++) {
    for (let c = 0; c < RES; c++) {
      const wx = ARENA_ORIGIN_X + c * ARENA_CELL
      const wy = ARENA_ORIGIN_Y + r * ARENA_CELL
      if (field[r * RES + c] > FIELD_THRESHOLD) {
        walls.push({ x: wx, y: wy, w: ARENA_CELL, h: ARENA_CELL })
      } else {
        passable.push({ x: wx + ARENA_CELL / 2, y: wy + ARENA_CELL / 2 })
      }
    }
  }

  // Marching squares → organic polygon outlines.
  const segments = emitSegments(field, RES, RES, ARENA_CELL, ARENA_ORIGIN_X, ARENA_ORIGIN_Y, FIELD_THRESHOLD)
  const polygons = stitchPolygons(segments)

  return { walls, polygons, passableCenters: passable, entryX, entryY }
}

// True if (x, y) is inside the arena rectangle. Used to bound enemy AI and
// rendering culling once an activity is running.
export function isInsideArena(x: number, y: number): boolean {
  return x >= ARENA_ORIGIN_X && x < ARENA_END_X &&
         y >= ARENA_ORIGIN_Y && y < ARENA_END_Y
}
