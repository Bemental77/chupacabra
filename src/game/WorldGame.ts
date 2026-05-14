const MAX_SPEED = 7.5
const ACCELERATION = 0.9
const DECELERATION = 0.85
const PLAYER_RADIUS = 12

export interface WorldState {
  playerX: number
  playerY: number
  velocityX: number
  velocityY: number
  isPaused: boolean
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface Circle { x: number; y: number; r: number }
export interface ResourceNode { x: number; y: number; r: number; type: number }
export type NPCType = 'blacksmith'
export interface NPC { x: number; y: number; type: NPCType }

export const WORLD_WIDTH = 50000
export const WORLD_HEIGHT = 25000
export const PLAYER_START = { x: 25500, y: 13500 }

const GATE = 70
const WALL = 25

function halfGap(size: number) { return (size - GATE) / 2 }

function makeTownWalls(x: number, y: number, w: number, h: number): Rect[] {
  return [
    { x, y, w: halfGap(w), h: WALL },
    { x: x + halfGap(w) + GATE, y, w: halfGap(w), h: WALL },
    { x, y: y + h - WALL, w: halfGap(w), h: WALL },
    { x: x + halfGap(w) + GATE, y: y + h - WALL, w: halfGap(w), h: WALL },
    { x, y: y + WALL, w: WALL, h: halfGap(h) - WALL },
    { x, y: y + halfGap(h) + GATE, w: WALL, h: halfGap(h) - WALL },
    { x: x + w - WALL, y: y + WALL, w: WALL, h: halfGap(h) - WALL },
    { x: x + w - WALL, y: y + halfGap(h) + GATE, w: WALL, h: halfGap(h) - WALL },
  ]
}

function makeTownBuildings(x: number, y: number, w: number, h: number): Rect[] {
  return [
    { x: x + 50, y: y + 50, w: 100, h: 70 },
    { x: x + 170, y: y + 45, w: 75, h: 95 },
    { x: x + 50, y: y + 140, w: 130, h: 60 },
    { x: x + w - 170, y: y + 50, w: 100, h: 70 },
    { x: x + w - 265, y: y + 45, w: 75, h: 95 },
    { x: x + w - 205, y: y + 140, w: 130, h: 60 },
    { x: x + 50, y: y + h - 140, w: 100, h: 70 },
    { x: x + 170, y: y + h - 160, w: 75, h: 95 },
    { x: x + w - 170, y: y + h - 140, w: 100, h: 70 },
    { x: x + w - 265, y: y + h - 160, w: 75, h: 95 },
    { x: x + w / 2 - 90, y: y + h / 2 - 90, w: 55, h: 55 },
    { x: x + w / 2 + 35, y: y + h / 2 - 90, w: 55, h: 55 },
    { x: x + w / 2 - 90, y: y + h / 2 + 35, w: 55, h: 55 },
    { x: x + w / 2 + 35, y: y + h / 2 + 35, w: 55, h: 55 },
  ]
}

// [x, y, w, h] — spread across the 50000×25000 world
const TOWN_DEFS: [number, number, number, number][] = [
  [1000,  1500,  2100, 2400],   // NW
  [46500, 1500,  2100, 2400],   // NE
  [23500, 11000, 3600, 3000],   // Center (large)
  [1000,  20800, 2100, 2400],   // SW
  [46500, 20800, 2100, 2400],   // SE
  [24500, 500,   1800, 1500],   // North outpost
  [12000, 11000, 2400, 2400],   // Mid-west
  [35000, 11000, 2400, 2400],   // Mid-east
  [12500, 19500, 1800, 1800],   // Lower mid-west
  [35500, 19500, 1800, 1800],   // Lower mid-east
]

export const TOWN_GROUNDS: Rect[] = TOWN_DEFS.map(([x, y, w, h]) => ({ x, y, w, h }))
export const ALL_WALLS: Rect[]    = TOWN_DEFS.flatMap(([x, y, w, h]) => makeTownWalls(x, y, w, h))

// ============================================================================
// Procedural world generation
// ============================================================================
// Per-session seed: read from localStorage on web so the world persists across
// reloads; a "regenerate" call writes a fresh seed and reloads. On native we
// fall back to Math.random per session.

const SEED_STORAGE_KEY = 'chupacabra-world-seed'

function loadSessionSeed(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SEED_STORAGE_KEY)
      if (stored) return (parseInt(stored, 10) | 0) >>> 0
    }
  } catch {}
  const fresh = (Math.random() * 0xffffffff) >>> 0
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SEED_STORAGE_KEY, String(fresh))
    }
  } catch {}
  return fresh
}

