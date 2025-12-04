import React, { useState, useCallback } from 'react'
import { View, StyleSheet, SafeAreaView, Text, Dimensions } from 'react-native'
import { MazeGame, GameState } from '../game/MazeGame'
import { MazeCanvas } from '../components/MazeCanvas'
import { ControlPanel } from '../components/ControlPanel'
import { Colors, Typography, Spacing } from '../theme/Colors'

export const MazeGameScreen: React.FC = () => {
  const { width, height } = Dimensions.get('window')
  const [game] = useState(() => new MazeGame([]))
  const [gameState, setGameState] = useState<GameState>(game.getState())

  const handleMove = useCallback((dx: number, dy: number) => {
    setGameState(game.moveByDelta(dx, dy))
  }, [game])

  const handleMoveContinuous = useCallback((dx: number, dy: number) => {
    setGameState(game.moveByDelta(dx, dy))
  }, [game])

  const handleJump = useCallback((dx: number, dy: number) => {
    setGameState(game.moveByDelta(dx * 4, dy * 4))
  }, [game])

  const handleBreakWall = useCallback(() => {
    setGameState(game.breakWall())
  }, [game])

  const handleTogglePause = useCallback(() => {
    setGameState(game.togglePause())
  }, [game])

  const handleToggleReveal = useCallback(() => {
    setGameState(game.toggleRevealPath())
  }, [game])

  const handleReset = useCallback(() => {
    setGameState(game.reset())
  }, [game])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chupacabra Maze</Text>
        <Text style={styles.subtitle}>
          Position: ({gameState.playerX}, {gameState.playerY})
        </Text>
      </View>

      <View style={styles.content}>
        <View style={{ flex: 3, width: '100%' }}>
          <MazeCanvas
            playerX={gameState.playerX}
            playerY={gameState.playerY}
            cellSize={50}
            mazeWidth={width}
            mazeHeight={height}
            onMove={handleMove}
            revealedPaths={gameState.revealedPaths}
          />
        </View>

        <View style={{ flex: 2, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <ControlPanel
            onMoveContinuous={handleMoveContinuous}
            onJump={handleJump}
            onBreakWall={handleBreakWall}
            onTogglePause={handleTogglePause}
            onToggleReveal={handleToggleReveal}
            onReset={handleReset}
            isPaused={gameState.isPaused}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  title: { ...Typography.title, color: 'white', fontWeight: 'bold' },
  subtitle: { ...Typography.caption, color: 'rgba(255, 255, 255, 0.8)', marginTop: Spacing.xs, fontWeight: '400' },
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md }
})
