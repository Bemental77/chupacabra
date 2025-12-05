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
    const rawPx = playerX * cellSize
    const rawPy = playerY * cellSize

    const clampedPx = Math.max(0, Math.min(rawPx, mazeWidth - cellSize))
    const clampedPy = Math.max(0, Math.min(rawPy, mazeHeight - cellSize))

    Animated.timing(playerAnim, {
      toValue: { x: clampedPx, y: clampedPy },
      duration: 16,
      useNativeDriver: false
    }).start()

    if (viewportWidth === 0 || viewportHeight === 0) return

    const offsetX = Math.min(0, Math.max(viewportWidth - mazeWidth, -(clampedPx - viewportWidth * 0.5)))
    const offsetY = Math.min(0, Math.max(viewportHeight - mazeHeight, -(clampedPy - viewportHeight * 0.5)))

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
      onResponderGrant={e => {
        const { locationX, locationY } = e.nativeEvent
        startRef.current = { x: viewportWidth * 0.5, y: viewportHeight * 0.5 }
        moveInterval.current = setInterval(() => handleMove(locationX, locationY), 16) as unknown as number
      }}
      onResponderMove={e => {
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
            borderRadius: cellSize * 0.5,
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
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

export default MazeCanvas
