import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, LayoutChangeEvent, StyleSheet, Text } from 'react-native'
import {
  Canvas,
  Group,
  Picture,
  Path,
  Rect,
  Circle,
  RadialGradient,
  Skia,
  vec,
  createPicture,
} from '@shopify/react-native-skia'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_START,
  TOWN_GROUNDS,
  ALL_WALLS,
  ALL_BUILDINGS,
  FIELD_TREES,
  FIELD_ROCKS,
  TERRAIN_POLYGONS,
  RESOURCE_NODES,
  MAIN_ROADS,
  NPCS,
} from '../game/WorldGame'
import type { Enemy, AttackFlash, BeamFlash, Projectile, PendingMeteor, DotZone, DamageNumber } from '../game/Enemy'
import { DAMAGE_NUMBER_TTL_MS, ENEMY_ATTACK_RADIUS, ENEMY_HIT_FLASH_MS } from '../game/Enemy'
import type { LootDrop } from '../game/Item'
import { RARITY_COLORS } from '../game/Item'
import type { Rect as ArenaRect, NPC } from '../game/WorldGame'
import { HUT_SVG_TEXT } from '../assets/buildingSvg'
import {
  ARENA_ORIGIN_X, ARENA_ORIGIN_Y, ARENA_END_X, ARENA_END_Y,
  ARENA_WIDTH, ARENA_HEIGHT, ARENA_CELL,
} from '../game/DungeonGen'

// Pre-parse the hut sprite once at module load. Same instance is reused for
// every building draw inside the static Picture; orientation handled by
// rotating the canvas 90° for tall buildings.
const HUT_SVG = Skia.SVG.MakeFromString(HUT_SVG_TEXT)

// Dark-fantasy / horror-ARPG palette — moody-but-readable overworld, full
// darkness in dungeons. Reverses the prior painted-cartoon palette.
const GRASS_BASE     = '#3d4e2c'  // dark mossy green — base ground color
const GRASS_PATCH    = '#2c3a1f'  // even darker patches for variation
const DIRT_PATH      = '#5a4528'  // dark loam dirt road
const DIRT_PATH_EDGE = '#2e220f'  // near-black rim around the road
const ROCK_DARK      = '#2c2820'  // rocky impassable terrain
const ROCK_SHADE     = '#15120e'  // deep shadow / inner crater
const ROCK_HILITE    = '#454038'  // muted top edge highlight
const TOWN_GROUND_C  = '#4a3a22'  // weathered worn town ground
const WALL_COLOR     = '#1f1812'
const BUILDING_COLOR = '#2a2218'  // legacy fallback (real buildings use SVG sprites)
const BUILDING_OUT   = '#0a0807'
const TREE_DARK      = '#0a140a'  // near-black tree outline
const TREE_CANOPY    = '#162a14'  // almost-black canopy
const TREE_HILITE    = '#2a4422'  // subtle highlight (just enough to read)
const TREE_SHADOW    = '#000000'  // tree drop-shadow (rendered with alpha)
const ROCK_FILL      = '#3a342c'  // individual decorative rocks
const ROCK_SHAD      = '#15110e'
const ROCK_LIGHT     = '#544c42'  // muted top-side highlight
const ROCK_OUT       = '#0a0807'  // rock outline
const PLAYER_FILL    = '#d4af5e'  // dim bronze arrow (no more bright gold)
const PLAYER_OUTLINE = '#0a0807'
const PLAYER_ORB     = '#8ac0e6'  // cool-blue orbs (cold magic, not pure cyan)
const PLAYER_ORB_HALO = '#3a78b0'

// Dungeon (trial) palette — used only when an activity is running.
// Floor reads as worn dark stone with no tile grid; rocks use the SAME
// shadow/fill/hilite layer pattern as the overworld's TERRAIN_POLYGONS so
// the dungeon feels like a region of the same world.
const TILE_BASE         = '#22201c'  // dark worn stone floor
const TILE_DARK         = '#15120e'  // mossy darker stains
const TILE_HILITE       = '#3a342a'  // rare wet-stone glints
const DUNGEON_ROCK_DARK   = '#1a1612'   // main rock fill
const DUNGEON_ROCK_SHADE  = '#0a0807'   // shadow under the rocks
const DUNGEON_ROCK_HILITE = '#3a3429'   // top-edge rim
const TORCH_GLOW     = '#ff6b1a'  // warm torch glow color
const TORCH_CORE     = '#ffd07a'  // torch flame core

// Enemy palette — dark crouched silhouette with a single red eye glint, sized
// to read at the same SCALE as trees/rocks. Don't-Starve-ish but threatening.
const ENEMY_BODY      = '#1f1411'
const ENEMY_SHADOW    = '#0a0807'
const ENEMY_EYE       = '#ff3a2a'  // brighter red for dread eye-glow
const ATTACK_FLASH    = '#fff3c0'
const ATTACK_FLASH_FG = '#ffd86b'
const ULT_FLASH       = '#bce8ff'
const ULT_FLASH_FG    = '#6ab9ff'
const SPENDER_FLASH    = '#ffb98a'
const SPENDER_FLASH_FG = '#e87a2a'
const ENEMY_TELEGRAPH = '#e84a2a'
// Bone Spear / Marrow Lance — spectral white core, lavender halo.
const LANCE_CORE = '#ffffff'
const LANCE_HALO = '#cfd9ff'
// Fireball — bright body, warm trail. Explosion uses ATTACK_FLASH yellows.
const FIREBALL_CORE = '#ffffff'
const FIREBALL_BODY = '#ffd07a'
const FIREBALL_TRAIL_COLORS = ['#ffb347', '#ff7a1a', '#a03000']
const FIREBALL_FLASH_FG = '#ffb347'
const FIREBALL_FLASH    = '#ffd07a'
// Meteor — molten red telegraph + impact, distinct from yellow attack and
// orange spender.
const METEOR_FLASH_FG = '#ff7a2a'
const METEOR_FLASH    = '#ffd070'
const METEOR_DARK     = '#5a1d04'
// Hailstorm — cold blue palette, distinct from ult's pale blue.
const HAIL_FILL   = '#7fb8e6'
const HAIL_RING   = '#bfe4ff'
const HAIL_FLAKE  = '#ffffff'
// Orbs — pale cyan, bright core.
const ORB_CORE    = '#ffffff'
const ORB_BODY    = '#bfe3ff'
const ORB_HALO    = '#7ec8ff'

// Deterministic interior particle offsets for Hailstorm — reused per zone.
const HAIL_FLAKES: { x: number; y: number; s: number }[] = [
  { x:  0.30, y: -0.60, s: 1.2 },
  { x: -0.55, y: -0.20, s: 0.6 },
  { x:  0.65, y: -0.05, s: 1.0 },
  { x: -0.25, y:  0.40, s: 0.4 },
  { x:  0.10, y:  0.55, s: 1.1 },
  { x: -0.70, y:  0.45, s: 0.8 },
  { x:  0.45, y:  0.65, s: 0.5 },
  { x: -0.10, y: -0.15, s: 0.9 },
]
// Target reticle — bright red arrows around the auto-targeted enemy (the
// dread-ARPG convention: red = "you're locked, this is hostile").
const RETICLE_COLOR = '#e63a2a'
// Damaging-Dash trail behind the player while in the dash window.
const DASH_TRAIL_COLOR = '#e6a83a'

// Tier colors for enemy HP bars — variations of red. Brighter/saturated for
// rarer enemies so champions still pop visually but stay on-theme.
const TIER_BAR_COLOR: Record<string, string> = {
  normal:   '#c0202a',
  elite:    '#e83040',
  champion: '#ff4040',
}

// Resource icon palette — 7 types, rendered with shape variation per type
const RESOURCE_COLORS = [
  '#c84236', // 0: berries (red)
  '#7d5230', // 1: twigs (brown)
  '#d9c478', // 2: straw (yellow)
  '#e8e3d2', // 3: flowers (white)
  '#9d7ec0', // 4: mushrooms (purple)
  '#4a8c2a', // 5: wood (green)
  '#9c948a', // 6: stone (gray)
]
const RESOURCE_DARK = '#1d1612'

// Camera zoom: 1 world unit = SCALE screen pixels. Lower = more zoomed out.
// Overworld is wide-open so we render small; dungeons get a 2× zoom so the
// arena feels intimate rather than swallowed by viewport whitespace.
const OVERWORLD_SCALE = 0.28
const DUNGEON_SCALE   = 0.60

// Screen shake on ultimate. Magnitude is in SCREEN px (not world units), so
// the kick reads the same regardless of zoom. Decays linearly to 0.
const SHAKE_DURATION_MS = 280
const SHAKE_MAGNITUDE = 10

// Crit burst — 6 radial particles expanding from the impact point.
const BURST_TTL_MS = 320
const BURST_PARTICLE_COUNT = 6
const BURST_MAX_RADIUS = 36   // world units the particles travel by TTL end
const BURST_COLOR = '#ffe060'

