import {
  Enemy,
  EnemyTier,
  AttackFlash,
  BeamFlash,
  Projectile,
  PendingMeteor,
  DotZone,
  OrbState,
  DamageNumber,
  DamageNumberKind,
  makeEnemy,
  ENEMY_SPEED,
  ENEMY_AGGRO_RADIUS,
  ENEMY_ATTACK_RADIUS,
  ENEMY_ATTACK_COOLDOWN_MS,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_WINDUP_MS,
  VULNERABLE_MS,
  VULNERABLE_DAMAGE_MULT,
  DAMAGE_NUMBER_TTL_MS,
  DASH_IMPULSE,
  DASH_DURATION_MS,
  DASH_INVULN_MS,
  DASH_COOLDOWN_MS,
  DASH_HIT_SLOP,
  ULT_RADIUS,
  ULT_DAMAGE,
  ULT_COOLDOWN_MS,
  ULT_FLASH_MS,
  LANCE_LENGTH,
  LANCE_WIDTH,
  LANCE_COST,
  LANCE_COOLDOWN_MS,
  LANCE_DAMAGE_MULT,
  LANCE_FLASH_MS,
  FIREBALL_COST,
  FIREBALL_COOLDOWN_MS,
  FIREBALL_SPEED,
  FIREBALL_RANGE_SQ,
  FIREBALL_EXPLOSION_RADIUS,
  FIREBALL_DAMAGE_MULT,
  FIREBALL_BODY_RADIUS,
  FIREBALL_FLASH_MS,
  METEOR_COST,
  METEOR_COOLDOWN_MS,
  METEOR_WINDUP_MS,
  METEOR_RADIUS,
  METEOR_DAMAGE_MULT,
  METEOR_FLASH_MS,
  METEOR_TARGET_RANGE,
  METEOR_FALLBACK_DIST,
  HAIL_COOLDOWN_MS,
  HAIL_DURATION_MS,
  HAIL_TICK_INTERVAL_MS,
  HAIL_DAMAGE_MULT,
  HAIL_RADIUS,
  HAIL_TARGET_RANGE,
  HAIL_FALLBACK_DIST,
  ORBS_COUNT_BASE,
  ORBS_COOLDOWN_MS,
  ORBS_DURATION_MS,
  ORB_RADIUS,
  ORBS_ORBIT_RADIUS,
  ORBS_ANGULAR_SPEED,
  ORBS_HIT_COOLDOWN_MS,
  ORBS_DAMAGE_MULT,
  TIER_PROFILES,
  MAX_DIFFICULTY_TIER,
  difficultyHpMult,
  difficultyDamageMult,
} from './Enemy'
import {
  Item,
  ItemSlot,
  AffixKind,
  Rarity,
  LootDrop,
  PickupToast,
  PICKUP_TOAST_TTL_MS,
  LOOT_DROP_CHANCE,
  makeRandomItem,
  rerollAffixValue,
} from './Item'
import {
  SKILL_NODES,
  SkillRanks,
  totalRankEffect,
  xpRequiredForLevel,
  canPurchase,
  XP_PER_KILL,
} from './SkillTree'
import {
  ActivityState,
  saveScore,
  formatDuration,
} from './Activity'
import {
  Loadout,
  SkillId,
  DEFAULT_LOADOUT,
  LOADOUT_STORAGE_KEY,
} from './Loadout'
import { storage } from '../storage/storage'
import {
  generateDungeonLayout,
  ARENA_ORIGIN_X,
  ARENA_ORIGIN_Y,
  ARENA_END_X,
  ARENA_END_Y,
} from './DungeonGen'

export interface EquippedSlots {
  weapon: Item | null
  armor: Item | null
  ring: Item | null
}

const MAX_SPEED = 7.5
const ACCELERATION = 0.9
const DECELERATION = 0.85
const PLAYER_RADIUS = 12

// Player combat tunables. Damage is dealt as an instant AoE circle on tap.
const PLAYER_MAX_HP = 100
const PLAYER_ATTACK_RADIUS = 80
const PLAYER_ATTACK_DAMAGE = 14
const PLAYER_ATTACK_COOLDOWN_MS = 400
const PLAYER_ATTACK_FLASH_MS = 150
const PLAYER_RESPAWN_DELAY_MS = 1500
// Enemies outside this distance from the player don't tick (perf).
const ENEMY_TICK_RANGE = 1800
const ENEMY_TICK_RANGE_SQ = ENEMY_TICK_RANGE * ENEMY_TICK_RANGE
// Player auto-vacuums any loot drop closer than this.
const LOOT_PICKUP_RADIUS = 42
const LOOT_PICKUP_RADIUS_SQ = LOOT_PICKUP_RADIUS * LOOT_PICKUP_RADIUS

// Vigor — single-resource economy. Basic attack hits generate, spender consumes.
const PLAYER_MAX_VIGOR = 100
const VIGOR_PER_HIT    = 6
const SPENDER_COST     = 40
const SPENDER_RADIUS   = 130
const SPENDER_DAMAGE_MULT = 1.6
const SPENDER_COOLDOWN_MS = 350
const SPENDER_FLASH_MS    = 220

// Crit baseline. Skill nodes layer onto these via SkillTree effects.
const BASE_CRIT_CHANCE_PCT = 5     // 5% baseline
const BASE_CRIT_DAMAGE_PCT = 50    // +50% damage on crit (1.5x)

// Activity tuning for the Trial.
const TRIAL_ENEMY_COUNT = 8
const TRIAL_TIER: EnemyTier = 'elite'

// Survival Arena tuning. Enemies arrive in waves at a cadence that tightens
// over time — by ~60s waves are coming twice as fast as the opener.
const SURVIVAL_ARENA_X = 43500
const SURVIVAL_ARENA_Y = 13500
const SURVIVAL_ARENA_RADIUS = 600        // spawn ring distance from arena center
const SURVIVAL_OPENING_COUNT = 3         // enemies spawned the instant survival starts
const SURVIVAL_FIRST_WAVE_DELAY = 4000   // ms until the next wave after spawn
const SURVIVAL_MIN_WAVE_INTERVAL = 1500  // floor — waves never get faster than this
const SURVIVAL_WAVE_INTERVAL_DECAY = 80  // ms shaved off the next interval each wave
const SURVIVAL_WAVE_SIZE = 2             // enemies per wave
const DIFFICULTY_TIER_STORAGE_KEY = 'chupacabra:difficultyTier'
const MATERIALS_STORAGE_KEY = 'chupacabra:materials'
const INVENTORY_STORAGE_KEY = 'chupacabra:inventory'
const EQUIPPED_STORAGE_KEY  = 'chupacabra:equipped'

// Player can interact with an NPC when within this distance. Matches the
// player+NPC body radii plus a comfortable touch slop.
const NPC_INTERACT_RADIUS = 70
const NPC_INTERACT_RADIUS_SQ = NPC_INTERACT_RADIUS * NPC_INTERACT_RADIUS

// Salvage payouts — value per item by rarity. Tuned so a stack of trash
// commons is worth grinding through but rare/legendary salvage is the
// "cleared out by accident" backstop, not a primary mat source.
const SALVAGE_VALUE: Record<Rarity, number> = {
  common: 1,
  magic: 2,
  rare: 4,
  legendary: 10,
}

// Tempering cost — material price to reroll one random affix value on an
// item. Higher rarities cost more because they have more affixes (more
// upside per reroll) and tighter value spreads at the high end.
const TEMPER_COST: Record<Rarity, number> = {
  common: 3,
  magic: 5,
  rare: 8,
  legendary: 15,
}

// Hit-stop window — when the player lands a crit or fires the ultimate,
// world simulation slows by this factor for this many ms, selling impact
// without halting input.
const HITSTOP_CRIT_MS = 55
const HITSTOP_ULT_MS = 110
const HITSTOP_SCALE = 0.18

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
}

