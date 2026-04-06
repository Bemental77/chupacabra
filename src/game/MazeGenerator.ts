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
