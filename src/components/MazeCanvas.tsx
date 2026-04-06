import React, { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, Animated, LayoutChangeEvent } from 'react-native'
import { Colors } from '../theme/Colors'

const WALL_COLOR = '#2c3e1f'   // dense forest
const PATH_COLOR = '#8B7355'   // dirt trail
const EXIT_COLOR = '#4CAF50'   // green exit marker

interface MazeCanvasProps {
  maze: number[][]
  playerX: number
  playerY: number
  cellSize: number
  revealedPaths: boolean
  onMove?: (dx: number, dy: number) => void
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  playerX,
  playerY,
  cellSize,
  onMove
}) => {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const moveInterval = useRef<number | null>(null)
  const playerAnim = useRef(new Animated.ValueXY({ x: playerX * cellSize, y: playerY * cellSize })).current
  const worldOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const mazePixelWidth = maze.length > 0 ? maze[0].length * cellSize : 0
  const mazePixelHeight = maze.length * cellSize

  const exitRow = maze.length - 1
  const exitCol = maze.length > 0 ? maze[0].length - 2 : 0

  useEffect(() => {
    const px = playerX * cellSize
    const py = playerY * cellSize

    Animated.spring(playerAnim, {
      toValue: { x: px, y: py },
      useNativeDriver: false,
      speed: 50,
      bounciness: 0
    }).start()

    if (viewportWidth === 0 || viewportHeight === 0) return

    const offsetX = Math.min(0, Math.max(viewportWidth - mazePixelWidth, -(px - viewportWidth * 0.5)))
    const offsetY = Math.min(0, Math.max(viewportHeight - mazePixelHeight, -(py - viewportHeight * 0.5)))

    Animated.spring(worldOffset, {
      toValue: { x: offsetX, y: offsetY },
      useNativeDriver: false,
      speed: 50,
      bounciness: 0
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
      <Animated.View
        style={{
          width: mazePixelWidth,
          height: mazePixelHeight,
          position: 'absolute',
          transform: [{ translateX: worldOffset.x }, { translateY: worldOffset.y }]
        }}
      >
        {/* Maze grid */}
        {maze.map((row, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {row.map((cell, x) => {
              const isExit = y === exitRow && x === exitCol
              return (
                <View
                  key={x}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isExit ? EXIT_COLOR : cell === 1 ? WALL_COLOR : PATH_COLOR
                  }}
                />
              )
            })}
          </View>
        ))}

        {/* Player */}
        <Animated.View
          style={{
            width: cellSize * 0.8,
            height: cellSize * 0.8,
            borderRadius: cellSize * 0.4,
            backgroundColor: Colors.player,
            position: 'absolute',
            transform: [
              { translateX: Animated.add(playerAnim.x, new Animated.Value(cellSize * 0.1)) },
              { translateY: Animated.add(playerAnim.y, new Animated.Value(cellSize * 0.1)) }
            ]
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