export const SESSION_SEED = loadSessionSeed()

export function regenerateWorld(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const fresh = (Math.random() * 0xffffffff) >>> 0
      localStorage.setItem(SEED_STORAGE_KEY, String(fresh))
    }
  } catch {}
  if (typeof window !== 'undefined' && (window as any).location) {
    ;(window as any).location.reload()
  }
}

// --- Random / noise primitives ----------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Spatial hash for Poisson-disc neighbor queries. Keeps generation tractable
// at world scale (otherwise rejection sampling is O(n²)).
class SpatialGrid {
  private cells = new Map<number, number[]>()
  private cellSize: number
  private cols: number
  constructor(cellSize: number, worldW: number) {
    this.cellSize = cellSize
    this.cols = Math.ceil(worldW / cellSize) + 1
  }
  private key(cx: number, cy: number): number {
    return cy * this.cols + cx
  }
  insert(idx: number, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const k = this.key(cx, cy)
    const list = this.cells.get(k)
    if (list) list.push(idx)
    else this.cells.set(k, [idx])
  }
  forEachNear(x: number, y: number, radius: number, fn: (idx: number) => void): void {
    const rc = Math.ceil(radius / this.cellSize)
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    for (let dy = -rc; dy <= rc; dy++) {
      for (let dx = -rc; dx <= rc; dx++) {
        const list = this.cells.get(this.key(cx + dx, cy + dy))
        if (list) for (const idx of list) fn(idx)
      }
    }
  }
}

function hash2(x: number, y: number, seed: number): number {
  let h = seed | 0
  h = Math.imul(h ^ Math.imul(x | 0, 374761393), 1597334677)
  h = Math.imul(h ^ Math.imul(y | 0, 668265263), 1597334677)
  h ^= h >>> 13
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

// --- Constraint helpers -----------------------------------------------------

function isInsideTown(x: number, y: number, padding: number): boolean {
  for (const t of TOWN_GROUNDS) {
    if (
      x > t.x - padding && x < t.x + t.w + padding &&
      y > t.y - padding && y < t.y + t.h + padding
    ) return true
  }
  return false
}

function isNearPlayerStart(x: number, y: number, radius: number): boolean {
  const dx = x - PLAYER_START.x
  const dy = y - PLAYER_START.y
  return dx * dx + dy * dy < radius * radius
}

// --- Curving road generation (Catmull-Rom-ish) ------------------------------
//
// Roads connect specific town pairs. Each road is a polyline with smooth
// perpendicular noise displacement so it reads as a winding dirt track.

export interface RoadPoint { x: number; y: number }
export interface Road { points: RoadPoint[]; width: number }

function townCenter(t: Rect): RoadPoint {
  return { x: t.x + t.w / 2, y: t.y + t.h / 2 }
}

function generateRoads(seed: number): Road[] {
  const rnd = mulberry32(seed)
  const centers = TOWN_GROUNDS.map(townCenter)
  const pairs: [number, number][] = [
    [0, 5], [5, 1], [0, 2], [1, 2], [0, 3], [3, 4], [1, 4], [2, 3], [2, 4],
  ]
  const roads: Road[] = []
  for (const [a, b] of pairs) {
    const A = centers[a], B = centers[b]
    const dx = B.x - A.x, dy = B.y - A.y
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len, py = dx / len

    // Pre-pick wobble amplitudes at evenly-spaced control points along the road.
    const wobbleScale = 250 + rnd() * 400
    const controls = 5
    const wobbles: number[] = [0]
    for (let i = 1; i < controls - 1; i++) wobbles.push((rnd() - 0.5) * wobbleScale)
    wobbles.push(0)

    // Sample the road as ~24 segments. Wobble is smoothly interpolated.
    const segments = 24
    const points: RoadPoint[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const ws = t * (wobbles.length - 1)
      const wi = Math.floor(ws)
      const wt = ws - wi
      const wp = wobbles[wi]
      const wn = wi + 1 < wobbles.length ? wobbles[wi + 1] : 0
      const s = smoothstep(wt)
      const wobble = wp + (wn - wp) * s
      points.push({
        x: A.x + dx * t + px * wobble,
        y: A.y + dy * t + py * wobble,
      })
    }
    roads.push({ points, width: 80 })
  }
  return roads
}

export const MAIN_ROADS: Road[] = generateRoads(SESSION_SEED ^ 0xa1)

function distanceToSegmentSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-6) {
    const ex = px - ax, ey = py - ay
    return ex * ex + ey * ey
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const cx = ax + t * dx
  const cy = ay + t * dy
  const ex = px - cx, ey = py - cy
  return ex * ex + ey * ey
}

