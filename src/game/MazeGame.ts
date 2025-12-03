export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface GameState {
  maze: number[][]
  playerX: number
  playerY: number
  isPaused: boolean
  revealedPaths: boolean
}

export class MazeGame {
  private maze: number[][]
  private playerX: number = 1
  private playerY: number = 1
  private isPaused: boolean = false
  private revealedPaths: boolean = false
  readonly speed: number = 5

  constructor(maze: number[][]) {
    this.maze = maze
  }

  getMaze(): number[][] {
    return this.maze
  }

  getState(): GameState {
    return {
      maze: this.maze,
      playerX: this.playerX,
      playerY: this.playerY,
      isPaused: this.isPaused,
      revealedPaths: this.revealedPaths
    }
  }

  moveByDelta(dx: number, dy: number): GameState {
    if (this.isPaused) return this.getState()
    this.playerX += dx
    this.playerY += dy
    return this.getState()
  }

movePlayer(dx: number, dy: number): GameState {
  if (this.isPaused) return this.getState()

  const newX = this.playerX + dx
  const newY = this.playerY + dy

  this.playerX = newX
  this.playerY = newY

  return this.getState()
}


  jump(direction: Direction): GameState {
    if (this.isPaused) return this.getState()

    let newX = this.playerX
    let newY = this.playerY

    if (direction === Direction.UP) newY -= this.speed * 4
    if (direction === Direction.DOWN) newY += this.speed * 4
    if (direction === Direction.LEFT) newX -= this.speed * 4
    if (direction === Direction.RIGHT) newX += this.speed * 4

    this.playerX = newX
    this.playerY = newY

    return this.getState()
  }

  breakWall(): GameState {
    return this.getState()
  }

  teleport(x: number, y: number): GameState {
    if (this.isPaused) return this.getState()

    this.playerX = x
    this.playerY = y

    return this.getState()
  }

  toggleRevealPath(): GameState {
    this.revealedPaths = !this.revealedPaths
    return this.getState()
  }

  togglePause(): GameState {
    this.isPaused = !this.isPaused
    return this.getState()
  }

  reset(): GameState {
    this.playerX = 1
    this.playerY = 1
    this.isPaused = false
    this.revealedPaths = false
    this.maze = this.maze.map(r => r.slice())
    return this.getState()
  }
}
