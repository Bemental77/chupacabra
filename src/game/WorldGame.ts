const MAX_SPEED = 4
const ACCELERATION = 0.5
const DECELERATION = 0.85
const PLAYER_RADIUS = 12

export interface WorldState {
  playerX: number
  playerY: number
  isPaused: boolean
}

interface Rect { x: number; y: number; w: number; h: number }
interface Circle { x: number; y: number; r: number }

export const WORLD_WIDTH = 3200
export const WORLD_HEIGHT = 1400

// Village: map.png displayed here
export const VILLAGE: Rect = { x: 2100, y: 300, w: 900, h: 900 }

// Town 2 origin
const T2_X = 100
const T2_Y = 300
const T2_W = 700
const T2_H = 800

export const TOWN2: Rect = { x: T2_X, y: T2_Y, w: T2_W, h: T2_H }

export const PLAYER_START = { x: 1550, y: 700 }

// Town 2 walls and buildings (collision rects)
const GATE = 70
const WALL = 25

function halfGap(size: number) { return (size - GATE) / 2 }

export const TOWN2_OBSTACLES: Rect[] = [
  // Outer walls with gate gaps on each side
  // Top
  { x: T2_X, y: T2_Y, w: halfGap(T2_W), h: WALL },
  { x: T2_X + halfGap(T2_W) + GATE, y: T2_Y, w: halfGap(T2_W), h: WALL },
  // Bottom
  { x: T2_X, y: T2_Y + T2_H - WALL, w: halfGap(T2_W), h: WALL },
  { x: T2_X + halfGap(T2_W) + GATE, y: T2_Y + T2_H - WALL, w: halfGap(T2_W), h: WALL },
  // Left
  { x: T2_X, y: T2_Y + WALL, w: WALL, h: halfGap(T2_H) - WALL },
  { x: T2_X, y: T2_Y + halfGap(T2_H) + GATE, w: WALL, h: halfGap(T2_H) - WALL },
  // Right
  { x: T2_X + T2_W - WALL, y: T2_Y + WALL, w: WALL, h: halfGap(T2_H) - WALL },
  { x: T2_X + T2_W - WALL, y: T2_Y + halfGap(T2_H) + GATE, w: WALL, h: halfGap(T2_H) - WALL },
  // NW buildings
  { x: T2_X + 50, y: T2_Y + 50, w: 100, h: 70 },
  { x: T2_X + 170, y: T2_Y + 45, w: 75, h: 95 },
  { x: T2_X + 50, y: T2_Y + 140, w: 130, h: 60 },
  // NE buildings
  { x: T2_X + T2_W - 170, y: T2_Y + 50, w: 100, h: 70 },
  { x: T2_X + T2_W - 265, y: T2_Y + 45, w: 75, h: 95 },
  { x: T2_X + T2_W - 205, y: T2_Y + 140, w: 130, h: 60 },
  // SW buildings
  { x: T2_X + 50, y: T2_Y + T2_H - 140, w: 100, h: 70 },
  { x: T2_X + 170, y: T2_Y + T2_H - 160, w: 75, h: 95 },
  // SE buildings
  { x: T2_X + T2_W - 170, y: T2_Y + T2_H - 140, w: 100, h: 70 },
  { x: T2_X + T2_W - 265, y: T2_Y + T2_H - 160, w: 75, h: 95 },
  // Market stalls at center
  { x: T2_X + T2_W / 2 - 90, y: T2_Y + T2_H / 2 - 90, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 + 35, y: T2_Y + T2_H / 2 - 90, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 - 90, y: T2_Y + T2_H / 2 + 35, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 + 35, y: T2_Y + T2_H / 2 + 35, w: 55, h: 55 },
]

