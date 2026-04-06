import React, { useRef, useEffect, useState } from 'react'
import { View, Animated, Image, LayoutChangeEvent, Platform } from 'react-native'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  VILLAGE,
  TOWN2,
  TOWN2_OBSTACLES,
  FIELD_TREES,
} from '../game/WorldGame'

const GRASS = '#5a8c3c'
const DIRT_ROAD = '#b5904a'
const TOWN2_GROUND = '#c9b07a'
const WALL_COLOR = '#7a6a50'
const BUILDING_COLORS = ['#8B7355', '#9e8060', '#a08866', '#7a6545']
const TREE_COLOR = '#2d5a1b'
const TREE_TRUNK = '#5c3d1e'
const PLAYER_COLOR = '#e63946'
const ROAD_Y = 650
const ROAD_H = 80

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

  // Load village pixel data for wall collision (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return
    try {
      const src = require('../../map.png')
      const uri = typeof src === 'string' ? src : src?.uri ?? src?.default ?? null
      if (!uri) return
      const img = new (window as any).Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        game.setVillagePixels(data.data, canvas.width, canvas.height)
      }
      img.src = uri
    } catch (_) {}
  }, [game])

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

        {/* Dirt road */}
        <View style={{ position: 'absolute', left: 0, top: ROAD_Y, width: WORLD_WIDTH, height: ROAD_H, backgroundColor: DIRT_ROAD }} />

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
              height: tree.r * 0.5,
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

        {/* Village */}
        <Image
          source={require('../../map.png')}
          style={{ position: 'absolute', left: VILLAGE.x, top: VILLAGE.y, width: VILLAGE.w, height: VILLAGE.h }}
          resizeMode="cover"
        />

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
