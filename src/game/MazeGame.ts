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

const MAX_SPEED = 0.08     // units per frame (~4px/frame at cellSize 50)
const ACCELERATION = 0.015 // how fast velocity ramps up
const DECELERATION = 0.80  // friction when no input (multiplier)

export class MazeGame {
  private maze: number[][]
  private playerX: number = 1
  private playerY: number = 1
  private velocityX: number = 0
  private velocityY: number = 0
  private isPaused: boolean = false
  private revealedPaths: boolean = false
  readonly speed: number = 16

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

    if (dx === 0 && dy === 0) {
      // No input — decelerate
      this.velocityX *= DECELERATION
      this.velocityY *= DECELERATION
      // Stop updating if velocity is negligible
      if (Math.abs(this.velocityX) < 0.001 && Math.abs(this.velocityY) < 0.001) {
        this.velocityX = 0
        this.velocityY = 0
        return this.getState()
      }
    } else {
      // Accelerate toward input direction
      this.velocityX += dx * ACCELERATION
      this.velocityY += dy * ACCELERATION

      // Cap at max speed
      const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
      if (speed > MAX_SPEED) {
        this.velocityX = (this.velocityX / speed) * MAX_SPEED
        this.velocityY = (this.velocityY / speed) * MAX_SPEED
      }
    }

    this.playerX += this.velocityX
    this.playerY += this.velocityY
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