export interface WorldState {
  playerX: number
  playerY: number
  velocityX: number
  velocityY: number
  isPaused: boolean
  playerHp: number
  playerMaxHp: number
  isDead: boolean
  enemies: readonly Enemy[]
  // Multiple flashes can coexist now — meteor wind-up + impact, stacked lances,
  // etc. WorldCanvas maps over the array.
  activeFlashes: readonly AttackFlash[]
  beamFlashes: readonly BeamFlash[]
  damageNumbers: readonly DamageNumber[]
  // ID of the auto-target enemy this frame, or null if none in range. The HUD
  // reticle finds the enemy with this id and draws around it.
  targetEnemyId: number | null
  // Cooldown end timestamps (Date.now() ms). UI subtracts now to display remaining time.
  attackCooldownEndsAt: number
  dashCooldownEndsAt: number
  ultimateCooldownEndsAt: number
  attackCooldownMs: number
  dashCooldownMs: number
  ultimateCooldownMs: number
  loot: readonly LootDrop[]
  inventory: readonly Item[]
  pickupToasts: readonly PickupToast[]
  equipped: EquippedSlots
  // Derived stats — UI uses these for tooltips / max-HP display.
  attackDamage: number
  maxSpeed: number
  // Progression
  level: number
  xp: number
  xpToNext: number
  skillPoints: number
  skillRanks: SkillRanks
  // Level-up event timestamp — HUD watches for changes to fire its ceremony anim.
  lastLevelUpAt: number
  // Phase 5 — resource economy.
  vigor: number
  maxVigor: number
  spenderCooldownEndsAt: number
  spenderCooldownMs: number
  // Phase 5 — crit stats (display).
  critChancePct: number
  critDamagePct: number
  // Phase 4 — activity / dungeon.
  activityState: ActivityState
  arenaWalls: readonly Rect[]
  // Lance cooldown (other new-skill CDs will join here).
  lanceCooldownEndsAt: number
  lanceCooldownMs: number
  lanceCost: number
  // Fireball
  fireballCooldownEndsAt: number
  fireballCooldownMs: number
  fireballCost: number
  projectiles: readonly Projectile[]
  // Meteor
  meteorCooldownEndsAt: number
  meteorCooldownMs: number
  meteorCost: number
  pendingMeteors: readonly PendingMeteor[]
  // Hailstorm — free, long CD, persistent zone.
  hailCooldownEndsAt: number
  hailCooldownMs: number
  dotZones: readonly DotZone[]
  // Orbs — free, long CD, player-orbiting cluster.
  orbsCooldownEndsAt: number
  orbsCooldownMs: number
  // Derived per-frame positions for the canvas to render directly.
  orbs: readonly { x: number; y: number; r: number }[]
  // 4-slot loadout — ControlPanel renders only these skill ids in the cluster.
  loadout: Loadout
  // Difficulty tier — clamps to [1, MAX_DIFFICULTY_TIER], scales Trial enemy
  // HP/damage, scoreboards key off it.
  difficultyTier: number
  maxDifficultyTier: number
  // Salvage materials currency.
  materials: number
  // Nearest interactable NPC within INTERACT_RADIUS, recomputed each tick.
  // null when nothing is in range. The HUD shows a contextual prompt and the
  // PC E key / mobile Talk button dispatches to its screen.
  nearestNpc: NPC | null
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

// --- Enemies ---------------------------------------------------------------
// Procedurally scattered like rocks/resources, but density is biased upward
// with distance from PLAYER_START so the area around spawn is safe and the
// wilderness is dangerous. Avoid towns, roads, terrain, and player start.

// Module-level counter so IDs are assigned at world generation, then WorldGame
// instances seed `nextEnemyId` from this high-water mark.
let _initialEnemyIdCursor = 0

function generateInitialEnemies(seed: number): Enemy[] {
  const rnd = mulberry32(seed)
  const enemies: Enemy[] = []
  const minDist = 220
  const minDistSq = minDist * minDist
  const grid = new SpatialGrid(minDist, WORLD_WIDTH)
  const tries = 40000
  const target = 400
  // Distance from PLAYER_START at which density saturates.
  const FULL_DENSITY_DIST = 9000
  for (let i = 0; i < tries && enemies.length < target; i++) {
    const x = rnd() * WORLD_WIDTH
    const y = rnd() * WORLD_HEIGHT
    if (isInsideTown(x, y, 200)) continue
    if (isNearPlayerStart(x, y, 900)) continue
    if (isOnMainRoad(x, y, 60)) continue
    if (isOnTerrain(x, y)) continue
    const dx0 = x - PLAYER_START.x
    const dy0 = y - PLAYER_START.y
    const distFromStart = Math.hypot(dx0, dy0)
    const densityFactor = Math.min(1, distFromStart / FULL_DENSITY_DIST)
    if (rnd() > densityFactor) continue
    let tooClose = false
    grid.forEachNear(x, y, minDist, (idx) => {
      if (tooClose) return
      const e = enemies[idx]
      const dx = x - e.x, dy = y - e.y
      if (dx * dx + dy * dy < minDistSq) tooClose = true
    })
    if (tooClose) continue
    // Tier distribution: most enemies are normal, a small fraction are elite,
    // and a rare few are champion. Far-out enemies skew slightly harder.
    const eliteRoll = rnd()
    const champRoll = rnd()
    const distBoost = Math.min(1, distFromStart / FULL_DENSITY_DIST)
    let tier: EnemyTier = 'normal'
    if (champRoll < 0.02 + 0.01 * distBoost) tier = 'champion'
    else if (eliteRoll < 0.10 + 0.05 * distBoost) tier = 'elite'
    enemies.push(makeEnemy(++_initialEnemyIdCursor, x, y, tier))
    grid.insert(enemies.length - 1, x, y)
  }
  return enemies
}

const INITIAL_ENEMIES: Enemy[] = generateInitialEnemies(SESSION_SEED ^ 0xb8)

// Helper: would a circle of `radius` at (x, y) collide with any static obstacle?
// Used by enemy movement; kept independent of WorldGame's player-resolution
// pipeline so enemies don't perturb player state.
function isCircleBlocked(x: number, y: number, radius: number): boolean {
  if (x < radius || x > WORLD_WIDTH - radius) return true
  if (y < radius || y > WORLD_HEIGHT - radius) return true
  for (const t of FIELD_TREES) {
    const dx = x - t.x, dy = y - t.y
    const min = radius + t.r
    if (dx * dx + dy * dy < min * min) return true
  }
  for (const r of FIELD_ROCKS) {
    const dx = x - r.x, dy = y - r.y
    const min = radius + r.r
    if (dx * dx + dy * dy < min * min) return true
  }
  for (const w of ALL_WALLS) {
    if (
      x + radius > w.x && x - radius < w.x + w.w &&
      y + radius > w.y && y - radius < w.y + w.h
    ) return true
  }
  for (const b of ALL_BUILDINGS) {
    if (
      x + radius > b.x && x - radius < b.x + b.w &&
      y + radius > b.y && y - radius < b.y + b.h
    ) return true
  }
  if (terrainNoiseAt(x, y) > TERRAIN_THRESHOLD) return true
  return false
}

export class WorldGame {
  private playerX = PLAYER_START.x
  private playerY = PLAYER_START.y
  private velocityX = 0
  private velocityY = 0
  private isPaused = false

  private playerHp = PLAYER_MAX_HP
  private isDead = false
  private deathAt = 0
  private playerAttackCooldownEndsAt = 0
  private activeFlashes: AttackFlash[] = []
  private beamFlashes: BeamFlash[] = []
  private damageNumbers: DamageNumber[] = []
  private nextDamageNumberId = 1
  // Multi-hit skill scratch space — cleared at the start of each new cast so
  // a single dash doesn't damage the same enemy twice.
  private dashHitIds: Set<number> = new Set()
  // Auto-target system — recomputed every tick from facing + nearest-in-cone.
  // Exposed in state so the canvas can draw a reticle around the target.
  private targetEnemyId: number | null = null
  // Stable Enemy.id source. INITIAL_ENEMIES were assigned IDs at module load;
  // WorldGame picks up after that high-water mark so trial-spawned enemies
  // never collide with overworld ones.
  private nextEnemyId = _initialEnemyIdCursor + 1
  private lanceCooldownEndsAt = 0

  private projectiles: Projectile[] = []
  private nextProjectileId = 1
  private fireballCooldownEndsAt = 0

  private pendingMeteors: PendingMeteor[] = []
  private nextMeteorId = 1
  private meteorCooldownEndsAt = 0

  private dotZones: DotZone[] = []
  private nextDotZoneId = 1
  private hailCooldownEndsAt = 0

  private orbs: OrbState[] = []
  private orbsAngle = 0
  private orbsExpireAt = 0
  private orbsCooldownEndsAt = 0
  private nextOrbId = 1
  // Parallel to `orbs[]` — each entry is one orb's per-enemy hit-cooldown map.
  // Cleared wholesale when the orb burst expires; entries clear naturally as
  // dead enemies are compacted out of `enemies`.
  private orbHitMaps: Map<number, number>[] = []

  // Loadout — mutable copy of DEFAULT_LOADOUT so per-instance edits don't
  // mutate the module-level default. `loadStoredLoadout()` overwrites this
  // asynchronously from AsyncStorage/localStorage on app boot.
  private loadout: Loadout = { slots: [...DEFAULT_LOADOUT.slots] }

  // Difficulty tier — affects Trial enemy HP/damage. Overworld enemies are
  // unchanged (always tier-1 vibes), so the difficulty knob only applies to
  // scored runs. Persists across sessions.
  private difficultyTier = 1

  // Materials currency — earned by salvaging items at a blacksmith. Future
  // crafting/tempering will spend these. Persisted across sessions.
  private materials = 0

  // Hit-stop — when set in the future, world simulation runs at HITSTOP_SCALE
  // until `now >= hitStopUntil`. Damage numbers, cooldowns, and flashes use
  // wall-clock so they're naturally unaffected.
  private hitStopUntil = 0

  // Cached nearest interactable NPC — recomputed each tick from player pos.
  private nearestNpc: NPC | null = null

  // Survival wave-spawner state. Only meaningful while a survival activity
  // is running; reset on activity start/end.
  private nextSurvivalWaveAt = 0
  private survivalWaveInterval = SURVIVAL_FIRST_WAVE_DELAY

  // Last non-zero unit vector seen from input or velocity; used to give dash a
  // direction when the joystick is neutral at trigger time. Defaults to +x.
  private facingX = 1
  private facingY = 0
  private dashEndsAt = 0
  private dashCooldownEndsAt = 0
  private invulnerableUntil = 0
  private ultimateCooldownEndsAt = 0

  // Loot lying on the ground awaiting pickup; cleared when the player walks
  // close enough. Inventory accumulates pickups for the (not-yet-built) UI.
  private loot: LootDrop[] = []
  private inventory: Item[] = []
  private pickupToasts: PickupToast[] = []
  private equipped: EquippedSlots = { weapon: null, armor: null, ring: null }
  private nextItemId = 1
  private nextLootId = 1
  private nextToastId = 1

  // Progression. Rank map is sparse — absent key means rank 0.
  private level = 1
  private xp = 0
  private skillPoints = 0
  private skillRanks: SkillRanks = {}
  private lastLevelUpAt = 0
  // Real-time accumulator for HP regen so passive heal rate is independent of
  // framerate. Reset when regen is enabled or after death.
  private nextRegenTickAt = 0

  private vigor = 0
  private spenderCooldownEndsAt = 0

  private activityState: ActivityState = { kind: 'idle' }
  private arenaWalls: Rect[] = []

  // Sum an affix value across every currently-equipped item. Cheap — 3 slots,
  // at most 4 affixes each. Called from the derived-stat getters below.
  private sumAffix(kind: AffixKind): number {
    let total = 0
    const slots: ItemSlot[] = ['weapon', 'armor', 'ring']
    for (const slot of slots) {
      const item = this.equipped[slot]
      if (!item) continue
      for (const a of item.affixes) {
        if (a.kind === kind) total += a.value
      }
    }
    return total
  }

