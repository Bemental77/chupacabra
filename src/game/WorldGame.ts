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

// Town 2
const T2_X = 100
const T2_Y = 300
const T2_W = 700
const T2_H = 800

export const TOWN2: Rect = { x: T2_X, y: T2_Y, w: T2_W, h: T2_H }

export const PLAYER_START = { x: 1550, y: 700 }

const GATE = 70
const WALL = 25

function halfGap(size: number) { return (size - GATE) / 2 }

export const TOWN2_OBSTACLES: Rect[] = [
  // Outer walls
  { x: T2_X, y: T2_Y, w: halfGap(T2_W), h: WALL },
  { x: T2_X + halfGap(T2_W) + GATE, y: T2_Y, w: halfGap(T2_W), h: WALL },
  { x: T2_X, y: T2_Y + T2_H - WALL, w: halfGap(T2_W), h: WALL },
  { x: T2_X + halfGap(T2_W) + GATE, y: T2_Y + T2_H - WALL, w: halfGap(T2_W), h: WALL },
  { x: T2_X, y: T2_Y + WALL, w: WALL, h: halfGap(T2_H) - WALL },
  { x: T2_X, y: T2_Y + halfGap(T2_H) + GATE, w: WALL, h: halfGap(T2_H) - WALL },
  { x: T2_X + T2_W - WALL, y: T2_Y + WALL, w: WALL, h: halfGap(T2_H) - WALL },
  { x: T2_X + T2_W - WALL, y: T2_Y + halfGap(T2_H) + GATE, w: WALL, h: halfGap(T2_H) - WALL },
  // Buildings
  { x: T2_X + 50, y: T2_Y + 50, w: 100, h: 70 },
  { x: T2_X + 170, y: T2_Y + 45, w: 75, h: 95 },
  { x: T2_X + 50, y: T2_Y + 140, w: 130, h: 60 },
  { x: T2_X + T2_W - 170, y: T2_Y + 50, w: 100, h: 70 },
  { x: T2_X + T2_W - 265, y: T2_Y + 45, w: 75, h: 95 },
  { x: T2_X + T2_W - 205, y: T2_Y + 140, w: 130, h: 60 },
  { x: T2_X + 50, y: T2_Y + T2_H - 140, w: 100, h: 70 },
  { x: T2_X + 170, y: T2_Y + T2_H - 160, w: 75, h: 95 },
  { x: T2_X + T2_W - 170, y: T2_Y + T2_H - 140, w: 100, h: 70 },
  { x: T2_X + T2_W - 265, y: T2_Y + T2_H - 160, w: 75, h: 95 },
  { x: T2_X + T2_W / 2 - 90, y: T2_Y + T2_H / 2 - 90, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 + 35, y: T2_Y + T2_H / 2 - 90, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 - 90, y: T2_Y + T2_H / 2 + 35, w: 55, h: 55 },
  { x: T2_X + T2_W / 2 + 35, y: T2_Y + T2_H / 2 + 35, w: 55, h: 55 },
]

