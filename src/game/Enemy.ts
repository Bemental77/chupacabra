// Phase 1 combat: simple chase-and-attack enemies. Spawned proc-gen at world
// init by WorldGame, ticked each frame against the player's position.

export type EnemyTier = 'normal' | 'elite' | 'champion'

export interface Enemy {
  // Stable per-instance id, assigned at spawn. Lets multi-hit skills (orbs,
  // damaging dash) track "already hit this cast" without object identity
  // breaking when the enemies array gets compacted after kills.
  id: number
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  radius: number
  tier: EnemyTier
  // World-time (ms via Date.now) when this enemy can next deal damage.
  // Set in the future on every successful hit.
  attackCooldownEndsAt: number
  // Telegraphed attack: enemy locks in a swing this many ms in the future.
  // 0 = no swing pending. Player can dash out of range to avoid the hit.
  windUpEndsAt: number
  // Damage on the pending swing (saved so tier scaling sticks even if buffs
  // change mid-windup).
  windUpDamage: number
  // True for enemies spawned inside an activity instance; removed wholesale
  // when the activity ends so the open world isn't permanently littered.
  activityEnemy: boolean
  // Difficulty tier active when this enemy was spawned. Stored (not derived
  // from current tier) so that mid-run tier changes don't retro-rescale
  // already-spawned enemies. Both HP-at-spawn and damage-at-wind-up read
  // this via the difficulty*Mult helpers.
  spawnTier: number
  // Wall-clock timestamp of the last damage taken. Drives the brief white
  // flash overlay in WorldCanvas. 0 = never hit.
  lastHitAt: number
  // Vulnerable debuff expiry timestamp. While `now < vulnerableUntil`, all
  // damage to this enemy is multiplied by VULNERABLE_DAMAGE_MULT. 0 = clean.
  vulnerableUntil: number
}

// How long an enemy's hit-flash overlay shows in ms.
export const ENEMY_HIT_FLASH_MS = 90

// Vulnerable debuff — second multiplicative damage axis on top of crit.
// Applied by Lance crits and Fireball direct hits; ALL incoming damage to
// a vulnerable enemy is scaled by VULNERABLE_DAMAGE_MULT for VULNERABLE_MS.
export const VULNERABLE_MS = 4000
export const VULNERABLE_DAMAGE_MULT = 1.25

// Phase-5 line-shaped damage visual (Bone Spear and similar). Lives here
// alongside the other transient-combat types.
export interface BeamFlash {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  startedAt: number
  endsAt: number
  kind: 'lance'
}

// Travelling damaging projectile (Fireball). Updated each frame in
// `WorldGame.tickProjectiles`. Trail is a ring buffer of recent positions
// (oldest at index 0) for the comet-tail render.
export interface Projectile {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  spawnedAt: number
  originX: number
  originY: number
  maxRangeSq: number
  trail: { x: number; y: number }[]
}

// Delayed AoE — Meteor. Telegraphs a ground marker for `windupMs` then resolves
// damage at the locked position. Target coords are fixed at cast time so the
// hit lands even if the targeted enemy moves or dies.
export interface PendingMeteor {
  id: number
  x: number
  y: number
  castAt: number
  impactAt: number
  radius: number
  damage: number
}

// Persistent damage zone — Blizzard/Hailstorm. Ticks for `nextTickAt` cadence
// until `expiresAt`. Multiple zones can stack independently.
export interface DotZone {
  id: number
  x: number
  y: number
  radius: number
  damagePerTick: number
  tickIntervalMs: number
  expiresAt: number
  nextTickAt: number
  startedAt: number
  kind: 'hailstorm'
}

// Orbiting projectile cluster (Spirit Lanterns). Each entry is one orb's
// angular phase offset; the absolute angle is `orbsAngle + angleOffset`.
// Per-orb hit cooldown is tracked in a parallel array of Maps keyed by
// Enemy.id so the same orb doesn't tag the same enemy every frame.
export interface OrbState {
  id: number
  angleOffset: number
}

export type AttackFlashKind = 'basic' | 'spender' | 'ultimate' | 'meteor' | 'fireball'

export interface AttackFlash {
  x: number
  y: number
  radius: number
  endsAt: number
  startedAt: number
  kind: AttackFlashKind
}

export type DamageNumberKind = 'normal' | 'crit' | 'taken'

export interface DamageNumber {
  id: number
  x: number
  y: number
  value: number
  spawnedAt: number
  kind: DamageNumberKind
}

export const DAMAGE_NUMBER_TTL_MS = 600

export const ENEMY_RADIUS = 14
export const ENEMY_MAX_HP = 30
export const ENEMY_SPEED = 2.6
export const ENEMY_AGGRO_RADIUS = 420
export const ENEMY_ATTACK_RADIUS = 30
export const ENEMY_ATTACK_COOLDOWN_MS = 900
export const ENEMY_ATTACK_DAMAGE = 8

// Telegraphed attack — enemy enters wind-up state this many ms before the
// damage tick. Player can dash out of range during this window to negate.
export const ENEMY_WINDUP_MS = 450