  // Derived stats — read at use sites so equipping/unequipping/skill purchase
  // takes effect on the very next tick without a separate "recompute" step.
  private getMaxHp(): number {
    return PLAYER_MAX_HP
      + this.sumAffix('maxHp')
      + totalRankEffect(this.skillRanks, 'maxHp')
  }
  private getAttackDamage(): number {
    return PLAYER_ATTACK_DAMAGE
      + this.sumAffix('damage')
      + totalRankEffect(this.skillRanks, 'damage')
  }
  private getUltimateDamage(): number {
    return ULT_DAMAGE
      + this.sumAffix('damage') * 3
      + totalRankEffect(this.skillRanks, 'damage') * 3
  }
  private getMaxSpeed(): number {
    const pct = this.sumAffix('moveSpeedPct')
      + totalRankEffect(this.skillRanks, 'moveSpeedPct')
    return MAX_SPEED * (1 + pct / 100)
  }
  private getAttackCooldownMs(): number {
    return Math.max(80,
      PLAYER_ATTACK_COOLDOWN_MS
      - this.sumAffix('attackCdMsReduction')
      - totalRankEffect(this.skillRanks, 'attackCdMsReduction'))
  }
  private getDashCooldownMs(): number {
    return Math.max(200,
      DASH_COOLDOWN_MS
      - this.sumAffix('dashCdMsReduction')
      - totalRankEffect(this.skillRanks, 'dashCdMsReduction'))
  }
  private getUltimateCooldownMs(): number {
    return Math.max(1500, ULT_COOLDOWN_MS - totalRankEffect(this.skillRanks, 'ultCdMsReduction'))
  }
  private getCritChancePct(): number {
    return BASE_CRIT_CHANCE_PCT
      + this.sumAffix('critChancePct')
      + totalRankEffect(this.skillRanks, 'critChancePct')
  }
  private getCritDamagePct(): number {
    return BASE_CRIT_DAMAGE_PCT
      + this.sumAffix('critDamagePct')
      + totalRankEffect(this.skillRanks, 'critDamagePct')
  }
  private getHpRegenPerSec(): number {
    return this.sumAffix('hpRegenPerSec')
      + totalRankEffect(this.skillRanks, 'hpRegenPerSec')
  }
  private getLanceCooldownMs(): number {
    return Math.max(120, LANCE_COOLDOWN_MS - totalRankEffect(this.skillRanks, 'lanceCdMsReduction'))
  }
  private getLanceDamage(): number {
    const bonusPct = totalRankEffect(this.skillRanks, 'lanceDamagePct')
    return this.getAttackDamage() * LANCE_DAMAGE_MULT * (1 + bonusPct / 100)
  }
  private getDashDamagePct(): number {
    return totalRankEffect(this.skillRanks, 'dashDamagePct')
  }
  private getFireballCooldownMs(): number {
    return Math.max(120, FIREBALL_COOLDOWN_MS - totalRankEffect(this.skillRanks, 'fireballCdMsReduction'))
  }
  private getFireballDamage(): number {
    const bonus = totalRankEffect(this.skillRanks, 'fireballDamagePct')
    return this.getAttackDamage() * FIREBALL_DAMAGE_MULT * (1 + bonus / 100)
  }
  private getMeteorWindupMs(): number {
    return Math.max(120, METEOR_WINDUP_MS - totalRankEffect(this.skillRanks, 'meteorWindupMsReduction'))
  }
  private getMeteorRadius(): number {
    return METEOR_RADIUS + totalRankEffect(this.skillRanks, 'meteorRadiusBonus')
  }
  private getMeteorDamage(): number {
    return this.getAttackDamage() * METEOR_DAMAGE_MULT
  }
  private getHailRadius(): number {
    return HAIL_RADIUS + totalRankEffect(this.skillRanks, 'hailRadiusBonus')
  }
  private getHailDurationMs(): number {
    return HAIL_DURATION_MS + totalRankEffect(this.skillRanks, 'hailDurationMs')
  }
  private getHailDamage(): number {
    return this.getAttackDamage() * HAIL_DAMAGE_MULT
  }
  private getOrbsCount(): number {
    return ORBS_COUNT_BASE + totalRankEffect(this.skillRanks, 'orbsCountBonus')
  }
  private getOrbsDurationMs(): number {
    return ORBS_DURATION_MS + totalRankEffect(this.skillRanks, 'orbsDurationMs')
  }
  private getOrbDamage(): number {
    return this.getAttackDamage() * ORBS_DAMAGE_MULT
  }

  // ---- Activity (Phase 4) -----------------------------------------------

  // Start the Trial: stash the player's overworld coords, generate a fresh
  // maze, teleport into it, and spawn elites in random passable cells.
  startTrial(): WorldState {
    if (this.activityState.kind === 'running') return this.getState()
    if (this.isDead) return this.getState()
    const seed = Date.now() & 0x7fffffff
    const layout = generateDungeonLayout()
    this.arenaWalls = layout.walls
    // Pick spawn cells far enough from the entry to give the player a beat.
    const minSpawnDistSq = 200 * 200
    const candidates = layout.passableCenters.filter((p) => {
      const dx = p.x - layout.entryX
      const dy = p.y - layout.entryY
      return dx * dx + dy * dy > minSpawnDistSq
    })
    // Fisher-Yates partial shuffle to pick distinct spawn cells.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    const count = Math.min(TRIAL_ENEMY_COUNT, candidates.length)
    for (let i = 0; i < count; i++) {
      const c = candidates[i]
      this.enemies.push(
        makeEnemy(this.nextEnemyId++, c.x, c.y, TRIAL_TIER, true, this.difficultyTier),
      )
    }
    const returnX = this.playerX
    const returnY = this.playerY
    this.playerX = layout.entryX
    this.playerY = layout.entryY
    this.velocityX = 0
    this.velocityY = 0
    this.activityState = {
      kind: 'running',
      activityId: 'trial',
      seed,
      tier: this.difficultyTier,
      startedAt: Date.now(),
      totalEnemies: count,
      returnX,
      returnY,
    }
    return this.getState()
  }

  // Survival Arena — open arena, wave-based, ends on player death. No maze
  // walls; player teleports to a fixed arena center and waves close in from
  // random angles. Score = how long you stayed alive.
  startSurvival(): WorldState {
    if (this.activityState.kind === 'running') return this.getState()
    if (this.isDead) return this.getState()
    const seed = Date.now() & 0x7fffffff
    const returnX = this.playerX
    const returnY = this.playerY
    this.playerX = SURVIVAL_ARENA_X + 800   // center of arena (roughly mid-arena-X)
    this.playerY = SURVIVAL_ARENA_Y + 800
    this.velocityX = 0
    this.velocityY = 0
    this.arenaWalls = []                    // explicit — no maze
    // Opening spawn — 3 elites in a ring around the player.
    for (let i = 0; i < SURVIVAL_OPENING_COUNT; i++) {
      this.spawnSurvivalEnemy(i / SURVIVAL_OPENING_COUNT * Math.PI * 2)
    }
    const now = Date.now()
    this.survivalWaveInterval = SURVIVAL_FIRST_WAVE_DELAY
    this.nextSurvivalWaveAt = now + this.survivalWaveInterval
    this.activityState = {
      kind: 'running',
      activityId: 'survival',
      seed,
      tier: this.difficultyTier,
      startedAt: now,
      totalEnemies: SURVIVAL_OPENING_COUNT,
      returnX,
      returnY,
    }
    return this.getState()
  }

  // Spawn one survival enemy at the given angle around the player. Used both
  // for the opening burst and per-wave additions.
  private spawnSurvivalEnemy(angle: number): void {
    const x = this.playerX + Math.cos(angle) * SURVIVAL_ARENA_RADIUS
    const y = this.playerY + Math.sin(angle) * SURVIVAL_ARENA_RADIUS
    this.enemies.push(
      makeEnemy(this.nextEnemyId++, x, y, TRIAL_TIER, true, this.difficultyTier),
    )
  }

  // Run wave spawner forward — emits a new wave when the cadence timer hits,
  // tightening the interval each wave.
  private tickSurvivalWaves(now: number): void {
    if (this.activityState.kind !== 'running') return
    if (this.activityState.activityId !== 'survival') return
    if (now < this.nextSurvivalWaveAt) return
    // Catch up if a frame stutter pushed us past multiple intervals — keeps
    // pressure constant rather than dropping waves.
    while (now >= this.nextSurvivalWaveAt) {
      for (let i = 0; i < SURVIVAL_WAVE_SIZE; i++) {
        this.spawnSurvivalEnemy(Math.random() * Math.PI * 2)
      }
      this.survivalWaveInterval = Math.max(
        SURVIVAL_MIN_WAVE_INTERVAL,
        this.survivalWaveInterval - SURVIVAL_WAVE_INTERVAL_DECAY,
      )
      this.nextSurvivalWaveAt += this.survivalWaveInterval
    }
  }

  // Abandon an in-progress trial without recording a score.
  abortActivity(): WorldState {
    if (this.activityState.kind === 'idle') return this.getState()
    const returnX = this.activityState.kind === 'running'
      ? this.activityState.returnX
      : this.activityState.returnX
    const returnY = this.activityState.kind === 'running'
      ? this.activityState.returnY
      : this.activityState.returnY
    this.cleanupActivity(returnX, returnY)
    return this.getState()
  }

  // Returns true if the Trial's all-enemies-cleared condition is satisfied.
  // Survival never completes this way (it ends on death, handled at the
  // damage site) — return false for non-trial activities.
  private isActivityComplete(): boolean {
    if (this.activityState.kind !== 'running') return false
    if (this.activityState.activityId !== 'trial') return false
    for (const e of this.enemies) {
      if (e.activityEnemy) return false
    }
    return true
  }