export const FIELD_TREES: Circle[] = [
  { x: 870, y: 380, r: 38 },
  { x: 930, y: 450, r: 28 },
  { x: 820, y: 460, r: 32 },
  { x: 1050, y: 300, r: 42 },
  { x: 1110, y: 370, r: 26 },
  { x: 800, y: 620, r: 35 },
  { x: 860, y: 680, r: 30 },
  { x: 900, y: 980, r: 38 },
  { x: 960, y: 1040, r: 28 },
  { x: 1200, y: 920, r: 35 },
  { x: 1270, y: 980, r: 30 },
  { x: 1350, y: 880, r: 40 },
  { x: 1680, y: 380, r: 38 },
  { x: 1740, y: 450, r: 28 },
  { x: 1630, y: 460, r: 32 },
  { x: 1900, y: 320, r: 42 },
  { x: 1960, y: 390, r: 28 },
  { x: 1700, y: 900, r: 35 },
  { x: 1760, y: 960, r: 30 },
  { x: 1550, y: 980, r: 38 },
  { x: 1200, y: 1100, r: 32 },
  { x: 1300, y: 1150, r: 28 },
]

export class WorldGame {
  private playerX: number = PLAYER_START.x
  private playerY: number = PLAYER_START.y
  private velocityX = 0
  private velocityY = 0
  private isPaused = false
  private villagePixels: Uint8ClampedArray | null = null
  private villageImgW = 0
  private villageImgH = 0

  setVillagePixels(data: Uint8ClampedArray, w: number, h: number) {
    this.villagePixels = data
    this.villageImgW = w
    this.villageImgH = h
  }

  getState(): WorldState {
    return { playerX: this.playerX, playerY: this.playerY, isPaused: this.isPaused }
  }

  private rectCollides(px: number, py: number, r: Rect): boolean {
    return px + PLAYER_RADIUS > r.x && px - PLAYER_RADIUS < r.x + r.w &&
           py + PLAYER_RADIUS > r.y && py - PLAYER_RADIUS < r.y + r.h
  }

  private circleCollides(px: number, py: number, c: Circle): boolean {
    const dx = px - c.x, dy = py - c.y
    return Math.sqrt(dx * dx + dy * dy) < c.r + PLAYER_RADIUS
  }

  private villageWallAt(wx: number, wy: number): boolean {
    if (!this.villagePixels) return false
    const v = VILLAGE
    if (wx < v.x || wx > v.x + v.w || wy < v.y || wy > v.y + v.h) return false
    const ix = Math.floor((wx - v.x) / v.w * this.villageImgW)
    const iy = Math.floor((wy - v.y) / v.h * this.villageImgH)
    if (ix < 0 || iy < 0 || ix >= this.villageImgW || iy >= this.villageImgH) return false
    const i = (iy * this.villageImgW + ix) * 4
    return this.villagePixels[i] + this.villagePixels[i + 1] + this.villagePixels[i + 2] < 120
  }

  private collidesAt(x: number, y: number): boolean {
    if (x < PLAYER_RADIUS || x > WORLD_WIDTH - PLAYER_RADIUS) return true
    if (y < PLAYER_RADIUS || y > WORLD_HEIGHT - PLAYER_RADIUS) return true
    if (this.villageWallAt(x, y)) return true
    for (const obs of TOWN2_OBSTACLES) {
      if (this.rectCollides(x, y, obs)) return true
    }
    for (const tree of FIELD_TREES) {
      if (this.circleCollides(x, y, tree)) return true
    }
    return false
  }

  moveByDelta(dx: number, dy: number): WorldState {
    if (this.isPaused) return this.getState()

    if (dx === 0 && dy === 0) {
      this.velocityX *= DECELERATION
      this.velocityY *= DECELERATION
      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
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

    if (!this.collidesAt(newX, this.playerY)) this.playerX = newX
    else this.velocityX = 0

    if (!this.collidesAt(this.playerX, newY)) this.playerY = newY
    else this.velocityY = 0

    return this.getState()
  }

  togglePause(): WorldState {
    this.isPaused = !this.isPaused
    return this.getState()
  }

  reset(): WorldState {
    this.playerX = PLAYER_START.x
    this.playerY = PLAYER_START.y
    this.velocityX = 0
    this.velocityY = 0
    this.isPaused = false
    return this.getState()
  }
}
