import React from 'react'
import { Canvas, Path, Skia } from '@shopify/react-native-skia'

// Tiny iconography for the combat cluster. Each glyph is hand-tuned for a
// 32×32 viewBox so it renders crisp at the typical button sizes (60 / 80 px).
// Drawn as filled white paths over the button's colored background.
//
// Kinds match WorldGame's combat actions: the 6 loadout skills + the three
// always-on slots (attack / dash / ultimate).

export type SkillIconKind =
  | 'attack' | 'dash' | 'ultimate'
  | 'smash' | 'lance' | 'fireball' | 'meteor' | 'hailstorm' | 'orbs'

const ICON_PATHS: Record<SkillIconKind, string> = {
  // Diagonal sword blade — instantly readable as "attack"
  attack:    'M 4 28 L 8 28 L 28 8 L 28 4 L 24 4 L 4 24 Z',
  // Two right-pointing chevrons — speed lines
  dash:      'M 6 8 L 14 16 L 6 24 L 8 26 L 18 16 L 8 6 Z '
           + 'M 14 8 L 22 16 L 14 24 L 16 26 L 26 16 L 16 6 Z',
  // Lightning bolt (vigor spender / Smash)
  smash:     'M 16 2 L 6 18 L 14 18 L 10 30 L 26 12 L 18 12 L 22 2 Z',
  // Vertical lance / spear
  lance:     'M 16 2 L 20 12 L 17 12 L 17 28 L 22 30 L 16 30 L 10 30 L 15 28 L 15 12 L 12 12 Z',
  // Fireball — circle with a flame tip rising off the top
  fireball:  'M 16 30 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 '
           + 'M 16 2  L 11 14 L 16 11 L 21 14 Z',
  // Meteor — comet head with a long trail down to bottom-left
  meteor:    'M 24 8  m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 '
           + 'M 4 28 L 8 28 L 22 14 L 18 10 Z',
  // Hailstorm — six-spoke snowflake
  hailstorm: 'M 15 2 L 17 2 L 17 30 L 15 30 Z '
           + 'M 4 9  L 4.7 7.3 L 28 21 L 27.3 22.7 Z '
           + 'M 4 23 L 27.3 9.3 L 28 11 L 4.7 24.7 Z',
  // Orbs — center circle + 3 satellite circles
  orbs:      'M 16 16 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 '
           + 'M 16 4  m -2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 '
           + 'M 26 22 m -2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 '
           + 'M 6 22  m -2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0',
  // 5-point star — Ultimate
  ultimate:  'M 16 2 L 19.5 12 L 30 12 L 21.5 18.5 L 24.5 28.5 L 16 22.5 L 7.5 28.5 L 10.5 18.5 L 2 12 L 12.5 12 Z',
}

// Pre-build Skia paths once at module load — Path.MakeFromSVGString is a
// non-trivial parse and the buttons re-render at ~15 Hz.
const ICON_PATHS_SKIA: Partial<Record<SkillIconKind, ReturnType<typeof Skia.Path.MakeFromSVGString>>> = {}
for (const k of Object.keys(ICON_PATHS) as SkillIconKind[]) {
  ICON_PATHS_SKIA[k] = Skia.Path.MakeFromSVGString(ICON_PATHS[k])!
}

interface Props {
  kind: SkillIconKind
  size: number
  color?: string
}

export const SkillIcon: React.FC<Props> = ({ kind, size, color = '#ffffff' }) => {
  const path = ICON_PATHS_SKIA[kind]
  if (!path) return null
  // Icon paths are authored in a 32×32 box; scale uniformly to fit `size`.
  const scale = size / 32
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Path
        path={path}
        color={color}
        style="fill"
        transform={[{ scale }]}
      />
    </Canvas>
  )
}
