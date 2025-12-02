import React, { useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { Colors } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

interface MazeCanvasProps {
  maze: number[][]
  playerX: number
  playerY: number
  cellSize: number
  revealedPaths: boolean
  onMove?: (direction: Direction) => void
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  playerX,
  playerY,
  cellSize,
  revealedPaths,
  onMove
}) => {
  const width = maze[0].length * cellSize
  const height = maze.length * cellSize
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const threshold = 10

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height
        }
      ]}
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
          const isVisible = revealedPaths || Math.abs(x - playerX) < 6 && Math.abs(y - playerY) < 6
          return (
            <View
              key={`${x}-${y}`}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  opacity: isVisible ? 1 : 0.15,
                  backgroundColor: cell === 0 ? Colors.path : Colors.wall
                },
                {
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
    backgroundColor: Colors.surface,
    borderRadius: 200,
    overflow: 'hidden'
  },
  cell: {
    borderWidth: 0
  },
  player: {
    backgroundColor: Colors.player,
    position: 'absolute'
  }
})
