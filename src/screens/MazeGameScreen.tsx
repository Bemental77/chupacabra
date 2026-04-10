import React, { useState, useCallback, useRef } from 'react'
import { View, StyleSheet, SafeAreaView } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import { WorldCanvas } from '../components/WorldCanvas'
import { ControlPanel } from '../components/ControlPanel'
import { MapOverlay } from '../components/MapOverlay'
import { Colors } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

export const MazeGameScreen: React.FC = () => {
  const gameRef = useRef(new WorldGame())
  const inputRef = useRef({ dx: 0, dy: 0 })
  const [isPaused, setIsPaused] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)

  const handleMoveContinuous = useCallback((dx: number, dy: number) => {
    inputRef.current = { dx, dy }
  }, [])

  const handleTogglePause = useCallback(() => {
    const state = gameRef.current.togglePause()
    setIsPaused(state.isPaused)
  }, [])

  const handleReset = useCallback(() => {
    const state = gameRef.current.reset()
    setIsPaused(state.isPaused)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <WorldCanvas
          game={gameRef.current}
          inputRef={inputRef}
          onViewportSize={() => {}}
        />
        <View style={styles.controls}>
          <ControlPanel
            onMoveContinuous={handleMoveContinuous}
            onJump={() => {}}
            onBreakWall={(_: Direction) => {}}
            onTogglePause={handleTogglePause}
            onToggleReveal={() => {}}
            onReset={handleReset}
            onMap={() => setMapVisible(true)}
            isPaused={isPaused}
          />
        </View>
        <MapOverlay
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          game={gameRef.current}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0 },
})