// Chevron player path (points along +x, will rotate to velocity angle).
// Sized in screen pixels — drawn inside a group that undoes the world scale.
const CHEVRON_PATH = Skia.Path.MakeFromSVGString(
  'M 18 0 L -12 -12 L -4 0 L -12 12 Z'
)!

// Player passive orbit: 3 cyan orbs riding a small ring around the player.
// Orbit radius is in screen pixels (drawn inside the inverse-scaled group).
const PLAYER_ORB_RADIUS_PX = 26
const PLAYER_ORB_COUNT = 3
const PLAYER_ORB_PERIOD_MS = 1800

// Auto-target arrow path — a small chevron pointing in +x. Drawn 4× rotated
// around the targeted enemy, each one squeezing toward the body. Authored in
// a 16×16 box so it scales cleanly.
const TARGET_ARROW_PATH = Skia.Path.MakeFromSVGString(
  'M 0 -5 L 7 0 L 0 5 L 2 0 Z',
)!

// Diamond glyph for loot drops, world-space units (rotation-free, just a rhombus).
const LOOT_DIAMOND_PATH = Skia.Path.MakeFromSVGString(
  'M 0 -16 L 16 0 L 0 16 L -16 0 Z'
)!

// Beam reaches this many world units above the drop's ground position.
const LOOT_BEAM_HEIGHT = 110
const LOOT_BEAM_WIDTH  = 6

// Rarity-driven beam dynamics. Higher rarities pulse harder + add a wider,
// taller halo so legendaries actually feel rare from across the map.
// Returns: { ampMult: pulse amplitude (added to base opacity),
//            speed: rad/sec, sizeBoost: extra beam height fraction,
//            haloWidthMult: how wide the outer glow is relative to LOOT_BEAM_WIDTH }
const RARITY_BEAM: Record<string, { ampMult: number; speed: number; sizeBoost: number; haloWidthMult: number }> = {
  common:    { ampMult: 0.00, speed: 0,   sizeBoost: 0,    haloWidthMult: 3 },
  magic:     { ampMult: 0.08, speed: 1.2, sizeBoost: 0.05, haloWidthMult: 3.5 },
  rare:      { ampMult: 0.18, speed: 1.8, sizeBoost: 0.20, haloWidthMult: 4.5 },
  legendary: { ampMult: 0.32, speed: 2.6, sizeBoost: 0.45, haloWidthMult: 6 },
}

