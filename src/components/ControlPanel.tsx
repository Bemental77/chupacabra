import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme/Colors';
import { Direction } from '../game/MazeGame';

interface ControlPanelProps {
  onMove: (direction: Direction) => void;
  onJump: (direction: Direction) => void;
  onBreakWall: (direction: Direction) => void;
  onTeleport: (x: number, y: number) => void;
  onTogglePause: () => void;
  onToggleReveal: () => void;
  onReset: () => void;
  isPaused: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onMove,
  onJump,
  onBreakWall,
  onTogglePause,
  onToggleReveal,
  onReset,
  isPaused,
}) => {
  return (
    <ScrollView style={styles.container}>
      {/* Direction Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movement</Text>
        <View style={styles.dPadContainer}>
          <TouchableOpacity
            style={styles.buttonUp}
            onPress={() => onMove(Direction.UP)}
          >
            <Text style={styles.buttonText}>↑</Text>
          </TouchableOpacity>
          <View style={styles.dPadRow}>
            <TouchableOpacity
              style={styles.buttonSide}
              onPress={() => onMove(Direction.LEFT)}
            >
              <Text style={styles.buttonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonSide}
              onPress={() => onMove(Direction.RIGHT)}
            >
              <Text style={styles.buttonText}>→</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.buttonDown}
            onPress={() => onMove(Direction.DOWN)}
          >
            <Text style={styles.buttonText}>↓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Special Moves */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Moves</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onJump(Direction.UP)}
          >
            <Text style={styles.smallButtonText}>Jump ↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onJump(Direction.DOWN)}
          >
            <Text style={styles.smallButtonText}>Jump ↓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onJump(Direction.LEFT)}
          >
            <Text style={styles.smallButtonText}>Jump ←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onJump(Direction.RIGHT)}
          >
            <Text style={styles.smallButtonText}>Jump →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wall Breaking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Break Walls</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onBreakWall(Direction.UP)}
          >
            <Text style={styles.smallButtonText}>Break ↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onBreakWall(Direction.DOWN)}
          >
            <Text style={styles.smallButtonText}>Break ↓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onBreakWall(Direction.LEFT)}
          >
            <Text style={styles.smallButtonText}>Break ←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => onBreakWall(Direction.RIGHT)}
          >
            <Text style={styles.smallButtonText}>Break →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Controls</Text>
        <TouchableOpacity
          style={[styles.actionButton, isPaused && styles.pausedButton]}
          onPress={onTogglePause}
        >
          <Text style={styles.actionButtonText}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onToggleReveal}>
          <Text style={styles.actionButtonText}>Reveal Path</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.md,
    fontWeight: '600', // Ensure this matches allowed values: 'normal', 'bold', '100'-'900'
  },
  dPadContainer: {
    alignItems: 'center',
  },
  dPadRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  buttonUp: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDown: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSide: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  smallButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pausedButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    backgroundColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
