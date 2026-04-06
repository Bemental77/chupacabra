import { generateMaze } from './MazeGenerator'

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

const MAZE_COLS = 13
const MAZE_ROWS = 21
const PLAYER_RADIUS = 0.4

const MAX_SPEED = 0.08
const ACCELERATION = 0.015
const DECELERATION = 0.80

export class MazeGame {
  private maze: number[][]
  private playerX: number = 1
  private playerY: number = 1
  private velocityX: number = 0
  private velocityY: number = 0
  private isPaused: boolean = false
  private revealedPaths: boolean = false

  constructor() {
    this.maze = generateMaze(MAZE_COLS, MAZE_ROWS)
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

  private isWall(x: number, y: number): boolean {
    const gx = Math.round(x)
    const gy = Math.round(y)
    if (gx < 0 || gy < 0 || gy >= this.maze.length || gx >= this.maze[0].length) return true
    return this.maze[gy][gx] === 1
  }

  private collidesWithWall(x: number, y: number): boolean {
    return (
      this.isWall(x - PLAYER_RADIUS, y - PLAYER_RADIUS) ||
      this.isWall(x + PLAYER_RADIUS, y - PLAYER_RADIUS) ||
      this.isWall(x - PLAYER_RADIUS, y + PLAYER_RADIUS) ||
      this.isWall(x + PLAYER_RADIUS, y + PLAYER_RADIUS)
    )
  }

  moveByDelta(dx: number, dy: number): GameState {
    if (this.isPaused) return this.getState()

    if (dx === 0 && dy === 0) {
      this.velocityX *= DECELERATION
      this.velocityY *= DECELERATION
      if (Math.abs(this.velocityX) < 0.001 && Math.abs(this.velocityY) < 0.001) {
        this.velocityX = 0
        this.velocityY = 0
        return this.getState()
      }
    } else {
      this.velocityX += dx * ACCELERATION
      this.velocityY += dy * ACCELERATION
      const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
      if (speed > MAX_SPEED) {
        this.velocityX = (this.velocityX / speed) * MAX_SPEED
        this.velocityY = (this.velocityY / speed) * MAX_SPEED
      }
    }

    const newX = this.playerX + this.velocityX
    const newY = this.playerY + this.velocityY

    if (!this.collidesWithWall(newX, this.playerY)) {
      this.playerX = newX
    } else {
      this.velocityX = 0
    }

    if (!this.collidesWithWall(this.playerX, newY)) {
      this.playerY = newY
    } else {
      this.velocityY = 0
    }

    return this.getState()
  }

  breakWall(): GameState {
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
    this.maze = generateMaze(MAZE_COLS, MAZE_ROWS)
    this.playerX = 1
    this.playerY = 1
    this.velocityX = 0
    this.velocityY = 0
    this.isPaused = false
    this.revealedPaths = false
    return this.getState()
  }
}
