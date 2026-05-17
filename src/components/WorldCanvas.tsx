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

// Don't-Starve-ish gameplay palette
const GRASS_BASE     = '#6e7d3f'  // olive grass — base ground color
const GRASS_PATCH    = '#5d6b34'  // darker patches of grass for variation
const DIRT_PATH      = '#a08660'  // tan dirt roads / clearings
const ROCK_DARK      = '#4f4d48'  // rocky impassable terrain (was brown forest)
const ROCK_SHADE     = '#37352f'  // shadow / inner crater
const ROCK_HILITE    = '#6e6a62'  // top edge highlight on rocky terrain
const TOWN_GROUND_C  = '#c9b07a'  // sandy town ground (man-made clearing)
const WALL_COLOR     = '#3d2e20'
const BUILDING_COLOR = '#5a4530'
const BUILDING_OUT   = '#2a1f15'
const TREE_CANOPY    = '#2a4218'  // dark forest green
const TREE_HILITE    = '#3d5a25'  // lighter canopy highlight
const TREE_SHADOW    = '#1a280f'  // tree drop-shadow
const ROCK_FILL      = '#7a7268'  // individual decorative rocks
const ROCK_SHAD      = '#4a4540'
const ROCK_LIGHT     = '#9c948a'
const PLAYER_FILL    = '#f4e8c8'
const PLAYER_OUTLINE = '#2a1f15'

// Enemy palette — dark crouched silhouette with a single red eye glint, sized
// to read at the same SCALE as trees/rocks. Don't-Starve-ish but threatening.
const ENEMY_BODY      = '#1f1411'
const ENEMY_SHADOW    = '#0a0807'
const ENEMY_EYE       = '#e84a2a'
const ENEMY_HP_BG     = '#2a1f15'
const ENEMY_HP_FG     = '#c84236'
const ATTACK_FLASH    = '#fff3c0'
const ATTACK_FLASH_FG = '#ffd86b'
const ULT_FLASH       = '#bce8ff'
const ULT_FLASH_FG    = '#6ab9ff'
const SPENDER_FLASH    = '#ffb98a'
const SPENDER_FLASH_FG = '#e87a2a'
const ENEMY_TELEGRAPH = '#e84a2a'
const ARENA_WALL_FILL = '#2f2722'
const ARENA_WALL_EDGE = '#0f0c0a'
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
// Target reticle — yellow chevron + ring around the auto-targeted enemy.
const RETICLE_COLOR = '#ffd86b'
// Damaging-Dash trail behind the player while in the dash window.
const DASH_TRAIL_COLOR = '#fff7c2'

