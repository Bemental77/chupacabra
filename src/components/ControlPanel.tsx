import React, { useRef, useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, PanResponder } from 'react-native'
import { Colors, Spacing, Typography } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

interface ControlPanelProps {
  onJump: (dx: number, dy: number) => void
  onBreakWall: (direction: Direction) => void
  onTogglePause: () => void
  onToggleReveal: () => void
  onReset: () => void
  isPaused: boolean
  onMoveContinuous: (dx: number, dy: number) => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onJump,
  onBreakWall,
  onTogglePause,
  onToggleReveal,
  onReset,
  isPaused,
  onMoveContinuous
}) => {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const joystickSize = 120
  const knobSize = 60
  const radius = joystickSize / 2
  const inputRef = useRef({ dx: 0, dy: 0 })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      onMoveContinuous(inputRef.current.dx, inputRef.current.dy)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [onMoveContinuous])

  const handleJump = () => {
    onJump(inputRef.current.dx, inputRef.current.dy)
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const dx = gesture.dx
        const dy = gesture.dy
        const dist = Math.sqrt(dx * dx + dy * dy)
        let nx = dx
        let ny = dy
        if (dist > radius) {
          nx = (dx / dist) * radius
          ny = (dy / dist) * radius
        }
        setJoystickPos({ x: nx, y: ny })
        inputRef.current = { dx: nx / radius, dy: ny / radius }
      },
      onPanResponderRelease: () => {
        setJoystickPos({ x: 0, y: 0 })
        inputRef.current = { dx: 0, dy: 0 }
      }
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
                  transform: [{ translateX: joystickPos.x }, { translateY: joystickPos.y }]
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonsWrapper}>
          <TouchableOpacity style={styles.smallButton} onPress={handleJump}>
            <Text style={styles.smallButtonText}>Jump</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.UP)}>
            <Text style={styles.smallButtonText}>Break ↑</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.DOWN)}>
            <Text style={styles.smallButtonText}>Break ↓</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.LEFT)}>
            <Text style={styles.smallButtonText}>Break ←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.RIGHT)}>
            <Text style={styles.smallButtonText}>Break →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, isPaused && styles.pausedButton]} onPress={onTogglePause}>
            <Text style={styles.actionButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onToggleReveal}>
            <Text style={styles.actionButtonText}>Reveal Path</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', justifyContent: 'flex-end', padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0)' },
  bottomRow: { flexDirection: 'row', width: '100%', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0)' },
  joystickWrapper: { width: '35%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0)' },
  buttonsWrapper: { width: '65%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(0,0,0,0)' },
  smallButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 8, backgroundColor: Colors.primary },
  smallButtonText: { color: 'white', fontSize: 12 },
  actionButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: 8, backgroundColor: Colors.primary },
  pausedButton: { backgroundColor: '#FF9500' },
  actionButtonText: { color: 'white', fontSize: 14 },
  resetButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: 8, backgroundColor: Colors.textSecondary },
  resetButtonText: { color: 'white', fontSize: 14 },
  joystickBase: { backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  joystickKnob: { backgroundColor: Colors.primary, position: 'absolute' }
})
