import React, { useRef, useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, PanResponder } from 'react-native'
import { Colors, Spacing, Typography } from '../theme/Colors'
import { Direction } from '../game/MazeGame'

interface ControlPanelProps {
  onJump: (direction: Direction) => void
  onBreakWall: (direction: Direction) => void
  onTogglePause: () => void
  onToggleReveal: () => void
  onReset: () => void
  isPaused: boolean
  onMoveContinuous: (direction: Direction | null) => void
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
  const directionRef = useRef<Direction | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startContinuousMove = (direction: Direction | null) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!direction) {
      onMoveContinuous(null)
      return
    }
    directionRef.current = direction
    intervalRef.current = setInterval(() => {
      onMoveContinuous(direction)
    }, 1)
  }

  const stopContinuousMove = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    directionRef.current = null
    onMoveContinuous(null)
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

        let newDirection: Direction | null = null
        if (Math.abs(nx) > Math.abs(ny)) {
          if (nx > 20) newDirection = Direction.RIGHT
          else if (nx < -20) newDirection = Direction.LEFT
        } else {
          if (ny > 20) newDirection = Direction.DOWN
          else if (ny < -20) newDirection = Direction.UP
        }

        if (newDirection !== directionRef.current) {
          startContinuousMove(newDirection)
        }
      },
      onPanResponderRelease: () => {
        setJoystickPos({ x: 0, y: 0 })
        stopContinuousMove()
      }
    })
  ).current

  useEffect(() => {
    return () => stopContinuousMove()
  }, [])

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movement</Text>
        <View style={styles.joystickContainer}>
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Moves</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallButton} onPress={() => onJump(Direction.UP)}>
            <Text style={styles.smallButtonText}>Jump ↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => onJump(Direction.DOWN)}>
            <Text style={styles.smallButtonText}>Jump ↓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallButton} onPress={() => onJump(Direction.LEFT)}>
            <Text style={styles.smallButtonText}>Jump ←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => onJump(Direction.RIGHT)}>
            <Text style={styles.smallButtonText}>Jump →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Break Walls</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.UP)}>
            <Text style={styles.smallButtonText}>Break ↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.DOWN)}>
            <Text style={styles.smallButtonText}>Break ↓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.LEFT)}>
            <Text style={styles.smallButtonText}>Break ←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => onBreakWall(Direction.RIGHT)}>
            <Text style={styles.smallButtonText}>Break →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Controls</Text>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.surface, padding: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.heading, color: Colors.text, marginBottom: Spacing.md, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  smallButton: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { color: 'white', fontSize: 12 },
  actionButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  pausedButton: { backgroundColor: '#FF9500' },
  actionButtonText: { color: 'white', fontSize: 14 },
  resetButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: 8, backgroundColor: Colors.textSecondary, justifyContent: 'center', alignItems: 'center' },
  resetButtonText: { color: 'white', fontSize: 14 },
  joystickContainer: { justifyContent: 'center', alignItems: 'center' },
  joystickBase: { backgroundColor: '#333', opacity: 0.4, justifyContent: 'center', alignItems: 'center' },
  joystickKnob: { backgroundColor: Colors.primary, position: 'absolute' }
})