  private completeActivity(now: number): void {
    if (this.activityState.kind !== 'running') return
    const durationMs = now - this.activityState.startedAt
    const seed = this.activityState.seed
    const tier = this.activityState.tier
    const activityId = this.activityState.activityId
    const returnX = this.activityState.returnX
    const returnY = this.activityState.returnY
    // Optimistic state transition — the HUD shows "Complete" immediately and
    // upgrades to "NEW BEST!" if the save reports placement === 0.
    this.activityState = {
      kind: 'complete',
      activityId,
      seed,
      tier,
      durationMs,
      isNewBest: false,
      placement: -1,
      returnX,
      returnY,
    }
    // Fire-and-forget — if the player has already returned to the overworld
    // by the time the save lands, the state is 'idle' and we skip the update.
    saveScore(activityId, { durationMs, timestamp: now, seed, level: this.level, tier })
      .then((result) => {
        if (
          this.activityState.kind === 'complete' &&
          this.activityState.seed === seed &&
          this.activityState.durationMs === durationMs
        ) {
          this.activityState = {
            ...this.activityState,
            isNewBest: result.isNewBest,
            placement: result.placement,
          }
        }
      })
      .catch(() => { /* save errors don't break the UX */ })
  }

  // Clean up arena walls + activity-tagged enemies + teleport player back.
  // Used by both abort and post-complete return.
  private cleanupActivity(returnX: number, returnY: number): void {
    this.arenaWalls = []
    this.enemies = this.enemies.filter((e) => !e.activityEnemy)
    this.playerX = returnX
    this.playerY = returnY
    this.velocityX = 0
    this.velocityY = 0
    this.activityState = { kind: 'idle' }
    this.nextSurvivalWaveAt = 0
    this.survivalWaveInterval = SURVIVAL_FIRST_WAVE_DELAY
  }

  // Player taps "Return" on the complete screen — teleport back to the world.
  returnFromActivity(): WorldState {
    if (this.activityState.kind === 'complete') {
      this.cleanupActivity(this.activityState.returnX, this.activityState.returnY)
    }
    return this.getState()
  }

  awardXp(amount: number): void {
    if (amount <= 0) return
    this.xp += amount
    // Multi-level catch-up if a single grant crosses several thresholds.
    while (this.xp >= xpRequiredForLevel(this.level)) {
      this.xp -= xpRequiredForLevel(this.level)
      this.level += 1
      this.skillPoints += 1
      this.lastLevelUpAt = Date.now()
      // Heal to full on level-up (classic ARPG convention).
      this.playerHp = this.getMaxHp()
    }
  }

  purchaseSkill(nodeId: string): WorldState {
    const node = SKILL_NODES.find((n) => n.id === nodeId)
    if (!node) return this.getState()
    if (!canPurchase(node, this.skillRanks, this.skillPoints)) return this.getState()
    this.skillRanks[node.id] = (this.skillRanks[node.id] ?? 0) + 1
    this.skillPoints -= 1
    // HP could increase from a maxHp node — clamp current up to new max only if
    // we crossed via a skill; mirror level-up heal behavior so the buy moment
    // feels rewarding.
    if (node.effect === 'maxHp') {
      this.playerHp = Math.min(this.getMaxHp(), this.playerHp + node.perRank)
    }
    return this.getState()
  }

  equip(itemId: number): WorldState {
    const idx = this.inventory.findIndex((it) => it.id === itemId)
    if (idx < 0) return this.getState()
    const item = this.inventory[idx]
    const previous = this.equipped[item.slot]
    this.inventory.splice(idx, 1)
    this.equipped[item.slot] = item
    if (previous) this.inventory.push(previous)
    // Clamp current HP to the new max (lower armor => might lose HP).
    this.playerHp = Math.min(this.playerHp, this.getMaxHp())
    this.persistInventory()
    this.persistEquipped()
    return this.getState()
  }

  unequip(slot: ItemSlot): WorldState {
    const current = this.equipped[slot]
    if (!current) return this.getState()
    this.equipped[slot] = null
    this.inventory.push(current)
    this.playerHp = Math.min(this.playerHp, this.getMaxHp())
    this.persistInventory()
    this.persistEquipped()
    return this.getState()
  }

  // INITIAL_ENEMIES is the world's spawn manifest; we clone its entries into a
  // mutable list owned by this instance so reset/respawn semantics stay local.
  private enemies: Enemy[] = INITIAL_ENEMIES.map((e) => ({ ...e }))

  getState(): WorldState {
    return {
      playerX: this.playerX,
      playerY: this.playerY,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      isPaused: this.isPaused,
      playerHp: this.playerHp,
      playerMaxHp: this.getMaxHp(),
      isDead: this.isDead,
      enemies: this.enemies,
      activeFlashes: this.activeFlashes,
      beamFlashes: this.beamFlashes,
      damageNumbers: this.damageNumbers,
      targetEnemyId: this.targetEnemyId,
      attackCooldownEndsAt: this.playerAttackCooldownEndsAt,
      dashCooldownEndsAt: this.dashCooldownEndsAt,
      ultimateCooldownEndsAt: this.ultimateCooldownEndsAt,
      attackCooldownMs: this.getAttackCooldownMs(),
      dashCooldownMs: this.getDashCooldownMs(),
      ultimateCooldownMs: this.getUltimateCooldownMs(),
      loot: this.loot,
      inventory: this.inventory,
      pickupToasts: this.pickupToasts,
      equipped: this.equipped,
      attackDamage: this.getAttackDamage(),
      maxSpeed: this.getMaxSpeed(),
      level: this.level,
      xp: this.xp,
      xpToNext: xpRequiredForLevel(this.level),
      skillPoints: this.skillPoints,
      skillRanks: this.skillRanks,
      lastLevelUpAt: this.lastLevelUpAt,
      vigor: this.vigor,
      maxVigor: PLAYER_MAX_VIGOR,
      spenderCooldownEndsAt: this.spenderCooldownEndsAt,
      spenderCooldownMs: SPENDER_COOLDOWN_MS,
      critChancePct: this.getCritChancePct(),
      critDamagePct: this.getCritDamagePct(),
      activityState: this.activityState,
      arenaWalls: this.arenaWalls,
      lanceCooldownEndsAt: this.lanceCooldownEndsAt,
      lanceCooldownMs: this.getLanceCooldownMs(),
      lanceCost: LANCE_COST,
      fireballCooldownEndsAt: this.fireballCooldownEndsAt,
      fireballCooldownMs: this.getFireballCooldownMs(),
      fireballCost: FIREBALL_COST,
      projectiles: this.projectiles,
      meteorCooldownEndsAt: this.meteorCooldownEndsAt,
      meteorCooldownMs: METEOR_COOLDOWN_MS,
      meteorCost: METEOR_COST,
      pendingMeteors: this.pendingMeteors,
      hailCooldownEndsAt: this.hailCooldownEndsAt,
      hailCooldownMs: HAIL_COOLDOWN_MS,
      dotZones: this.dotZones,
      orbsCooldownEndsAt: this.orbsCooldownEndsAt,
      orbsCooldownMs: ORBS_COOLDOWN_MS,
      orbs: this.deriveOrbPositions(),
      loadout: this.loadout,
      difficultyTier: this.difficultyTier,
      maxDifficultyTier: MAX_DIFFICULTY_TIER,
      materials: this.materials,
      nearestNpc: this.nearestNpc,
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

  attack(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.playerAttackCooldownEndsAt) return this.getState()
    this.playerAttackCooldownEndsAt = now + this.getAttackCooldownMs()
    this.activeFlashes.push({
      x: this.playerX,
      y: this.playerY,
      radius: PLAYER_ATTACK_RADIUS,
      startedAt: now,
      endsAt: now + PLAYER_ATTACK_FLASH_MS,
      kind: 'basic',
    })
    this.applyAoe(PLAYER_ATTACK_RADIUS, this.getAttackDamage(), true)
    return this.getState()
  }

  ultimate(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.ultimateCooldownEndsAt) return this.getState()
    this.ultimateCooldownEndsAt = now + this.getUltimateCooldownMs()
    this.activeFlashes.push({
      x: this.playerX,
      y: this.playerY,
      radius: ULT_RADIUS,
      startedAt: now,
      endsAt: now + ULT_FLASH_MS,
      kind: 'ultimate',
    })
    this.applyAoe(ULT_RADIUS, this.getUltimateDamage(), false)
    this.triggerHitStop(HITSTOP_ULT_MS)
    return this.getState()
  }

  // Position-agnostic AoE damage. `applyAoe` is a thin player-centered wrapper
  // that future skills (meteor, blizzard, projectile-explosion) can sidestep
  // by calling `applyAoeAt` directly with a non-player origin. Each hit rolls
  // for crit independently; vigor generates only on basic-tier hits.
  private applyAoe(radius: number, baseDamage: number, generatesVigor: boolean): void {
    this.applyAoeAt(this.playerX, this.playerY, radius, baseDamage, generatesVigor)
  }

