import React, { useState, useCallback } from 'react'
import { View, StyleSheet, SafeAreaView, Text } from 'react-native'
import { WorldGame, WorldState } from '../game/WorldGame'
import { WorldCanvas } from '../components/WorldCanvas'
import { ControlPanel } from '../components/ControlPanel'
import { Colors, Typography, Spacing } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

export const MazeGameScreen: React.FC = () => {
  const [game] = useState(() => new WorldGame())
  const [state, setState] = useState<WorldState>(game.getState())

  const handleMoveContinuous = useCallback((dx: number, dy: number) => {
    setState(game.moveByDelta(dx, dy))
  }, [game])

  const handleTogglePause = useCallback(() => {
    setState(game.togglePause())
  }, [game])

  const handleReset = useCallback(() => {
    setState(game.reset())
  }, [game])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chupacabra</Text>
      </View>

      <View style={styles.content}>
        <WorldCanvas
          game={game}
          playerX={state.playerX}
          playerY={state.playerY}
        />

        <View style={styles.controls}>
          <ControlPanel
            onMoveContinuous={handleMoveContinuous}
            onJump={() => {}}
            onBreakWall={(_: Direction) => {}}
            onTogglePause={handleTogglePause}
            onToggleReveal={() => {}}
            onReset={handleReset}
            isPaused={state.isPaused}
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
  content: { flex: 1 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0 },
})
