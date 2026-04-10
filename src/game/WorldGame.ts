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

export const WORLD_WIDTH = 10000
export const WORLD_HEIGHT = 5000
export const PLAYER_START = { x: 5000, y: 2500 }

const GATE = 70
const WALL = 25

function halfGap(size: number) { return (size - GATE) / 2 }

function makeTownWalls(x: number, y: number, w: number, h: number): Rect[] {
  return [
    { x, y, w: halfGap(w), h: WALL },
    { x: x + halfGap(w) + GATE, y, w: halfGap(w), h: WALL },
    { x, y: y + h - WALL, w: halfGap(w), h: WALL },
    { x: x + halfGap(w) + GATE, y: y + h - WALL, w: halfGap(w), h: WALL },
    { x, y: y + WALL, w: WALL, h: halfGap(h) - WALL },
    { x, y: y + halfGap(h) + GATE, w: WALL, h: halfGap(h) - WALL },
    { x: x + w - WALL, y: y + WALL, w: WALL, h: halfGap(h) - WALL },
    { x: x + w - WALL, y: y + halfGap(h) + GATE, w: WALL, h: halfGap(h) - WALL },
  ]
}

function makeTownBuildings(x: number, y: number, w: number, h: number): Rect[] {
  return [
    { x: x + 50, y: y + 50, w: 100, h: 70 },
    { x: x + 170, y: y + 45, w: 75, h: 95 },
    { x: x + 50, y: y + 140, w: 130, h: 60 },
    { x: x + w - 170, y: y + 50, w: 100, h: 70 },
    { x: x + w - 265, y: y + 45, w: 75, h: 95 },
    { x: x + w - 205, y: y + 140, w: 130, h: 60 },
    { x: x + 50, y: y + h - 140, w: 100, h: 70 },
    { x: x + 170, y: y + h - 160, w: 75, h: 95 },
    { x: x + w - 170, y: y + h - 140, w: 100, h: 70 },
    { x: x + w - 265, y: y + h - 160, w: 75, h: 95 },
    { x: x + w / 2 - 90, y: y + h / 2 - 90, w: 55, h: 55 },
    { x: x + w / 2 + 35, y: y + h / 2 - 90, w: 55, h: 55 },
    { x: x + w / 2 - 90, y: y + h / 2 + 35, w: 55, h: 55 },
    { x: x + w / 2 + 35, y: y + h / 2 + 35, w: 55, h: 55 },
  ]
}

// [x, y, w, h]
const TOWN_DEFS: [number, number, number, number][] = [
  [100,  300,  700,  800],   // NW (original)
  [9000, 300,  700,  800],   // NE
  [4300, 1300, 1200, 1000],  // Center
  [100,  3800, 700,  800],   // SW
  [9000, 3800, 700,  800],   // SE
  [4700, 100,  600,  500],   // North outpost
]

export const TOWN_GROUNDS: Rect[] = TOWN_DEFS.map(([x, y, w, h]) => ({ x, y, w, h }))
export const ALL_WALLS: Rect[]    = TOWN_DEFS.flatMap(([x, y, w, h]) => makeTownWalls(x, y, w, h))
export const ALL_BUILDINGS: Rect[] = TOWN_DEFS.flatMap(([x, y, w, h]) => makeTownBuildings(x, y, w, h))