// Tier colors for enemy HP bars (D4 convention: white normal / blue elite / gold champion).
const TIER_BAR_COLOR: Record<string, string> = {
  normal:   '#c84236',
  elite:    '#4a9bd9',
  champion: '#e8c84a',
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
const SCALE = 0.28

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

        // 2. Dirt roads — stroked polylines (each Road is a smooth curve between towns)
        const roadPaint = Skia.Paint()
        roadPaint.setColor(Skia.Color(DIRT_PATH))
        roadPaint.setStyle(1)
        roadPaint.setStrokeJoin(1) // round
        roadPaint.setStrokeCap(1)  // round
        for (const road of MAIN_ROADS) {
          if (road.points.length < 2) continue
          roadPaint.setStrokeWidth(road.width)
          const p = Skia.Path.Make()
          p.moveTo(road.points[0].x, road.points[0].y)
          for (let i = 1; i < road.points.length; i++) {
            p.lineTo(road.points[i].x, road.points[i].y)
          }
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

        // 6. Buildings (fill + dark outline with hand-drawn wobble)
        const wobble = Skia.PathEffect.MakeDiscrete(6, 1.6, 0)
        const outlinePaint = Skia.Paint()
        outlinePaint.setColor(Skia.Color(BUILDING_OUT))
        outlinePaint.setStyle(1)
        outlinePaint.setStrokeWidth(4)
        outlinePaint.setPathEffect(wobble)
        paint.setColor(Skia.Color(BUILDING_COLOR))
        for (const b of ALL_BUILDINGS) {
          canvas.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, paint)
          canvas.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, outlinePaint)
        }

        // 7. Trees — drop shadow + canopy + offset highlight (Don't Starve style)
        const treeShadowPaint = Skia.Paint()
        treeShadowPaint.setColor(Skia.Color(TREE_SHADOW))
        const treeCanopyPaint = Skia.Paint()
        treeCanopyPaint.setColor(Skia.Color(TREE_CANOPY))
        const treeHiPaint = Skia.Paint()
        treeHiPaint.setColor(Skia.Color(TREE_HILITE))
        for (const t of FIELD_TREES) {
          canvas.drawCircle(t.x + 5, t.y + 7, t.r, treeShadowPaint)
          canvas.drawCircle(t.x, t.y, t.r, treeCanopyPaint)
          canvas.drawCircle(t.x - t.r * 0.25, t.y - t.r * 0.3, t.r * 0.45, treeHiPaint)
        }

        // 8. Rocks (individual scattered) — shadow + main + highlight
        const rockShadowPaint = Skia.Paint()
        rockShadowPaint.setColor(Skia.Color(ROCK_SHAD))
        const rockFillPaint = Skia.Paint()
        rockFillPaint.setColor(Skia.Color(ROCK_FILL))
        const rockHiPaint = Skia.Paint()
        rockHiPaint.setColor(Skia.Color(ROCK_LIGHT))
        for (const r of FIELD_ROCKS) {
          canvas.drawCircle(r.x + 3, r.y + 4, r.r * 0.95, rockShadowPaint)
          canvas.drawCircle(r.x, r.y, r.r * 0.9, rockFillPaint)
          canvas.drawCircle(r.x - r.r * 0.25, r.y - r.r * 0.3, r.r * 0.35, rockHiPaint)
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

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setViewport({ w: width, h: height })
    onViewportSize?.(width, height)
  }

  const { w: vw, h: vh } = viewport
  const { x: px, y: py, angle } = playerRef.current
  const { enemies, activeFlashes, beamFlashes, projectiles, pendingMeteors, dotZones, orbs, damageNumbers, loot, arenaWalls, targetEnemyId, nearestNpc } = combatRef.current
  const targetEnemy = targetEnemyId != null
    ? enemies.find((e) => e.id === targetEnemyId)
    : undefined

  // Camera centers on player, clamped so we don't show beyond world edges.
  const worldScreenW = WORLD_WIDTH * SCALE
  const worldScreenH = WORLD_HEIGHT * SCALE
  const baseOx = vw > 0
    ? Math.min(0, Math.max(vw - worldScreenW, -(px * SCALE - vw / 2)))
    : 0
  const baseOy = vh > 0
    ? Math.min(0, Math.max(vh - worldScreenH, -(py * SCALE - vh / 2)))
    : 0
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
        <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: SCALE }]}>
          <Picture picture={staticPicture} />

          {/* NPC interaction glow — pulsing gold ring around the nearest
              interactable NPC. Reinforces the HUD's "Talk to X" prompt with
              a worldspace cue so the player can spot the right NPC visually.
              Radius matches NPC_INTERACT_RADIUS so the ring also doubles as
              a "this is the trigger zone" hint. */}
          {nearestNpc && (() => {
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

          {/* Arena (Trial) walls. Only present during an active activity;
              drawn over the world content. */}
          {arenaWalls.map((w, i) => (
            <Group key={`aw${i}`}>
              <Rect x={w.x} y={w.y} width={w.w} height={w.h} color={ARENA_WALL_FILL} />
              <Rect
                x={w.x} y={w.y} width={w.w} height={w.h}
                color={ARENA_WALL_EDGE} style="stroke" strokeWidth={2}
              />
            </Group>
          ))}

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
            const barColor = TIER_BAR_COLOR[e.tier] ?? ENEMY_HP_FG
            // Telegraph: fill an attack-range circle that ramps in alpha as the
            // wind-up progresses, signaling "dash out NOW".
            const inWindUp = e.windUpEndsAt > now
            const telegraphAlpha = inWindUp
              ? Math.min(0.55, 0.1 + 0.5 * (1 - (e.windUpEndsAt - now) / 450))
              : 0
            // Tier ring around bigger enemies for instant readability.
            const tierRingW = e.tier === 'champion' ? 3 : e.tier === 'elite' ? 2 : 0
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
                    cx={e.x} cy={e.y} r={e.radius + 6}
                    color="#b66cf2"
                    style="stroke" strokeWidth={2.5}
                    opacity={0.5 + 0.3 * Math.sin(now / 160)}
                  />
                )}
                {/* Drop shadow */}
                <Circle cx={e.x + 3} cy={e.y + 5} r={e.radius * 0.95} color={ENEMY_SHADOW} />
                {/* Body */}
                <Circle cx={e.x} cy={e.y} r={e.radius} color={ENEMY_BODY} />
                {/* Hit flash — brief white overlay on the body when struck.
                    Alpha decays linearly over ENEMY_HIT_FLASH_MS so the strike
                    reads from across the screen, then fades cleanly. */}
                {e.lastHitAt > 0 && now - e.lastHitAt < ENEMY_HIT_FLASH_MS && (
                  <Circle
                    cx={e.x} cy={e.y} r={e.radius}
                    color="#ffffff"
                    opacity={1 - (now - e.lastHitAt) / ENEMY_HIT_FLASH_MS}
                  />
                )}
                {/* Tier silhouette overlay — elites get curved horns, champions
                    get a crown of spikes. Distinct enough to read from across
                    the screen without breaking the dark-blob aesthetic. */}
                {e.tier === 'elite' && (
                  <Group>
                    {/* Left horn */}
                    <Path
                      path={Skia.Path.MakeFromSVGString(
                        `M ${e.x - e.radius * 0.5} ${e.y - e.radius * 0.7} `
                        + `L ${e.x - e.radius * 0.8} ${e.y - e.radius * 1.5} `
                        + `L ${e.x - e.radius * 0.25} ${e.y - e.radius * 0.9} Z`,
                      )!}
                      color={ENEMY_BODY}
                    />
                    {/* Right horn */}
                    <Path
                      path={Skia.Path.MakeFromSVGString(
                        `M ${e.x + e.radius * 0.5} ${e.y - e.radius * 0.7} `
                        + `L ${e.x + e.radius * 0.8} ${e.y - e.radius * 1.5} `
                        + `L ${e.x + e.radius * 0.25} ${e.y - e.radius * 0.9} Z`,
                      )!}
                      color={ENEMY_BODY}
                    />
                  </Group>
                )}
                {e.tier === 'champion' && (
                  <Group>
                    {/* Crown of 5 spikes around the top half — each is a thin
                        triangle pointing radially outward. */}
                    {[-0.9, -0.45, 0, 0.45, 0.9].map((rot, i) => {
                      const cx = e.x + Math.sin(rot) * e.radius * 0.75
                      const cy = e.y - Math.cos(rot) * e.radius * 0.75
                      const tipX = e.x + Math.sin(rot) * e.radius * 1.55
                      const tipY = e.y - Math.cos(rot) * e.radius * 1.55
                      // Perpendicular base
                      const perp = rot + Math.PI / 2
                      const halfBase = e.radius * 0.18
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
                {/* Tier ring on elite/champion */}
                {tierRingW > 0 && (
                  <Circle
                    cx={e.x} cy={e.y} r={e.radius + 2}
                    color={barColor}
                    style="stroke"
                    strokeWidth={tierRingW}
                  />
                )}
                {/* Eye(s) — champions get two for extra menace. */}
                {e.tier === 'champion' ? (
                  <Group>
                    <Circle cx={e.x - 4} cy={e.y - 4} r={3} color={ENEMY_EYE} />
                    <Circle cx={e.x + 4} cy={e.y - 4} r={3} color={ENEMY_EYE} />
                  </Group>
                ) : (
                  <Circle cx={e.x - 3} cy={e.y - 4} r={3} color={ENEMY_EYE} />
                )}
                {/* HP bar above (only when damaged) */}
                {showHpBar && (
                  <Group>
                    <Rect x={e.x - e.radius} y={e.y - e.radius - 8} width={e.radius * 2} height={4} color={ENEMY_HP_BG} />
                    <Rect x={e.x - e.radius} y={e.y - e.radius - 8} width={e.radius * 2 * hpFrac} height={4} color={barColor} />
                  </Group>
                )}
              </Group>
            )
          })}

          {/* Player AoE flashes — multiple can be active. */}
          {activeFlashes.map((f, idx) => {
            if (now >= f.endsAt) return null
            const total = f.endsAt - f.startedAt
            const remaining = (f.endsAt - now) / total
            const alpha = Math.max(0, Math.min(1, remaining))
            const isUlt = f.kind === 'ultimate'
            const isSpender = f.kind === 'spender'
            const isMeteor = f.kind === 'meteor'
            const isFireball = f.kind === 'fireball'
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

          {/* Target reticle — yellow ring + chevron above the auto-targeted
              enemy. Pulses gently so it reads as "live tracking" rather than
              a static marker. */}
          {targetEnemy && (() => {
            const pulse = 0.55 + 0.3 * Math.sin(now / 180)
            const r = targetEnemy.radius + 10
            return (
              <Group>
                <Circle
                  cx={targetEnemy.x} cy={targetEnemy.y} r={r}
                  color={RETICLE_COLOR} style="stroke" strokeWidth={2}
                  opacity={pulse}
                />
                {/* Down-pointing chevron above the enemy */}
                <Path
                  path={Skia.Path.MakeFromSVGString(
                    `M ${targetEnemy.x - 6} ${targetEnemy.y - r - 12}
                     L ${targetEnemy.x}     ${targetEnemy.y - r - 4}
                     L ${targetEnemy.x + 6} ${targetEnemy.y - r - 12}`,
                  )!}
                  color={RETICLE_COLOR} style="stroke" strokeWidth={2.5}
                  strokeJoin="round" strokeCap="round"
                  opacity={pulse}
                />
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

          {/* Player chevron — inverse-scaled so it stays a fixed pixel size on screen */}
          <Group
            transform={[
              { translateX: px },
              { translateY: py },
              { rotate: angle },
              { scale: 1 / SCALE },
            ]}
          >
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

        {/* Soft corner vignette for atmosphere */}
        {vw > 0 && vh > 0 && (
          <Rect x={0} y={0} width={vw} height={vh}>
            <RadialGradient
              c={vec(vw / 2, vh / 2)}
              r={Math.max(vw, vh) * 0.85}
              colors={['#00000000', '#0a0d0666']}
              positions={[0.55, 1.0]}
            />
          </Rect>
        )}
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
              {d.value}
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