export const FIELD_TREES: Circle[] = [
  // NW forest cluster
  { x: 870, y: 380, r: 38 }, { x: 930, y: 440, r: 30 }, { x: 820, y: 460, r: 32 },
  { x: 980, y: 390, r: 26 }, { x: 860, y: 320, r: 34 }, { x: 780, y: 350, r: 28 },
  // North-center forest
  { x: 1050, y: 280, r: 42 }, { x: 1120, y: 350, r: 30 }, { x: 990, y: 310, r: 26 },
  { x: 1180, y: 290, r: 36 }, { x: 1060, y: 200, r: 32 }, { x: 1140, y: 180, r: 28 },
  // West field scatter
  { x: 800, y: 600, r: 35 }, { x: 860, y: 680, r: 30 }, { x: 750, y: 720, r: 28 },
  // South scatter
  { x: 900, y: 980, r: 38 }, { x: 970, y: 1050, r: 28 }, { x: 840, y: 1060, r: 32 },
  { x: 1200, y: 920, r: 35 }, { x: 1280, y: 990, r: 30 }, { x: 1360, y: 880, r: 40 },
  { x: 1150, y: 1060, r: 26 }, { x: 1050, y: 1100, r: 34 },
  // NE forest cluster
  { x: 1700, y: 360, r: 38 }, { x: 1760, y: 440, r: 28 }, { x: 1640, y: 440, r: 32 },
  { x: 1820, y: 380, r: 34 }, { x: 1880, y: 300, r: 38 }, { x: 1950, y: 370, r: 26 },
  { x: 1760, y: 270, r: 30 }, { x: 1840, y: 230, r: 28 },
  // SE scatter
  { x: 1720, y: 900, r: 35 }, { x: 1790, y: 970, r: 30 }, { x: 1660, y: 960, r: 28 },
  { x: 1560, y: 1000, r: 38 }, { x: 1620, y: 1070, r: 26 },
  // Far east
  { x: 2100, y: 500, r: 40 }, { x: 2180, y: 560, r: 30 }, { x: 2060, y: 580, r: 28 },
  { x: 2240, y: 480, r: 34 }, { x: 2300, y: 550, r: 28 },
  // Far east lower
  { x: 2150, y: 950, r: 35 }, { x: 2220, y: 1010, r: 28 }, { x: 2090, y: 1020, r: 32 },
  // Deep south
  { x: 1300, y: 1200, r: 32 }, { x: 1400, y: 1250, r: 28 }, { x: 1200, y: 1260, r: 36 },
  { x: 1500, y: 1220, r: 30 }, { x: 1600, y: 1270, r: 26 },
  // Far north
  { x: 1400, y: 120, r: 38 }, { x: 1480, y: 80, r: 28 }, { x: 1320, y: 90, r: 32 },
  { x: 1560, y: 110, r: 30 }, { x: 1650, y: 140, r: 34 },
]

export const FIELD_ROCKS: Circle[] = [
  // Near forest path (trail A)
  { x: 1240, y: 480, r: 22 }, { x: 1270, y: 450, r: 16 }, { x: 1210, y: 460, r: 18 },
  // Near river path (trail B)
  { x: 1960, y: 1080, r: 24 }, { x: 2000, y: 1110, r: 18 }, { x: 1930, y: 1100, r: 20 },
  // Central field scatter
  { x: 1400, y: 520, r: 20 }, { x: 1440, y: 545, r: 15 }, { x: 1370, y: 548, r: 18 },
  // NW trail area
  { x: 730, y: 380, r: 22 }, { x: 760, y: 350, r: 17 }, { x: 700, y: 360, r: 19 },
  // Far east rocks
  { x: 2300, y: 700, r: 25 }, { x: 2340, y: 730, r: 18 }, { x: 2270, y: 720, r: 20 },
  // South trail rocks
  { x: 1880, y: 1180, r: 22 }, { x: 1910, y: 1210, r: 16 },
  // Scattered mid-field
  { x: 1650, y: 560, r: 18 }, { x: 1580, y: 490, r: 20 },
  { x: 1100, y: 780, r: 22 }, { x: 1130, y: 810, r: 16 },
]

export class WorldGame {
  private playerX: number = PLAYER_START.x
  private playerY: number = PLAYER_START.y
  private velocityX = 0
  private velocityY = 0
  private isPaused = false

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

  private collidesAt(x: number, y: number): boolean {
    if (x < PLAYER_RADIUS || x > WORLD_WIDTH - PLAYER_RADIUS) return true
    if (y < PLAYER_RADIUS || y > WORLD_HEIGHT - PLAYER_RADIUS) return true
    for (const obs of TOWN2_OBSTACLES) {
      if (this.rectCollides(x, y, obs)) return true
    }
    for (const tree of FIELD_TREES) {
      if (this.circleCollides(x, y, tree)) return true
    }
    for (const rock of FIELD_ROCKS) {
      if (this.circleCollides(x, y, rock)) return true
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
