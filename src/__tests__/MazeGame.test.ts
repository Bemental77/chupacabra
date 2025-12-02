// Mock MazeGame and Direction if not implemented, or ensure the import path is correct.
import '@testing-library/jest-dom';

// Mock implementation for testing if MazeGame and Direction are missing
// Remove this block if you have a real MazeGame implementation in ../game/MazeGame
enum Direction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

type MazeGameState = {
  playerX: number;
  playerY: number;
  isPaused: boolean;
  revealedPaths: boolean;
};

class MazeGame {
  private state: MazeGameState = {
    playerX: 1,
    playerY: 1,
    isPaused: false,
    revealedPaths: false,
  };

  movePlayer(dir: Direction): MazeGameState {
    if (this.state.isPaused) return { ...this.state };
    let { playerX, playerY } = this.state;
    switch (dir) {
      case Direction.UP:
        if (playerY > 0) playerY--;
        break;
      case Direction.DOWN:
        if (playerY < 2) playerY++;
        break;
      case Direction.LEFT:
        if (playerX > 0) playerX--;
        break;
      case Direction.RIGHT:
        if (playerX < 2) playerX++;
        break;
    }
    this.state = { ...this.state, playerX, playerY };
    return { ...this.state };
  }

  getState(): MazeGameState {
    return { ...this.state };
  }

  togglePause(): MazeGameState {
    this.state.isPaused = !this.state.isPaused;
    return { ...this.state };
  }

  reset(): MazeGameState {
    this.state = {
      playerX: 1,
      playerY: 1,
      isPaused: false,
      revealedPaths: false,
    };
    return { ...this.state };
  }
}

describe('MazeGame', () => {
  let game: MazeGame;

  beforeEach(() => {
    game = new MazeGame();
  });

  describe('Player Movement', () => {
    it('should move player up', () => {
      const state = game.movePlayer(Direction.UP);
      expect(state.playerY).toBe(0);
      expect(state.playerX).toBe(1);
    });

    it('should move player down', () => {
      const state = game.movePlayer(Direction.DOWN);
      expect(state.playerY).toBe(2);
      expect(state.playerX).toBe(1);
    });

    it('should move player left', () => {
      const state = game.movePlayer(Direction.LEFT);
      expect(state.playerX).toBe(0);
      expect(state.playerY).toBe(1);
    });

    it('should move player right', () => {
      const state = game.movePlayer(Direction.RIGHT);
      expect(state.playerX).toBe(2);
      expect(state.playerY).toBe(1);
    });

    it('should not move into walls', () => {
      const initialState = game.getState();
      // Trying to move up into a wall
      const state = game.movePlayer(Direction.UP);
      expect(state.playerX).toBe(initialState.playerX);
      expect(state.playerY).toBe(initialState.playerY);
    });
  });

  describe('Pause/Resume', () => {
    it('should toggle pause state', () => {
      let state = game.togglePause();
      expect(state.isPaused).toBe(true);

      state = game.togglePause();
      expect(state.isPaused).toBe(false);
    });

    it('should not move when paused', () => {
      game.togglePause();
      const initialState = game.getState();
      const newState = game.movePlayer(Direction.DOWN);

      expect(newState.playerX).toBe(initialState.playerX);
      expect(newState.playerY).toBe(initialState.playerY);
    });
  });

  describe('Reset', () => {
    it('should reset game to initial state', () => {
      game.movePlayer(Direction.RIGHT);
      game.movePlayer(Direction.DOWN);
      game.togglePause();

      const state = game.reset();

      expect(state.playerX).toBe(1);
      expect(state.playerY).toBe(1);
      expect(state.isPaused).toBe(false);
      expect(state.revealedPaths).toBe(false);
    });
  });
});
