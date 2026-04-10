import React, { useRef, useEffect } from 'react'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TOWN_GROUNDS,
  ALL_WALLS,
  ALL_BUILDINGS,
  FIELD_TREES,
  FIELD_ROCKS,
} from '../game/WorldGame'

const GRASS        = '#5a8c3c'
const DIRT_ROAD    = '#b5904a'
const TOWN_GROUND  = '#c9b07a'
const WALL_COLOR   = '#7a6a50'
const BUILDING_COLORS = ['#8B7355', '#9e8060', '#a08866', '#7a6545']
const TREE_COLOR   = '#2d5a1b'
const TREE_TRUNK   = '#5c3d1e'
const ROCK_COLOR   = '#8a8070'
const ROCK_SHADOW  = '#6a6258'
const PLAYER_COLOR = '#e63946'

const TRAIL_W = 45

const MAIN_ROADS = [
  { x: 0,    y: 600,  w: 10000, h: 80  },  // northern E-W
  { x: 0,    y: 2300, w: 10000, h: 100 },  // central E-W
  { x: 0,    y: 3900, w: 10000, h: 80  },  // southern E-W
  { x: 4960, y: 0,    w: 80,    h: 5000 }, // central N-S
  { x: 760,  y: 0,    w: 60,    h: 5000 }, // western N-S
  { x: 9160, y: 0,    w: 60,    h: 5000 }, // eastern N-S
]

const TRAILS = [
  // NW area (original)
  { cx: 1300, cy: 580,  len: 160, angle: -8  },
  { cx: 1270, cy: 430,  len: 160, angle: -18 },
  { cx: 1220, cy: 285,  len: 160, angle: -12 },
  { cx: 1180, cy: 140,  len: 140, angle: -6  },
  { cx: 1750, cy: 820,  len: 160, angle: 22  },
  { cx: 1820, cy: 965,  len: 160, angle: 16  },
  { cx: 1870, cy: 1110, len: 160, angle: 28  },
  { cx: 1930, cy: 1255, len: 140, angle: 20  },
  { cx: 960,  cy: 610,  len: 160, angle: -42 },
  { cx: 870,  cy: 490,  len: 150, angle: -50 },
  { cx: 770,  cy: 370,  len: 140, angle: -44 },
  { cx: 2050, cy: 600,  len: 160, angle: -28 },
  { cx: 2140, cy: 470,  len: 160, angle: -22 },
  { cx: 2240, cy: 355,  len: 140, angle: -30 },
  { cx: 1200, cy: 1050, len: 160, angle: 15  },
  { cx: 1340, cy: 1120, len: 160, angle: 5   },
  { cx: 1490, cy: 1150, len: 160, angle: -5  },
  // Central area
  { cx: 3000, cy: 1400, len: 160, angle: 30  },
  { cx: 3200, cy: 1500, len: 140, angle: 20  },
  { cx: 3400, cy: 1380, len: 160, angle: -15 },
  { cx: 4000, cy: 1200, len: 150, angle: -25 },
  { cx: 4200, cy: 1100, len: 160, angle: -10 },
  { cx: 5700, cy: 1200, len: 160, angle: 20  },
  { cx: 5900, cy: 1300, len: 140, angle: 15  },
  { cx: 4800, cy: 2400, len: 160, angle: -30 },
  { cx: 5000, cy: 2280, len: 150, angle: -20 },
  { cx: 5200, cy: 2400, len: 160, angle: 25  },
  // Eastern area
  { cx: 6500, cy: 600,  len: 160, angle: -20 },
  { cx: 6700, cy: 480,  len: 150, angle: -30 },
  { cx: 7500, cy: 550,  len: 160, angle: 18  },
  { cx: 7700, cy: 680,  len: 140, angle: 25  },
  { cx: 8600, cy: 620,  len: 160, angle: -12 },
  { cx: 8800, cy: 480,  len: 150, angle: -20 },
  { cx: 9000, cy: 1200, len: 160, angle: 35  },
  { cx: 9100, cy: 1100, len: 140, angle: 28  },
  // SW area
  { cx: 350,  cy: 1800, len: 150, angle: 20  },
  { cx: 500,  cy: 2000, len: 160, angle: -15 },
  { cx: 650,  cy: 2300, len: 140, angle: 30  },
  { cx: 800,  cy: 2500, len: 160, angle: -25 },
  { cx: 400,  cy: 2800, len: 150, angle: 18  },
  { cx: 600,  cy: 3000, len: 160, angle: -22 },
  { cx: 350,  cy: 3300, len: 140, angle: 15  },
  { cx: 600,  cy: 3600, len: 160, angle: -30 },
  // Southern area
  { cx: 2500, cy: 3950, len: 160, angle: 20  },
  { cx: 2800, cy: 4100, len: 150, angle: -15 },
  { cx: 4800, cy: 4000, len: 160, angle: 25  },
  { cx: 5200, cy: 4000, len: 140, angle: -20 },
  { cx: 7200, cy: 3950, len: 160, angle: 18  },
  { cx: 7500, cy: 4100, len: 150, angle: -12 },
  // SE area
  { cx: 8600, cy: 3000, len: 160, angle: 22  },
  { cx: 8800, cy: 3200, len: 140, angle: -18 },
  { cx: 9100, cy: 2800, len: 160, angle: 30  },
  { cx: 9300, cy: 3500, len: 150, angle: -25 },
]

