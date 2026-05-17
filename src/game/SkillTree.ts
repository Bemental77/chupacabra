// Phase 3 progression: XP/levels/skill points spent on a small tree.
// Each effect is summed across ranks and applied as a flat modifier at the
// stat-read site, mirroring the item-stat pipeline.

export type SkillEffect =
  | 'damage'                // flat +damage
  | 'maxHp'                 // flat +max HP
  | 'moveSpeedPct'          // additive %
  | 'attackCdMsReduction'   // -ms basic attack CD
  | 'dashCdMsReduction'     // -ms dash CD
  | 'ultCdMsReduction'      // -ms ultimate CD
  | 'hpRegenPerSec'         // passive HP/sec
  | 'critChancePct'         // additive % to base crit chance
  | 'critDamagePct'         // additive % to base crit damage bonus
  | 'dashDamagePct'         // enables damaging-dash; % of base attack damage per dash hit
  | 'lanceDamagePct'        // additive % multiplier on Marrow Lance damage
  | 'lanceCdMsReduction'    // -ms Lance CD
  | 'fireballDamagePct'     // additive % multiplier on Fireball damage
  | 'fireballCdMsReduction' // -ms Fireball CD
  | 'meteorRadiusBonus'     // +radius (world units) on Meteor impact
  | 'meteorWindupMsReduction' // -ms Meteor wind-up
  | 'hailDurationMs'        // +ms Blizzard duration (extra ticks)
  | 'hailRadiusBonus'       // +radius on Blizzard zone
  | 'orbsCountBonus'        // +N orbs spawned per cast
  | 'orbsDurationMs'        // +ms orb persistence per cast

export type SkillBranch = 'combat' | 'survival' | 'movement'

export interface SkillNode {
  id: string
  name: string
  description: string
  branch: SkillBranch
  effect: SkillEffect
  perRank: number
  maxRanks: number
  requires?: { nodeId: string; rank: number }
}

