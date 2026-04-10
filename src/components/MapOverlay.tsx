import React, { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native'
import {
  WorldGame,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TOWN_GROUNDS,
  ALL_BUILDINGS,
  FIELD_TREES,
} from '../game/WorldGame'

const MAIN_ROADS = [
  { x: 0,    y: 600,  w: 10000, h: 80  },
  { x: 0,    y: 2300, w: 10000, h: 100 },
  { x: 0,    y: 3900, w: 10000, h: 80  },
  { x: 4960, y: 0,    w: 80,    h: 5000 },
  { x: 760,  y: 0,    w: 60,    h: 5000 },
  { x: 9160, y: 0,    w: 60,    h: 5000 },
]

const { width: SW, height: SH } = Dimensions.get('window')
// Fit the 2:1 world aspect ratio inside the screen with padding
const MAP_W = Math.min(SW * 0.92, SH * 0.85 * 2)
const MAP_H = MAP_W / 2
const S = MAP_W / WORLD_WIDTH

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
    const s = game.getState()
    setPlayerPos({ x: s.playerX, y: s.playerY })
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

          {/* Map area */}
          <View style={[styles.mapBorder, { width: MAP_W + 2, height: MAP_H + 2 }]}>
            <View style={{ width: MAP_W, height: MAP_H, overflow: 'hidden', position: 'relative' }}>
              {/* Grass */}
              <View style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, backgroundColor: '#5a8c3c' }} />

              {/* Roads */}
              {MAIN_ROADS.map((r, i) => (
                <View key={`mr-${i}`} style={{
                  position: 'absolute',
                  left: r.x * S, top: r.y * S,
                  width: Math.max(r.w * S, 1),
                  height: Math.max(r.h * S, 1),
                  backgroundColor: '#b5904a',
                }} />
              ))}

              {/* Town grounds */}
              {TOWN_GROUNDS.map((g, i) => (
                <View key={`tg-${i}`} style={{
                  position: 'absolute',
                  left: g.x * S, top: g.y * S,
                  width: Math.max(g.w * S, 2),
                  height: Math.max(g.h * S, 2),
                  backgroundColor: '#c9b07a',
                }} />
              ))}

              {/* Buildings */}
              {ALL_BUILDINGS.map((b, i) => (
                <View key={`b-${i}`} style={{
                  position: 'absolute',
                  left: b.x * S, top: b.y * S,
                  width: Math.max(b.w * S, 1),
                  height: Math.max(b.h * S, 1),
                  backgroundColor: '#6b5840',
                }} />
              ))}

              {/* Trees as 2×2 dots */}
              {FIELD_TREES.map((t, i) => (
                <View key={`tr-${i}`} style={{
                  position: 'absolute',
                  left: t.x * S - 1,
                  top: t.y * S - 1,
                  width: 2,
                  height: 2,
                  backgroundColor: '#1a4010',
                }} />
              ))}

              {/* Player dot */}
              <View style={{
                position: 'absolute',
                left: playerPos.x * S - 5,
                top: playerPos.y * S - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#e63946',
                borderWidth: 1.5,
                borderColor: 'white',
              }} />
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  closeText: {
    color: '#aaa',
    fontSize: 18,
  },
  mapBorder: {
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 4,
  },
  coords: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 8,
  },
})

export default MapOverlay
