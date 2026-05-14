import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, LayoutChangeEvent, StyleSheet } from 'react-native'
import {
  Canvas,
  Group,
  Picture,
  Path,
  Rect,
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

// Chevron player path (points along +x, will rotate to velocity angle).
// Sized in screen pixels — drawn inside a group that undoes the world scale.
const CHEVRON_PATH = Skia.Path.MakeFromSVGString(
  'M 18 0 L -12 -12 L -4 0 L -12 12 Z'
)!

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

  // Camera centers on player, clamped so we don't show beyond world edges.
  const worldScreenW = WORLD_WIDTH * SCALE
  const worldScreenH = WORLD_HEIGHT * SCALE
  const ox = vw > 0
    ? Math.min(0, Math.max(vw - worldScreenW, -(px * SCALE - vw / 2)))
    : 0
  const oy = vh > 0
    ? Math.min(0, Math.max(vh - worldScreenH, -(py * SCALE - vh / 2)))
    : 0

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: SCALE }]}>
          <Picture picture={staticPicture} />

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
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GRASS_BASE, overflow: 'hidden' },
})

export default WorldCanvas
