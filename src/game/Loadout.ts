// 4-slot user-configurable loadout. Primary attack, Dash, and Ultimate stay
// fixed (always-on); the four loadout slots are picked from the available
// "core" skills. The ControlPanel reads the loadout and renders only the
// equipped skills; PC hotkeys 1-4 map to the same slots.

export type SkillId =
  | 'smash'
  | 'lance'
  | 'fireball'
  | 'meteor'
  | 'hailstorm'
  | 'orbs'

export interface SkillMeta {
  id: SkillId
  label: string         // short button label (≤6 chars)
  longLabel: string     // shown in the loadout picker
  color: string         // button background
  description: string   // shown under the picker chip
}

export const SKILL_META: Record<SkillId, SkillMeta> = {
  smash: {
    id: 'smash',
    label: 'Smash',
    longLabel: 'Smash',
    color: '#e87a2a',
    description: 'Vigor spender. Big AoE around the player.',
  },
  lance: {
    id: 'lance',
    label: 'Lance',
    longLabel: 'Marrow Lance',
    color: '#5dadec',
    description: 'Instant line beam toward the target.',
  },
  fireball: {
    id: 'fireball',
    label: 'Fire',
    longLabel: 'Cinderlash',
    color: '#ff7a1a',
    description: 'Auto-aimed projectile, explodes on contact.',
  },
  meteor: {
    id: 'meteor',
    label: 'Meteor',
    longLabel: 'Cinderfall',
    color: '#a03a0c',
    description: '0.75s wind-up, massive AoE at the target.',
  },
  hailstorm: {
    id: 'hailstorm',
    label: 'Hail',
    longLabel: 'Hailstorm',
    color: '#5790c2',
    description: 'Persistent ice zone, ticks 10 times.',
  },
  orbs: {
    id: 'orbs',
    label: 'Orbs',
    longLabel: 'Spirit Lanterns',
    color: '#7ec8ff',
    description: 'Three orbs orbit the player and damage on contact.',
  },
}

export const ALL_SKILL_IDS: readonly SkillId[] = [
  'smash', 'lance', 'fireball', 'meteor', 'hailstorm', 'orbs',
]

export interface Loadout {
  slots: [SkillId, SkillId, SkillId, SkillId]
}

export const DEFAULT_LOADOUT: Loadout = {
  slots: ['smash', 'fireball', 'lance', 'meteor'],
}

export const LOADOUT_STORAGE_KEY = 'chupacabra:loadout'
