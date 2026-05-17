// Wraps MazeGenerator into something useful for activity instances. Converts
// the 0/1 grid into:
//   - axis-aligned wall rects in world coords (for collision + render)
//   - a list of passable cells (for spawning the player and enemies)
//
// The arena is anchored at a fixed world coord chosen to be outside any town
// or POI. Players are teleported here on `startTrial()`, and back on exit.

import { generateMaze } from './MazeGenerator'
import type { Rect } from './WorldGame'

// Arena origin in world coords — extreme SE area, away from towns and the
// player's normal play zone. 1680x1680 fits a 10x10 maze at 80 units per cell.
export const ARENA_ORIGIN_X = 43500
export const ARENA_ORIGIN_Y = 13500
export const ARENA_CELL = 80
export const ARENA_MAZE_COLS = 10
export const ARENA_MAZE_ROWS = 10
export const ARENA_GRID_W = ARENA_MAZE_COLS * 2 + 1
export const ARENA_GRID_H = ARENA_MAZE_ROWS * 2 + 1
export const ARENA_WIDTH  = ARENA_GRID_W * ARENA_CELL
export const ARENA_HEIGHT = ARENA_GRID_H * ARENA_CELL
export const ARENA_END_X = ARENA_ORIGIN_X + ARENA_WIDTH
export const ARENA_END_Y = ARENA_ORIGIN_Y + ARENA_HEIGHT

export interface DungeonLayout {
  walls: Rect[]
  passableCenters: { x: number; y: number }[]
  // World-space coord of the maze entrance (cell [0][1]).
  entryX: number
  entryY: number
}

export function generateDungeonLayout(): DungeonLayout {
  const grid = generateMaze(ARENA_MAZE_COLS, ARENA_MAZE_ROWS)
  const walls: Rect[] = []
  const passable: { x: number; y: number }[] = []
  for (let r = 0; r < ARENA_GRID_H; r++) {
    for (let c = 0; c < ARENA_GRID_W; c++) {
      const wx = ARENA_ORIGIN_X + c * ARENA_CELL
      const wy = ARENA_ORIGIN_Y + r * ARENA_CELL
      if (grid[r][c] === 1) {
        walls.push({ x: wx, y: wy, w: ARENA_CELL, h: ARENA_CELL })
      } else {
        passable.push({ x: wx + ARENA_CELL / 2, y: wy + ARENA_CELL / 2 })
      }
    }
  }
  return {
    walls,
    passableCenters: passable,
    entryX: ARENA_ORIGIN_X + 1 * ARENA_CELL + ARENA_CELL / 2,
    entryY: ARENA_ORIGIN_Y + 1 * ARENA_CELL + ARENA_CELL / 2,
  }
}

// True if (x, y) is inside the arena rectangle. Used to bound enemy AI and
// rendering culling once an activity is running.
export function isInsideArena(x: number, y: number): boolean {
  return x >= ARENA_ORIGIN_X && x < ARENA_END_X &&
         y >= ARENA_ORIGIN_Y && y < ARENA_END_Y
}
