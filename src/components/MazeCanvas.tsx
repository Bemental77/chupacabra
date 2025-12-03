import React, { useRef, useEffect } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { Colors } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

interface MazeCanvasProps {
  playerX: number
  playerY: number
  cellSize: number
  revealedPaths: boolean
  onMove?: (direction: Direction) => void
  maze: number[][]
}

export const generateLargeSparseMaze = (): number[][] =>
  Array.from({ length: 100 }, (_, row) =>
    Array.from({ length: 100 }, (_, col) => {
      if (row === 0 || row === 99 || col === 0 || col === 99) return 1
      if ((row % 7 === 0 && col % 11 === 0) || (row % 13 === 0 && col % 17 === 0)) return 1
      return 0
    })
  )

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  playerX,
  playerY,
  cellSize,
  revealedPaths,
  onMove
}) => {
  const maze = useRef(generateLargeSparseMaze()).current
  const width = maze[0].length * cellSize
  const height = maze.length * cellSize
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const moveInterval = useRef<number | null>(null)

  const playerAnim = useRef(new Animated.ValueXY({ x: playerX * cellSize + cellSize * 0.2, y: playerY * cellSize + cellSize * 0.2 })).current

  useEffect(() => {
    Animated.timing(playerAnim, {
      toValue: { x: playerX * cellSize + cellSize * 0.2, y: playerY * cellSize + cellSize * 0.2 },
      duration: 5,
      useNativeDriver: false
    }).start()
  }, [playerX, playerY])

  const handleMove = (locationX: number, locationY: number) => {
    const s = startRef.current
    if (!s || !onMove) return
    const dx = locationX - s.x
    const dy = locationY - s.y
    let dir: Direction | null = null
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? Direction.RIGHT : Direction.LEFT
    else dir = dy > 0 ? Direction.DOWN : Direction.UP
    if (dir) onMove(dir)
  }

  return (
    <View
      style={[styles.container, { width, height }]}
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
      {maze.map((row, y) =>
        row.map((cell, x) => {
          const isVisible = cell === 1 || revealedPaths || (x >= playerX - 5 && x <= playerX + 5 && y >= playerY - 5 && y <= playerY + 5)
          return (
            <View
              key={`${x}-${y}`}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  opacity: isVisible ? 1 : 0.1,
                  backgroundColor: cell === 0 ? Colors.path : Colors.wall,
                  position: 'absolute',
                  left: x * cellSize,
                  top: y * cellSize
                }
              ]}
            />
          )
        })
      )}

      <Animated.View
        style={[
          styles.player,
          {
            width: cellSize * 0.6,
            height: cellSize * 0.6,
            borderRadius: cellSize * 0.3,
            transform: [{ translateX: playerAnim.x }, { translateY: playerAnim.y }]
          }
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.surface
  },
  cell: {
    borderWidth: 0
  },
  player: {
    backgroundColor: Colors.player,
    position: 'absolute'
  }
})
export default MazeCanvas