function isOnMainRoad(x: number, y: number, padding: number): boolean {
  for (const road of MAIN_ROADS) {
    const limit = road.width / 2 + padding
    const limit2 = limit * limit
    const pts = road.points
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1]
      const minX = Math.min(p1.x, p2.x) - limit
      const maxX = Math.max(p1.x, p2.x) + limit
      const minY = Math.min(p1.y, p2.y) - limit
      const maxY = Math.max(p1.y, p2.y) + limit
      if (x < minX || x > maxX || y < minY || y > maxY) continue
      if (distanceToSegmentSq(x, y, p1.x, p1.y, p2.x, p2.y) < limit2) return true
    }
  }
  return false
}

// --- Terrain (noise field + marching squares) -------------------------------

export const TERRAIN_CELL = 70
export const TERRAIN_COLS = Math.ceil(WORLD_WIDTH / TERRAIN_CELL) + 1
export const TERRAIN_ROWS = Math.ceil(WORLD_HEIGHT / TERRAIN_CELL) + 1
export const TERRAIN_THRESHOLD = 0.56

const NOISE_PERIOD   = 22
const WARP_PERIOD    = 26
const WARP_AMT       = 3.5
const HOLE_PERIOD    = 14
const HOLE_THRESHOLD = 0.74

function buildTerrainField(seed: number): Float32Array {
  const field = new Float32Array(TERRAIN_COLS * TERRAIN_ROWS)
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const wx = c * TERRAIN_CELL
      const wy = r * TERRAIN_CELL
      // Town/spawn clearing only — road carving happens AFTER roads are
      // deflected around the natural terrain.
      if (isInsideTown(wx, wy, 350) || isNearPlayerStart(wx, wy, 500)) {
        field[r * TERRAIN_COLS + c] = 0
        continue
      }
      const wu = c / WARP_PERIOD
      const wv = r / WARP_PERIOD
      const warpX = (valueNoise2(wu,       wv,       seed + 5101) - 0.5) * WARP_AMT
      const warpY = (valueNoise2(wu + 100, wv + 100, seed + 7307) - 0.5) * WARP_AMT
      const n = fbm(c / NOISE_PERIOD + warpX, r / NOISE_PERIOD + warpY, seed, 3)
      const hole = fbm(c / HOLE_PERIOD, r / HOLE_PERIOD, seed + 33333, 3)
      field[r * TERRAIN_COLS + c] = hole > HOLE_THRESHOLD ? 0 : n
    }
  }
  return field
}

export const TERRAIN_FIELD = buildTerrainField(SESSION_SEED ^ 0xb2)

// --- Road deflection: push control points away from rocky terrain ----------
//
// Initial roads are straight-ish curves between towns. Now that we have a
// terrain noise field, push each interior road control point perpendicular to
// the road, away from high-noise (rocky) cells. Smooth the polyline each
// iteration to keep it readable.

function deflectRoadsAroundTerrain(roads: Road[]): void {
  const ITER = 8
  const SAMPLE_EPS = 90
  const PUSH = 70

  for (let iter = 0; iter < ITER; iter++) {
    for (const road of roads) {
      const pts = road.points
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i]
        const n = terrainNoiseAt(p.x, p.y)
        if (n < 0.35) continue
        const gx = terrainNoiseAt(p.x + SAMPLE_EPS, p.y) - terrainNoiseAt(p.x - SAMPLE_EPS, p.y)
        const gy = terrainNoiseAt(p.x, p.y + SAMPLE_EPS) - terrainNoiseAt(p.x, p.y - SAMPLE_EPS)
        const gLen = Math.hypot(gx, gy)
        if (gLen < 0.001) continue
        // Push opposite the gradient — away from higher noise. Strength scales
        // with how deep into terrain we are.
        const strength = PUSH * Math.min(1, (n - 0.35) * 3)
        p.x -= (gx / gLen) * strength
        p.y -= (gy / gLen) * strength
      }
      // Smoothing pass — pull each interior point toward its neighbors' midpoint.
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i]
        const prev = pts[i - 1]
        const next = pts[i + 1]
        const mx = (prev.x + next.x) / 2
        const my = (prev.y + next.y) / 2
        p.x = p.x * 0.7 + mx * 0.3
        p.y = p.y * 0.7 + my * 0.3
      }
    }
  }
}