interface WorldCanvasProps {
  game: WorldGame
  inputRef: React.MutableRefObject<{ dx: number; dy: number }>
  onViewportSize?: (w: number, h: number) => void
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ game, inputRef, onViewportSize }) => {
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  // Tick state forces a re-render each frame; the actual values live in refs.
  const [, setTick] = useState(0)

  const playerRef = useRef({
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    angle: 0,
  })
  const combatRef = useRef<{
    enemies: readonly Enemy[]
    activeFlashes: readonly AttackFlash[]
    beamFlashes: readonly BeamFlash[]
    projectiles: readonly Projectile[]
    pendingMeteors: readonly PendingMeteor[]
    dotZones: readonly DotZone[]
    orbs: readonly { x: number; y: number; r: number }[]
    damageNumbers: readonly DamageNumber[]
    loot: readonly LootDrop[]
    arenaWalls: readonly ArenaRect[]
    targetEnemyId: number | null
    nearestNpc: NPC | null
    dashEndsAt: number
    isDead: boolean
    activityKind: 'idle' | 'running' | 'complete'
    arenaPolygons: readonly number[][]
  }>({
    enemies: [],
    activeFlashes: [],
    beamFlashes: [],
    projectiles: [],
    pendingMeteors: [],
    dotZones: [],
    orbs: [],
    damageNumbers: [],
    loot: [],
    arenaWalls: [],
    targetEnemyId: null,
    nearestNpc: null,
    dashEndsAt: 0,
    isDead: false,
    activityKind: 'idle',
    arenaPolygons: [],
  })
  // Recent player positions for the damaging-dash trail. Kept as a ref so we
  // don't trigger renders for trail updates; the rAF loop re-renders anyway.
  const dashTrailRef = useRef<{ x: number; y: number; at: number }[]>([])
  // Screen-shake bookkeeping. Triggered when a new ultimate flash arrives;
  // decays linearly to zero over `SHAKE_DURATION_MS`. `lastUltStartedAt`
  // tracks the most recent ult we've reacted to so we don't re-shake the
  // same flash every frame.
  const shakeRef = useRef({ untilMs: 0, magnitude: 0, lastUltStartedAt: 0 })
  // Crit-burst particle system. Each entry is one burst — 6 radial particles
  // expanding from the crit's spawn point, fading over BURST_TTL_MS. We
  // append on detection of a new 'crit'-kind damage number and prune by age.
  const critBurstsRef = useRef<{ id: number; x: number; y: number; spawnedAt: number }[]>([])
  const lastCritIdRef = useRef(0)
  const lastAngleRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    let rafId = 0
    const loop = (time: number) => {
      const delta = lastTimeRef.current !== null
        ? Math.min((time - lastTimeRef.current) / 16.667, 3)
        : 1
      lastTimeRef.current = time

      const state = game.moveByDelta(inputRef.current.dx, inputRef.current.dy, delta)

      // Lock rotation to velocity direction; freeze on stop.
      if (Math.abs(state.velocityX) > 0.08 || Math.abs(state.velocityY) > 0.08) {
        lastAngleRef.current = Math.atan2(state.velocityY, state.velocityX)
      }

      playerRef.current = {
        x: state.playerX,
        y: state.playerY,
        angle: lastAngleRef.current,
      }
      combatRef.current = {
        enemies: state.enemies,
        activeFlashes: state.activeFlashes,
        beamFlashes: state.beamFlashes,
        projectiles: state.projectiles,
        pendingMeteors: state.pendingMeteors,
        dotZones: state.dotZones,
        orbs: state.orbs,
        damageNumbers: state.damageNumbers,
        loot: state.loot,
        arenaWalls: state.arenaWalls,
        targetEnemyId: state.targetEnemyId,
        nearestNpc: state.nearestNpc,
        dashEndsAt: 0,
        isDead: state.isDead,
        activityKind: state.activityState.kind,
        arenaPolygons: state.arenaPolygons,
      }
      // Dash trail bookkeeping. WorldState doesn't expose dashEndsAt directly,
      // so we infer "dashing now" by player speed: above MAX_SPEED indicates
      // the clamp was lifted by the dash window.
      const speed = Math.hypot(state.velocityX, state.velocityY)
      if (speed > 8) {
        dashTrailRef.current.push({ x: state.playerX, y: state.playerY, at: time })
      }
      dashTrailRef.current = dashTrailRef.current.filter((p) => time - p.at < 220)

      // Detect a brand-new ultimate flash → start a screen-shake window. We
      // key on `startedAt` of the most recent 'ultimate' flash so consecutive
      // ult casts each retrigger but a still-playing one doesn't shake on
      // every frame.
      const ultFlash = state.activeFlashes.find((f) => f.kind === 'ultimate')
      if (ultFlash && ultFlash.startedAt !== shakeRef.current.lastUltStartedAt) {
        shakeRef.current.lastUltStartedAt = ultFlash.startedAt
        shakeRef.current.untilMs = Date.now() + SHAKE_DURATION_MS
        shakeRef.current.magnitude = SHAKE_MAGNITUDE
      }

      // Crit burst — for any 'crit' damage number with an id we haven't seen,
      // queue a particle burst at its world-space position. Damage numbers
      // expose monotonically increasing ids, so > tracking is enough.
      const nowMs = Date.now()
      let maxCritId = lastCritIdRef.current
      for (const d of state.damageNumbers) {
        if (d.kind !== 'crit') continue
        if (d.id <= lastCritIdRef.current) continue
        critBurstsRef.current.push({ id: d.id, x: d.x, y: d.y, spawnedAt: nowMs })
        if (d.id > maxCritId) maxCritId = d.id
      }
      lastCritIdRef.current = maxCritId
      // Prune expired bursts.
      critBurstsRef.current = critBurstsRef.current.filter((b) => nowMs - b.spawnedAt < BURST_TTL_MS)
      setTick((t) => (t + 1) & 0xffff)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [game, inputRef])

  // Pre-record the static world once. Heavy work, runs on first render only.
  const staticPicture = useMemo(
    () =>
      createPicture((canvas) => {
        const paint = Skia.Paint()

        // 1. Grass base + darker grass patches for variation
        paint.setColor(Skia.Color(GRASS_BASE))
        canvas.drawRect({ x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT }, paint)
        paint.setColor(Skia.Color(GRASS_PATCH))
        // Deterministic scatter of ~80 large soft patches across the world
        let prng = 0x13579bdf
        const nextRand = () => {
          prng = (prng * 1103515245 + 12345) & 0x7fffffff
          return prng / 0x7fffffff
        }
        for (let i = 0; i < 80; i++) {
          const x = nextRand() * WORLD_WIDTH
          const y = nextRand() * WORLD_HEIGHT
          const r = 120 + nextRand() * 180
          canvas.drawCircle(x, y, r, paint)
        }

        // 2. Dirt roads — darker edge stroke under a warm tan core. The edge
        //    gives the road a hand-painted feel, like it was outlined first.
        const roadEdgePaint = Skia.Paint()
        roadEdgePaint.setColor(Skia.Color(DIRT_PATH_EDGE))
        roadEdgePaint.setStyle(1)
        roadEdgePaint.setStrokeJoin(1)
        roadEdgePaint.setStrokeCap(1)
        const roadPaint = Skia.Paint()
        roadPaint.setColor(Skia.Color(DIRT_PATH))
        roadPaint.setStyle(1)
        roadPaint.setStrokeJoin(1)
        roadPaint.setStrokeCap(1)
        for (const road of MAIN_ROADS) {
          if (road.points.length < 2) continue
          const p = Skia.Path.Make()
          p.moveTo(road.points[0].x, road.points[0].y)
          for (let i = 1; i < road.points.length; i++) {
            p.lineTo(road.points[i].x, road.points[i].y)
          }
          roadEdgePaint.setStrokeWidth(road.width + 6)
          canvas.drawPath(p, roadEdgePaint)
          roadPaint.setStrokeWidth(road.width)
          canvas.drawPath(p, roadPaint)
        }

        // 3. Town grounds — sandy clearings inside town walls
        paint.setColor(Skia.Color(TOWN_GROUND_C))
        for (const g of TOWN_GROUNDS) {
          canvas.drawRect({ x: g.x, y: g.y, width: g.w, height: g.h }, paint)
        }

        // 4. Rocky impassable terrain — marching-squares polygons.
        //    Layered: shadow underlay (offset darker) + main fill + thin highlight stroke
        //    to give the rocky regions some sculpted depth.
        const terrainPath = Skia.Path.Make()
        for (const poly of TERRAIN_POLYGONS) {
          terrainPath.moveTo(poly[0], poly[1])
          for (let i = 2; i < poly.length; i += 2) {
            terrainPath.lineTo(poly[i], poly[i + 1])
          }
          terrainPath.close()
        }

        // 4a. shadow underlay (small offset so the visible edge sits very close
        //     to the collision boundary)
        canvas.save()
        canvas.translate(2, 3)
        paint.setColor(Skia.Color(ROCK_SHADE))
        canvas.drawPath(terrainPath, paint)
        canvas.restore()

        // 4b. main rock fill — collision edge is here
        paint.setColor(Skia.Color(ROCK_DARK))
        canvas.drawPath(terrainPath, paint)

        // 4c. thin lighter rim along the top to suggest depth
        const rockRim = Skia.Paint()
        rockRim.setColor(Skia.Color(ROCK_HILITE))
        rockRim.setStyle(1)
        rockRim.setStrokeWidth(2)
        canvas.drawPath(terrainPath, rockRim)

        // 5. Town walls
        paint.setColor(Skia.Color(WALL_COLOR))
        for (const w of ALL_WALLS) {
          canvas.drawRect({ x: w.x, y: w.y, width: w.w, height: w.h }, paint)
        }

        // 6. Buildings — authored SVG hut sprite (3/4-perspective wooden hut
        //    with shingled roof). Rotated 90° for tall buildings so the
        //    "wider than tall" sprite proportions still match the footprint.
        //    Falls back to a flat-colored rect if SVG parsing failed at boot
        //    (defensive — should never trip in practice).
        if (HUT_SVG) {
          for (const b of ALL_BUILDINGS) {
            canvas.save()
            if (b.h > b.w) {
              // Rotate the canvas 90° around the building's center, then draw
              // the horizontal sprite into the rotated h×w box so it lines up
              // with the building's vertical footprint.
              canvas.translate(b.x + b.w / 2, b.y + b.h / 2)
              canvas.rotate(90, 0, 0)
              canvas.translate(-b.h / 2, -b.w / 2)
              canvas.drawSvg(HUT_SVG, b.h, b.w)
            } else {
              canvas.translate(b.x, b.y)
              canvas.drawSvg(HUT_SVG, b.w, b.h)
            }
            canvas.restore()
          }
        } else {
          paint.setColor(Skia.Color(BUILDING_COLOR))
          for (const b of ALL_BUILDINGS) {
            canvas.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, paint)
          }
        }

        // 7. Trees — painted blob-cluster. Ground shadow, then a dark outline
        //    formed by 3 oversized dark circles, then 3 canopy circles inside,
        //    then a single highlight blob on the upper-left.
        const treeShadowPaint = Skia.Paint()
        treeShadowPaint.setColor(Skia.Color(TREE_SHADOW))
        treeShadowPaint.setAlphaf(0.45)
        const treeDarkPaint = Skia.Paint()
        treeDarkPaint.setColor(Skia.Color(TREE_DARK))
        const treeCanopyPaint = Skia.Paint()
        treeCanopyPaint.setColor(Skia.Color(TREE_CANOPY))
        const treeHiPaint = Skia.Paint()
        treeHiPaint.setColor(Skia.Color(TREE_HILITE))
        // Cluster offsets (in r-relative units) — three lobes that overlap to
        // form one blobby canopy. Deterministic; baked into the static picture.
        const CANOPY_LOBES: { dx: number; dy: number; s: number }[] = [
          { dx: -0.55, dy:  0.05, s: 0.82 },
          { dx:  0.55, dy:  0.10, s: 0.78 },
          { dx:  0.00, dy: -0.55, s: 0.92 },
        ]
        for (const t of FIELD_TREES) {
          // Soft ground shadow, flattened ellipse-ish via two stacked circles
          canvas.drawCircle(t.x + 4, t.y + t.r * 0.85, t.r * 0.95, treeShadowPaint)
          // Dark outline lobes (slightly larger than the canopy fill)
          for (const lobe of CANOPY_LOBES) {
            canvas.drawCircle(
              t.x + lobe.dx * t.r,
              t.y + lobe.dy * t.r,
              t.r * lobe.s + 3.5,
              treeDarkPaint,
            )
          }
          // Canopy fill lobes
          for (const lobe of CANOPY_LOBES) {
            canvas.drawCircle(
              t.x + lobe.dx * t.r,
              t.y + lobe.dy * t.r,
              t.r * lobe.s,
              treeCanopyPaint,
            )
          }
          // Single highlight on the upper-left (light reads as coming from
          // top-left throughout the scene).
          canvas.drawCircle(t.x - t.r * 0.45, t.y - t.r * 0.55, t.r * 0.42, treeHiPaint)
        }

        // 8. Rocks (individual scattered) — outlined rounded shape with a
        //    bright top-side highlight curve. Reads as a hand-drawn pebble.
        const rockShadowPaint = Skia.Paint()
        rockShadowPaint.setColor(Skia.Color(ROCK_SHAD))
        rockShadowPaint.setAlphaf(0.5)
        const rockOutPaint = Skia.Paint()
        rockOutPaint.setColor(Skia.Color(ROCK_OUT))
        const rockFillPaint = Skia.Paint()
        rockFillPaint.setColor(Skia.Color(ROCK_FILL))
        const rockHiPaint = Skia.Paint()
        rockHiPaint.setColor(Skia.Color(ROCK_LIGHT))
        for (const r of FIELD_ROCKS) {
          // Ground shadow (offset down-right, slightly squashed)
          canvas.drawCircle(r.x + 3, r.y + r.r * 0.55, r.r * 0.95, rockShadowPaint)
          // Dark outline
          canvas.drawCircle(r.x, r.y, r.r * 0.95, rockOutPaint)
          // Main fill
          canvas.drawCircle(r.x, r.y, r.r * 0.82, rockFillPaint)
          // Top-side highlight: a smaller circle clipped by drawing it offset
          // up-left so only the visible cap reads as a lit edge.
          canvas.drawCircle(r.x - r.r * 0.20, r.y - r.r * 0.32, r.r * 0.50, rockHiPaint)
        }

        // 9. Resource nodes — every node rendered (no thinning), each as a
        //    type-specific shape sized to read at SCALE=0.28.
        const resourcePaints = RESOURCE_COLORS.map((c) => {
          const p = Skia.Paint()
          p.setColor(Skia.Color(c))
          return p
        })
        const resourceDarkPaint = Skia.Paint()
        resourceDarkPaint.setColor(Skia.Color(RESOURCE_DARK))
        resourceDarkPaint.setStyle(1)
        resourceDarkPaint.setStrokeWidth(3)
        const twigStroke = Skia.Paint()
        twigStroke.setColor(Skia.Color('#5a3a20'))
        twigStroke.setStyle(1)
        twigStroke.setStrokeWidth(5)
        const strawStroke = Skia.Paint()
        strawStroke.setColor(Skia.Color('#a08442'))
        strawStroke.setStyle(1)
        strawStroke.setStrokeWidth(4)
        const stemPaint = Skia.Paint()
        stemPaint.setColor(Skia.Color('#d9c89e'))
        const woodTrunkPaint = Skia.Paint()
        woodTrunkPaint.setColor(Skia.Color('#5a3a20'))
        for (const n of RESOURCE_NODES) {
          const fill = resourcePaints[n.type]
          switch (n.type) {
            case 0: {
              // Berries: 3-circle cluster
              canvas.drawCircle(n.x - 11, n.y + 4, 9, fill)
              canvas.drawCircle(n.x + 9,  n.y + 2, 9, fill)
              canvas.drawCircle(n.x,      n.y - 9, 9, fill)
              break
            }
            case 1: {
              // Twigs: two crossed strokes
              const p = Skia.Path.Make()
              p.moveTo(n.x - 14, n.y - 7); p.lineTo(n.x + 14, n.y + 7)
              p.moveTo(n.x + 14, n.y - 10); p.lineTo(n.x - 12, n.y + 12)
              canvas.drawPath(p, twigStroke)
              break
            }
            case 2: {
              // Straw / grass tufts
              const p = Skia.Path.Make()
              p.moveTo(n.x - 11, n.y + 9); p.lineTo(n.x - 9, n.y - 12)
              p.moveTo(n.x,      n.y + 9); p.lineTo(n.x,     n.y - 14)
              p.moveTo(n.x + 11, n.y + 9); p.lineTo(n.x + 9, n.y - 11)
              canvas.drawPath(p, strawStroke)
              break
            }
            case 3: {
              // Flower: 4 petals + dark center
              canvas.drawCircle(n.x - 9, n.y, 7, fill)
              canvas.drawCircle(n.x + 9, n.y, 7, fill)
              canvas.drawCircle(n.x, n.y - 9, 7, fill)
              canvas.drawCircle(n.x, n.y + 9, 7, fill)
              canvas.drawCircle(n.x, n.y, 5, resourceDarkPaint)
              break
            }
            case 4: {
              // Mushroom: cap + stem
              canvas.drawRect({ x: n.x - 5, y: n.y + 2, width: 10, height: 14 }, stemPaint)
              canvas.drawCircle(n.x, n.y, 14, fill)
              canvas.drawCircle(n.x - 5, n.y - 2, 3, resourceDarkPaint)
              canvas.drawCircle(n.x + 5, n.y, 2.5, resourceDarkPaint)
              break
            }
            case 5: {
              // Wood: a short log silhouette
              const trunk = Skia.Path.Make()
              trunk.moveTo(n.x - 14, n.y - 4); trunk.lineTo(n.x + 14, n.y - 4)
              trunk.lineTo(n.x + 14, n.y + 6); trunk.lineTo(n.x - 14, n.y + 6); trunk.close()
              canvas.drawPath(trunk, woodTrunkPaint)
              canvas.drawCircle(n.x - 14, n.y + 1, 5, fill)
              canvas.drawCircle(n.x + 14, n.y + 1, 5, fill)
              canvas.drawCircle(n.x - 14, n.y + 1, 2, resourceDarkPaint)
              canvas.drawCircle(n.x + 14, n.y + 1, 2, resourceDarkPaint)
              break
            }
            case 6: {
              // Stone: angular 3-stone cluster
              canvas.drawCircle(n.x - 8, n.y + 3, 9, fill)
              canvas.drawCircle(n.x + 9, n.y + 1, 10, fill)
              canvas.drawCircle(n.x - 1, n.y - 9, 8, fill)
              // small dark pits
              canvas.drawCircle(n.x - 6, n.y + 4, 2, resourceDarkPaint)
              canvas.drawCircle(n.x + 8, n.y + 2, 2.5, resourceDarkPaint)
              break
            }
          }
        }

        // 10. NPCs (blacksmiths) — anvil silhouette with a warm forge glow
        const anvilDark = Skia.Paint()
        anvilDark.setColor(Skia.Color('#2a2520'))
        const anvilMid = Skia.Paint()
        anvilMid.setColor(Skia.Color('#4d463d'))
        const forgeGlow = Skia.Paint()
        forgeGlow.setColor(Skia.Color('#e8782a'))
        const npcShadow = Skia.Paint()
        npcShadow.setColor(Skia.Color('#1a140e'))
        for (const npc of NPCS) {
          if (npc.type !== 'blacksmith') continue
          // soft ground shadow
          canvas.drawCircle(npc.x + 2, npc.y + 18, 18, npcShadow)
          // anvil base
          canvas.drawRect({ x: npc.x - 14, y: npc.y + 6, width: 28, height: 8 }, anvilDark)
          // anvil body (waisted)
          canvas.drawRect({ x: npc.x - 6, y: npc.y - 4, width: 12, height: 10 }, anvilDark)
          // anvil top (the face)
          canvas.drawRect({ x: npc.x - 18, y: npc.y - 12, width: 36, height: 8 }, anvilMid)
          // pointy horn
          const horn = Skia.Path.Make()
          horn.moveTo(npc.x - 18, npc.y - 12)
          horn.lineTo(npc.x - 28, npc.y - 6)
          horn.lineTo(npc.x - 18, npc.y - 4)
          horn.close()
          canvas.drawPath(horn, anvilMid)
          // forge glow under the anvil
          canvas.drawCircle(npc.x, npc.y + 16, 6, forgeGlow)
        }
      }),
    []
  )

  // Dungeon floor — flat dark stone with scattered noise stains. NO tile
  // grid (user feedback: the grid reads as "a bunch of blocks", not a real
  // environment). Pre-recorded once; the noise stains are deterministic and
  // baked in.
  const dungeonFloorPicture = useMemo(
    () =>
      createPicture((canvas) => {
        const base = Skia.Paint()
        base.setColor(Skia.Color(TILE_BASE))
        canvas.drawRect({ x: ARENA_ORIGIN_X, y: ARENA_ORIGIN_Y, width: ARENA_WIDTH, height: ARENA_HEIGHT }, base)

        // Sparse darker mossy patches scattered across the floor so it isn't
        // a perfect flat color.
        const dark = Skia.Paint()
        dark.setColor(Skia.Color(TILE_DARK))
        const hilite = Skia.Paint()
        hilite.setColor(Skia.Color(TILE_HILITE))
        let prng = 0x9e3779b9
        const rand = () => { prng = (prng * 1664525 + 1013904223) & 0x7fffffff; return prng / 0x7fffffff }
        const patchCount = 140
        for (let i = 0; i < patchCount; i++) {
          const x = ARENA_ORIGIN_X + rand() * ARENA_WIDTH
          const y = ARENA_ORIGIN_Y + rand() * ARENA_HEIGHT
          canvas.drawCircle(x, y, 6 + rand() * 14, dark)
        }
        // Occasional wet-stone glint
        for (let i = 0; i < 40; i++) {
          const x = ARENA_ORIGIN_X + rand() * ARENA_WIDTH
          const y = ARENA_ORIGIN_Y + rand() * ARENA_HEIGHT
          canvas.drawCircle(x, y, 1.5, hilite)
        }
      }),
    [],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setViewport({ w: width, h: height })
    onViewportSize?.(width, height)
  }

  const { w: vw, h: vh } = viewport
  const { x: px, y: py, angle } = playerRef.current
  const { enemies, activeFlashes, beamFlashes, projectiles, pendingMeteors, dotZones, orbs, damageNumbers, loot, arenaPolygons, targetEnemyId, nearestNpc, activityKind } = combatRef.current
  const targetEnemy = targetEnemyId != null
    ? enemies.find((e) => e.id === targetEnemyId)
    : undefined
  // Trials/survival render a self-contained dungeon scene. Camera clamps to
  // arena bounds (instead of world bounds) so the overworld never bleeds
  // through, and we skip drawing the overworld static Picture entirely.
  const inDungeon = activityKind === 'running'

  // Effective zoom — dungeons are tighter so the arena fills the viewport.
  // Shadows the module-level OVERWORLD/DUNGEON constants for every SCALE
  // reference below.
  const SCALE = inDungeon ? DUNGEON_SCALE : OVERWORLD_SCALE

  // Camera centers on player, clamped to either the world or the arena
  // bounds depending on scene. Per-axis: if bounds fit inside the viewport,
  // CENTER the bounds (instead of pinning to one edge). Otherwise standard
  // follow-with-clamp.
  const camBoundsX = inDungeon ? ARENA_ORIGIN_X : 0
  const camBoundsY = inDungeon ? ARENA_ORIGIN_Y : 0
  const camBoundsW = inDungeon ? ARENA_WIDTH  : WORLD_WIDTH
  const camBoundsH = inDungeon ? ARENA_HEIGHT : WORLD_HEIGHT
  const worldScreenW = camBoundsW * SCALE
  const worldScreenH = camBoundsH * SCALE
  const fitOrFollow = (
    viewSize: number, boundsStart: number, boundsSize: number, playerCoord: number,
  ): number => {
    const boundsScreen = boundsSize * SCALE
    if (boundsScreen <= viewSize) {
      // Bounds fit — center them, ignore player position
      return viewSize / 2 - (boundsStart + boundsSize / 2) * SCALE
    }
    const ideal = -(playerCoord * SCALE - viewSize / 2)
    // Range: arena left flush with view left (max) → arena right flush with view right (min).
    const maxOffset = -boundsStart * SCALE
    const minOffset = viewSize - (boundsStart + boundsSize) * SCALE
    return Math.min(maxOffset, Math.max(minOffset, ideal))
  }
  const baseOx = vw > 0 ? fitOrFollow(vw, camBoundsX, camBoundsW, px) : 0
  const baseOy = vh > 0 ? fitOrFollow(vh, camBoundsY, camBoundsH, py) : 0
  // Apply shake — fresh random offset per frame, magnitude decays linearly.
  // The cull bounds use the un-shaken ox/oy so we don't pop content at the
  // edges during a kick.
  const shakeRemaining = Math.max(0, shakeRef.current.untilMs - Date.now())
  const shakeT = SHAKE_DURATION_MS > 0 ? shakeRemaining / SHAKE_DURATION_MS : 0
  const shakeMag = shakeRef.current.magnitude * shakeT
  const shakeX = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag * 2 : 0
  const shakeY = shakeMag > 0 ? (Math.random() - 0.5) * shakeMag * 2 : 0
  const ox = baseOx + shakeX
  const oy = baseOy + shakeY

  // Viewport bounds in world units, with a margin so enemies don't pop in at
  // the edge. Used to cull the dynamic enemy render — drawing all 400 each
  // frame is wasteful when only ~30 are on-screen. Uses the un-shaken offset
  // so a screen-shake at the world edge doesn't strobe content in and out.
  const worldVisibleMargin = 60
  const worldLeft   = vw > 0 ? -baseOx / SCALE - worldVisibleMargin : 0
  const worldTop    = vh > 0 ? -baseOy / SCALE - worldVisibleMargin : 0
  const worldRight  = vw > 0 ? worldLeft + vw / SCALE + worldVisibleMargin * 2 : WORLD_WIDTH
  const worldBottom = vh > 0 ? worldTop  + vh / SCALE + worldVisibleMargin * 2 : WORLD_HEIGHT

  const now = Date.now()

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Pitch-black backdrop — covers anything outside the camera-clamped
            scene (matters most for dungeons, where any meadow leak would
            break the illusion). */}
        {vw > 0 && vh > 0 && (
          <Rect x={0} y={0} width={vw} height={vh} color="#000000" />
        )}
        <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: SCALE }]}>
          {/* Pick the static scene by activity state — overworld at idle,
              dungeon floor when a trial/survival run is active. */}
          {inDungeon ? (
            <Picture picture={dungeonFloorPicture} />
          ) : (
            <Picture picture={staticPicture} />
          )}

          {/* NPC interaction glow — overworld only. */}
          {!inDungeon && nearestNpc && (() => {
            const pulse = 0.45 + 0.25 * Math.sin(now / 220)
            return (
              <Group>
                <Circle
                  cx={nearestNpc.x} cy={nearestNpc.y} r={50}
                  color="#ffd86b"
                  opacity={pulse * 0.18}
                />
                <Circle
                  cx={nearestNpc.x} cy={nearestNpc.y} r={56}
                  color="#ffd86b"
                  style="stroke"
                  strokeWidth={2}
                  opacity={pulse}
                />
              </Group>
            )
          })()}

          {/* Dungeon rock polygons — marching-squares output from the
              dungeon noise field. Rendered as ORGANIC outcrops with the same
              shadow + fill + hilite layer pattern as overworld TERRAIN_POLYGONS,
              so the dungeon reads as a cavern within the same world. */}
          {arenaPolygons.length > 0 && (() => {
            // Build one combined path so the layered passes (shadow, fill,
            // hilite) only need one drawPath per pass per layer.
            const combined = Skia.Path.Make()
            for (const poly of arenaPolygons) {
              if (poly.length < 6) continue
              combined.moveTo(poly[0], poly[1])
              for (let k = 2; k < poly.length; k += 2) {
                combined.lineTo(poly[k], poly[k + 1])
              }
              combined.close()
            }
            return (
              <Group>
                {/* shadow underlay (offset darker) */}
                <Group transform={[{ translateX: 3 }, { translateY: 4 }]}>
                  <Path path={combined} color={DUNGEON_ROCK_SHADE} />
                </Group>
                {/* main rock fill */}
                <Path path={combined} color={DUNGEON_ROCK_DARK} />
                {/* hilite rim along edges */}
                <Path path={combined} color={DUNGEON_ROCK_HILITE} style="stroke" strokeWidth={2} />
              </Group>
            )
          })()}

          {/* Torches at the 4 arena corners — warm radial glow + flicker.
              Only drawn in dungeon scenes (no torches in the overworld). */}
          {inDungeon && (() => {
            const flick = 0.85 + 0.15 * Math.sin(now / 95) * Math.cos(now / 137)
            const torches = [
              { x: ARENA_ORIGIN_X + 60,           y: ARENA_ORIGIN_Y + 60 },
              { x: ARENA_END_X - 60,              y: ARENA_ORIGIN_Y + 60 },
              { x: ARENA_ORIGIN_X + 60,           y: ARENA_END_Y - 60 },
              { x: ARENA_END_X - 60,              y: ARENA_END_Y - 60 },
            ]
            return (
              <Group>
                {torches.map((t, i) => (
                  <Group key={`tch${i}`}>
                    <Circle cx={t.x} cy={t.y} r={200 * flick} color={TORCH_GLOW} opacity={0.12} />
                    <Circle cx={t.x} cy={t.y} r={110 * flick} color={TORCH_GLOW} opacity={0.22} />
                    <Circle cx={t.x} cy={t.y} r={28 * flick}  color={TORCH_GLOW} opacity={0.55} />
                    <Circle cx={t.x} cy={t.y} r={9 * flick}   color={TORCH_CORE} opacity={0.95} />
                  </Group>
                ))}
              </Group>
            )
          })()}

          {/* Loot drops — rarity-colored beam + ground diamond. Rendered
              BEFORE enemies so an enemy standing on a drop hides the diamond
              but the beam pokes up above. */}
          {loot.map((l) => {
            if (l.x < worldLeft || l.x > worldRight || l.y < worldTop || l.y > worldBottom) {
              return null
            }
            const color = RARITY_COLORS[l.item.rarity]
            const beamCfg = RARITY_BEAM[l.item.rarity] ?? RARITY_BEAM.common
            // Phase is per-drop (offset by spawnedAt so neighboring drops aren't
            // synchronized) at the rarity's own speed. Pulse adds to the base
            // opacity rather than replacing it so commons still show clearly.
            const phase = ((now - l.spawnedAt) / 1000) * beamCfg.speed
            const pulse = beamCfg.ampMult > 0
              ? beamCfg.ampMult * (0.5 + 0.5 * Math.sin(phase))
              : 0
            const haloOpacity = 0.18 + pulse * 0.7
            const coreOpacity = 0.7 + pulse
            const beamHeight = LOOT_BEAM_HEIGHT * (1 + beamCfg.sizeBoost)
            const haloWidth = LOOT_BEAM_WIDTH * beamCfg.haloWidthMult
            const beamTop = l.y - beamHeight
            // Mild bob: drops gently move ±3 world units over ~1.4s.
            const bob = Math.sin((now - l.spawnedAt) / 220) * 3
            return (
              <Group key={l.id}>
                {/* Beam halo (wider, faint, pulses with rarity) */}
                <Rect
                  x={l.x - haloWidth / 2}
                  y={beamTop}
                  width={haloWidth}
                  height={beamHeight}
                  color={color}
                  opacity={haloOpacity}
                />
                {/* Beam core */}
                <Rect
                  x={l.x - LOOT_BEAM_WIDTH / 2}
                  y={beamTop}
                  width={LOOT_BEAM_WIDTH}
                  height={beamHeight}
                  color={color}
                  opacity={Math.min(1, coreOpacity)}
                />
                {/* Ground diamond */}
                <Group transform={[{ translateX: l.x }, { translateY: l.y + bob }]}>
                  <Path path={LOOT_DIAMOND_PATH} color={color} style="fill" />
                  <Path
                    path={LOOT_DIAMOND_PATH}
                    color="#1a140f"
                    style="stroke"
                    strokeWidth={2}
                  />
                </Group>
              </Group>
            )
          })}

          {/* Hailstorm zones — render BEFORE enemies so the swirling AoE
              sits visually on the ground and enemies appear above it. */}
          {dotZones.map((z) => {
            const phase = (now - z.startedAt) / 1000
            const rotate = phase * 0.6
            const ringAlpha = 0.45 + 0.15 * Math.sin(phase * 6)
            const sinceLastTick = now - (z.nextTickAt - z.tickIntervalMs)
            const tickFlash = Math.max(0, 1 - sinceLastTick / 180)
            return (
              <Group key={`dz${z.id}`} transform={[
                { translateX: z.x }, { translateY: z.y }, { rotate },
              ]}>
                <Circle cx={0} cy={0} r={z.radius}
                  color={HAIL_FILL}
                  opacity={0.18 + 0.12 * tickFlash}
                />
                <Circle cx={0} cy={0} r={z.radius}
                  color={HAIL_RING}
                  style="stroke" strokeWidth={2}
                  opacity={ringAlpha}
                />
                {HAIL_FLAKES.map((f, i) => (
                  <Circle key={`f${i}`}
                    cx={f.x * z.radius} cy={f.y * z.radius}
                    r={2 + f.s}
                    color={HAIL_FLAKE}
                    opacity={0.5 + 0.4 * tickFlash}
                  />
                ))}
              </Group>
            )
          })}

          {/* Enemies — culled to viewport for perf */}
          {enemies.map((e, i) => {
            if (e.x < worldLeft || e.x > worldRight || e.y < worldTop || e.y > worldBottom) {
              return null
            }
            const showHpBar = e.hp < e.maxHp
            const hpFrac = Math.max(0, e.hp / e.maxHp)
            const barColor = TIER_BAR_COLOR[e.tier] ?? TIER_BAR_COLOR.normal
            // Dread pass — render enemies ~20% larger and silhouette-jagged.
            const renderR = e.radius * 1.18
            // Telegraph: fill an attack-range circle that ramps in alpha as the
            // wind-up progresses, signaling "dash out NOW".
            const inWindUp = e.windUpEndsAt > now
            const telegraphAlpha = inWindUp
              ? Math.min(0.55, 0.1 + 0.5 * (1 - (e.windUpEndsAt - now) / 450))
              : 0
            // Tier ring around bigger enemies for instant readability.
            const tierRingW = e.tier === 'champion' ? 3 : e.tier === 'elite' ? 2 : 0
            // Blood-red bloom — gentle pulse around the body, brighter for
            // higher tiers. Sells "monstrous" without spamming red everywhere.
            const bloomAlpha = (e.tier === 'champion' ? 0.22 : e.tier === 'elite' ? 0.16 : 0.10)
              * (0.85 + 0.15 * Math.sin(now / 240 + i * 1.3))
            // Pre-compute 9 jagged silhouette spikes around the body (radial
            // tips). Same count for every enemy; tier affects spike length.
            const spikeLenMult = e.tier === 'champion' ? 0.45 : e.tier === 'elite' ? 0.35 : 0.22
            const spikes: { tipX: number; tipY: number; b1x: number; b1y: number; b2x: number; b2y: number }[] = []
            for (let k = 0; k < 9; k++) {
              const a = (k / 9) * Math.PI * 2 + (i * 0.37)  // per-enemy rotation
              const tipR = renderR * (1 + spikeLenMult * (0.7 + (k % 3) * 0.15))
              const baseR = renderR * 0.92
              const perp = a + Math.PI / 2
              const half = renderR * 0.10
              spikes.push({
                tipX: e.x + Math.cos(a) * tipR,
                tipY: e.y + Math.sin(a) * tipR,
                b1x: e.x + Math.cos(a) * baseR + Math.cos(perp) * half,
                b1y: e.y + Math.sin(a) * baseR + Math.sin(perp) * half,
                b2x: e.x + Math.cos(a) * baseR - Math.cos(perp) * half,
                b2y: e.y + Math.sin(a) * baseR - Math.sin(perp) * half,
              })
            }
            return (
              <Group key={i}>
                {inWindUp && (
                  <Circle
                    cx={e.x} cy={e.y} r={ENEMY_ATTACK_RADIUS}
                    color={ENEMY_TELEGRAPH}
                    opacity={telegraphAlpha}
                  />
                )}
                {/* Vulnerable debuff — purple ring under the enemy with a
                    gentle pulse. Drawn below the body so the silhouette
                    still reads on top. */}
                {e.vulnerableUntil > now && (
                  <Circle
                    cx={e.x} cy={e.y} r={renderR + 6}
                    color="#b66cf2"
                    style="stroke" strokeWidth={2.5}
                    opacity={0.5 + 0.3 * Math.sin(now / 160)}
                  />
                )}
                {/* Blood-red bloom under the body */}
                <Circle cx={e.x} cy={e.y} r={renderR * 1.6} color="#a01010" opacity={bloomAlpha} />
                {/* Drop shadow */}
                <Circle cx={e.x + 3} cy={e.y + 5} r={renderR * 0.95} color={ENEMY_SHADOW} />
                {/* Jagged silhouette spikes (drawn under body so they read
                    as growing OUT of the creature, not stuck on top). */}
                {spikes.map((s, sk) => (
                  <Path
                    key={`sp${sk}`}
                    path={Skia.Path.MakeFromSVGString(
                      `M ${s.b1x} ${s.b1y} L ${s.tipX} ${s.tipY} L ${s.b2x} ${s.b2y} Z`,
                    )!}
                    color={ENEMY_BODY}
                  />
                ))}
                {/* Body */}
                <Circle cx={e.x} cy={e.y} r={renderR} color={ENEMY_BODY} />
                {/* Hit flash — brief white overlay on the body when struck.
                    Alpha decays linearly over ENEMY_HIT_FLASH_MS so the strike
                    reads from across the screen, then fades cleanly. */}
                {e.lastHitAt > 0 && now - e.lastHitAt < ENEMY_HIT_FLASH_MS && (
                  <Circle
                    cx={e.x} cy={e.y} r={renderR}
                    color="#ffffff"
                    opacity={1 - (now - e.lastHitAt) / ENEMY_HIT_FLASH_MS}
                  />
                )}
                {/* Tier silhouette overlay — elites get longer curved horns,
                    champions get a crown of spikes. These read AS THE BEAST
                    not as a hat. */}
                {e.tier === 'elite' && (
                  <Group>
                    {/* Left horn — bigger, curved further out */}
                    <Path
                      path={Skia.Path.MakeFromSVGString(
                        `M ${e.x - renderR * 0.55} ${e.y - renderR * 0.7} `
                        + `L ${e.x - renderR * 1.0} ${e.y - renderR * 1.8} `
                        + `L ${e.x - renderR * 0.20} ${e.y - renderR * 0.9} Z`,
                      )!}
                      color={ENEMY_BODY}
                    />
                    {/* Right horn */}
                    <Path
                      path={Skia.Path.MakeFromSVGString(
                        `M ${e.x + renderR * 0.55} ${e.y - renderR * 0.7} `
                        + `L ${e.x + renderR * 1.0} ${e.y - renderR * 1.8} `
                        + `L ${e.x + renderR * 0.20} ${e.y - renderR * 0.9} Z`,
                      )!}
                      color={ENEMY_BODY}
                    />
                  </Group>
                )}
                {e.tier === 'champion' && (
                  <Group>
                    {/* Crown of 5 long spikes */}
                    {[-0.9, -0.45, 0, 0.45, 0.9].map((rot, i) => {
                      const cx = e.x + Math.sin(rot) * renderR * 0.75
                      const cy = e.y - Math.cos(rot) * renderR * 0.75
                      const tipX = e.x + Math.sin(rot) * renderR * 1.9
                      const tipY = e.y - Math.cos(rot) * renderR * 1.9
                      const perp = rot + Math.PI / 2
                      const halfBase = renderR * 0.20
                      const b1x = cx + Math.sin(perp) * halfBase
                      const b1y = cy - Math.cos(perp) * halfBase
                      const b2x = cx - Math.sin(perp) * halfBase
                      const b2y = cy + Math.cos(perp) * halfBase
                      return (
                        <Path
                          key={i}
                          path={Skia.Path.MakeFromSVGString(
                            `M ${b1x} ${b1y} L ${tipX} ${tipY} L ${b2x} ${b2y} Z`,
                          )!}
                          color={ENEMY_BODY}
                        />
                      )
                    })}
                  </Group>
                )}
                {/* Tier ring on elite/champion — kept thin so it doesn't
                    compete with the HP bar above. */}
                {tierRingW > 0 && (
                  <Circle
                    cx={e.x} cy={e.y} r={renderR + 2}
                    color={barColor}
                    style="stroke"
                    strokeWidth={tierRingW}
                  />
                )}
                {/* Eye(s) — bright red with bloom halo. Sells the dread. */}
                {e.tier === 'champion' ? (
                  <Group>
                    <Circle cx={e.x - 5} cy={e.y - 5} r={9} color={ENEMY_EYE} opacity={0.30} />
                    <Circle cx={e.x + 5} cy={e.y - 5} r={9} color={ENEMY_EYE} opacity={0.30} />
                    <Circle cx={e.x - 5} cy={e.y - 5} r={4} color={ENEMY_EYE} />
                    <Circle cx={e.x + 5} cy={e.y - 5} r={4} color={ENEMY_EYE} />
                    <Circle cx={e.x - 5} cy={e.y - 5} r={1.5} color="#ffffff" />
                    <Circle cx={e.x + 5} cy={e.y - 5} r={1.5} color="#ffffff" />
                  </Group>
                ) : (
                  <Group>
                    <Circle cx={e.x - 4} cy={e.y - 4} r={8} color={ENEMY_EYE} opacity={0.30} />
                    <Circle cx={e.x + 4} cy={e.y - 4} r={8} color={ENEMY_EYE} opacity={0.30} />
                    <Circle cx={e.x - 4} cy={e.y - 4} r={3.5} color={ENEMY_EYE} />
                    <Circle cx={e.x + 4} cy={e.y - 4} r={3.5} color={ENEMY_EYE} />
                    <Circle cx={e.x - 4} cy={e.y - 4} r={1.2} color="#ffffff" />
                    <Circle cx={e.x + 4} cy={e.y - 4} r={1.2} color="#ffffff" />
                  </Group>
                )}
                {/* HP bar — thin red stroke above the enemy, no background
                    plate. Width matches the body; depletes from right.
                    Reference is clean and clinical: red = wound, no chrome. */}
                {showHpBar && (() => {
                  const barW = renderR * 2
                  const barY = e.y - renderR * 1.85
                  return (
                    <Rect
                      x={e.x - renderR}
                      y={barY}
                      width={barW * hpFrac}
                      height={3}
                      color={barColor}
                    />
                  )
                })()}
              </Group>
            )
          })}

          {/* Player AoE flashes — multiple can be active. The 'basic' kind
              renders as a forward sword-swing arc (swept around the player
              in the facing direction); everything else is a circular flash. */}
          {activeFlashes.map((f, idx) => {
            if (now >= f.endsAt) return null
            const total = f.endsAt - f.startedAt
            const remaining = (f.endsAt - now) / total
            const alpha = Math.max(0, Math.min(1, remaining))
            const isBasic = f.kind === 'basic'
            const isUlt = f.kind === 'ultimate'
            const isSpender = f.kind === 'spender'
            const isMeteor = f.kind === 'meteor'
            const isFireball = f.kind === 'fireball'

            if (isBasic && f.facing !== undefined) {
              // Sword swing: an annular arc segment in front of the player,
              // sweeping through a half-arc on either side of the facing angle.
              // Built as a closed path: outer arc CW + inner arc CCW + close.
              const halfArc = Math.PI / 3   // 60° → 120° total sweep
              const inner = 16              // ≈ player radius + a tiny gap
              const outer = f.radius
              const a0 = f.facing - halfArc
              const a1 = f.facing + halfArc
              const p = Skia.Path.Make()
              // Outer arc forward
              const steps = 14
              for (let i = 0; i <= steps; i++) {
                const a = a0 + (a1 - a0) * (i / steps)
                const x = f.x + Math.cos(a) * outer
                const y = f.y + Math.sin(a) * outer
                if (i === 0) p.moveTo(x, y); else p.lineTo(x, y)
              }
              // Inner arc back
              for (let i = steps; i >= 0; i--) {
                const a = a0 + (a1 - a0) * (i / steps)
                const x = f.x + Math.cos(a) * inner
                const y = f.y + Math.sin(a) * inner
                p.lineTo(x, y)
              }
              p.close()
              // Animate the swing — sweep wipe from a0 to a1 over the flash
              // window (so it visually "slashes" rather than appearing whole).
              // We approximate by ramping opacity higher in the middle of the
              // window and tapering at both ends.
              const t = 1 - remaining   // 0..1 from start to end of flash
              const sweepAlpha = alpha * (t < 0.4 ? t / 0.4 : 1)
              return (
                <Group key={`af${idx}`}>
                  <Path path={p} color={ATTACK_FLASH_FG} opacity={sweepAlpha * 0.7} />
                  <Path path={p} color={ATTACK_FLASH} style="stroke" strokeWidth={3}
                    opacity={sweepAlpha} />
                </Group>
              )
            }

            const fillColor =
              isUlt ? ULT_FLASH_FG :
              isSpender ? SPENDER_FLASH_FG :
              isMeteor ? METEOR_FLASH_FG :
              isFireball ? FIREBALL_FLASH_FG :
              ATTACK_FLASH_FG
            const ringColor =
              isUlt ? ULT_FLASH :
              isSpender ? SPENDER_FLASH :
              isMeteor ? METEOR_FLASH :
              isFireball ? FIREBALL_FLASH :
              ATTACK_FLASH
            const ringWidth = isUlt ? 6 : isMeteor ? 5 : isSpender ? 4 : 3
            return (
              <Group key={`af${idx}`}>
                <Circle
                  cx={f.x} cy={f.y} r={f.radius}
                  color={fillColor}
                  opacity={alpha * (isUlt ? 0.45 : 0.35)}
                />
                <Circle
                  cx={f.x} cy={f.y} r={f.radius}
                  color={ringColor}
                  opacity={alpha * 0.7}
                  style="stroke" strokeWidth={ringWidth}
                />
              </Group>
            )
          })}

          {/* Meteor telegraphs — pulsing ground marker + falling rock during
              the wind-up. Resolves into a `meteor`-kind flash on impact. */}
          {pendingMeteors.map((m) => {
            const total = m.impactAt - m.castAt
            const t = Math.max(0, Math.min(1, (now - m.castAt) / total))
            const pulse = 0.5 + 0.5 * Math.sin(now / 60)
            const rockDropFrom = 360
            const rockY = m.y - rockDropFrom * (1 - t)
            return (
              <Group key={`pm${m.id}`}>
                {/* Inner fill (faint, pulsing) */}
                <Circle cx={m.x} cy={m.y} r={m.radius}
                  color={METEOR_FLASH_FG}
                  opacity={0.18 + 0.12 * pulse}
                />
                {/* Outline that thickens as we approach impact */}
                <Circle cx={m.x} cy={m.y} r={m.radius}
                  color={METEOR_FLASH}
                  style="stroke"
                  strokeWidth={2 + 3 * t}
                  opacity={0.7}
                />
                {/* Falling rock — purely cosmetic, sells the wind-up */}
                <Circle cx={m.x} cy={rockY} r={12 + 4 * t} color={METEOR_DARK} />
              </Group>
            )
          })}

          {/* Fireball projectiles — bright body + comet trail. */}
          {projectiles.map((p) => (
            <Group key={`pj${p.id}`}>
              {p.trail.map((tp, i) => {
                const trailColor = FIREBALL_TRAIL_COLORS[Math.min(i, FIREBALL_TRAIL_COLORS.length - 1)]
                return (
                  <Circle
                    key={`pjt${p.id}-${i}`}
                    cx={tp.x} cy={tp.y}
                    r={5 - i * 1.2}
                    color={trailColor}
                    opacity={0.4 - i * 0.1}
                  />
                )
              })}
              <Circle cx={p.x} cy={p.y} r={9} color={FIREBALL_BODY} />
              <Circle cx={p.x} cy={p.y} r={5} color={FIREBALL_CORE} />
            </Group>
          ))}

          {/* Lance beams — thick stroked line, lavender halo over white core. */}
          {beamFlashes.map((b, idx) => {
            if (now >= b.endsAt) return null
            const total = b.endsAt - b.startedAt
            const remaining = (b.endsAt - now) / total
            const alpha = Math.max(0, Math.min(1, remaining))
            const p = Skia.Path.Make()
            p.moveTo(b.x1, b.y1)
            p.lineTo(b.x2, b.y2)
            return (
              <Group key={`bf${idx}`}>
                <Path
                  path={p} color={LANCE_HALO} style="stroke"
                  strokeWidth={b.width} strokeCap="round"
                  opacity={alpha * 0.45}
                />
                <Path
                  path={p} color={LANCE_CORE} style="stroke"
                  strokeWidth={b.width * 0.35} strokeCap="round"
                  opacity={alpha}
                />
              </Group>
            )
          })}

          {/* Crit bursts — radial particles from each crit's impact point.
              Drawn before the dash trail so they layer under the player. */}
          {critBurstsRef.current.map((b) => {
            const age = now - b.spawnedAt
            if (age >= BURST_TTL_MS) return null
            const t = age / BURST_TTL_MS
            const r = BURST_MAX_RADIUS * t
            const alpha = 1 - t
            const partR = 4 * (1 - t)
            return (
              <Group key={`crb${b.id}`}>
                {Array.from({ length: BURST_PARTICLE_COUNT }, (_, i) => {
                  const angle = (i / BURST_PARTICLE_COUNT) * Math.PI * 2
                  return (
                    <Circle
                      key={i}
                      cx={b.x + Math.cos(angle) * r}
                      cy={b.y + Math.sin(angle) * r}
                      r={partR}
                      color={BURST_COLOR}
                      opacity={alpha}
                    />
                  )
                })}
              </Group>
            )
          })}

          {/* Damaging-Dash trail — fading yellow circles behind the player. */}
          {dashTrailRef.current.map((p, i) => {
            const age = now - p.at
            if (age >= 220) return null
            const fade = 1 - age / 220
            return (
              <Circle
                key={`dt${i}`}
                cx={p.x} cy={p.y}
                r={12 * fade}
                color={DASH_TRAIL_COLOR}
                opacity={fade * 0.4}
              />
            )
          })}

          {/* Auto-target indicator — 4 small yellow arrows pinching inward
              at the locked enemy's cardinal points, scale-pulsing so it reads
              as live tracking. Plus a faint dotted aim-trail from the player
              toward the target so the player knows what they'll hit. */}
          {targetEnemy && (() => {
            const pulse = 0.85 + 0.18 * Math.sin(now / 160)
            const offset = (targetEnemy.radius + 14) * pulse
            const arrowScale = 3.0
            // Aim trail — series of small dots along the segment from player
            // toward the target. Spacing in WORLD units; only render those
            // between the player and the target with some headroom.
            const dx = targetEnemy.x - px
            const dy = targetEnemy.y - py
            const dist = Math.hypot(dx, dy)
            const trailDots: { x: number; y: number; o: number }[] = []
            if (dist > 40) {
              const ux = dx / dist
              const uy = dy / dist
              const step = 18
              const startD = 22
              const endD = dist - targetEnemy.radius - 10
              for (let d = startD; d < endD; d += step) {
                const fade = 1 - d / dist  // brighter near player, fades toward target
                trailDots.push({ x: px + ux * d, y: py + uy * d, o: 0.25 + fade * 0.35 })
              }
            }
            return (
              <Group>
                {trailDots.map((p, i) => (
                  <Circle key={`at${i}`} cx={p.x} cy={p.y} r={2.5}
                    color={RETICLE_COLOR} opacity={p.o}
                  />
                ))}
                {/* 4 arrows: left, top, right, bottom (rotated 0, 90, 180, 270 CCW
                    relative to "pointing at target center from outside"). */}
                {[0, 1, 2, 3].map((i) => {
                  const a = (i / 4) * Math.PI * 2
                  const ax = targetEnemy.x + Math.cos(a) * offset
                  const ay = targetEnemy.y + Math.sin(a) * offset
                  return (
                    <Group key={`tg${i}`} transform={[
                      { translateX: ax },
                      { translateY: ay },
                      { rotate: a + Math.PI }, // point inward, toward enemy
                      { scale: arrowScale },
                    ]}>
                      <Path path={TARGET_ARROW_PATH} color={RETICLE_COLOR} style="fill" />
                      <Path path={TARGET_ARROW_PATH} color="#1a140f" style="stroke" strokeWidth={0.6} />
                    </Group>
                  )
                })}
              </Group>
            )
          })()}

          {/* Orbs — render after enemies so they visibly pass over them. */}
          {orbs.map((o, i) => (
            <Group key={`orb${i}`}>
              <Circle cx={o.x} cy={o.y} r={o.r * 2.2} color={ORB_HALO} opacity={0.25} />
              <Circle cx={o.x} cy={o.y} r={o.r * 1.4} color={ORB_BODY} opacity={0.6} />
              <Circle cx={o.x} cy={o.y} r={o.r}        color={ORB_CORE} />
            </Group>
          ))}

          {/* Player chevron — inverse-scaled so it stays a fixed pixel size on
              screen. Three cyan orbs orbit around it (passive visual hook). */}
          <Group
            transform={[
              { translateX: px },
              { translateY: py },
              { scale: 1 / SCALE },
            ]}
          >
            {/* Orbiting orbs (drawn under the chevron so the hero sits on top). */}
            {Array.from({ length: PLAYER_ORB_COUNT }, (_, i) => {
              const phase = (now % PLAYER_ORB_PERIOD_MS) / PLAYER_ORB_PERIOD_MS
              const a = phase * Math.PI * 2 + (i / PLAYER_ORB_COUNT) * Math.PI * 2
              const ox2 = Math.cos(a) * PLAYER_ORB_RADIUS_PX
              const oy2 = Math.sin(a) * PLAYER_ORB_RADIUS_PX * 0.55  // squashed orbit, top-down feel
              return (
                <Group key={`pob${i}`}>
                  <Circle cx={ox2} cy={oy2} r={5} color={PLAYER_ORB_HALO} opacity={0.45} />
                  <Circle cx={ox2} cy={oy2} r={3} color={PLAYER_ORB} />
                  <Circle cx={ox2} cy={oy2} r={1.4} color="#ffffff" />
                </Group>
              )
            })}
            {/* Chevron itself rotates to facing; orbs above do not. */}
            <Group transform={[{ rotate: angle }]}>
              <Path path={CHEVRON_PATH} color={PLAYER_FILL} style="fill" />
              <Path
                path={CHEVRON_PATH}
                color={PLAYER_OUTLINE}
                style="stroke"
                strokeWidth={2.5}
                strokeJoin="round"
              />
            </Group>
          </Group>
        </Group>

        {/* Player light radius — radial gradient centered on the player's
            screen position. Transparent in a tight zone around the player and
            ramps to near-black at the edge. Sells "lantern in the dark"
            without losing readability. Dungeons get a tighter, harder falloff
            than the overworld. */}
        {vw > 0 && vh > 0 && (() => {
          const playerScreenX = ox + px * SCALE
          const playerScreenY = oy + py * SCALE
          const outerR = inDungeon
            ? Math.max(vw, vh) * 0.55     // tight in dungeons
            : Math.max(vw, vh) * 0.95     // generous on the overworld
          // Inner ramp position controls how big the bright zone is. Smaller
          // means the bright zone is smaller (darker scene).
          const innerStop = inDungeon ? 0.18 : 0.30
          const midStop = inDungeon ? 0.55 : 0.70
          const edgeColor = inDungeon ? '#000000f5' : '#000000bb'
          return (
            <Rect x={0} y={0} width={vw} height={vh}>
              <RadialGradient
                c={vec(playerScreenX, playerScreenY)}
                r={outerR}
                colors={['#00000000', '#00000050', edgeColor]}
                positions={[innerStop, midStop, 1.0]}
              />
            </Rect>
          )
        })()}
      </Canvas>

      {/* Damage numbers — overlay RN Text since Skia text needs a loaded font.
          World coords → screen coords via the same camera transform as Skia. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {damageNumbers.map((d) => {
          const age = now - d.spawnedAt
          if (age >= DAMAGE_NUMBER_TTL_MS) return null
          const t = age / DAMAGE_NUMBER_TTL_MS
          // Crits rise faster and farther — extra visual punch.
          const liftDistance = d.kind === 'crit' ? 48 : 28
          const lift = t * liftDistance
          const screenX = ox + d.x * SCALE
          const screenY = oy + d.y * SCALE - lift
          const color =
            d.kind === 'taken' ? '#ff5050' :
            d.kind === 'crit'  ? '#ffe060' :
            '#ffffff'
          // Crits start oversized and settle back to a still-big resting size
          // over ~120ms — sells the impact without overstaying.
          const baseFontSize = d.kind === 'crit' ? 30 : 16
          const popMult = d.kind === 'crit' ? (1 + 0.35 * Math.max(0, 1 - age / 120)) : 1
          const fontSize = baseFontSize * popMult
          // Crit numbers tilt slightly side-to-side as they rise — kinetic feel.
          const rotateDeg = d.kind === 'crit' ? Math.sin(t * 6) * 4 : 0
          return (
            <Text
              key={d.id}
              style={[
                styles.damageNumber,
                {
                  left: screenX - 18,
                  top:  screenY - 12,
                  opacity: 1 - t,
                  color,
                  fontSize,
                  transform: [{ rotate: `${rotateDeg}deg` }],
                  fontWeight: d.kind === 'crit' ? '900' : '700',
                },
              ]}
            >
              {d.kind === 'crit' ? `${d.value}!` : d.value}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GRASS_BASE, overflow: 'hidden' },
  damageNumber: {
    position: 'absolute',
    fontWeight: 'bold',
    fontSize: 14,
    width: 36,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as any,
})

export default WorldCanvas
