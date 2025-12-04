import React, { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, Animated, Image, LayoutChangeEvent } from 'react-native'
import { Colors } from '../theme/Colors'

interface MazeCanvasProps {
  playerX: number
  playerY: number
  cellSize: number
  revealedPaths: boolean
  onMove?: (dx: number, dy: number) => void
  mazeWidth: number
  mazeHeight: number
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({ playerX, playerY, cellSize, onMove, mazeWidth, mazeHeight }) => {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const moveInterval = useRef<number | null>(null)
  const playerAnim = useRef(new Animated.ValueXY({ x: playerX * cellSize, y: playerY * cellSize })).current
  const worldOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const playerPx = playerX * cellSize
    const playerPy = playerY * cellSize

    Animated.timing(playerAnim, {
      toValue: { x: playerPx, y: playerPy },
      duration: 16,
      useNativeDriver: false
    }).start()

    if (viewportWidth === 0 || viewportHeight === 0) return

    const offsetX = Math.max(Math.min(-(playerPx - viewportWidth / 2), 0), viewportWidth - mazeWidth)
    const offsetY = Math.max(Math.min(-(playerPy - viewportHeight / 2), 0), viewportHeight - mazeHeight)

    Animated.timing(worldOffset, {
      toValue: { x: offsetX, y: offsetY },
      duration: 16,
      useNativeDriver: false
    }).start()
  }, [playerX, playerY, viewportWidth, viewportHeight])

  const handleMove = (locationX: number, locationY: number) => {
    const s = startRef.current
    if (!s || !onMove) return
    const dx = locationX - s.x
    const dy = locationY - s.y
    if (dx === 0 && dy === 0) return
    onMove(dx, dy)
    startRef.current = { x: locationX, y: locationY }
  }

  const onLayout = (e: LayoutChangeEvent) => {
    setViewportWidth(e.nativeEvent.layout.width)
    setViewportHeight(e.nativeEvent.layout.height)
  }

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const { locationX, locationY } = e.nativeEvent
        startRef.current = { x: locationX, y: locationY }
        moveInterval.current = setInterval(() => handleMove(locationX, locationY), 16) as unknown as number
      }}
      onResponderMove={(e) => {
        const { locationX, locationY } = e.nativeEvent
        handleMove(locationX, locationY)
      }}
      onResponderRelease={() => {
        startRef.current = null
        if (moveInterval.current !== null) {
          clearInterval(moveInterval.current)
          moveInterval.current = null
        }
      }}
    >
      <Animated.View style={{ width: mazeWidth, height: mazeHeight, position: 'absolute', transform: [{ translateX: worldOffset.x }, { translateY: worldOffset.y }] }}>
        <Image source={{ uri: '/assets/map.png' }} style={{ width: mazeWidth, height: mazeHeight, position: 'absolute' }} />
        <Animated.View
          style={{
            width: cellSize,
            height: cellSize,
            borderRadius: cellSize / 2,
            backgroundColor: Colors.player,
            position: 'absolute',
            transform: [{ translateX: playerAnim.x }, { translateY: playerAnim.y }]
          }}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'relative', flex: 1, width: '100%', height: '100%' }
})

export default MazeCanvas