export const FIELD_TREES: Circle[] = [
  // NW forest cluster (original)
  { x: 870, y: 380, r: 38 }, { x: 930, y: 440, r: 30 }, { x: 820, y: 460, r: 32 },
  { x: 980, y: 390, r: 26 }, { x: 860, y: 320, r: 34 }, { x: 780, y: 350, r: 28 },
  // North-center forest (original)
  { x: 1050, y: 280, r: 42 }, { x: 1120, y: 350, r: 30 }, { x: 990, y: 310, r: 26 },
  { x: 1180, y: 290, r: 36 }, { x: 1060, y: 200, r: 32 }, { x: 1140, y: 180, r: 28 },
  // West field scatter (original)
  { x: 800, y: 600, r: 35 }, { x: 860, y: 680, r: 30 }, { x: 750, y: 720, r: 28 },
  // South scatter original area
  { x: 900, y: 980, r: 38 }, { x: 970, y: 1050, r: 28 }, { x: 840, y: 1060, r: 32 },
  { x: 1200, y: 920, r: 35 }, { x: 1280, y: 990, r: 30 }, { x: 1360, y: 880, r: 40 },
  { x: 1150, y: 1060, r: 26 }, { x: 1050, y: 1100, r: 34 },
  // NE forest cluster (original)
  { x: 1700, y: 360, r: 38 }, { x: 1760, y: 440, r: 28 }, { x: 1640, y: 440, r: 32 },
  { x: 1820, y: 380, r: 34 }, { x: 1880, y: 300, r: 38 }, { x: 1950, y: 370, r: 26 },
  { x: 1760, y: 270, r: 30 }, { x: 1840, y: 230, r: 28 },
  // SE scatter (original)
  { x: 1720, y: 900, r: 35 }, { x: 1790, y: 970, r: 30 }, { x: 1660, y: 960, r: 28 },
  { x: 1560, y: 1000, r: 38 }, { x: 1620, y: 1070, r: 26 },
  // Far east (original)
  { x: 2100, y: 500, r: 40 }, { x: 2180, y: 560, r: 30 }, { x: 2060, y: 580, r: 28 },
  { x: 2240, y: 480, r: 34 }, { x: 2300, y: 550, r: 28 },
  { x: 2150, y: 950, r: 35 }, { x: 2220, y: 1010, r: 28 }, { x: 2090, y: 1020, r: 32 },
  // Deep south (original)
  { x: 1300, y: 1200, r: 32 }, { x: 1400, y: 1250, r: 28 }, { x: 1200, y: 1260, r: 36 },
  { x: 1500, y: 1220, r: 30 }, { x: 1600, y: 1270, r: 26 },
  // Far north strip (original)
  { x: 1400, y: 120, r: 38 }, { x: 1480, y: 80, r: 28 }, { x: 1320, y: 90, r: 32 },
  { x: 1560, y: 110, r: 30 }, { x: 1650, y: 140, r: 34 },

  // Central forest (x=2500-4000, y=800-1400)
  { x: 2600, y: 900, r: 40 }, { x: 2700, y: 980, r: 32 }, { x: 2800, y: 860, r: 36 },
  { x: 2900, y: 950, r: 28 }, { x: 3000, y: 1000, r: 44 }, { x: 3100, y: 880, r: 30 },
  { x: 3200, y: 970, r: 38 }, { x: 3300, y: 860, r: 32 }, { x: 3400, y: 940, r: 40 },
  { x: 2650, y: 1100, r: 34 }, { x: 2800, y: 1160, r: 28 }, { x: 2950, y: 1200, r: 36 },
  { x: 3100, y: 1100, r: 32 }, { x: 3250, y: 1180, r: 38 }, { x: 3380, y: 1130, r: 28 },
  { x: 2700, y: 1290, r: 30 }, { x: 2900, y: 1320, r: 42 }, { x: 3050, y: 1280, r: 28 },
  { x: 3200, y: 1300, r: 34 }, { x: 3350, y: 1260, r: 30 },

  // NE new forest (x=5500-7000, y=100-800)
  { x: 5600, y: 200, r: 38 }, { x: 5700, y: 300, r: 30 }, { x: 5800, y: 180, r: 34 },
  { x: 5900, y: 280, r: 28 }, { x: 6000, y: 350, r: 40 }, { x: 6100, y: 220, r: 32 },
  { x: 6200, y: 300, r: 36 }, { x: 6300, y: 180, r: 28 }, { x: 6400, y: 260, r: 42 },
  { x: 6500, y: 350, r: 30 }, { x: 6600, y: 220, r: 38 }, { x: 6700, y: 300, r: 34 },
  { x: 5650, y: 480, r: 32 }, { x: 5800, y: 550, r: 40 }, { x: 5950, y: 500, r: 28 },
  { x: 6100, y: 560, r: 36 }, { x: 6250, y: 480, r: 30 }, { x: 6400, y: 550, r: 38 },
  { x: 6600, y: 480, r: 32 }, { x: 6800, y: 550, r: 36 },
  { x: 5700, y: 700, r: 34 }, { x: 5900, y: 750, r: 28 }, { x: 6100, y: 720, r: 40 },
  { x: 6300, y: 700, r: 30 }, { x: 6500, y: 750, r: 36 }, { x: 6700, y: 700, r: 32 },

  // Eastern forest (x=7200-8800, y=200-1200)
  { x: 7300, y: 300, r: 40 }, { x: 7450, y: 380, r: 32 }, { x: 7600, y: 280, r: 36 },
  { x: 7750, y: 350, r: 28 }, { x: 7900, y: 420, r: 44 }, { x: 8050, y: 300, r: 30 },
  { x: 8200, y: 380, r: 38 }, { x: 8350, y: 280, r: 34 }, { x: 8500, y: 350, r: 40 },
  { x: 7350, y: 550, r: 32 }, { x: 7500, y: 620, r: 38 }, { x: 7650, y: 560, r: 28 },
  { x: 7800, y: 620, r: 36 }, { x: 7950, y: 560, r: 42 }, { x: 8100, y: 620, r: 30 },
  { x: 8250, y: 560, r: 34 }, { x: 8400, y: 620, r: 28 }, { x: 8550, y: 560, r: 40 },
  { x: 7400, y: 800, r: 36 }, { x: 7600, y: 880, r: 30 }, { x: 7800, y: 820, r: 38 },
  { x: 8000, y: 880, r: 32 }, { x: 8200, y: 820, r: 40 }, { x: 8400, y: 880, r: 28 },
  { x: 7350, y: 1060, r: 34 }, { x: 7550, y: 1100, r: 28 }, { x: 7750, y: 1060, r: 38 },
  { x: 7950, y: 1100, r: 32 }, { x: 8150, y: 1060, r: 36 }, { x: 8350, y: 1100, r: 30 },

  // South-central forest belt (x=2000-8000, y=3200-4600)
  { x: 2100, y: 3300, r: 40 }, { x: 2300, y: 3400, r: 32 }, { x: 2500, y: 3350, r: 36 },
  { x: 2700, y: 3450, r: 28 }, { x: 2900, y: 3380, r: 42 }, { x: 3100, y: 3480, r: 30 },
  { x: 3300, y: 3400, r: 38 }, { x: 3500, y: 3480, r: 34 }, { x: 3700, y: 3380, r: 40 },
  { x: 3900, y: 3450, r: 28 }, { x: 4100, y: 3400, r: 36 }, { x: 4300, y: 3480, r: 32 },
  { x: 5600, y: 3380, r: 40 }, { x: 5800, y: 3460, r: 28 }, { x: 6000, y: 3380, r: 36 },
  { x: 6200, y: 3460, r: 32 }, { x: 6400, y: 3380, r: 42 }, { x: 6600, y: 3460, r: 30 },
  { x: 6800, y: 3380, r: 38 }, { x: 7000, y: 3460, r: 34 }, { x: 7200, y: 3380, r: 28 },
  { x: 7400, y: 3460, r: 40 }, { x: 7600, y: 3380, r: 36 }, { x: 7800, y: 3460, r: 32 },
  { x: 2200, y: 3600, r: 36 }, { x: 2450, y: 3700, r: 30 }, { x: 2700, y: 3650, r: 38 },
  { x: 2950, y: 3720, r: 28 }, { x: 3200, y: 3680, r: 40 }, { x: 3450, y: 3750, r: 32 },
  { x: 3700, y: 3680, r: 36 }, { x: 3950, y: 3750, r: 28 }, { x: 4200, y: 3680, r: 34 },
  { x: 5700, y: 3700, r: 38 }, { x: 5950, y: 3780, r: 30 }, { x: 6200, y: 3700, r: 36 },
  { x: 6450, y: 3780, r: 28 }, { x: 6700, y: 3700, r: 42 }, { x: 6950, y: 3780, r: 32 },
  { x: 7200, y: 3700, r: 38 }, { x: 7450, y: 3780, r: 28 }, { x: 7700, y: 3700, r: 34 },
  { x: 2300, y: 3900, r: 32 }, { x: 2600, y: 3980, r: 38 }, { x: 2900, y: 3920, r: 28 },
  { x: 3200, y: 4000, r: 36 }, { x: 3500, y: 3950, r: 40 }, { x: 3800, y: 4020, r: 30 },
  { x: 4100, y: 3950, r: 34 }, { x: 4400, y: 4020, r: 28 }, { x: 5700, y: 3950, r: 36 },
  { x: 6000, y: 4020, r: 32 }, { x: 6300, y: 3950, r: 40 }, { x: 6600, y: 4020, r: 28 },
  { x: 6900, y: 3950, r: 36 }, { x: 7200, y: 4020, r: 32 }, { x: 7500, y: 3950, r: 38 },
  { x: 2400, y: 4200, r: 36 }, { x: 2700, y: 4280, r: 30 }, { x: 3000, y: 4220, r: 38 },
  { x: 3300, y: 4300, r: 28 }, { x: 3600, y: 4240, r: 42 }, { x: 3900, y: 4300, r: 32 },
  { x: 4200, y: 4240, r: 36 }, { x: 5800, y: 4240, r: 38 }, { x: 6100, y: 4300, r: 28 },
  { x: 6400, y: 4240, r: 36 }, { x: 6700, y: 4300, r: 32 }, { x: 7000, y: 4240, r: 40 },
  { x: 7300, y: 4300, r: 28 }, { x: 7600, y: 4240, r: 34 },
  { x: 2500, y: 4450, r: 34 }, { x: 2800, y: 4480, r: 28 }, { x: 3100, y: 4460, r: 36 },
  { x: 3400, y: 4490, r: 30 }, { x: 3700, y: 4460, r: 40 }, { x: 4000, y: 4490, r: 26 },
  { x: 5900, y: 4460, r: 36 }, { x: 6200, y: 4490, r: 28 }, { x: 6500, y: 4460, r: 34 },
  { x: 6800, y: 4490, r: 32 }, { x: 7100, y: 4460, r: 38 }, { x: 7400, y: 4490, r: 28 },

  // SW forest belt (x=100-2000, y=1500-3600)
  { x: 200, y: 1600, r: 38 }, { x: 350, y: 1700, r: 30 }, { x: 500, y: 1650, r: 36 },
  { x: 650, y: 1720, r: 28 }, { x: 400, y: 1900, r: 40 }, { x: 600, y: 1980, r: 32 },
  { x: 300, y: 2100, r: 36 }, { x: 500, y: 2180, r: 28 }, { x: 700, y: 2100, r: 42 },
  { x: 200, y: 2300, r: 34 }, { x: 400, y: 2380, r: 30 }, { x: 600, y: 2320, r: 38 },
  { x: 800, y: 2400, r: 28 }, { x: 1000, y: 2350, r: 36 }, { x: 1200, y: 2420, r: 32 },
  { x: 300, y: 2600, r: 40 }, { x: 550, y: 2680, r: 28 }, { x: 800, y: 2620, r: 36 },
  { x: 1050, y: 2700, r: 32 }, { x: 1300, y: 2640, r: 38 },
  { x: 400, y: 2900, r: 36 }, { x: 650, y: 2980, r: 30 }, { x: 900, y: 2920, r: 40 },
  { x: 1150, y: 3000, r: 28 }, { x: 1400, y: 2940, r: 34 },
  { x: 500, y: 3150, r: 38 }, { x: 750, y: 3220, r: 32 }, { x: 1000, y: 3160, r: 36 },
  { x: 1250, y: 3220, r: 28 }, { x: 1500, y: 3160, r: 40 },
  { x: 600, y: 3400, r: 34 }, { x: 900, y: 3450, r: 28 }, { x: 1200, y: 3400, r: 36 },
  { x: 1500, y: 3460, r: 32 }, { x: 1800, y: 3400, r: 38 },

  // SE forest belt (x=8000-9900, y=1500-3600)
  { x: 8100, y: 1600, r: 38 }, { x: 8300, y: 1700, r: 30 }, { x: 8500, y: 1640, r: 36 },
  { x: 8700, y: 1720, r: 28 }, { x: 8900, y: 1660, r: 40 },
  { x: 8100, y: 1900, r: 32 }, { x: 8350, y: 1980, r: 36 }, { x: 8600, y: 1920, r: 28 },
  { x: 8850, y: 2000, r: 40 }, { x: 9100, y: 1940, r: 32 },
  { x: 8200, y: 2200, r: 38 }, { x: 8450, y: 2280, r: 28 }, { x: 8700, y: 2220, r: 36 },
  { x: 8950, y: 2300, r: 32 }, { x: 9200, y: 2240, r: 40 },
  { x: 8100, y: 2500, r: 34 }, { x: 8400, y: 2580, r: 30 }, { x: 8700, y: 2520, r: 38 },
  { x: 9000, y: 2600, r: 28 }, { x: 9300, y: 2540, r: 36 },
  { x: 8200, y: 2800, r: 40 }, { x: 8500, y: 2880, r: 28 }, { x: 8800, y: 2820, r: 36 },
  { x: 9100, y: 2900, r: 32 }, { x: 9400, y: 2840, r: 38 },
  { x: 8150, y: 3100, r: 36 }, { x: 8450, y: 3180, r: 30 }, { x: 8750, y: 3120, r: 40 },
  { x: 9050, y: 3200, r: 28 }, { x: 9350, y: 3140, r: 34 },
  { x: 8200, y: 3400, r: 38 }, { x: 8500, y: 3450, r: 32 }, { x: 8800, y: 3400, r: 36 },
  { x: 9100, y: 3460, r: 28 }, { x: 9400, y: 3400, r: 40 },

  // Mid-world central scatter (x=4000-6000, y=700-1200)
  { x: 4100, y: 800, r: 36 }, { x: 4250, y: 900, r: 28 }, { x: 4400, y: 840, r: 40 },
  { x: 5500, y: 800, r: 36 }, { x: 5700, y: 880, r: 30 }, { x: 5900, y: 820, r: 38 },
  { x: 4100, y: 1060, r: 32 }, { x: 4300, y: 1100, r: 38 }, { x: 4500, y: 1060, r: 28 },
  { x: 5500, y: 1060, r: 40 }, { x: 5700, y: 1120, r: 28 }, { x: 5900, y: 1060, r: 36 },

  // Far north strip west (x=1800-4600)
  { x: 1900, y: 100, r: 34 }, { x: 2100, y: 80, r: 28 }, { x: 2300, y: 110, r: 36 },
  { x: 2500, y: 80, r: 32 }, { x: 2700, y: 120, r: 38 }, { x: 2900, y: 80, r: 28 },
  { x: 3100, y: 110, r: 40 }, { x: 3300, y: 80, r: 30 }, { x: 3500, y: 120, r: 36 },
  { x: 3700, y: 80, r: 34 }, { x: 3900, y: 110, r: 28 }, { x: 4100, y: 80, r: 38 },

  // Far north strip east (x=5400-8900)
  { x: 5500, y: 100, r: 34 }, { x: 5800, y: 80, r: 28 }, { x: 6100, y: 120, r: 36 },
  { x: 6400, y: 90, r: 32 }, { x: 6700, y: 110, r: 38 }, { x: 7000, y: 80, r: 28 },
  { x: 7300, y: 120, r: 40 }, { x: 7600, y: 90, r: 30 }, { x: 7900, y: 110, r: 36 },
  { x: 8200, y: 80, r: 34 }, { x: 8500, y: 110, r: 28 }, { x: 8800, y: 80, r: 36 },
]