// Tier-based stat multipliers. Apply at spawn time so the enemy's HP bar /
// damage taken / damage dealt all reflect its tier consistently.
export interface TierProfile {
  hpMult: number
  damageMult: number
  radiusMult: number
}
export const TIER_PROFILES: Record<EnemyTier, TierProfile> = {
  normal:   { hpMult: 1,   damageMult: 1,   radiusMult: 1    },
  elite:    { hpMult: 3,   damageMult: 1.5, radiusMult: 1.15 },
  champion: { hpMult: 8,   damageMult: 2,   radiusMult: 1.35 },
}

// Dash — short burst impulse + brief i-frames. Cooldown is the only gate.
export const DASH_IMPULSE = 30          // initial velocity magnitude (vs MAX_SPEED 7.5)
export const DASH_DURATION_MS = 220     // window during which speed clamp is lifted
export const DASH_INVULN_MS = 260       // slightly longer than dash so the recovery frame is also safe
export const DASH_COOLDOWN_MS = 1200

// Ultimate — big AoE on a long cooldown. Single transient flash, like the basic attack.
export const ULT_RADIUS = 220
export const ULT_DAMAGE = 60
export const ULT_COOLDOWN_MS = 8000
export const ULT_FLASH_MS = 350

// Lance (Bone Spear-style line). Instant cast, capsule hit detection, stops
// at first arena wall. Per-enemy crit roll.
export const LANCE_LENGTH = 600
export const LANCE_WIDTH = 30
export const LANCE_COST = 25
export const LANCE_COOLDOWN_MS = 600
export const LANCE_DAMAGE_MULT = 1.6
export const LANCE_FLASH_MS = 220

// Damaging-Dash — base damage multiplier per rank of "Rushing Claw" comes from
// the SkillTree. This is just the per-enemy reach slop on top of the swept
// player radius.
export const DASH_HIT_SLOP = 8

// Difficulty-tier scaling — applied to Trial enemy spawns. Tier 1 = 1.0x;
// each successive tier multiplies HP and damage. Tunable independently in
// case we want HP and damage curves to diverge later.
export const MAX_DIFFICULTY_TIER = 5
export function difficultyHpMult(tier: number): number {
  return 1 + Math.max(0, tier - 1) * 0.55
}
export function difficultyDamageMult(tier: number): number {
  return 1 + Math.max(0, tier - 1) * 0.35
}

// Fireball — instant-cast travelling projectile, explodes on first enemy hit.
export const FIREBALL_COST = 25
export const FIREBALL_COOLDOWN_MS = 600
export const FIREBALL_SPEED = 18           // world units / frame at delta=1
export const FIREBALL_RANGE = 900
export const FIREBALL_RANGE_SQ = FIREBALL_RANGE * FIREBALL_RANGE
export const FIREBALL_EXPLOSION_RADIUS = 70
export const FIREBALL_DAMAGE_MULT = 2.0
export const FIREBALL_BODY_RADIUS = 9      // visual + collision
export const FIREBALL_FLASH_MS = 200       // explosion flash duration

// Meteor — high-cost wind-up AoE at the target's locked position.
export const METEOR_COST = 55
export const METEOR_COOLDOWN_MS = 2500
export const METEOR_WINDUP_MS = 750
export const METEOR_RADIUS = 150
export const METEOR_DAMAGE_MULT = 2.4
export const METEOR_FLASH_MS = 320
export const METEOR_TARGET_RANGE = 700
// Distance ahead of player to drop when no target exists.
export const METEOR_FALLBACK_DIST = 280

// Blizzard / Hailstorm — persistent ground AoE, no vigor cost, ticks for the
// duration. 10 ticks × 0.4x = ~4x total damage, spread out.
export const HAIL_COOLDOWN_MS = 8000
export const HAIL_DURATION_MS = 5000
export const HAIL_TICK_INTERVAL_MS = 500
export const HAIL_DAMAGE_MULT = 0.4
export const HAIL_RADIUS = 120
export const HAIL_TARGET_RANGE = 700
export const HAIL_FALLBACK_DIST = 220

// Orbiting Orbs / Spirit Lanterns — N orbs circle the player, dealing damage
// on contact with per-orb-per-enemy hit cooldown. Cast once, persists.
export const ORBS_COUNT_BASE = 3
export const ORBS_COOLDOWN_MS = 12000
export const ORBS_DURATION_MS = 8000
export const ORB_RADIUS = 8                  // visual + hit radius of one orb
export const ORBS_ORBIT_RADIUS = 62          // distance from player center
export const ORBS_ANGULAR_SPEED = 3          // radians per second
export const ORBS_HIT_COOLDOWN_MS = 400      // per-orb-per-enemy
export const ORBS_DAMAGE_MULT = 0.6

export function makeEnemy(
  id: number,
  x: number,
  y: number,
  tier: EnemyTier = 'normal',
  activityEnemy = false,
  spawnTier = 1,
): Enemy {
  const p = TIER_PROFILES[tier]
  const hpMult = difficultyHpMult(spawnTier)
  const hp = Math.round(ENEMY_MAX_HP * p.hpMult * hpMult)
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: ENEMY_RADIUS * p.radiusMult,
    tier,
    attackCooldownEndsAt: 0,
    windUpEndsAt: 0,
    windUpDamage: 0,
    activityEnemy,
    spawnTier,
    lastHitAt: 0,
    vulnerableUntil: 0,
  }
}