deflectRoadsAroundTerrain(MAIN_ROADS)

// --- Carve final road paths out of the terrain field -----------------------
// Runs in-place after deflection so the field reflects where the road actually
// ends up. Players walking the road never hit rocky terrain.

function carveRoadsFromField(field: Float32Array): void {
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const wx = c * TERRAIN_CELL
      const wy = r * TERRAIN_CELL
      if (isOnMainRoad(wx, wy, 90)) field[r * TERRAIN_COLS + c] = 0
    }
  }
}

carveRoadsFromField(TERRAIN_FIELD)

export function terrainNoiseAt(x: number, y: number): number {
  const cx = x / TERRAIN_CELL
  const cy = y / TERRAIN_CELL
  const c = Math.floor(cx)
  const r = Math.floor(cy)
  if (c < 0 || r < 0 || c >= TERRAIN_COLS - 1 || r >= TERRAIN_ROWS - 1) return 0
  const fx = cx - c
  const fy = cy - r
  const i = r * TERRAIN_COLS + c
  const tl = TERRAIN_FIELD[i]
  const tr = TERRAIN_FIELD[i + 1]
  const bl = TERRAIN_FIELD[i + TERRAIN_COLS]
  const br = TERRAIN_FIELD[i + TERRAIN_COLS + 1]
  const top = tl + (tr - tl) * fx
  const bot = bl + (br - bl) * fx
  return top + (bot - top) * fy
}

export function isOnTerrain(x: number, y: number): boolean {
  return terrainNoiseAt(x, y) > TERRAIN_THRESHOLD
}

function lerpCross(va: number, vb: number, threshold: number): number {
  if (Math.abs(vb - va) < 1e-9) return 0.5
  const t = (threshold - va) / (vb - va)
  return t < 0 ? 0 : t > 1 ? 1 : t
}

interface Segment { x1: number; y1: number; x2: number; y2: number }

