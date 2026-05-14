import React, { useRef, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, PanResponder } from 'react-native'
import { Colors, Spacing } from '../theme/Colors'
import { Direction } from '../game/MazeGame'
import { regenerateWorld } from '../game/WorldGame'

interface ControlPanelProps {
  onMoveContinuous: (dx: number, dy: number) => void
  onJump: (dx: number, dy: number) => void
  onBreakWall: (direction: Direction) => void
  onTogglePause: () => void
  onToggleReveal: () => void
  onReset: () => void
  onMap: () => void
  isPaused: boolean
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onMoveContinuous,
  onJump,
  onBreakWall,
  onTogglePause,
  onToggleReveal,
  onReset,
  onMap,
  isPaused,
}) => {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const joystickSize = 120
  const knobSize = 60
  const radius = joystickSize / 2
  const lastInputRef = useRef({ dx: 0, dy: 0 })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const dist = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2)
        let nx = gesture.dx
        let ny = gesture.dy
        if (dist > radius) {
          nx = (nx / dist) * radius
          ny = (ny / dist) * radius
        }
        setJoystickPos({ x: nx, y: ny })
        const ndx = nx / radius
        const ndy = ny / radius
        lastInputRef.current = { dx: ndx, dy: ndy }
        onMoveContinuous(ndx, ndy)
      },
      onPanResponderRelease: () => {
        setJoystickPos({ x: 0, y: 0 })
        lastInputRef.current = { dx: 0, dy: 0 }
        onMoveContinuous(0, 0)
      },
    })
  ).current

  return (
    <View style={styles.container}>
      <View style={styles.bottomRow}>
        <View style={styles.joystickWrapper}>
          <View style={[styles.joystickBase, { width: joystickSize, height: joystickSize, borderRadius: radius }]}>
            <View
              {...panResponder.panHandlers}
              style={[
                styles.joystickKnob,
                {
                  width: knobSize,
                  height: knobSize,
                  borderRadius: knobSize / 2,
                  transform: [{ translateX: joystickPos.x }, { translateY: joystickPos.y }],
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonsWrapper}>
          <TouchableOpacity style={[styles.actionButton, isPaused && styles.pausedButton]} onPress={onTogglePause}>
            <Text style={styles.actionButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={onMap}>
            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newWorldButton} onPress={regenerateWorld}>
            <Text style={styles.newWorldText}>New World</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', justifyContent: 'flex-end', padding: 12 },
  bottomRow: { flexDirection: 'row', width: '100%', alignItems: 'flex-end' },
  joystickWrapper: { width: '40%', justifyContent: 'center', alignItems: 'center' },
  buttonsWrapper: { width: '60%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  actionButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: Colors.primary },
  pausedButton: { backgroundColor: '#FF9500' },
  actionButtonText: { color: 'white', fontSize: 14 },
  resetButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: Colors.textSecondary },
  resetButtonText: { color: 'white', fontSize: 14 },
  mapButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#2c5f8a' },
  mapButtonText: { color: 'white', fontSize: 14 },
  newWorldButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5b8a3a' },
  newWorldText: { color: 'white', fontSize: 14 },
  joystickBase: { backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  joystickKnob: { backgroundColor: Colors.primary, position: 'absolute' },
})
