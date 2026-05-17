// Phase 2 loot: rolled on enemy death, dropped into the world, auto-picked
// when the player walks close. Items have N affixes by rarity (1/2/3/4 for
// common/magic/rare/legendary) instead of a single flat stat. Affixes are
// summed across all equipped items inside WorldGame's derived-stat getters.

export type Rarity = 'common' | 'magic' | 'rare' | 'legendary'
export type ItemSlot = 'weapon' | 'armor' | 'ring'

export type AffixKind =
  | 'damage'
  | 'maxHp'
  | 'moveSpeedPct'
  | 'critChancePct'
  | 'critDamagePct'
  | 'attackCdMsReduction'
  | 'dashCdMsReduction'
  | 'hpRegenPerSec'

export interface Affix {
  kind: AffixKind
  value: number
}

export interface Item {
  id: number
  slot: ItemSlot
  rarity: Rarity
  affixes: Affix[]
}

export interface LootDrop {
  id: number
  x: number
  y: number
  item: Item
  spawnedAt: number
}

// Brief HUD entry for "you picked up X" — fades on its own timer in the HUD.
export interface PickupToast {
  id: number
  item: Item
  spawnedAt: number
}

export const PICKUP_TOAST_TTL_MS = 1800

// Rarity drop probabilities and visual colors.
export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#d8d0bc',
  magic:     '#4a9bd9',
  rare:      '#e8c84a',
  legendary: '#e89a40',
}

export const LOOT_DROP_CHANCE = 0.35  // per-enemy on death

// Cumulative thresholds: roll < threshold = that rarity.
const RARITY_TABLE: { rarity: Rarity; cumulative: number }[] = [
  { rarity: 'common',    cumulative: 0.70 },
  { rarity: 'magic',     cumulative: 0.92 },
  { rarity: 'rare',      cumulative: 0.99 },
  { rarity: 'legendary', cumulative: 1.00 },
]

const AFFIX_COUNT_BY_RARITY: Record<Rarity, number> = {
  common: 1,
  magic: 2,
  rare: 3,
  legendary: 4,
}

// Per-affix value range, by rarity. A legendary affix lands roughly 3-4x a
// common one of the same kind — combined with the higher affix count, a
// legendary is ~6-10x as impactful as a common, which is the chase signal.
const AFFIX_RANGES: Record<AffixKind, Record<Rarity, [number, number]>> = {
  damage:              { common: [1, 2],  magic: [2, 4],   rare: [4, 7],   legendary: [7, 12]  },
  maxHp:               { common: [4, 10], magic: [10, 22], rare: [18, 36], legendary: [32, 60] },
  moveSpeedPct:        { common: [1, 3],  magic: [2, 5],   rare: [4, 7],   legendary: [7, 12]  },
  critChancePct:       { common: [1, 2],  magic: [2, 3],   rare: [3, 5],   legendary: [4, 7]   },
  critDamagePct:       { common: [5, 10], magic: [8, 15],  rare: [12, 22], legendary: [18, 35] },
  attackCdMsReduction: { common: [10, 25],magic: [20, 40], rare: [35, 60], legendary: [55, 90] },
  dashCdMsReduction:   { common: [30, 60],magic: [50, 100],rare: [80, 150],legendary: [120, 220] },
  hpRegenPerSec:       { common: [0, 1],  magic: [1, 2],   rare: [1, 3],   legendary: [2, 4]   },
}

// Pool of affix kinds eligible for each slot. Repeating an entry biases the
// roll toward the "natural" affix for that slot — weapons trend toward dmg,
// armor toward HP, rings toward mobility/crit.
const SLOT_AFFIX_POOL: Record<ItemSlot, AffixKind[]> = {
  weapon: ['damage', 'damage', 'damage', 'critChancePct', 'critDamagePct', 'attackCdMsReduction', 'moveSpeedPct'],
  armor:  ['maxHp', 'maxHp', 'maxHp', 'hpRegenPerSec', 'moveSpeedPct', 'dashCdMsReduction', 'critChancePct'],
  ring:   ['moveSpeedPct', 'moveSpeedPct', 'critChancePct', 'critChancePct', 'critDamagePct', 'dashCdMsReduction', 'hpRegenPerSec'],
}

function rollRarity(): Rarity {
  const r = Math.random()
  for (const entry of RARITY_TABLE) {
    if (r < entry.cumulative) return entry.rarity
  }
  return 'legendary'
}

function rollSlot(): ItemSlot {
  const r = Math.random()
  if (r < 0.45) return 'weapon'
  if (r < 0.80) return 'armor'
  return 'ring'
}

function rollInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Pick one affix kind from the slot's pool that hasn't been used yet.
// Returns null if the pool has been exhausted (e.g. legendary asking for
// 4 unique affixes on a pool of 3 — shouldn't happen with current pools).
function pickAffixKind(slot: ItemSlot, used: Set<AffixKind>): AffixKind | null {
  const candidates = SLOT_AFFIX_POOL[slot].filter((k) => !used.has(k))
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function makeRandomItem(id: number): Item {
  const slot = rollSlot()
  const rarity = rollRarity()
  const targetCount = AFFIX_COUNT_BY_RARITY[rarity]
  const affixes: Affix[] = []
  const used = new Set<AffixKind>()
  for (let i = 0; i < targetCount; i++) {
    const kind = pickAffixKind(slot, used)
    if (!kind) break
    const range = AFFIX_RANGES[kind][rarity]
    affixes.push({ kind, value: rollInt(range[0], range[1]) })
    used.add(kind)
  }
  return { id, slot, rarity, affixes }
}

export function itemLabel(item: Item): string {
  const r = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)
  const s = item.slot.charAt(0).toUpperCase() + item.slot.slice(1)
  return `${r} ${s}`
}

// Per-affix display string.
export function affixLabel(a: Affix): string {
  switch (a.kind) {
    case 'damage':              return `+${a.value} dmg`
    case 'maxHp':               return `+${a.value} hp`
    case 'moveSpeedPct':        return `+${a.value}% spd`
    case 'critChancePct':       return `+${a.value}% crit`
    case 'critDamagePct':       return `+${a.value}% crit dmg`
    case 'attackCdMsReduction': return `−${a.value}ms atk cd`
    case 'dashCdMsReduction':   return `−${a.value}ms dash cd`
    case 'hpRegenPerSec':       return `+${a.value} hp/s`
  }
}

// Compact one-line summary — middle-dot separated. Used in HUD pickup toasts
// where vertical space is tight.
export function itemStatLabel(item: Item): string {
  if (item.affixes.length === 0) return ''
  return item.affixes.map(affixLabel).join(' · ')
}

// Used by tempering: rolls a fresh value for an existing affix using the
// same kind+rarity range that generated it. Kind doesn't change — only value.
export function rerollAffixValue(rarity: Rarity, kind: AffixKind): number {
  const range = AFFIX_RANGES[kind][rarity]
  return rollInt(range[0], range[1])
}