export const FIELD_ROCKS: Circle[] = [
  // Original rocks
  { x: 1240, y: 480, r: 22 }, { x: 1270, y: 450, r: 16 }, { x: 1210, y: 460, r: 18 },
  { x: 1960, y: 1080, r: 24 }, { x: 2000, y: 1110, r: 18 }, { x: 1930, y: 1100, r: 20 },
  { x: 1400, y: 520, r: 20 }, { x: 1440, y: 545, r: 15 }, { x: 1370, y: 548, r: 18 },
  { x: 730,  y: 380, r: 22 }, { x: 760,  y: 350, r: 17 }, { x: 700,  y: 360, r: 19 },
  { x: 2300, y: 700, r: 25 }, { x: 2340, y: 730, r: 18 }, { x: 2270, y: 720, r: 20 },
  { x: 1880, y: 1180, r: 22 }, { x: 1910, y: 1210, r: 16 },
  { x: 1650, y: 560, r: 18 }, { x: 1580, y: 490, r: 20 },
  { x: 1100, y: 780, r: 22 }, { x: 1130, y: 810, r: 16 },

  // Central rocks
  { x: 3500, y: 1300, r: 22 }, { x: 3540, y: 1330, r: 16 }, { x: 3470, y: 1320, r: 18 },
  { x: 4000, y: 800,  r: 20 }, { x: 4040, y: 830,  r: 15 }, { x: 3970, y: 820,  r: 18 },
  { x: 3000, y: 2000, r: 22 }, { x: 3040, y: 2030, r: 16 }, { x: 2970, y: 2020, r: 18 },

  // Eastern rocks
  { x: 5500, y: 1400, r: 24 }, { x: 5540, y: 1430, r: 18 }, { x: 5470, y: 1420, r: 20 },
  { x: 6000, y: 700,  r: 22 }, { x: 6040, y: 730,  r: 16 }, { x: 5970, y: 720,  r: 18 },
  { x: 7000, y: 1500, r: 25 }, { x: 7040, y: 1530, r: 18 }, { x: 6970, y: 1520, r: 20 },
  { x: 8000, y: 1300, r: 22 }, { x: 8040, y: 1330, r: 16 }, { x: 7970, y: 1320, r: 18 },
  { x: 7000, y: 2000, r: 24 }, { x: 7040, y: 2030, r: 18 }, { x: 6970, y: 2020, r: 20 },

  // Southern rocks
  { x: 2500, y: 2700, r: 24 }, { x: 2540, y: 2730, r: 18 }, { x: 2470, y: 2720, r: 20 },
  { x: 4500, y: 3100, r: 22 }, { x: 4540, y: 3130, r: 16 }, { x: 4470, y: 3120, r: 18 },
  { x: 6500, y: 2800, r: 25 }, { x: 6540, y: 2830, r: 18 }, { x: 6470, y: 2820, r: 20 },
  { x: 8500, y: 3200, r: 22 }, { x: 8540, y: 3230, r: 16 }, { x: 8470, y: 3220, r: 18 },
  { x: 3000, y: 4200, r: 24 }, { x: 3040, y: 4230, r: 18 }, { x: 2970, y: 4220, r: 20 },
  { x: 5000, y: 4400, r: 22 }, { x: 5040, y: 4430, r: 16 }, { x: 4970, y: 4420, r: 18 },
  { x: 7000, y: 4200, r: 25 }, { x: 7040, y: 4230, r: 18 }, { x: 6970, y: 4220, r: 20 },
]

export class WorldGame {
  private playerX = PLAYER_START.x
  private playerY = PLAYER_START.y
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
    for (const obs of ALL_WALLS) {
      if (this.rectCollides(x, y, obs)) return true
    }
    for (const obs of ALL_BUILDINGS) {
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

  moveByDelta(dx: number, dy: number, delta: number = 1): WorldState {
    if (this.isPaused) return this.getState()

    if (dx === 0 && dy === 0) {
      this.velocityX *= Math.pow(DECELERATION, delta)
      this.velocityY *= Math.pow(DECELERATION, delta)
      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
        this.velocityX = 0
        this.velocityY = 0
        return this.getState()
      }
    } else {
      this.velocityX += dx * ACCELERATION * delta
      this.velocityY += dy * ACCELERATION * delta
      const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
      if (speed > MAX_SPEED) {
        this.velocityX = (this.velocityX / speed) * MAX_SPEED
        this.velocityY = (this.velocityY / speed) * MAX_SPEED
      }
    }

    const newX = this.playerX + this.velocityX * delta
    const newY = this.playerY + this.velocityY * delta

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
