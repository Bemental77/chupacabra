import React, { useRef } from 'react'
import { View, StyleSheet } from 'react-native'
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
  const threshold = 10

  return (
    <View
      style={[styles.container, { width, height }]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const { locationX, locationY } = e.nativeEvent
        startRef.current = { x: locationX, y: locationY }
      }}
      onResponderRelease={(e) => {
        const s = startRef.current
        if (!s || !onMove) return
        const { locationX, locationY } = e.nativeEvent
        const dx = locationX - s.x
        const dy = locationY - s.y
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
          startRef.current = null
          return
        }
        let dir: Direction | null = null
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? Direction.RIGHT : Direction.LEFT
        } else {
          dir = dy > 0 ? Direction.DOWN : Direction.UP
        }
        startRef.current = null
        if (dir) onMove(dir)
      }}
    >
      {maze.map((row, y) =>
        row.map((cell, x) => {
          const isVisible =
            revealedPaths ||
            (x >= playerX - 5 && x <= playerX + 5 && y >= playerY - 5 && y <= playerY + 5)
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

      <View
        style={[
          styles.player,
          {
            width: cellSize * 0.6,
            height: cellSize * 0.6,
            borderRadius: cellSize * 0.3,
            left: playerX * cellSize + cellSize * 0.2,
            top: playerY * cellSize + cellSize * 0.2
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