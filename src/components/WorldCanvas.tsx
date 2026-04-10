import React, { useRef, useEffect, useState } from 'react'
import { View, Animated, LayoutChangeEvent } from 'react-native'
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
} from '../game/WorldGame'

const GRASS           = '#5a8c3c'
const DIRT_ROAD       = '#b5904a'
const TOWN_GROUND     = '#c9b07a'
const WALL_COLOR      = '#7a6a50'
const BUILDING_COLORS = ['#8B7355', '#9e8060', '#a08866', '#7a6545']
const TREE_COLOR      = '#2d5a1b'
const TREE_TRUNK      = '#5c3d1e'
const ROCK_COLOR      = '#8a8070'
const ROCK_SHADOW     = '#6a6258'
const PLAYER_COLOR    = '#e63946'

const TRAIL_W = 45
const CULL_MARGIN = 300

const MAIN_ROADS = [
  { x: 0,    y: 600,  w: 10000, h: 80  },
  { x: 0,    y: 2300, w: 10000, h: 100 },
  { x: 0,    y: 3900, w: 10000, h: 80  },
  { x: 4960, y: 0,    w: 80,    h: 5000 },
  { x: 760,  y: 0,    w: 60,    h: 5000 },
  { x: 9160, y: 0,    w: 60,    h: 5000 },
]

const TRAILS = [
  // NW area (original)
  { cx: 1300, cy: 580,  len: 160, angle: -8  },
  { cx: 1270, cy: 430,  len: 160, angle: -18 },
  { cx: 1220, cy: 285,  len: 160, angle: -12 },
  { cx: 1180, cy: 140,  len: 140, angle: -6  },
  { cx: 1750, cy: 820,  len: 160, angle: 22  },
  { cx: 1820, cy: 965,  len: 160, angle: 16  },
  { cx: 1870, cy: 1110, len: 160, angle: 28  },
  { cx: 1930, cy: 1255, len: 140, angle: 20  },
  { cx: 960,  cy: 610,  len: 160, angle: -42 },
  { cx: 870,  cy: 490,  len: 150, angle: -50 },
  { cx: 770,  cy: 370,  len: 140, angle: -44 },
  { cx: 2050, cy: 600,  len: 160, angle: -28 },
  { cx: 2140, cy: 470,  len: 160, angle: -22 },
  { cx: 2240, cy: 355,  len: 140, angle: -30 },
  { cx: 1200, cy: 1050, len: 160, angle: 15  },
  { cx: 1340, cy: 1120, len: 160, angle: 5   },
  { cx: 1490, cy: 1150, len: 160, angle: -5  },
  // Central area
  { cx: 3000, cy: 1400, len: 160, angle: 30  },
  { cx: 3200, cy: 1500, len: 140, angle: 20  },
  { cx: 3400, cy: 1380, len: 160, angle: -15 },
  { cx: 4000, cy: 1200, len: 150, angle: -25 },
  { cx: 4200, cy: 1100, len: 160, angle: -10 },
  { cx: 5700, cy: 1200, len: 160, angle: 20  },
  { cx: 5900, cy: 1300, len: 140, angle: 15  },
  { cx: 4800, cy: 2400, len: 160, angle: -30 },
  { cx: 5000, cy: 2280, len: 150, angle: -20 },
  { cx: 5200, cy: 2400, len: 160, angle: 25  },
  // Eastern area
  { cx: 6500, cy: 600,  len: 160, angle: -20 },
  { cx: 6700, cy: 480,  len: 150, angle: -30 },
  { cx: 7500, cy: 550,  len: 160, angle: 18  },
  { cx: 7700, cy: 680,  len: 140, angle: 25  },
  { cx: 8600, cy: 620,  len: 160, angle: -12 },
  { cx: 8800, cy: 480,  len: 150, angle: -20 },
  { cx: 9000, cy: 1200, len: 160, angle: 35  },
  { cx: 9100, cy: 1100, len: 140, angle: 28  },
  // SW area
  { cx: 350,  cy: 1800, len: 150, angle: 20  },
  { cx: 500,  cy: 2000, len: 160, angle: -15 },
  { cx: 650,  cy: 2300, len: 140, angle: 30  },
  { cx: 800,  cy: 2500, len: 160, angle: -25 },
  { cx: 400,  cy: 2800, len: 150, angle: 18  },
  { cx: 600,  cy: 3000, len: 160, angle: -22 },
  { cx: 350,  cy: 3300, len: 140, angle: 15  },
  { cx: 600,  cy: 3600, len: 160, angle: -30 },
  // Southern area
  { cx: 2500, cy: 3950, len: 160, angle: 20  },
  { cx: 2800, cy: 4100, len: 150, angle: -15 },
  { cx: 4800, cy: 4000, len: 160, angle: 25  },
  { cx: 5200, cy: 4000, len: 140, angle: -20 },
  { cx: 7200, cy: 3950, len: 160, angle: 18  },
  { cx: 7500, cy: 4100, len: 150, angle: -12 },
  // SE area
  { cx: 8600, cy: 3000, len: 160, angle: 22  },
  { cx: 8800, cy: 3200, len: 140, angle: -18 },
  { cx: 9100, cy: 2800, len: 160, angle: 30  },
  { cx: 9300, cy: 3500, len: 150, angle: -25 },
]