  private applyAoeAt(
    ox: number, oy: number,
    radius: number,
    baseDamage: number,
    generatesVigor: boolean,
  ): void {
    const now = Date.now()
    const aoeSq = radius * radius
    const critPct = this.getCritChancePct()
    const critMult = 1 + this.getCritDamagePct() / 100
    let write = 0
    let hits = 0
    let landedCrit = false
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]
      const dx = e.x - ox
      const dy = e.y - oy
      if (dx * dx + dy * dy <= aoeSq) {
        const isCrit = Math.random() * 100 < critPct
        if (isCrit) landedCrit = true
        const vuln = e.vulnerableUntil > now ? VULNERABLE_DAMAGE_MULT : 1
        const dmg = Math.round(baseDamage * (isCrit ? critMult : 1) * vuln)
        e.hp -= dmg
        e.lastHitAt = now
        this.spawnDamageNumber(e.x, e.y - e.radius - 8, dmg, isCrit ? 'crit' : 'normal')
        hits++
        if (e.hp <= 0) {
          if (!e.activityEnemy) this.rollLoot(e.x, e.y)
          this.awardXp(XP_PER_KILL)
          continue
        }
      }
      this.enemies[write++] = e
    }
    this.enemies.length = write
    if (generatesVigor && hits > 0) {
      this.vigor = Math.min(PLAYER_MAX_VIGOR, this.vigor + VIGOR_PER_HIT * hits)
    }
    if (landedCrit) this.triggerHitStop(HITSTOP_CRIT_MS)
  }

  // Hit-stop trigger. Always extends the window forward — never shortens —
  // so a crit landing during a stale hit-stop strengthens rather than
  // overrides.
  private triggerHitStop(durationMs: number): void {
    const now = Date.now()
    this.hitStopUntil = Math.max(this.hitStopUntil, now + durationMs)
  }

  // Capsule AoE for line-shaped skills (Lance). Hits any enemy whose circle
  // intersects the capsule from (x1, y1) to (x2, y2) of half-width radius+e.r.
  private applyLine(
    x1: number, y1: number,
    x2: number, y2: number,
    halfWidth: number,
    baseDamage: number,
  ): void {
    const now = Date.now()
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const critPct = this.getCritChancePct()
    const critMult = 1 + this.getCritDamagePct() / 100
    let write = 0
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]
      const ex = e.x - x1, ey = e.y - y1
      const proj = ex * ux + ey * uy
      const perp = Math.abs(ex * (-uy) + ey * ux)
      const reach = halfWidth + e.radius
      const hit = proj >= -e.radius && proj <= len + e.radius && perp <= reach
      if (hit) {
        const isCrit = Math.random() * 100 < critPct
        const vuln = e.vulnerableUntil > now ? VULNERABLE_DAMAGE_MULT : 1
        const dmg = Math.round(baseDamage * (isCrit ? critMult : 1) * vuln)
        e.hp -= dmg
        e.lastHitAt = now
        // Lance crits apply Vulnerable to the struck enemy.
        if (isCrit) e.vulnerableUntil = now + VULNERABLE_MS
        this.spawnDamageNumber(e.x, e.y - e.radius - 8, dmg, isCrit ? 'crit' : 'normal')
        if (e.hp <= 0) {
          if (!e.activityEnemy) this.rollLoot(e.x, e.y)
          this.awardXp(XP_PER_KILL)
          continue
        }
      }
      this.enemies[write++] = e
    }
    this.enemies.length = write
  }

  // AABB raycast — earliest hit `t` along the parametric line P + t*D in [0, 1].
  // Returns Infinity if no hit. Used to clamp Lance length at the first arena wall.
  private raycastArenaWalls(x1: number, y1: number, x2: number, y2: number): number {
    if (this.arenaWalls.length === 0) return Infinity
    const dx = x2 - x1, dy = y2 - y1
    let bestT = Infinity
    for (const w of this.arenaWalls) {
      const invDx = dx === 0 ? Infinity : 1 / dx
      const invDy = dy === 0 ? Infinity : 1 / dy
      const tx1 = (w.x - x1) * invDx
      const tx2 = (w.x + w.w - x1) * invDx
      const ty1 = (w.y - y1) * invDy
      const ty2 = (w.y + w.h - y1) * invDy
      const tEnter = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2))
      const tExit  = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2))
      if (tEnter <= tExit && tEnter >= 0 && tEnter <= 1 && tEnter < bestT) {
        bestT = tEnter
      }
    }
    return bestT
  }

  // Marrow Lance — instant line through enemies, length clamped at arena
  // walls. Fires toward the current auto-target; fails silently with no cost
  // if there is no target.
  boneSpear(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.lanceCooldownEndsAt) return this.getState()
    if (this.vigor < LANCE_COST) return this.getState()
    const target = this.getTargetEnemy()
    if (!target) return this.getState()
    const dx = target.x - this.playerX
    const dy = target.y - this.playerY
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const x1 = this.playerX
    const y1 = this.playerY
    let x2 = x1 + ux * LANCE_LENGTH
    let y2 = y1 + uy * LANCE_LENGTH
    // Clamp to the first arena wall along the path.
    const wallT = this.raycastArenaWalls(x1, y1, x2, y2)
    if (wallT < Infinity) {
      x2 = x1 + (x2 - x1) * wallT
      y2 = y1 + (y2 - y1) * wallT
    }
    this.vigor -= LANCE_COST
    this.lanceCooldownEndsAt = now + this.getLanceCooldownMs()
    this.beamFlashes.push({
      x1, y1, x2, y2,
      width: LANCE_WIDTH,
      startedAt: now,
      endsAt: now + LANCE_FLASH_MS,
      kind: 'lance',
    })
    this.applyLine(x1, y1, x2, y2, LANCE_WIDTH / 2, this.getLanceDamage())
    return this.getState()
  }

  // Fireball — launches a projectile toward the auto-target. Explodes on
  // first enemy contact for an AoE burst. Fails silently with no cost if
  // no target exists (consistent with Lance behavior).
  fireball(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.fireballCooldownEndsAt) return this.getState()
    if (this.vigor < FIREBALL_COST) return this.getState()
    const target = this.getTargetEnemy()
    if (!target) return this.getState()
    const dx = target.x - this.playerX
    const dy = target.y - this.playerY
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    this.vigor -= FIREBALL_COST
    this.fireballCooldownEndsAt = now + this.getFireballCooldownMs()
    this.projectiles.push({
      id: this.nextProjectileId++,
      x: this.playerX,
      y: this.playerY,
      vx: ux * FIREBALL_SPEED,
      vy: uy * FIREBALL_SPEED,
      damage: this.getFireballDamage(),
      spawnedAt: now,
      originX: this.playerX,
      originY: this.playerY,
      maxRangeSq: FIREBALL_RANGE_SQ,
      trail: [],
    })
    return this.getState()
  }

  // Meteor — lock the impact point at the target (or facing-fallback) and
  // schedule a delayed AoE. Telegraph renders during the wind-up; impact is
  // applied via applyAoeAt when the tick loop catches up to impactAt.
  meteor(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.meteorCooldownEndsAt) return this.getState()
    if (this.vigor < METEOR_COST) return this.getState()
    const target = this.getTargetEnemy()
    let mx: number, my: number
    if (target) {
      const dx = target.x - this.playerX
      const dy = target.y - this.playerY
      if (dx * dx + dy * dy <= METEOR_TARGET_RANGE * METEOR_TARGET_RANGE) {
        mx = target.x; my = target.y
      } else {
        mx = this.playerX + this.facingX * METEOR_FALLBACK_DIST
        my = this.playerY + this.facingY * METEOR_FALLBACK_DIST
      }
    } else {
      mx = this.playerX + this.facingX * METEOR_FALLBACK_DIST
      my = this.playerY + this.facingY * METEOR_FALLBACK_DIST
    }
    this.vigor -= METEOR_COST
    this.meteorCooldownEndsAt = now + METEOR_COOLDOWN_MS
    const radius = this.getMeteorRadius()
    this.pendingMeteors.push({
      id: this.nextMeteorId++,
      x: mx, y: my,
      castAt: now,
      impactAt: now + this.getMeteorWindupMs(),
      radius,
      damage: this.getMeteorDamage(),
    })
    return this.getState()
  }

  // ---- Loadout ---------------------------------------------------------

  // Dispatch the skill currently equipped in slot `i`. Out-of-range index is
  // a no-op (cheap defense against PC keys / gamepad mis-mapping).
  castSlot(i: number): WorldState {
    if (i < 0 || i >= this.loadout.slots.length) return this.getState()
    const id = this.loadout.slots[i]
    return this.castSkill(id)
  }

  // Dispatch by skill id. Centralized so callers don't switch on every site.
  castSkill(id: SkillId): WorldState {
    switch (id) {
      case 'smash':     return this.spender()
      case 'lance':     return this.boneSpear()
      case 'fireball':  return this.fireball()
      case 'meteor':    return this.meteor()
      case 'hailstorm': return this.hailstorm()
      case 'orbs':      return this.summonOrbs()
    }
  }

  // Edit a slot. Persists fire-and-forget.
  setLoadoutSlot(slotIndex: number, skillId: SkillId): WorldState {
    if (slotIndex < 0 || slotIndex >= this.loadout.slots.length) return this.getState()
    const next: Loadout = { slots: [...this.loadout.slots] as Loadout['slots'] }
    next.slots[slotIndex] = skillId
    this.loadout = next
    void storage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(this.loadout))
    return this.getState()
  }

  // Asynchronous boot-time hydration. Called from MazeGameScreen useEffect.
  // Safe to await even if there's no stored loadout — we just stay on the
  // defaults that were set in the field initializer.
  async loadStoredLoadout(): Promise<void> {
    const raw = await storage.getItem(LOADOUT_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Loadout
      if (
        parsed && parsed.slots && Array.isArray(parsed.slots)
        && parsed.slots.length === 4
      ) {
        this.loadout = { slots: [...parsed.slots] as Loadout['slots'] }
      }
    } catch { /* malformed save — keep defaults */ }
  }

  // Difficulty tier — clamped, persisted, scoreboards key off it so each
  // tier has its own personal best.
  setDifficultyTier(t: number): WorldState {
    const next = Math.max(1, Math.min(MAX_DIFFICULTY_TIER, Math.floor(t)))
    if (next === this.difficultyTier) return this.getState()
    this.difficultyTier = next
    void storage.setItem(DIFFICULTY_TIER_STORAGE_KEY, String(next))
    return this.getState()
  }

  async loadStoredDifficultyTier(): Promise<void> {
    const raw = await storage.getItem(DIFFICULTY_TIER_STORAGE_KEY)
    if (!raw) return
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    this.difficultyTier = Math.max(1, Math.min(MAX_DIFFICULTY_TIER, parsed))
  }

  // Salvage every UNEQUIPPED item whose rarity is at or below `maxRarity`.
  // Returns the number of items salvaged + the materials granted so the
  // BlacksmithScreen can show a confirmation toast.
  salvageInventory(maxRarity: Rarity): { count: number; gained: number } {
    const cap = RARITY_RANK[maxRarity]
    const keep: Item[] = []
    let count = 0
    let gained = 0
    for (const it of this.inventory) {
      if (RARITY_RANK[it.rarity] <= cap) {
        count++
        gained += SALVAGE_VALUE[it.rarity]
      } else {
        keep.push(it)
      }
    }
    this.inventory = keep
    this.materials += gained
    if (gained > 0) {
      void storage.setItem(MATERIALS_STORAGE_KEY, String(this.materials))
      this.persistInventory()
    }
    return { count, gained }
  }

  async loadStoredMaterials(): Promise<void> {
    const raw = await storage.getItem(MATERIALS_STORAGE_KEY)
    if (!raw) return
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) return
    this.materials = parsed
  }

  // Inventory + equipped persistence. Items are plain JSON-serializable so we
  // dump/restore directly. Fire-and-forget on every mutation; load on boot.
  // nextItemId is reseeded above the max stored id so future drops don't
  // collide with restored items.
  private persistInventory(): void {
    try {
      void storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(this.inventory))
    } catch {}
  }
  private persistEquipped(): void {
    try {
      void storage.setItem(EQUIPPED_STORAGE_KEY, JSON.stringify(this.equipped))
    } catch {}
  }

  async loadStoredInventory(): Promise<void> {
    const raw = await storage.getItem(INVENTORY_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Item[]
      if (Array.isArray(parsed)) {
        this.inventory = parsed
        // Reseed the id counter past the highest stored id so brand-new
        // drops can't reuse an existing id.
        for (const it of parsed) {
          if (it.id >= this.nextItemId) this.nextItemId = it.id + 1
        }
      }
    } catch {}
  }

  async loadStoredEquipped(): Promise<void> {
    const raw = await storage.getItem(EQUIPPED_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as EquippedSlots
      if (parsed && typeof parsed === 'object') {
        this.equipped = {
          weapon: parsed.weapon ?? null,
          armor:  parsed.armor  ?? null,
          ring:   parsed.ring   ?? null,
        }
        for (const slot of ['weapon', 'armor', 'ring'] as const) {
          const it = this.equipped[slot]
          if (it && it.id >= this.nextItemId) this.nextItemId = it.id + 1
        }
        // Clamp HP if a restored armor piece increases max HP.
        this.playerHp = Math.min(this.playerHp, this.getMaxHp())
      }
    } catch {}
  }

  // Temper a specific affix on an item: reroll just its value. Costs
  // materials by rarity. Operates on BAG items only (player must unequip to
  // reroll equipped gear) so the affix-roll site stays in one place.
  //
  // The caller chooses WHICH affix to reroll by index — gives the player real
  // agency over which roll they're chasing rather than burning materials on
  // RNG-picked affixes.
  temperItem(itemId: number, affixIndex: number): {
    success: boolean
    cost: number
    oldValue?: number
    newValue?: number
    affixKind?: AffixKind
  } {
    const item = this.inventory.find((i) => i.id === itemId)
    if (!item) return { success: false, cost: 0 }
    if (affixIndex < 0 || affixIndex >= item.affixes.length) return { success: false, cost: 0 }
    const cost = TEMPER_COST[item.rarity]
    if (this.materials < cost) return { success: false, cost }
    const affix = item.affixes[affixIndex]
    const oldValue = affix.value
    // New value uses the same range table the affix was originally rolled
    // from; can produce the same number (player needs to know this is RNG).
    const newValue = rerollAffixValue(item.rarity, affix.kind)
    item.affixes[affixIndex] = { kind: affix.kind, value: newValue }
    this.materials -= cost
    void storage.setItem(MATERIALS_STORAGE_KEY, String(this.materials))
    this.persistInventory()
    return {
      success: true,
      cost,
      oldValue,
      newValue,
      affixKind: affix.kind,
    }
  }

  // Hailstorm — drop a persistent damage zone on the nearest enemy (or ahead
  // of facing if no target). Free cast, long cooldown. Multiple zones stack.
  hailstorm(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.hailCooldownEndsAt) return this.getState()
    const target = this.getTargetEnemy()
    let zx: number, zy: number
    if (target) {
      const dx = target.x - this.playerX
      const dy = target.y - this.playerY
      if (dx * dx + dy * dy <= HAIL_TARGET_RANGE * HAIL_TARGET_RANGE) {
        zx = target.x; zy = target.y
      } else {
        zx = this.playerX + this.facingX * HAIL_FALLBACK_DIST
        zy = this.playerY + this.facingY * HAIL_FALLBACK_DIST
      }
    } else {
      zx = this.playerX + this.facingX * HAIL_FALLBACK_DIST
      zy = this.playerY + this.facingY * HAIL_FALLBACK_DIST
    }
    this.hailCooldownEndsAt = now + HAIL_COOLDOWN_MS
    this.dotZones.push({
      id: this.nextDotZoneId++,
      x: zx, y: zy,
      radius: this.getHailRadius(),
      damagePerTick: this.getHailDamage(),
      tickIntervalMs: HAIL_TICK_INTERVAL_MS,
      startedAt: now,
      // First tick fires one interval after cast — avoids "drop on a melee enemy
      // and pulse the first tick before they react" cheese.
      nextTickAt: now + HAIL_TICK_INTERVAL_MS,
      expiresAt: now + this.getHailDurationMs(),
      kind: 'hailstorm',
    })
    return this.getState()
  }

  // Spirit Lanterns — N orbs orbit the player for the duration, damaging
  // anything they brush past. Recast refreshes (doesn't stack).
  summonOrbs(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.orbsCooldownEndsAt) return this.getState()
    const count = this.getOrbsCount()
    this.orbs = []
    this.orbHitMaps = []
    for (let i = 0; i < count; i++) {
      this.orbs.push({
        id: this.nextOrbId++,
        angleOffset: (i / count) * Math.PI * 2,
      })
      this.orbHitMaps.push(new Map())
    }
    this.orbsExpireAt = now + this.getOrbsDurationMs()
    this.orbsCooldownEndsAt = now + ORBS_COOLDOWN_MS
    return this.getState()
  }

  // Resource spender — bigger AoE than basic, on a short CD, gated by vigor
  // cost. Doesn't generate vigor (would loop on itself).
  spender(): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.spenderCooldownEndsAt) return this.getState()
    if (this.vigor < SPENDER_COST) return this.getState()
    this.vigor -= SPENDER_COST
    this.spenderCooldownEndsAt = now + SPENDER_COOLDOWN_MS
    this.activeFlashes.push({
      x: this.playerX,
      y: this.playerY,
      radius: SPENDER_RADIUS,
      startedAt: now,
      endsAt: now + SPENDER_FLASH_MS,
      kind: 'spender',
    })
    this.applyAoe(SPENDER_RADIUS, this.getAttackDamage() * SPENDER_DAMAGE_MULT, false)
    return this.getState()
  }

  // Per-enemy-death loot roll. Common path skips the allocation entirely.
  private rollLoot(x: number, y: number): void {
    if (Math.random() > LOOT_DROP_CHANCE) return
    const item = makeRandomItem(this.nextItemId++)
    this.loot.push({
      id: this.nextLootId++,
      x,
      y,
      item,
      spawnedAt: Date.now(),
    })
  }

  // Auto-vacuum any drop within pickup radius. Called once per tick from
  // moveByDelta after the player has moved + been resolved against obstacles.
  private collectLoot(now: number): void {
    let write = 0
    let pickedUp = 0
    for (let i = 0; i < this.loot.length; i++) {
      const l = this.loot[i]
      const dx = l.x - this.playerX
      const dy = l.y - this.playerY
      if (dx * dx + dy * dy < LOOT_PICKUP_RADIUS_SQ) {
        this.inventory.push(l.item)
        this.pickupToasts.push({
          id: this.nextToastId++,
          item: l.item,
          spawnedAt: now,
        })
        pickedUp++
        continue
      }
      this.loot[write++] = l
    }
    this.loot.length = write
    // Persist only when something was actually picked up — saves an
    // IndexedDB / AsyncStorage write per frame.
    if (pickedUp > 0) this.persistInventory()
  }

  // Burst impulse in the joystick direction. Falls back to current velocity or
  // last facing if the joystick is neutral so the player still dashes the way
  // they're looking.
  dash(dx: number, dy: number): WorldState {
    const now = Date.now()
    if (this.isPaused || this.isDead) return this.getState()
    if (now < this.dashCooldownEndsAt) return this.getState()
    let ux = dx
    let uy = dy
    let len = Math.hypot(ux, uy)
    if (len < 0.1) {
      ux = this.velocityX
      uy = this.velocityY
      len = Math.hypot(ux, uy)
    }
    if (len < 0.1) {
      ux = this.facingX
      uy = this.facingY
      len = Math.hypot(ux, uy) || 1
    }
    ux /= len
    uy /= len
    this.velocityX = ux * DASH_IMPULSE
    this.velocityY = uy * DASH_IMPULSE
    this.facingX = ux
    this.facingY = uy
    this.dashEndsAt = now + DASH_DURATION_MS
    this.dashCooldownEndsAt = now + this.getDashCooldownMs()
    this.invulnerableUntil = now + DASH_INVULN_MS
    // Fresh per-dash hit set so the new dash can re-hit enemies it touched
    // during the previous one.
    this.dashHitIds.clear()
    return this.getState()
  }

  private spawnDamageNumber(x: number, y: number, value: number, kind: DamageNumberKind): void {
    this.damageNumbers.push({
      id: this.nextDamageNumberId++,
      x, y, value,
      spawnedAt: Date.now(),
      kind,
    })
  }

  private respawnPlayer(): void {
    this.playerX = PLAYER_START.x
    this.playerY = PLAYER_START.y
    this.velocityX = 0
    this.velocityY = 0
    this.playerHp = this.getMaxHp()
    this.isDead = false
  }

  private tickEnemies(now: number, delta: number): void {
    const aggroSq = ENEMY_AGGRO_RADIUS * ENEMY_AGGRO_RADIUS
    const attackSq = ENEMY_ATTACK_RADIUS * ENEMY_ATTACK_RADIUS
    const inActivity = this.activityState.kind === 'running'
    for (const e of this.enemies) {
      // Activity-tagged enemies are confined to the arena; world enemies are
      // suppressed while an activity is running.
      if (inActivity !== e.activityEnemy) continue

      // Resolve a pending wind-up regardless of distance — the player may have
      // dashed out during the telegraph window.
      if (e.windUpEndsAt > 0 && now >= e.windUpEndsAt) {
        const dxNow = this.playerX - e.x
        const dyNow = this.playerY - e.y
        const stillInRange = dxNow * dxNow + dyNow * dyNow <= attackSq
        if (stillInRange && !this.isDead && now >= this.invulnerableUntil) {
          this.playerHp = Math.max(0, this.playerHp - e.windUpDamage)
          this.spawnDamageNumber(this.playerX, this.playerY - PLAYER_RADIUS - 8, e.windUpDamage, 'taken')
          if (this.playerHp <= 0 && !this.isDead) {
            this.isDead = true
            this.deathAt = now
            // Survival activity ends on player death — convert to a complete
            // state immediately so the score lands before the respawn timer
            // kicks in (otherwise the run state would be cleared first).
            if (
              this.activityState.kind === 'running'
              && this.activityState.activityId === 'survival'
            ) {
              this.completeActivity(now)
            }
          }
        }
        // Always consume the swing cooldown — dodging doesn't refund.
        e.attackCooldownEndsAt = now + ENEMY_ATTACK_COOLDOWN_MS
        e.windUpEndsAt = 0
        e.windUpDamage = 0
      }

      const dx = this.playerX - e.x
      const dy = this.playerY - e.y
      const distSq = dx * dx + dy * dy
      if (distSq > ENEMY_TICK_RANGE_SQ) continue
      if (distSq > aggroSq) {
        if (e.windUpEndsAt > 0) { e.windUpEndsAt = 0; e.windUpDamage = 0 }
        continue
      }
      // In melee range: start a wind-up if not already committed and CD ready.
      if (distSq <= attackSq) {
        if (e.windUpEndsAt === 0 && now >= e.attackCooldownEndsAt && !this.isDead) {
          e.windUpEndsAt = now + ENEMY_WINDUP_MS
          e.windUpDamage = Math.round(
            ENEMY_ATTACK_DAMAGE
              * TIER_PROFILES[e.tier].damageMult
              * difficultyDamageMult(e.spawnTier),
          )
        }
        continue
      }
      // Out of range — abort any pending wind-up.
      if (e.windUpEndsAt > 0) { e.windUpEndsAt = 0; e.windUpDamage = 0 }

      // Chase: per-axis trial move so a blocked axis doesn't stall both.
      const dist = Math.sqrt(distSq) || 0.001
      const step = ENEMY_SPEED * delta
      const ux = dx / dist
      const uy = dy / dist
      const tryX = e.x + ux * step
      if (!isCircleBlocked(tryX, e.y, e.radius) && !this.isBlockedByArena(tryX, e.y, e.radius)) {
        e.x = tryX
      }
      const tryY = e.y + uy * step
      if (!isCircleBlocked(e.x, tryY, e.radius) && !this.isBlockedByArena(e.x, tryY, e.radius)) {
        e.y = tryY
      }
    }
  }

  // Scan NPCS for the nearest one within interaction radius. Suppressed while
  // an activity is running — towns aren't accessible from inside a trial.
  private updateNearestNpc(): void {
    if (this.activityState.kind !== 'idle') {
      this.nearestNpc = null
      return
    }
    let best: NPC | null = null
    let bestSq = Infinity
    for (const n of NPCS) {
      const dx = n.x - this.playerX
      const dy = n.y - this.playerY
      const d = dx * dx + dy * dy
      if (d <= NPC_INTERACT_RADIUS_SQ && d < bestSq) {
        bestSq = d
        best = n
      }
    }
    this.nearestNpc = best
  }

  // Tap-to-interact dispatcher. Returns the NPC type so the screen can pick
  // which modal to open; null if nothing in range. Stays on WorldGame so the
  // proximity gate stays a single source of truth.
  interactWithNearbyNpc(): NPCType | null {
    if (!this.nearestNpc) return null
    return this.nearestNpc.type
  }

  // Refresh `targetEnemyId` from the current player position + facing. Prefers
  // the nearest enemy within a 120° forward cone (matches the player's last
  // movement direction); falls back to the nearest enemy in any direction if
  // the cone is empty. Range capped at 700 world units.
  private updateTarget(): void {
    const TARGET_RANGE = 700
    const rangeSq = TARGET_RANGE * TARGET_RANGE
    const fx = this.facingX, fy = this.facingY
    const inActivity = this.activityState.kind === 'running'
    let bestConeId = -1, bestConeSq = Infinity
    let bestAnyId = -1,  bestAnySq  = Infinity
    for (const e of this.enemies) {
      if (inActivity !== e.activityEnemy) continue
      const dx = e.x - this.playerX
      const dy = e.y - this.playerY
      const distSq = dx * dx + dy * dy
      if (distSq > rangeSq) continue
      if (distSq < bestAnySq) { bestAnySq = distSq; bestAnyId = e.id }
      // Cone test: dot(unitToEnemy, facing) >= cos(60°) = 0.5
      const dist = Math.sqrt(distSq) || 1
      const dotF = (dx * fx + dy * fy) / dist
      if (dotF >= 0.5 && distSq < bestConeSq) {
        bestConeSq = distSq
        bestConeId = e.id
      }
    }
    const winner = bestConeId !== -1 ? bestConeId : bestAnyId
    this.targetEnemyId = winner === -1 ? null : winner
  }

  private getTargetEnemy(): Enemy | undefined {
    if (this.targetEnemyId === null) return undefined
    const targetId = this.targetEnemyId
    return this.enemies.find((e) => e.id === targetId)
  }

  // Advance each projectile, check static collisions, resolve enemy hits with
  // explosion damage at the impact site. Despawn on wall hit, enemy hit, or
  // when range is exceeded.
  private tickProjectiles(now: number, delta: number): void {
    if (this.projectiles.length === 0) return
    const inActivity = this.activityState.kind === 'running'
    let write = 0
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]
      // Sample trail BEFORE moving so the dot is at the back.
      p.trail.push({ x: p.x, y: p.y })
      while (p.trail.length > 3) p.trail.shift()
      p.x += p.vx * delta
      p.y += p.vy * delta
      // Out of range?
      const ddx = p.x - p.originX
      const ddy = p.y - p.originY
      if (ddx * ddx + ddy * ddy >= p.maxRangeSq) continue
      // Static obstacles + arena walls — despawn, no explosion (matches the
      // "don't waste burst on walls" intent and avoids friendly-fire visuals).
      if (isCircleBlocked(p.x, p.y, FIREBALL_BODY_RADIUS)) continue
      if (this.arenaWalls.length > 0 && this.isBlockedByArena(p.x, p.y, FIREBALL_BODY_RADIUS)) continue
      // Enemy hit? — explode at impact site.
      let hitId = -1
      for (const e of this.enemies) {
        if (inActivity !== e.activityEnemy) continue
        const dx = e.x - p.x
        const dy = e.y - p.y
        const reach = FIREBALL_BODY_RADIUS + e.radius
        if (dx * dx + dy * dy <= reach * reach) { hitId = e.id; break }
      }
      if (hitId !== -1) {
        // Apply Vulnerable to the directly-struck enemy BEFORE the explosion
        // resolves — so it's already vulnerable when applyAoeAt damages it,
        // doubling the impact for hits with multiple targets in the radius.
        for (const e of this.enemies) {
          if (e.id === hitId) { e.vulnerableUntil = now + VULNERABLE_MS; break }
        }
        this.activeFlashes.push({
          x: p.x, y: p.y,
          radius: FIREBALL_EXPLOSION_RADIUS,
          startedAt: now,
          endsAt: now + FIREBALL_FLASH_MS,
          kind: 'fireball',
        })
        this.applyAoeAt(p.x, p.y, FIREBALL_EXPLOSION_RADIUS, p.damage, false)
        continue
      }
      this.projectiles[write++] = p
    }
    this.projectiles.length = write
  }

  // Tick all active DotZones — fire any ticks whose nextTickAt has passed,
  // catching up across multiple intervals if a frame stutter delayed us.
  // Vigor is never generated by DoT ticks (perpetual-motion exploit otherwise).
  private tickDotZones(now: number): void {
    if (this.dotZones.length === 0) return
    let write = 0
    for (let i = 0; i < this.dotZones.length; i++) {
      const z = this.dotZones[i]
      while (now >= z.nextTickAt && z.nextTickAt < z.expiresAt) {
        this.applyAoeAt(z.x, z.y, z.radius, z.damagePerTick, false)
        z.nextTickAt += z.tickIntervalMs
      }
      if (now < z.expiresAt) this.dotZones[write++] = z
    }
    this.dotZones.length = write
  }

  // Advance orbs around the player, damage any enemy they overlap that's off
  // its per-orb hit cooldown. Orbs despawn wholesale at expiry.
  private tickOrbs(now: number, delta: number): void {
    if (this.orbs.length === 0) return
    if (now >= this.orbsExpireAt) {
      this.orbs = []
      this.orbHitMaps = []
      return
    }
    // Advance shared phase. delta is "frames since last tick", so divide by 60
    // to convert ORBS_ANGULAR_SPEED (rad/sec) into the per-frame increment.
    this.orbsAngle += ORBS_ANGULAR_SPEED * (delta / 60)
    const dmg = this.getOrbDamage()
    const critPct = this.getCritChancePct()
    const critMult = 1 + this.getCritDamagePct() / 100
    const inActivity = this.activityState.kind === 'running'
    const hitReachBase = ORB_RADIUS
    for (let oi = 0; oi < this.orbs.length; oi++) {
      const o = this.orbs[oi]
      const a = this.orbsAngle + o.angleOffset
      const ox = this.playerX + Math.cos(a) * ORBS_ORBIT_RADIUS
      const oy = this.playerY + Math.sin(a) * ORBS_ORBIT_RADIUS
      const hitMap = this.orbHitMaps[oi]
      let write = 0
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i]
        if (inActivity !== e.activityEnemy) { this.enemies[write++] = e; continue }
        const dx = e.x - ox
        const dy = e.y - oy
        const reach = hitReachBase + e.radius
        const lastHit = hitMap.get(e.id) ?? 0
        if (dx * dx + dy * dy <= reach * reach && now - lastHit >= ORBS_HIT_COOLDOWN_MS) {
          const isCrit = Math.random() * 100 < critPct
          const d = Math.round(dmg * (isCrit ? critMult : 1))
          e.hp -= d
          e.lastHitAt = now
          this.spawnDamageNumber(e.x, e.y - e.radius - 8, d, isCrit ? 'crit' : 'normal')
          hitMap.set(e.id, now)
          if (e.hp <= 0) {
            if (!e.activityEnemy) this.rollLoot(e.x, e.y)
            this.awardXp(XP_PER_KILL)
            continue
          }
        }
        this.enemies[write++] = e
      }
      this.enemies.length = write
    }
  }

  // Build derived orb world positions for the canvas. Computed in getState so
  // callers see fresh positions each frame without storing them.
  private deriveOrbPositions(): { x: number; y: number; r: number }[] {
    if (this.orbs.length === 0) return []
    const out: { x: number; y: number; r: number }[] = []
    for (const o of this.orbs) {
      const a = this.orbsAngle + o.angleOffset
      out.push({
        x: this.playerX + Math.cos(a) * ORBS_ORBIT_RADIUS,
        y: this.playerY + Math.sin(a) * ORBS_ORBIT_RADIUS,
        r: ORB_RADIUS,
      })
    }
    return out
  }

  // Wind-up tick — resolve any meteors whose impactAt has arrived.
  private tickMeteors(now: number): void {
    if (this.pendingMeteors.length === 0) return
    let write = 0
    for (let i = 0; i < this.pendingMeteors.length; i++) {
      const m = this.pendingMeteors[i]
      if (now >= m.impactAt) {
        this.activeFlashes.push({
          x: m.x, y: m.y,
          radius: m.radius,
          startedAt: now,
          endsAt: now + METEOR_FLASH_MS,
          kind: 'meteor',
        })
        this.applyAoeAt(m.x, m.y, m.radius, m.damage, false)
        continue
      }
      this.pendingMeteors[write++] = m
    }
    this.pendingMeteors.length = write
  }

  // Apply per-frame dash damage during the dash window. Each enemy is hit at
  // most once per dash via `dashHitIds`. Pre-gated by the Rushing Claw skill —
  // a 0% multiplier short-circuits to no-op.
  private tickDashDamage(now: number): void {
    if (now >= this.dashEndsAt) return
    const dmgPct = this.getDashDamagePct()
    if (dmgPct <= 0) return
    const baseDmg = this.getAttackDamage() * (dmgPct / 100)
    const critPct = this.getCritChancePct()
    const critMult = 1 + this.getCritDamagePct() / 100
    const inActivity = this.activityState.kind === 'running'
    let write = 0
    let hits = 0
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]
      if (inActivity !== e.activityEnemy || this.dashHitIds.has(e.id)) {
        this.enemies[write++] = e
        continue
      }
      const dx = e.x - this.playerX
      const dy = e.y - this.playerY
      const reach = PLAYER_RADIUS + e.radius + DASH_HIT_SLOP
      if (dx * dx + dy * dy <= reach * reach) {
        const isCrit = Math.random() * 100 < critPct
        const dmg = Math.round(baseDmg * (isCrit ? critMult : 1))
        e.hp -= dmg
        e.lastHitAt = now
        this.spawnDamageNumber(e.x, e.y - e.radius - 8, dmg, isCrit ? 'crit' : 'normal')
        this.dashHitIds.add(e.id)
        hits++
        if (e.hp <= 0) {
          if (!e.activityEnemy) this.rollLoot(e.x, e.y)
          this.awardXp(XP_PER_KILL)
          continue
        }
      }
      this.enemies[write++] = e
    }
    this.enemies.length = write
    if (hits > 0) {
      this.vigor = Math.min(PLAYER_MAX_VIGOR, this.vigor + VIGOR_PER_HIT * hits)
    }
  }

  // Arena walls live on the instance (not module-scope like FIELD_TREES), so
  // they need their own blocker check that the chase pass can call. Cheap
  // because the arena wall list is small (a maze grid, ~80-150 rects).
  private isBlockedByArena(x: number, y: number, radius: number): boolean {
    for (const w of this.arenaWalls) {
      if (
        x + radius > w.x && x - radius < w.x + w.w &&
        y + radius > w.y && y - radius < w.y + w.h
      ) return true
    }
    return false
  }

  moveByDelta(dx: number, dy: number, delta: number = 1): WorldState {
    const now = Date.now()

    // Expire transient combat visuals every frame so they decay even while
    // paused or dead.
    if (this.activeFlashes.length > 0) {
      this.activeFlashes = this.activeFlashes.filter((f) => now < f.endsAt)
    }
    if (this.beamFlashes.length > 0) {
      this.beamFlashes = this.beamFlashes.filter((b) => now < b.endsAt)
    }
    if (this.damageNumbers.length > 0) {
      this.damageNumbers = this.damageNumbers.filter((d) => now - d.spawnedAt < DAMAGE_NUMBER_TTL_MS)
    }
    if (this.pickupToasts.length > 0) {
      this.pickupToasts = this.pickupToasts.filter((t) => now - t.spawnedAt < PICKUP_TOAST_TTL_MS)
    }

    if (this.isPaused) return this.getState()

    if (this.isDead) {
      if (now - this.deathAt >= PLAYER_RESPAWN_DELAY_MS) this.respawnPlayer()
      else return this.getState()
    }

    // Hit-stop — global delta scale during the impact window. Everything
    // downstream that uses delta (player accel, enemy chase, projectile travel,
    // orb orbit, dash damage) slows together. Wall-clock state (cooldowns,
    // flash expiry, damage-number lift) is unaffected.
    if (now < this.hitStopUntil) {
      delta *= HITSTOP_SCALE
    }

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
      // Speed clamp is lifted during the dash window so the burst impulse
      // actually moves the player above MAX_SPEED. After the window closes,
      // the clamp resumes and any residual high velocity gets reined in.
      const inDash = now < this.dashEndsAt
      const cap = this.getMaxSpeed()
      const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
      if (!inDash && speed > cap) {
        this.velocityX = (this.velocityX / speed) * cap
        this.velocityY = (this.velocityY / speed) * cap
      }
    }

    // Remember the latest movement direction so a neutral-joystick dash still
    // has somewhere to go. Use input first, fall back to velocity.
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy)
      this.facingX = dx / len
      this.facingY = dy / len
    } else if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
      const len = Math.hypot(this.velocityX, this.velocityY)
      this.facingX = this.velocityX / len
      this.facingY = this.velocityY / len
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
    // (axis-aligned separation), then terrain (gradient push). Arena walls
    // resolve last so they always win when present (they exist inside the
    // overworld coordinate space and may visually overlap world content).
    for (const t of FIELD_TREES) this.resolveCircle(t)
    for (const r of FIELD_ROCKS) this.resolveCircle(r)
    for (const w of ALL_WALLS) this.resolveRect(w)
    for (const b of ALL_BUILDINGS) this.resolveRect(b)
    for (let i = 0; i < 4; i++) {
      if (!this.resolveTerrain()) break
    }
    for (const w of this.arenaWalls) this.resolveRect(w)

    this.tickEnemies(now, delta)
    this.tickProjectiles(now, delta)
    this.tickMeteors(now)
    this.tickDotZones(now)
    this.tickOrbs(now, delta)
    this.tickDashDamage(now)
    this.tickSurvivalWaves(now)
    this.collectLoot(now)
    this.tickRegen(now)
    // Refresh auto-target last so it sees the post-tick enemy positions and
    // any kills that just happened. Cheap O(N) over the enemy list.
    this.updateTarget()
    this.updateNearestNpc()

    if (this.activityState.kind === 'running' && this.isActivityComplete()) {
      this.completeActivity(now)
    }

    return this.getState()
  }

  private tickRegen(now: number): void {
    const rate = this.getHpRegenPerSec()
    if (rate <= 0 || this.isDead) {
      this.nextRegenTickAt = 0
      return
    }
    const intervalMs = 1000 / rate
    if (this.nextRegenTickAt === 0) {
      this.nextRegenTickAt = now + intervalMs
      return
    }
    if (now < this.nextRegenTickAt) return
    const maxHp = this.getMaxHp()
    if (this.playerHp >= maxHp) {
      this.nextRegenTickAt = now + intervalMs
      return
    }
    // Catch up if multiple ticks have passed (e.g. coming back from a stutter).
    const overdue = now - this.nextRegenTickAt
    const ticks = 1 + Math.floor(overdue / intervalMs)
    this.playerHp = Math.min(maxHp, this.playerHp + ticks)
    this.nextRegenTickAt += ticks * intervalMs
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
    this.playerHp = PLAYER_MAX_HP
    this.isDead = false
    this.deathAt = 0
    this.playerAttackCooldownEndsAt = 0
    this.activeFlashes = []
    this.beamFlashes = []
    this.damageNumbers = []
    this.dashHitIds.clear()
    this.targetEnemyId = null
    this.lanceCooldownEndsAt = 0
    this.fireballCooldownEndsAt = 0
    this.projectiles = []
    this.meteorCooldownEndsAt = 0
    this.pendingMeteors = []
    this.hailCooldownEndsAt = 0
    this.dotZones = []
    this.orbsCooldownEndsAt = 0
    this.orbs = []
    this.orbHitMaps = []
    this.orbsExpireAt = 0
    this.orbsAngle = 0
    this.facingX = 1
    this.facingY = 0
    this.dashEndsAt = 0
    this.dashCooldownEndsAt = 0
    this.invulnerableUntil = 0
    this.ultimateCooldownEndsAt = 0
    this.enemies = INITIAL_ENEMIES.map((e) => ({ ...e }))
    this.loot = []
    this.inventory = []
    this.pickupToasts = []
    this.equipped = { weapon: null, armor: null, ring: null }
    this.level = 1
    this.xp = 0
    this.skillPoints = 0
    this.skillRanks = {}
    this.lastLevelUpAt = 0
    this.nextRegenTickAt = 0
    this.playerHp = PLAYER_MAX_HP
    this.vigor = 0
    this.spenderCooldownEndsAt = 0
    this.arenaWalls = []
    this.activityState = { kind: 'idle' }
    return this.getState()
  }
}