export const SKILL_NODES: readonly SkillNode[] = [
  // ---- Combat
  {
    id: 'brawn', branch: 'combat',
    name: 'Brawn',
    description: '+3 base damage per rank',
    effect: 'damage', perRank: 3, maxRanks: 3,
  },
  {
    id: 'swiftness', branch: 'combat',
    name: 'Swiftness',
    description: '-50ms attack cooldown per rank',
    effect: 'attackCdMsReduction', perRank: 50, maxRanks: 3,
    requires: { nodeId: 'brawn', rank: 2 },
  },
  {
    id: 'overkill', branch: 'combat',
    name: 'Overkill',
    description: '-1.0s ultimate cooldown per rank',
    effect: 'ultCdMsReduction', perRank: 1000, maxRanks: 3,
    requires: { nodeId: 'swiftness', rank: 2 },
  },
  {
    id: 'keen-eye', branch: 'combat',
    name: 'Keen Eye',
    description: '+5% crit chance per rank',
    effect: 'critChancePct', perRank: 5, maxRanks: 3,
  },
  {
    id: 'devastate', branch: 'combat',
    name: 'Devastate',
    description: '+30% crit damage per rank',
    effect: 'critDamagePct', perRank: 30, maxRanks: 2,
    requires: { nodeId: 'keen-eye', rank: 2 },
  },
  // ---- Survival
  {
    id: 'hardy', branch: 'survival',
    name: 'Hardy',
    description: '+20 max HP per rank',
    effect: 'maxHp', perRank: 20, maxRanks: 3,
  },
  {
    id: 'rejuvenate', branch: 'survival',
    name: 'Rejuvenate',
    description: '+1 HP/sec passive regen per rank',
    effect: 'hpRegenPerSec', perRank: 1, maxRanks: 3,
    requires: { nodeId: 'hardy', rank: 2 },
  },
  // ---- Movement
  {
    id: 'fleet', branch: 'movement',
    name: 'Fleet Foot',
    description: '+5% move speed per rank',
    effect: 'moveSpeedPct', perRank: 5, maxRanks: 3,
  },
  {
    id: 'evasive', branch: 'movement',
    name: 'Evasive',
    description: '-150ms dash cooldown per rank',
    effect: 'dashCdMsReduction', perRank: 150, maxRanks: 2,
    requires: { nodeId: 'fleet', rank: 2 },
  },
  {
    id: 'rushing-claw', branch: 'movement',
    name: 'Rushing Claw',
    description: '+25% atk damage to enemies in dash path per rank',
    effect: 'dashDamagePct', perRank: 25, maxRanks: 3,
    requires: { nodeId: 'evasive', rank: 1 },
  },
  // Lance branch sits under Combat — same tree column as Brawn.
  {
    id: 'marrow', branch: 'combat',
    name: 'Marrow Lance',
    description: '+15% Lance damage per rank',
    effect: 'lanceDamagePct', perRank: 15, maxRanks: 3,
    requires: { nodeId: 'brawn', rank: 1 },
  },
  {
    id: 'piercing', branch: 'combat',
    name: 'Piercing Calculus',
    description: '-100ms Lance cooldown per rank',
    effect: 'lanceCdMsReduction', perRank: 100, maxRanks: 2,
    requires: { nodeId: 'marrow', rank: 1 },
  },
  // Fireball + Meteor share a "pyro" chain under combat — Fireball unlocks
  // first, Meteor builds on the same fantasy.
  {
    id: 'pyro', branch: 'combat',
    name: 'Pyro',
    description: '+15% Fireball damage per rank',
    effect: 'fireballDamagePct', perRank: 15, maxRanks: 3,
    requires: { nodeId: 'keen-eye', rank: 1 },
  },
  {
    id: 'falling-star', branch: 'combat',
    name: 'Falling Star',
    description: '-150ms Meteor wind-up per rank',
    effect: 'meteorWindupMsReduction', perRank: 150, maxRanks: 2,
    requires: { nodeId: 'pyro', rank: 2 },
  },
  // Frost line — Blizzard tuning, sits in Survival to balance the tree.
  {
    id: 'frost-pact', branch: 'survival',
    name: 'Frost Pact',
    description: '+1.0s Blizzard duration per rank (2 extra ticks each)',
    effect: 'hailDurationMs', perRank: 1000, maxRanks: 2,
    requires: { nodeId: 'hardy', rank: 1 },
  },
  {
    id: 'whiteout', branch: 'survival',
    name: 'Whiteout',
    description: '+20 Blizzard radius per rank',
    effect: 'hailRadiusBonus', perRank: 20, maxRanks: 2,
    requires: { nodeId: 'frost-pact', rank: 1 },
  },
  // Orbs — Movement branch, leans into the kite-and-orbit fantasy.
  {
    id: 'lanterns', branch: 'movement',
    name: 'Lanterns',
    description: '+1 orbiting lantern per rank',
    effect: 'orbsCountBonus', perRank: 1, maxRanks: 2,
    requires: { nodeId: 'fleet', rank: 1 },
  },
  {
    id: 'long-burn', branch: 'movement',
    name: 'Long Burn',
    description: '+2.0s orb persistence per rank',
    effect: 'orbsDurationMs', perRank: 2000, maxRanks: 2,
    requires: { nodeId: 'lanterns', rank: 1 },
  },
]

export type SkillRanks = Record<string, number>

export function totalRankEffect(ranks: SkillRanks, effect: SkillEffect): number {
  let total = 0
  for (const node of SKILL_NODES) {
    if (node.effect !== effect) continue
    total += (ranks[node.id] ?? 0) * node.perRank
  }
  return total
}

// Cumulative XP curve: level n+1 costs 50*n XP. Level 1->2 = 50, 2->3 = 100, etc.
export function xpRequiredForLevel(level: number): number {
  return 50 * level
}

export function canPurchase(node: SkillNode, ranks: SkillRanks, unspent: number): boolean {
  if (unspent < 1) return false
  if ((ranks[node.id] ?? 0) >= node.maxRanks) return false
  if (node.requires) {
    if ((ranks[node.requires.nodeId] ?? 0) < node.requires.rank) return false
  }
  return true
}

export const XP_PER_KILL = 10
