import React, { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native'
import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TOWN_GROUNDS,
  ALL_BUILDINGS,
  FIELD_TREES,
  FIELD_ROCKS,
  TERRAIN_POLYGONS,
  RESOURCE_NODES,
  MAIN_ROADS,
} from '../game/WorldGame'

// Parchment palette (mirrors WorldCanvas.tsx)
const PARCHMENT       = '#d4be95'
const PARCHMENT_LIGHT = '#e2d2ad'
const TERRAIN_DARK    = '#5c4530'
const ROAD_COLOR      = '#9a7a52'
const BUILDING_COLOR  = '#3d2e20'
const TREE_COLOR      = '#3a5a28'
const ROCK_COLOR      = '#857363'
const RESOURCE_COLORS = ['#c25844', '#7d5230', '#d9c478', '#aac46e', '#9d7ec0']
const PLAYER_COLOR    = '#e63946'

const { width: SW, height: SH } = Dimensions.get('window')
const MAP_W = Math.min(SW * 0.92, SH * 0.85 * 2)
const MAP_H = MAP_W / 2
const S = MAP_W / WORLD_WIDTH

// Pre-build the parchment-rect path and the terrain polygon path in minimap
// pixel coords. Computed once at module load.
const parchmentRectPath = (() => {
  const p = Skia.Path.Make()
  p.addRect({ x: 0, y: 0, width: MAP_W, height: MAP_H })
  return p
})()
const terrainPath = (() => {
  const p = Skia.Path.Make()
  for (const poly of TERRAIN_POLYGONS) {
    p.moveTo(poly[0] * S, poly[1] * S)
    for (let i = 2; i < poly.length; i += 2) {
      p.lineTo(poly[i] * S, poly[i + 1] * S)
    }
    p.close()
  }
  return p
})()
const roadsPath = (() => {
  const p = Skia.Path.Make()
  for (const road of MAIN_ROADS) {
    if (road.points.length < 2) continue
    p.moveTo(road.points[0].x * S, road.points[0].y * S)
    for (let i = 1; i < road.points.length; i++) {
      p.lineTo(road.points[i].x * S, road.points[i].y * S)
    }
  }
  return p
})()
const roadsStrokeWidth = Math.max(MAIN_ROADS[0]?.width * S || 1, 1)

interface Props {
  visible: boolean
  onClose: () => void
  game: WorldGame
}

export const MapOverlay: React.FC<Props> = ({ visible, onClose, game }) => {
  const [playerPos, setPlayerPos] = useState(() => {
    const s = game.getState()
    return { x: s.playerX, y: s.playerY }
  })

  useEffect(() => {
    if (!visible) return
    setPlayerPos({ x: game.getState().playerX, y: game.getState().playerY })
    const id = setInterval(() => {
      const st = game.getState()
      setPlayerPos({ x: st.playerX, y: st.playerY })
    }, 150)
    return () => clearInterval(id)
  }, [visible, game])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>World Map</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.mapBorder, { width: MAP_W + 2, height: MAP_H + 2 }]}>
            <View style={{ width: MAP_W, height: MAP_H, overflow: 'hidden', position: 'relative' }}>
              {/* Parchment base + roads + terrain polygons (all Skia) */}
              <Canvas style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H }}>
                <Path path={parchmentRectPath} color={PARCHMENT} style="fill" />
                <Path
                  path={roadsPath}
                  color={ROAD_COLOR}
                  style="stroke"
                  strokeWidth={roadsStrokeWidth}
                  strokeJoin="round"
                  strokeCap="round"
                />
                <Path path={terrainPath} color={TERRAIN_DARK} style="fill" />
              </Canvas>

              {/* Town grounds */}
              {TOWN_GROUNDS.map((g, i) => (
                <View
                  key={`tg-${i}`}
                  style={{
                    position: 'absolute',
                    left: g.x * S,
                    top: g.y * S,
                    width: Math.max(g.w * S, 2),
                    height: Math.max(g.h * S, 2),
                    backgroundColor: PARCHMENT_LIGHT,
                  }}
                />
              ))}

              {/* Buildings */}
              {ALL_BUILDINGS.map((b, i) => (
                <View
                  key={`b-${i}`}
                  style={{
                    position: 'absolute',
                    left: b.x * S,
                    top: b.y * S,
                    width: Math.max(b.w * S, 1),
                    height: Math.max(b.h * S, 1),
                    backgroundColor: BUILDING_COLOR,
                  }}
                />
              ))}

              {/* Trees */}
              {FIELD_TREES.map((t, i) => (
                <View
                  key={`tr-${i}`}
                  style={{
                    position: 'absolute',
                    left: t.x * S - 1,
                    top: t.y * S - 1,
                    width: 2,
                    height: 2,
                    backgroundColor: TREE_COLOR,
                  }}
                />
              ))}

              {/* Rocks */}
              {FIELD_ROCKS.map((r, i) => (
                <View
                  key={`rk-${i}`}
                  style={{
                    position: 'absolute',
                    left: r.x * S - 1,
                    top: r.y * S - 1,
                    width: 2,
                    height: 2,
                    backgroundColor: ROCK_COLOR,
                  }}
                />
              ))}

              {/* Resource nodes — render every 3rd to keep the minimap readable */}
              {RESOURCE_NODES.filter((_, i) => i % 3 === 0).map((n, i) => (
                <View
                  key={`rn-${i}`}
                  style={{
                    position: 'absolute',
                    left: n.x * S - 1,
                    top: n.y * S - 1,
                    width: 2,
                    height: 2,
                    backgroundColor: RESOURCE_COLORS[n.type],
                  }}
                />
              ))}

              {/* Player */}
              <View
                style={{
                  position: 'absolute',
                  left: playerPos.x * S - 5,
                  top: playerPos.y * S - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: PLAYER_COLOR,
                  borderWidth: 1.5,
                  borderColor: 'white',
                }}
              />
            </View>
          </View>

          <Text style={styles.coords}>
            {`x: ${Math.round(playerPos.x)}  y: ${Math.round(playerPos.y)}`}
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12 },
  title: { flex: 1, color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  closeBtn: { position: 'absolute', right: 0, padding: 4 },
  closeText: { color: '#aaa', fontSize: 18 },
  mapBorder: { borderWidth: 1, borderColor: '#555', borderRadius: 4 },
  coords: { color: '#aaa', fontSize: 12, marginTop: 8 },
})

export default MapOverlay
