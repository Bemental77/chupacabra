import React, { useRef, useEffect, useState } from 'react'
import { View, Animated, LayoutChangeEvent } from 'react-native'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TOWN2,
  TOWN2_OBSTACLES,
  FIELD_TREES,
  FIELD_ROCKS,
} from '../game/WorldGame'

const GRASS = '#5a8c3c'
const DIRT_ROAD = '#b5904a'
const TOWN2_GROUND = '#c9b07a'
const WALL_COLOR = '#7a6a50'
const BUILDING_COLORS = ['#8B7355', '#9e8060', '#a08866', '#7a6545']
const TREE_COLOR = '#2d5a1b'
const TREE_TRUNK = '#5c3d1e'
const ROCK_COLOR = '#8a8070'
const ROCK_SHADOW = '#6a6258'
const PLAYER_COLOR = '#e63946'

const ROAD_Y = 650
const ROAD_H = 80
const TRAIL_W = 45

// Trail segments: each is a rotated rectangle centered at (cx, cy)
const TRAILS = [
  // Trail A — Forest path heading north from main road
  { cx: 1300, cy: 580, len: 160, angle: -8 },
  { cx: 1270, cy: 430, len: 160, angle: -18 },
  { cx: 1220, cy: 285, len: 160, angle: -12 },
  { cx: 1180, cy: 140, len: 140, angle: -6 },

  // Trail B — River path heading south-southeast
  { cx: 1750, cy: 820, len: 160, angle: 22 },
  { cx: 1820, cy: 965, len: 160, angle: 16 },
  { cx: 1870, cy: 1110, len: 160, angle: 28 },
  { cx: 1930, cy: 1255, len: 140, angle: 20 },

  // Trail C — Hidden path heading northwest
  { cx: 960, cy: 610, len: 160, angle: -42 },
  { cx: 870, cy: 490, len: 150, angle: -50 },
  { cx: 770, cy: 370, len: 140, angle: -44 },

  // Trail D — Eastern branch heading northeast
  { cx: 2050, cy: 600, len: 160, angle: -28 },
  { cx: 2140, cy: 470, len: 160, angle: -22 },
  { cx: 2240, cy: 355, len: 140, angle: -30 },

  // Trail E — South loop connecting B to C area
  { cx: 1200, cy: 1050, len: 160, angle: 15 },
  { cx: 1340, cy: 1120, len: 160, angle: 5 },
  { cx: 1490, cy: 1150, len: 160, angle: -5 },
]

interface WorldCanvasProps {
  game: WorldGame
  playerX: number
  playerY: number
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ game, playerX, playerY }) => {
  const playerAnim = useRef(new Animated.ValueXY({ x: playerX, y: playerY })).current
  const playerOffsetX = useRef(new Animated.Value(-12)).current
  const playerOffsetY = useRef(new Animated.Value(-12)).current
  const worldOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const [viewportW, setViewportW] = useState(0)
  const [viewportH, setViewportH] = useState(0)

  useEffect(() => {
    Animated.spring(playerAnim, {
      toValue: { x: playerX, y: playerY },
      useNativeDriver: false,
      speed: 50,
      bounciness: 0,
    }).start()

    if (viewportW === 0 || viewportH === 0) return

    const ox = Math.min(0, Math.max(viewportW - WORLD_WIDTH, -(playerX - viewportW / 2)))
    const oy = Math.min(0, Math.max(viewportH - WORLD_HEIGHT, -(playerY - viewportH / 2)))

    Animated.spring(worldOffset, {
      toValue: { x: ox, y: oy },
      useNativeDriver: false,
      speed: 50,
      bounciness: 0,
    }).start()
  }, [playerX, playerY, viewportW, viewportH])

  const onLayout = (e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width)
    setViewportH(e.nativeEvent.layout.height)
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }} onLayout={onLayout}>
      <Animated.View
        style={{
          position: 'absolute',
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          transform: [{ translateX: worldOffset.x }, { translateY: worldOffset.y }],
        }}
      >
        {/* Grass background */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT, backgroundColor: GRASS }} />

        {/* Main east-west road */}
        <View style={{ position: 'absolute', left: 0, top: ROAD_Y, width: WORLD_WIDTH, height: ROAD_H, backgroundColor: DIRT_ROAD }} />

        {/* Branching trails */}
        {TRAILS.map((t, i) => (
          <View
            key={`trail-${i}`}
            style={{
              position: 'absolute',
              left: t.cx - t.len / 2,
              top: t.cy - TRAIL_W / 2,
              width: t.len,
              height: TRAIL_W,
              backgroundColor: DIRT_ROAD,
              transform: [{ rotate: `${t.angle}deg` }],
            }}
          />
        ))}

        {/* Town 2 ground */}
        <View style={{ position: 'absolute', left: TOWN2.x, top: TOWN2.y, width: TOWN2.w, height: TOWN2.h, backgroundColor: TOWN2_GROUND }} />

        {/* Town 2 walls and buildings */}
        {TOWN2_OBSTACLES.map((obs, i) => (
          <View
            key={`t2-${i}`}
            style={{
              position: 'absolute',
              left: obs.x,
              top: obs.y,
              width: obs.w,
              height: obs.h,
              backgroundColor: i < 8 ? WALL_COLOR : BUILDING_COLORS[i % BUILDING_COLORS.length],
            }}
          />
        ))}

        {/* Field trees */}
        {FIELD_TREES.map((tree, i) => (
          <View key={`tree-${i}`}>
            <View style={{
              position: 'absolute',
              left: tree.x - tree.r * 0.2,
              top: tree.y,
              width: tree.r * 0.4,
              height: tree.r * 0.6,
              backgroundColor: TREE_TRUNK,
            }} />
            <View style={{
              position: 'absolute',
              left: tree.x - tree.r,
              top: tree.y - tree.r,
              width: tree.r * 2,
              height: tree.r * 2,
              borderRadius: tree.r,
              backgroundColor: TREE_COLOR,
            }} />
          </View>
        ))}

        {/* Rocks */}
        {FIELD_ROCKS.map((rock, i) => (
          <View key={`rock-${i}`}>
            {/* Shadow */}
            <View style={{
              position: 'absolute',
              left: rock.x - rock.r + 3,
              top: rock.y - rock.r * 0.7 + 4,
              width: rock.r * 2,
              height: rock.r * 1.4,
              borderRadius: rock.r,
              backgroundColor: ROCK_SHADOW,
            }} />
            {/* Rock */}
            <View style={{
              position: 'absolute',
              left: rock.x - rock.r,
              top: rock.y - rock.r * 0.7,
              width: rock.r * 2,
              height: rock.r * 1.4,
              borderRadius: rock.r,
              backgroundColor: ROCK_COLOR,
            }} />
          </View>
        ))}

        {/* Player */}
        <Animated.View
          style={{
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
          }}
        />
      </Animated.View>
    </View>
  )
}

export default WorldCanvas
