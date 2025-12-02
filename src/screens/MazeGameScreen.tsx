import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { MazeGame, Direction, GameState } from '../game/MazeGame';
import { MazeCanvas } from './MazeCanvas';
import { ControlPanel } from './ControlPanel';
import { Colors, Typography, Spacing } from '../theme/Colors';

export const MazeGameScreen: React.FC = () => {
  const [game] = useState(() => new MazeGame());
  const [gameState, setGameState] = useState<GameState>(game.getState());

  const handleMove = useCallback((direction: Direction) => {
    setGameState(game.movePlayer(direction));
  }, [game]);

  const handleJump = useCallback((direction: Direction) => {
    setGameState(game.jump(direction));
  }, [game]);

  const handleBreakWall = useCallback((direction: Direction) => {
    setGameState(game.breakWall(direction));
  }, [game]);

  const handleTogglePause = useCallback(() => {
    setGameState(game.togglePause());
  }, [game]);

  const handleToggleReveal = useCallback(() => {
    setGameState(game.toggleRevealPath());
  }, [game]);

  const handleReset = useCallback(() => {
    setGameState(game.reset());
  }, [game]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chupacabra Maze</Text>
        <Text style={styles.subtitle}>
          Position: ({gameState.playerX}, {gameState.playerY})
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.canvasContainer}>
          <MazeCanvas
            maze={gameState.maze}
            playerX={gameState.playerX}
            playerY={gameState.playerY}
            cellSize={game.cellSize}
            revealedPaths={gameState.revealedPaths}
          />
        </View>

        <ControlPanel
          onMove={handleMove}
          onJump={handleJump}
          onBreakWall={handleBreakWall}
          onTogglePause={handleTogglePause}
          onToggleReveal={handleToggleReveal}
          onReset={handleReset}
          isPaused={gameState.isPaused}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    ...Typography.title,
    color: 'white',
  },
  subtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
  },
});
