import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/Colors';

interface MazeCanvasProps {
  maze: number[][];
  playerX: number;
  playerY: number;
  cellSize: number;
  revealedPaths: boolean;
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  playerX,
  playerY,
  cellSize,
  revealedPaths,
}) => {
  const width = maze[0].length * cellSize;
  const height = maze.length * cellSize;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderWidth: 2,
          borderColor: Colors.border,
        },
      ]}
    >
      {/* Render maze */}
      {maze.map((row, y) =>
        row.map((cell, x) => (
          <View
            key={`${x}-${y}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor:
                  cell === 0 ? Colors.path : Colors.wall,
              },
              {
                position: 'absolute',
                left: x * cellSize,
                top: y * cellSize,
              },
            ]}
          />
        ))
      )}

      {/* Render player */}
      <View
        style={[
          styles.player,
          {
            width: cellSize - 4,
            height: cellSize - 4,
            borderRadius: (cellSize - 4) / 2,
            left: playerX * cellSize + 2,
            top: playerY * cellSize + 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  cell: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  player: {
    backgroundColor: Colors.player,
    position: 'absolute',
  },
});
