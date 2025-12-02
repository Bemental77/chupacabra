import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { MazeGame, Direction, GameState } from '../game/MazeGame';
import { MazeCanvas } from '../components/MazeCanvas';
import { ControlPanel } from '../components/ControlPanel';
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

  const handleTeleport = useCallback((x: number, y: number) => {
      setGameState(game.teleport(x, y));
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
          onTeleport={handleTeleport}
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
    fontWeight: 'bold', // Only allowed values: 'normal', 'bold', '100', ..., '900'
  },
  subtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    fontWeight: Typography.caption?.fontWeight === 'bold' || Typography.caption?.fontWeight === 'normal'
      || Typography.caption?.fontWeight === '100' || Typography.caption?.fontWeight === '200'
      || Typography.caption?.fontWeight === '300' || Typography.caption?.fontWeight === '400'
      || Typography.caption?.fontWeight === '500' || Typography.caption?.fontWeight === '600'
      || Typography.caption?.fontWeight === '700' || Typography.caption?.fontWeight === '800'
      || Typography.caption?.fontWeight === '900'
      ? Typography.caption.fontWeight
      : undefined,
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