function drawStaticWorld(ctx: CanvasRenderingContext2D) {
  // Grass base
  ctx.fillStyle = GRASS
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  // Main roads
  ctx.fillStyle = DIRT_ROAD
  for (const r of MAIN_ROADS) ctx.fillRect(r.x, r.y, r.w, r.h)

  // Trail segments
  for (const t of TRAILS) {
    ctx.save()
    ctx.translate(t.cx, t.cy)
    ctx.rotate((t.angle * Math.PI) / 180)
    ctx.fillStyle = DIRT_ROAD
    ctx.fillRect(-t.len / 2, -TRAIL_W / 2, t.len, TRAIL_W)
    ctx.restore()
  }

  // Town grounds
  ctx.fillStyle = TOWN_GROUND
  for (const g of TOWN_GROUNDS) ctx.fillRect(g.x, g.y, g.w, g.h)

  // Walls
  ctx.fillStyle = WALL_COLOR
  for (const w of ALL_WALLS) ctx.fillRect(w.x, w.y, w.w, w.h)

  // Buildings
  ALL_BUILDINGS.forEach((b, i) => {
    ctx.fillStyle = BUILDING_COLORS[i % BUILDING_COLORS.length]
    ctx.fillRect(b.x, b.y, b.w, b.h)
  })

  // Trees
  for (const tree of FIELD_TREES) {
    ctx.fillStyle = TREE_TRUNK
    ctx.fillRect(tree.x - tree.r * 0.2, tree.y, tree.r * 0.4, tree.r * 0.6)
    ctx.fillStyle = TREE_COLOR
    ctx.beginPath()
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Rocks
  for (const rock of FIELD_ROCKS) {
    ctx.fillStyle = ROCK_SHADOW
    ctx.beginPath()
    ctx.ellipse(rock.x + 3, rock.y + 4, rock.r, rock.r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = ROCK_COLOR
    ctx.beginPath()
    ctx.ellipse(rock.x, rock.y, rock.r, rock.r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

interface WorldCanvasProps {
  game: WorldGame
  inputRef: React.MutableRefObject<{ dx: number; dy: number }>
  onViewportSize: (w: number, h: number) => void
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ game, inputRef, onViewportSize }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef    = useRef({ w: 0, h: 0 })
  const lastTimeRef = useRef<number | null>(null)

  // Pre-render static world once to offscreen canvas
  useEffect(() => {
    const offscreen = document.createElement('canvas')
    offscreen.width  = WORLD_WIDTH
    offscreen.height = WORLD_HEIGHT
    const ctx = offscreen.getContext('2d')
    if (ctx) drawStaticWorld(ctx)
    offscreenRef.current = offscreen
  }, [])

  // Track canvas size via ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height
      sizeRef.current = { w: rect.width, h: rect.height }
      onViewportSize(rect.width, rect.height)
    }
    updateSize()
    const observer = new (window as any).ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [onViewportSize])

  // Game loop
  useEffect(() => {
    let rafId: number
    const tick = (time: number) => {
      const delta = lastTimeRef.current !== null
        ? Math.min((time - lastTimeRef.current) / 16.667, 3)
        : 1
      lastTimeRef.current = time

      const state = game.moveByDelta(inputRef.current.dx, inputRef.current.dy, delta)

      const canvas    = canvasRef.current
      const offscreen = offscreenRef.current
      if (!canvas || !offscreen) { rafId = requestAnimationFrame(tick); return }

      const ctx = canvas.getContext('2d')
      if (!ctx) { rafId = requestAnimationFrame(tick); return }

      const { w, h } = sizeRef.current
      if (w === 0 || h === 0) { rafId = requestAnimationFrame(tick); return }

      const ox = Math.min(0, Math.max(w - WORLD_WIDTH,  -(state.playerX - w / 2)))
      const oy = Math.min(0, Math.max(h - WORLD_HEIGHT, -(state.playerY - h / 2)))

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(offscreen, ox, oy)

      // Player
      ctx.fillStyle   = PLAYER_COLOR
      ctx.strokeStyle = 'white'
      ctx.lineWidth   = 2
      ctx.beginPath()
      ctx.arc(state.playerX + ox, state.playerY + oy, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [game, inputRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export default WorldCanvas