function emitSegments(): Segment[] {
  const segments: Segment[] = []
  const T = TERRAIN_THRESHOLD
  for (let r = 0; r < TERRAIN_ROWS - 1; r++) {
    for (let c = 0; c < TERRAIN_COLS - 1; c++) {
      const i = r * TERRAIN_COLS + c
      const tl = TERRAIN_FIELD[i]
      const tr = TERRAIN_FIELD[i + 1]
      const bl = TERRAIN_FIELD[i + TERRAIN_COLS]
      const br = TERRAIN_FIELD[i + TERRAIN_COLS + 1]
      const code = (tl > T ? 1 : 0) | (tr > T ? 2 : 0) | (br > T ? 4 : 0) | (bl > T ? 8 : 0)
      if (code === 0 || code === 15) continue
      const x0 = c * TERRAIN_CELL, y0 = r * TERRAIN_CELL, cell = TERRAIN_CELL
      const nX = x0 + lerpCross(tl, tr, T) * cell, nY = y0
      const eX = x0 + cell,                          eY = y0 + lerpCross(tr, br, T) * cell
      const sX = x0 + lerpCross(bl, br, T) * cell,  sY = y0 + cell
      const wX = x0,                                 wY = y0 + lerpCross(tl, bl, T) * cell
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

export const TERRAIN_POLYGONS: number[][] = stitchPolygons(emitSegments())

// --- Trees (two-tier Poisson: cluster centers + radial scatter, grass only) -

function generateTrees(seed: number): Circle[] {
  const rnd = mulberry32(seed)
  const trees: Circle[] = []

  // Stage 1: pick cluster centers with a minimum spacing (spatial grid).
  const clusterCenters: { x: number; y: number; size: number }[] = []
  const minClusterDist = 500
  const clusterGrid = new SpatialGrid(minClusterDist, WORLD_WIDTH)
  const clusterTries = 30000
  const targetClusters = 600
  for (let i = 0; i < clusterTries && clusterCenters.length < targetClusters; i++) {
    const cx = 200 + rnd() * (WORLD_WIDTH - 400)
    const cy = 200 + rnd() * (WORLD_HEIGHT - 400)
    if (isInsideTown(cx, cy, 250)) continue
    if (isNearPlayerStart(cx, cy, 400)) continue
    if (isOnMainRoad(cx, cy, 80)) continue
    if (isOnTerrain(cx, cy)) continue
    let tooClose = false
    clusterGrid.forEachNear(cx, cy, minClusterDist, (idx) => {
      if (tooClose) return
      const c = clusterCenters[idx]
      const dx = cx - c.x, dy = cy - c.y
      if (dx * dx + dy * dy < minClusterDist * minClusterDist) tooClose = true
    })
    if (tooClose) continue
    clusterCenters.push({ x: cx, y: cy, size: 130 + rnd() * 200 })
    clusterGrid.insert(clusterCenters.length - 1, cx, cy)
  }

  const treeGrid = new SpatialGrid(80, WORLD_WIDTH)

  // Stage 2: radial scatter inside each cluster.
  for (const cluster of clusterCenters) {
    const count = 6 + Math.floor(rnd() * 18)
    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 6) {
      attempts++
      const angle = rnd() * Math.PI * 2
      const dist = Math.pow(rnd(), 0.5) * cluster.size
      const x = cluster.x + Math.cos(angle) * dist
      const y = cluster.y + Math.sin(angle) * dist
      const radius = 28 + rnd() * 14
      if (x < radius || x > WORLD_WIDTH - radius) continue
      if (y < radius || y > WORLD_HEIGHT - radius) continue
      if (isInsideTown(x, y, 80)) continue
      if (isNearPlayerStart(x, y, 220)) continue
      if (isOnMainRoad(x, y, 40)) continue
      if (isOnTerrain(x, y)) continue
      // Don't sit on another tree (spatial-grid neighbor check)
      let tooClose = false
      treeGrid.forEachNear(x, y, radius + 50, (idx) => {
        if (tooClose) return
        const t = trees[idx]
        const dx = x - t.x, dy = y - t.y
        const min = radius + t.r + 8
        if (dx * dx + dy * dy < min * min) tooClose = true
      })
      if (tooClose) continue
      trees.push({ x, y, r: radius })
      treeGrid.insert(trees.length - 1, x, y)
      placed++
    }
  }
  return trees
}

export const FIELD_TREES: Circle[] = generateTrees(SESSION_SEED ^ 0xc3)

// --- Rocks (Poisson disc, even distribution, grass only) --------------------

function generateRocks(seed: number): Circle[] {
  const rnd = mulberry32(seed)
  const rocks: Circle[] = []
  const minDist = 150
  const minDistSq = minDist * minDist
  const grid = new SpatialGrid(minDist, WORLD_WIDTH)
  const tries = 80000
  const targetCount = 5000
  for (let i = 0; i < tries && rocks.length < targetCount; i++) {
    const x = rnd() * WORLD_WIDTH
    const y = rnd() * WORLD_HEIGHT
    if (isInsideTown(x, y, 60)) continue
    if (isNearPlayerStart(x, y, 220)) continue
    if (isOnMainRoad(x, y, 40)) continue
    if (isOnTerrain(x, y)) continue
    let tooClose = false
    grid.forEachNear(x, y, minDist, (idx) => {
      if (tooClose) return
      const r = rocks[idx]
      const dx = x - r.x, dy = y - r.y
      if (dx * dx + dy * dy < minDistSq) tooClose = true
    })
    if (tooClose) continue
    rocks.push({ x, y, r: 20 + rnd() * 14 })
    grid.insert(rocks.length - 1, x, y)
  }
  return rocks
}

export const FIELD_ROCKS: Circle[] = generateRocks(SESSION_SEED ^ 0xd4)

// --- Buildings inside towns (templated, jittered) ---------------------------

function generateBuildings(seed: number): Rect[] {
  const rnd = mulberry32(seed)
  const buildings: Rect[] = []
  for (const town of TOWN_GROUNDS) {
    const margin = 70
    const streetWidth = 70           // central streets running through the town
    const cx = town.x + town.w / 2
    const cy = town.y + town.h / 2

    // 4 quadrant rects with reserved streets between them.
    const quads: Rect[] = [
      { x: town.x + margin,             y: town.y + margin,             w: cx - town.x - margin - streetWidth / 2, h: cy - town.y - margin - streetWidth / 2 },
      { x: cx + streetWidth / 2,        y: town.y + margin,             w: town.x + town.w - cx - streetWidth / 2 - margin, h: cy - town.y - margin - streetWidth / 2 },
      { x: town.x + margin,             y: cy + streetWidth / 2,        w: cx - town.x - margin - streetWidth / 2, h: town.y + town.h - cy - streetWidth / 2 - margin },
      { x: cx + streetWidth / 2,        y: cy + streetWidth / 2,        w: town.x + town.w - cx - streetWidth / 2 - margin, h: town.y + town.h - cy - streetWidth / 2 - margin },
    ]

    // Per-quadrant placement so buildings don't sit on the streets.
    for (const quad of quads) {
      if (quad.w < 80 || quad.h < 80) continue
      const target = 2 + Math.floor(rnd() * 4)
      const pre = buildings.length
      let placed = 0
      let attempts = 0
      while (placed < target && attempts < 80) {
        attempts++
        // Mix of orientations: 1/3 wide, 1/3 tall, 1/3 square-ish.
        const orient = rnd()
        let w: number, h: number
        if (orient < 0.34) {
          w = 90 + rnd() * 70
          h = 50 + rnd() * 30
        } else if (orient < 0.67) {
          w = 50 + rnd() * 30
          h = 90 + rnd() * 70
        } else {
          w = 60 + rnd() * 40
          h = 60 + rnd() * 40
        }
        if (w >= quad.w - 10 || h >= quad.h - 10) continue
        const x = quad.x + rnd() * (quad.w - w)
        const y = quad.y + rnd() * (quad.h - h)
        let bad = false
        for (const wall of ALL_WALLS) {
          if (
            x < wall.x + wall.w + 8 && x + w > wall.x - 8 &&
            y < wall.y + wall.h + 8 && y + h > wall.y - 8
          ) { bad = true; break }
        }
        if (bad) continue
        for (let i = pre; i < buildings.length; i++) {
          const b = buildings[i]
          if (
            x < b.x + b.w + 18 && x + w > b.x - 18 &&
            y < b.y + b.h + 18 && y + h > b.y - 18
          ) { bad = true; break }
        }
        if (bad) continue
        buildings.push({ x, y, w, h })
        placed++
      }
    }

    // Central plaza: a single larger building or two flanking the center
    // if there's room. (Skipped on small towns where the streets eat the space.)
    if (town.w > 900 && town.h > 700) {
      const plazaW = 70 + rnd() * 30
      const plazaH = 70 + rnd() * 30
      buildings.push({ x: cx - plazaW / 2, y: cy - plazaH / 2, w: plazaW, h: plazaH })
    }
  }
  return buildings
}

export const ALL_BUILDINGS: Rect[] = generateBuildings(SESSION_SEED ^ 0xe5)

// --- Resource nodes (independent scatter, biased toward features) -----------
//
// Resource types:
//   0  berries   (red)        — near trees, occasional in open
//   1  twigs     (brown)      — open grass, scattered
//   2  straw     (yellow)     — open grass
//   3  flowers   (white)      — open grass + clearings
//   4  mushrooms (purple)     — near rocks and forest edges
//   5  wood      (green)      — strongly biased near trees
//   6  stone     (gray)       — strongly biased near rocks

function generateResources(seed: number, trees: Circle[], rocks: Circle[]): ResourceNode[] {
  const rnd = mulberry32(seed)
  const nodes: ResourceNode[] = []
  const minDist = 90
  const minDistSq = minDist * minDist
  const target = 6000
  const maxTries = 80000

  // Build spatial grids for nodes, trees, rocks so per-candidate checks stay O(1).
  const nodeGrid = new SpatialGrid(minDist, WORLD_WIDTH)
  const treeGrid = new SpatialGrid(300, WORLD_WIDTH)
  trees.forEach((t, i) => treeGrid.insert(i, t.x, t.y))
  const rockGrid = new SpatialGrid(280, WORLD_WIDTH)
  rocks.forEach((r, i) => rockGrid.insert(i, r.x, r.y))

  for (let i = 0; i < maxTries && nodes.length < target; i++) {
    const x = rnd() * WORLD_WIDTH
    const y = rnd() * WORLD_HEIGHT
    if (isInsideTown(x, y, 60)) continue
    if (isNearPlayerStart(x, y, 200)) continue
    if (isOnMainRoad(x, y, 40)) continue
    if (isOnTerrain(x, y)) continue
    // Spacing vs. other nodes
    let bad = false
    nodeGrid.forEachNear(x, y, minDist, (idx) => {
      if (bad) return
      const n = nodes[idx]
      const dx = x - n.x, dy = y - n.y
      if (dx * dx + dy * dy < minDistSq) bad = true
    })
    if (bad) continue
    // Stacked-on / proximity to trees
    let nearestTreeSq = Infinity
    treeGrid.forEachNear(x, y, 300, (idx) => {
      if (bad) return
      const t = trees[idx]
      const dx = x - t.x, dy = y - t.y
      const dSq = dx * dx + dy * dy
      if (dSq < (t.r + 26) * (t.r + 26)) { bad = true; return }
      if (dSq < nearestTreeSq) nearestTreeSq = dSq
    })
    if (bad) continue
    // Stacked-on / proximity to rocks
    let nearestRockSq = Infinity
    rockGrid.forEachNear(x, y, 280, (idx) => {
      if (bad) return
      const r = rocks[idx]
      const dx = x - r.x, dy = y - r.y
      const dSq = dx * dx + dy * dy
      if (dSq < (r.r + 24) * (r.r + 24)) { bad = true; return }
      if (dSq < nearestRockSq) nearestRockSq = dSq
    })
    if (bad) continue

    // Type by proximity to features.
    const treeRange = 240
    const rockRange = 220
    let type: number
    const nearTree = nearestTreeSq < treeRange * treeRange
    const nearRock = nearestRockSq < rockRange * rockRange
    if (nearTree && (!nearRock || nearestTreeSq < nearestRockSq)) {
      const roll = rnd()
      if (roll < 0.55) type = 5      // wood
      else if (roll < 0.8) type = 0  // berries
      else type = 3                  // flowers
    } else if (nearRock) {
      const roll = rnd()
      if (roll < 0.65) type = 6      // stone
      else type = 4                  // mushrooms
    } else {
      const roll = rnd()
      if (roll < 0.35) type = 3      // flowers
      else if (roll < 0.65) type = 2 // straw
      else if (roll < 0.85) type = 0 // berries
      else type = 1                  // twigs
    }

    nodes.push({ x, y, r: 24 + rnd() * 6, type })
    nodeGrid.insert(nodes.length - 1, x, y)
  }
  return nodes
}

export const RESOURCE_NODES: ResourceNode[] = generateResources(SESSION_SEED ^ 0xf6, FIELD_TREES, FIELD_ROCKS)

// --- NPCs ---------------------------------------------------------------
// Every town gets a blacksmith placed adjacent to one of its buildings.
// Position deterministic per seed so the smith doesn't move between
// reloads of the same world.

function generateNPCs(seed: number): NPC[] {
  const rnd = mulberry32(seed)
  const npcs: NPC[] = []
  for (const town of TOWN_GROUNDS) {
    const buildingsInTown = ALL_BUILDINGS.filter((b) =>
      b.x >= town.x && b.x + b.w <= town.x + town.w &&
      b.y >= town.y && b.y + b.h <= town.y + town.h
    )
    let nx: number, ny: number
    if (buildingsInTown.length === 0) {
      nx = town.x + town.w / 2
      ny = town.y + town.h / 2
    } else {
      const b = buildingsInTown[Math.floor(rnd() * buildingsInTown.length)]
      // Place the smith just outside one of the building's four sides.
      const side = Math.floor(rnd() * 4)
      const offset = 32
      if (side === 0)      { nx = b.x + b.w / 2; ny = b.y - offset }
      else if (side === 1) { nx = b.x + b.w + offset; ny = b.y + b.h / 2 }
      else if (side === 2) { nx = b.x + b.w / 2; ny = b.y + b.h + offset }
      else                 { nx = b.x - offset; ny = b.y + b.h / 2 }
    }
    npcs.push({ x: nx, y: ny, type: 'blacksmith' })
  }
  return npcs
}

export const NPCS: NPC[] = generateNPCs(SESSION_SEED ^ 0xa7)

export class WorldGame {
  private playerX = PLAYER_START.x
  private playerY = PLAYER_START.y
  private velocityX = 0
  private velocityY = 0
  private isPaused = false

  getState(): WorldState {
    return {
      playerX: this.playerX,
      playerY: this.playerY,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      isPaused: this.isPaused,
    }
  }

  // Push the player out of a circle obstacle (tree/rock) along the surface
  // normal, then remove the velocity component pointing INTO the obstacle so
  // the residual velocity slides along the tangent.
  private resolveCircle(c: Circle): void {
    const dx = this.playerX - c.x
    const dy = this.playerY - c.y
    const minDist = c.r + PLAYER_RADIUS
    const distSq = dx * dx + dy * dy
    if (distSq >= minDist * minDist) return
    const dist = Math.sqrt(distSq) || 0.001
    const nx = dx / dist
    const ny = dy / dist
    this.playerX = c.x + nx * minDist
    this.playerY = c.y + ny * minDist
    const vDotN = this.velocityX * nx + this.velocityY * ny
    if (vDotN < 0) {
      this.velocityX -= vDotN * nx
      this.velocityY -= vDotN * ny
    }
  }

  // Push the player out of an AABB along the shortest-penetration axis. For
  // walls/buildings, axis-aligned separation is what the player expects.
  private resolveRect(r: Rect): void {
    const px = this.playerX
    const py = this.playerY
    const left = r.x - PLAYER_RADIUS
    const right = r.x + r.w + PLAYER_RADIUS
    const top = r.y - PLAYER_RADIUS
    const bottom = r.y + r.h + PLAYER_RADIUS
    if (px <= left || px >= right || py <= top || py >= bottom) return
    const dl = px - left, dr = right - px, dt = py - top, db = bottom - py
    const m = Math.min(dl, dr, dt, db)
    if (m === dl) {
      this.playerX = left
      if (this.velocityX > 0) this.velocityX = 0
    } else if (m === dr) {
      this.playerX = right
      if (this.velocityX < 0) this.velocityX = 0
    } else if (m === dt) {
      this.playerY = top
      if (this.velocityY > 0) this.velocityY = 0
    } else {
      this.playerY = bottom
      if (this.velocityY < 0) this.velocityY = 0
    }
  }

  // Terrain field collision: push the player out along the gradient of the
  // noise field, then tangentialize velocity. The gradient is approximated by
  // central differences. Multiple passes settle the player against curvy
  // terrain edges without ping-ponging.
  private resolveTerrain(): boolean {
    if (terrainNoiseAt(this.playerX, this.playerY) <= TERRAIN_THRESHOLD) return false
    const eps = 4
    const gx = terrainNoiseAt(this.playerX + eps, this.playerY) - terrainNoiseAt(this.playerX - eps, this.playerY)
    const gy = terrainNoiseAt(this.playerX, this.playerY + eps) - terrainNoiseAt(this.playerX, this.playerY - eps)
    const gLen = Math.hypot(gx, gy) || 0.001
    const nx = -gx / gLen
    const ny = -gy / gLen
    this.playerX += nx * 3
    this.playerY += ny * 3
    const vDotN = this.velocityX * nx + this.velocityY * ny
    if (vDotN < 0) {
      this.velocityX -= vDotN * nx
      this.velocityY -= vDotN * ny
    }
    return true
  }

  moveByDelta(dx: number, dy: number, delta: number = 1): WorldState {
    if (this.isPaused) return this.getState()

    if (dx === 0 && dy === 0) {
      this.velocityX *= Math.pow(DECELERATION, delta)
      this.velocityY *= Math.pow(DECELERATION, delta)
      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
        this.velocityX = 0
        this.velocityY = 0
        return this.getState()
      }
    } else {
      this.velocityX += dx * ACCELERATION * delta
      this.velocityY += dy * ACCELERATION * delta
      const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
      if (speed > MAX_SPEED) {
        this.velocityX = (this.velocityX / speed) * MAX_SPEED
        this.velocityY = (this.velocityY / speed) * MAX_SPEED
      }
    }

    // Move first.
    this.playerX += this.velocityX * delta
    this.playerY += this.velocityY * delta

    // World bounds (hard clamp).
    if (this.playerX < PLAYER_RADIUS) { this.playerX = PLAYER_RADIUS; if (this.velocityX < 0) this.velocityX = 0 }
    if (this.playerX > WORLD_WIDTH - PLAYER_RADIUS) { this.playerX = WORLD_WIDTH - PLAYER_RADIUS; if (this.velocityX > 0) this.velocityX = 0 }
    if (this.playerY < PLAYER_RADIUS) { this.playerY = PLAYER_RADIUS; if (this.velocityY < 0) this.velocityY = 0 }
    if (this.playerY > WORLD_HEIGHT - PLAYER_RADIUS) { this.playerY = WORLD_HEIGHT - PLAYER_RADIUS; if (this.velocityY > 0) this.velocityY = 0 }

    // Resolve overlaps. Circles first (push-out + tangent slide), then rects
    // (axis-aligned separation), then terrain (gradient push).
    for (const t of FIELD_TREES) this.resolveCircle(t)
    for (const r of FIELD_ROCKS) this.resolveCircle(r)
    for (const w of ALL_WALLS) this.resolveRect(w)
    for (const b of ALL_BUILDINGS) this.resolveRect(b)
    for (let i = 0; i < 4; i++) {
      if (!this.resolveTerrain()) break
    }

    return this.getState()
  }

  togglePause(): WorldState {
    this.isPaused = !this.isPaused
    return this.getState()
  }

  reset(): WorldState {
    this.playerX = PLAYER_START.x
    this.playerY = PLAYER_START.y
    this.velocityX = 0
    this.velocityY = 0
    this.isPaused = false
    return this.getState()
  }
}
