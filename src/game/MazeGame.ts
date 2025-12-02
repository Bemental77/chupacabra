export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export interface GameState {
  maze: number[][];
  playerX: number;
  playerY: number;
  isPaused: boolean;
  revealedPaths: boolean;
}

export class MazeGame {
  private maze: number[][];
  private playerX: number = 1;
  private playerY: number = 1;
  private isPaused: boolean = false;
  private revealedPaths: boolean = false;
  readonly cellSize: number = 40;

  constructor() {
    // Maze: 0 = path, 1 = wall
    this.maze = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
  }

  getMaze(): number[][] {
    return this.maze;
  }

  getState(): GameState {
    return {
      maze: this.maze,
      playerX: this.playerX,
      playerY: this.playerY,
      isPaused: this.isPaused,
      revealedPaths: this.revealedPaths,
    };
  }

  movePlayer(direction: Direction): GameState {
    if (this.isPaused) return this.getState();

    let newX = this.playerX;
    let newY = this.playerY;

    switch (direction) {
      case Direction.UP:
        newY--;
        break;
      case Direction.DOWN:
        newY++;
        break;
      case Direction.LEFT:
        newX--;
        break;
      case Direction.RIGHT:
        newX++;
        break;
    }

    // Check bounds and walls
    if (
      newX >= 0 &&
      newX < this.maze[0].length &&
      newY >= 0 &&
      newY < this.maze.length &&
      this.maze[newY][newX] === 0
    ) {
      this.playerX = newX;
      this.playerY = newY;
    }

    return this.getState();
  }

  jump(direction: Direction): GameState {
    if (this.isPaused) return this.getState();

    let newX = this.playerX;
    let newY = this.playerY;

    // Jump 2 cells in the direction
    switch (direction) {
      case Direction.UP:
        newY -= 2;
        break;
      case Direction.DOWN:
        newY += 2;
        break;
      case Direction.LEFT:
        newX -= 2;
        break;
      case Direction.RIGHT:
        newX += 2;
        break;
    }

    // Check bounds and if destination is a path
    if (
      newX >= 0 &&
      newX < this.maze[0].length &&
      newY >= 0 &&
      newY < this.maze.length &&
      this.maze[newY][newX] === 0
    ) {
      this.playerX = newX;
      this.playerY = newY;
    }

    return this.getState();
  }

  breakWall(direction: Direction): GameState {
    if (this.isPaused) return this.getState();

    let wallX = this.playerX;
    let wallY = this.playerY;

    switch (direction) {
      case Direction.UP:
        wallY--;
        break;
      case Direction.DOWN:
        wallY++;
        break;
      case Direction.LEFT:
        wallX--;
        break;
      case Direction.RIGHT:
        wallX++;
        break;
    }

    // Check bounds and if it's a wall
    if (
      wallX >= 0 &&
      wallX < this.maze[0].length &&
      wallY >= 0 &&
      wallY < this.maze.length &&
      this.maze[wallY][wallX] === 1
    ) {
      // Break the wall
      this.maze[wallY][wallX] = 0;
    }

    return this.getState();
  }

  teleport(x: number, y: number): GameState {
    if (this.isPaused) return this.getState();

    // Check bounds and if destination is a path
    if (
      x >= 0 &&
      x < this.maze[0].length &&
      y >= 0 &&
      y < this.maze.length &&
      this.maze[y][x] === 0
    ) {
      this.playerX = x;
      this.playerY = y;
    }

    return this.getState();
  }

  toggleRevealPath(): GameState {
    this.revealedPaths = !this.revealedPaths;
    return this.getState();
  }

  togglePause(): GameState {
    this.isPaused = !this.isPaused;
    return this.getState();
  }

  reset(): GameState {
    this.playerX = 1;
    this.playerY = 1;
    this.isPaused = false;
    this.revealedPaths = false;
    // Reset maze
    this.maze = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    return this.getState();
  }
}
