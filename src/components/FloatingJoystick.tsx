import React, { useRef, useState } from 'react'
import { View, StyleSheet, PanResponder } from 'react-native'
import { Colors } from '../theme/Colors'

// Diablo-Immortal-style floating joystick. The whole bottom-left quadrant
// is a touch sink; when the user puts a thumb down, the joystick base + knob
// render at that exact position and stay anchored until release.
//
// Visual polish layer: subtle outer glow ring, 4 cardinal tick marks on the
// base, and a knob color that brightens as the magnitude approaches max so
// the player gets feedback that they're at full speed.

interface Props {
  onMove: (dx: number, dy: number) => void
  baseSize?: number
  knobSize?: number
}

export const FloatingJoystick: React.FC<Props> = ({ onMove, baseSize = 120, knobSize = 60 }) => {
  const radius = baseSize / 2
  const knobRadius = knobSize / 2
  const [active, setActive] = useState(false)
  const [anchor, setAnchor] = useState({ x: 0, y: 0 })
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setAnchor({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
        setKnobOffset({ x: 0, y: 0 })
        setActive(true)
      },
      onPanResponderMove: (_, g) => {
        let nx = g.dx
        let ny = g.dy
        const dist = Math.hypot(nx, ny)
        if (dist > radius) {
          nx = (nx / dist) * radius
          ny = (ny / dist) * radius
        }
        setKnobOffset({ x: nx, y: ny })
        onMove(nx / radius, ny / radius)
      },
      onPanResponderRelease: () => {
        setActive(false)
        setKnobOffset({ x: 0, y: 0 })
        onMove(0, 0)
      },
      onPanResponderTerminate: () => {
        setActive(false)
        setKnobOffset({ x: 0, y: 0 })
        onMove(0, 0)
      },
    }),
  ).current

  // Knob magnitude 0..1 — drives the "at full speed" color brighten.
  const knobMag = Math.min(1, Math.hypot(knobOffset.x, knobOffset.y) / radius)
  // Lerp from Colors.primary to a brighter accent at full extension.
  const knobBg = knobMag > 0.85 ? '#ffd86b' : Colors.primary

  // Tick mark positions on the base — 8 short bars at 45° intervals around
  // the rim, hinting at direction without cluttering the surface.
  const TICK_COUNT = 8
  const tickInner = radius * 0.78
  const tickOuter = radius * 0.92

  return (
    <View style={styles.area} {...responder.panHandlers}>
      {active && (
        <>
          {/* Outer glow halo — wider, lower opacity ring behind the base. */}
          <View
            style={[
              styles.glow,
              {
                width: baseSize * 1.4, height: baseSize * 1.4,
                borderRadius: baseSize * 0.7,
                left: anchor.x - baseSize * 0.7,
                top: anchor.y - baseSize * 0.7,
              },
            ]}
            pointerEvents="none"
          />
          {/* Base disc */}
          <View
            style={[
              styles.base,
              {
                width: baseSize, height: baseSize, borderRadius: radius,
                left: anchor.x - radius, top: anchor.y - radius,
              },
            ]}
            pointerEvents="none"
          />
          {/* Cardinal-ish tick marks — 8 small slivers placed at angle steps
              around the rim. Implemented as tiny absolutely-positioned views
              rotated into place. */}
          {Array.from({ length: TICK_COUNT }, (_, i) => {
            const angle = (i / TICK_COUNT) * Math.PI * 2
            const midRadius = (tickInner + tickOuter) / 2
            const length = tickOuter - tickInner
            const tx = anchor.x + Math.cos(angle) * midRadius
            const ty = anchor.y + Math.sin(angle) * midRadius
            return (
              <View
                key={i}
                style={[
                  styles.tick,
                  {
                    left: tx - length / 2,
                    top: ty - 1,
                    width: length,
                    height: 2,
                    transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
                  },
                ]}
                pointerEvents="none"
              />
            )
          })}
          {/* Knob */}
          <View
            style={[
              styles.knob,
              {
                width: knobSize, height: knobSize, borderRadius: knobRadius,
                left: anchor.x - knobRadius + knobOffset.x,
                top: anchor.y - knobRadius + knobOffset.y,
                backgroundColor: knobBg,
              },
            ]}
            pointerEvents="none"
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // The touch sink — invisible, covers the bottom-left quadrant. Tuned so it
  // sits *under* the combat cluster at bottom-right and the HUD at top-left.
  area: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '55%',
    height: '70%',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 216, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 107, 0.15)',
  },
  base: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 2,
    borderColor: 'rgba(244, 232, 200, 0.35)',
  },
  tick: {
    position: 'absolute',
    backgroundColor: 'rgba(244, 232, 200, 0.55)',
    borderRadius: 1,
  },
  knob: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.55)',
  },
})
