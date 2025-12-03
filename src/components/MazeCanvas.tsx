import React, { useRef, useEffect } from 'react'
import { View, StyleSheet, Animated, Image } from 'react-native'
import { Colors } from '../theme/Colors'
import { Direction } from '../game/MazeGame'


interface MazeCanvasProps {
  playerX: number
  playerY: number
  cellSize: number
  revealedPaths: boolean
  onMove?: (direction: Direction) => void
  mazeWidth: number
  mazeHeight: number
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({ playerX, playerY, cellSize, onMove, mazeWidth, mazeHeight }) => {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const moveInterval = useRef<number | null>(null)
  const playerAnim = useRef(new Animated.ValueXY({ x: playerX, y: playerY })).current

  useEffect(() => {
    Animated.timing(playerAnim, {
      toValue: { x: playerX, y: playerY },
      duration: 16,
      useNativeDriver: false
    }).start()
  }, [playerX, playerY])

  const handleMove = (locationX: number, locationY: number) => {
    const s = startRef.current
    if (!s || !onMove) return
    const dx = locationX - s.x
    const dy = locationY - s.y
    const magnitude = Math.sqrt(dx * dx + dy * dy)
    if (magnitude === 0) return
    let direction: Direction
    const angle = Math.atan2(dy, dx)
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) direction = Direction.RIGHT
    else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) direction = Direction.DOWN
    else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) direction = Direction.UP
    else direction = Direction.LEFT
    onMove(direction)
  }


  return (
    <View
      style={[styles.container, { width: mazeWidth, height: mazeHeight }]}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'relative' }
})

export default MazeCanvas
