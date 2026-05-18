// Dungeon-style generator: rooms of varying sizes connected by L-shaped
// corridors. Replaces the old uniform-maze look (which felt like Pac-Man).
// Output shape matches `generateMaze` — a (cols*2+1) × (rows*2+1) grid of
// 0=floor / 1=wall — so the same wall/passable conversion in DungeonGen works.
//
// Returns the grid plus an entry cell where the player should be teleported.
// Entry is the center of the FIRST placed room; that room is anchored near
// the south edge of the grid so the player starts at the "bottom" looking up
// into the dungeon (matches the reference dungeon-screenshot framing).
export interface DungeonGenResult {
  grid: number[][]
  entryCellX: number
  entryCellY: number
  // Center cells of every generated room — useful for placing enemies in
  // rooms rather than corridors, props in interior tiles, etc.
  roomCenters: { x: number; y: number }[]
}

export function generateDungeon(cols: number, rows: number): DungeonGenResult {
  const W = cols * 2 + 1
  const H = rows * 2 + 1
  const grid: number[][] = Array.from({ length: H }, () => Array(W).fill(1))

  const rooms: { x: number; y: number; w: number; h: number; cx: number; cy: number }[] = []

  // Tunables. Sized to fit ~8 rooms in a 29×29 grid.
  const targetRoomCount = Math.max(6, Math.floor((W * H) / 100))
  const minRoomDim = 3
  const maxRoomDim = 7

  // The first room is "the entrance" — anchored near the south-center so the
  // player has predictable spawn footing.
  const firstW = 5 + Math.floor(Math.random() * 3)        // 5-7
  const firstH = 4 + Math.floor(Math.random() * 3)        // 4-6
  const firstX = Math.floor((W - firstW) / 2)
  const firstY = H - firstH - 2
  for (let dy = 0; dy < firstH; dy++) {
    for (let dx = 0; dx < firstW; dx++) {
      grid[firstY + dy][firstX + dx] = 0
    }
  }
  rooms.push({
    x: firstX, y: firstY, w: firstW, h: firstH,
    cx: firstX + Math.floor(firstW / 2),
    cy: firstY + Math.floor(firstH / 2),
  })

  // Try to place remaining rooms at random non-overlapping positions.
  let attempts = 0
  while (rooms.length < targetRoomCount && attempts < 300) {
    attempts++
    const w = minRoomDim + Math.floor(Math.random() * (maxRoomDim - minRoomDim + 1))
    const h = minRoomDim + Math.floor(Math.random() * (maxRoomDim - minRoomDim + 1))
    const x = 1 + Math.floor(Math.random() * (W - w - 2))
    const y = 1 + Math.floor(Math.random() * (H - h - 2))
    // 1-cell padding gap between rooms so they read as distinct chambers.
    let overlaps = false
    for (const r of rooms) {
      if (
        x < r.x + r.w + 1 && x + w + 1 > r.x &&
        y < r.y + r.h + 1 && y + h + 1 > r.y
      ) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        grid[y + dy][x + dx] = 0
      }
    }
    rooms.push({
      x, y, w, h,
      cx: x + Math.floor(w / 2),
      cy: y + Math.floor(h / 2),
    })
  }

  // Connect each room to the next with an L-shaped corridor (1 cell wide).
  // Randomly flip the bend orientation per corridor for variety.
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]
    const b = rooms[i]
    if (Math.random() < 0.5) {
      // horizontal then vertical
      const y = a.cy
      const x = b.cx
      for (let cx = Math.min(a.cx, b.cx); cx <= Math.max(a.cx, b.cx); cx++) grid[y][cx] = 0
      for (let cy = Math.min(a.cy, b.cy); cy <= Math.max(a.cy, b.cy); cy++) grid[cy][x] = 0
    } else {
      const x = a.cx
      const y = b.cy
      for (let cy = Math.min(a.cy, b.cy); cy <= Math.max(a.cy, b.cy); cy++) grid[cy][x] = 0
      for (let cx = Math.min(a.cx, b.cx); cx <= Math.max(a.cx, b.cx); cx++) grid[y][cx] = 0
    }
  }

  // A handful of extra connections so the layout isn't a strict chain (more
  // backtrack-free movement, more interesting circulation).
  const extra = Math.floor(rooms.length / 3)
  for (let i = 0; i < extra; i++) {
    const a = rooms[Math.floor(Math.random() * rooms.length)]
    const b = rooms[Math.floor(Math.random() * rooms.length)]
    if (a === b) continue
    const y = a.cy
    const x = b.cx
    for (let cx = Math.min(a.cx, b.cx); cx <= Math.max(a.cx, b.cx); cx++) grid[y][cx] = 0
    for (let cy = Math.min(a.cy, b.cy); cy <= Math.max(a.cy, b.cy); cy++) grid[cy][x] = 0
  }

  return {
    grid,
    entryCellX: rooms[0].cx,
    entryCellY: rooms[0].cy,
    roomCenters: rooms.map((r) => ({ x: r.cx, y: r.cy })),
  }
}

export function generateMaze(cols: number, rows: number): number[][] {
  const width = cols * 2 + 1
  const height = rows * 2 + 1

  // Start all walls
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(1))
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false))

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  function carve(cx: number, cy: number) {
    visited[cy][cx] = true
    grid[cy * 2 + 1][cx * 2 + 1] = 0

    const dirs = shuffle([
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ])

    for (const { dx, dy } of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0
        carve(nx, ny)
      }
    }
  }

  carve(0, 0)

  // Entrance top-left, exit bottom-right
  grid[0][1] = 0
  grid[height - 1][width - 2] = 0

  return grid
}