interface WorldCanvasProps {
  game: WorldGame
  inputRef: React.MutableRefObject<{ dx: number; dy: number }>
  onViewportSize: (w: number, h: number) => void
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ game, inputRef, onViewportSize }) => {
  const playerAnim    = useRef(new Animated.ValueXY({ x: PLAYER_START.x, y: PLAYER_START.y })).current
  const playerOffsetX = useRef(new Animated.Value(-12)).current
  const playerOffsetY = useRef(new Animated.Value(-12)).current
  const worldOffset   = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const viewportRef   = useRef({ w: 0, h: 0 })
  const lastTimeRef   = useRef<number | null>(null)

  // Throttled camera region for viewport culling
  const lastCullRef = useRef({ ox: -(PLAYER_START.x - 500), oy: -(PLAYER_START.y - 400) })
  const [cullReg, setCullReg] = useState(lastCullRef.current)

  useEffect(() => {
    let rafId: number
    const tick = (time: number) => {
      const delta = lastTimeRef.current !== null
        ? Math.min((time - lastTimeRef.current) / 16.667, 3)
        : 1
      lastTimeRef.current = time

      const state = game.moveByDelta(inputRef.current.dx, inputRef.current.dy, delta)
      playerAnim.setValue({ x: state.playerX, y: state.playerY })

      const { w, h } = viewportRef.current
      if (w > 0 && h > 0) {
        const ox = Math.min(0, Math.max(w - WORLD_WIDTH,  -(state.playerX - w / 2)))
        const oy = Math.min(0, Math.max(h - WORLD_HEIGHT, -(state.playerY - h / 2)))
        worldOffset.setValue({ x: ox, y: oy })

        // Update cull region only when camera moves enough to avoid per-frame re-renders
        if (
          Math.abs(ox - lastCullRef.current.ox) > 150 ||
          Math.abs(oy - lastCullRef.current.oy) > 150
        ) {
          lastCullRef.current = { ox, oy }
          setCullReg({ ox, oy })
        }
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [game, inputRef, playerAnim, worldOffset])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    viewportRef.current = { w: width, h: height }
    onViewportSize(width, height)
  }

  // Compute visible world bounds for culling
  const { w: vw, h: vh } = viewportRef.current
  const minX = -cullReg.ox - CULL_MARGIN
  const maxX = -cullReg.ox + (vw || 500) + CULL_MARGIN
  const minY = -cullReg.oy - CULL_MARGIN
  const maxY = -cullReg.oy + (vh || 900) + CULL_MARGIN

  const rectVisible = (x: number, y: number, w: number, h: number) =>
    x + w > minX && x < maxX && y + h > minY && y < maxY

  const circleVisible = (x: number, y: number, r: number) =>
    x + r > minX && x - r < maxX && y + r > minY && y - r < maxY

  const trailVisible = (cx: number, cy: number, len: number) =>
    cx > minX - len && cx < maxX + len && cy > minY - len && cy < maxY + len

  return (
    <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }} onLayout={onLayout}>
      <Animated.View style={{
        position: 'absolute',
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        transform: [{ translateX: worldOffset.x }, { translateY: worldOffset.y }],
      }}>
        {/* Grass */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT, backgroundColor: GRASS }} />

        {/* Main roads */}
        {MAIN_ROADS.filter(r => rectVisible(r.x, r.y, r.w, r.h)).map((r, i) => (
          <View key={`road-${i}`} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, backgroundColor: DIRT_ROAD }} />
        ))}

        {/* Trail segments */}
        {TRAILS.filter(t => trailVisible(t.cx, t.cy, t.len)).map((t, i) => (
          <View key={`trail-${i}`} style={{
            position: 'absolute',
            left: t.cx - t.len / 2,
            top: t.cy - TRAIL_W / 2,
            width: t.len,
            height: TRAIL_W,
            backgroundColor: DIRT_ROAD,
            transform: [{ rotate: `${t.angle}deg` }],
          }} />
        ))}

        {/* Town grounds */}
        {TOWN_GROUNDS.filter(g => rectVisible(g.x, g.y, g.w, g.h)).map((g, i) => (
          <View key={`tg-${i}`} style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, backgroundColor: TOWN_GROUND }} />
        ))}

        {/* Town walls */}
        {ALL_WALLS.filter(w => rectVisible(w.x, w.y, w.w, w.h)).map((w, i) => (
          <View key={`wall-${i}`} style={{ position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h, backgroundColor: WALL_COLOR }} />
        ))}

        {/* Buildings */}
        {ALL_BUILDINGS
          .map((b, i) => ({ b, i }))
          .filter(({ b }) => rectVisible(b.x, b.y, b.w, b.h))
          .map(({ b, i }) => (
            <View key={`bldg-${i}`} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, backgroundColor: BUILDING_COLORS[i % BUILDING_COLORS.length] }} />
          ))
        }

        {/* Trees */}
        {FIELD_TREES.filter(t => circleVisible(t.x, t.y, t.r)).map((tree, i) => (
          <View key={`tree-${i}`}>
            <View style={{ position: 'absolute', left: tree.x - tree.r * 0.2, top: tree.y, width: tree.r * 0.4, height: tree.r * 0.6, backgroundColor: TREE_TRUNK }} />
            <View style={{ position: 'absolute', left: tree.x - tree.r, top: tree.y - tree.r, width: tree.r * 2, height: tree.r * 2, borderRadius: tree.r, backgroundColor: TREE_COLOR }} />
          </View>
        ))}

        {/* Rocks */}
        {FIELD_ROCKS.filter(r => circleVisible(r.x, r.y, r.r)).map((rock, i) => (
          <View key={`rock-${i}`}>
            <View style={{ position: 'absolute', left: rock.x - rock.r + 3, top: rock.y - rock.r * 0.7 + 4, width: rock.r * 2, height: rock.r * 1.4, borderRadius: rock.r, backgroundColor: ROCK_SHADOW }} />
            <View style={{ position: 'absolute', left: rock.x - rock.r, top: rock.y - rock.r * 0.7, width: rock.r * 2, height: rock.r * 1.4, borderRadius: rock.r, backgroundColor: ROCK_COLOR }} />
          </View>
        ))}

        {/* Player */}
        <Animated.View style={{
          position: 'absolute',
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: PLAYER_COLOR,
          borderWidth: 2,
          borderColor: 'white',
          transform: [
            { translateX: Animated.add(playerAnim.x, playerOffsetX) },
            { translateY: Animated.add(playerAnim.y, playerOffsetY) },
          ],
        }} />
      </Animated.View>
    </View>
  )
}

export default WorldCanvas
