import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { regenerateWorld, WorldGame, WorldState } from '../game/WorldGame'
import { SKILL_META, SkillId } from '../game/Loadout'
import { SkillIcon, SkillIconKind } from './SkillIcon'

interface ControlPanelProps {
  game: WorldGame
  onTogglePause: () => void
  onReset: () => void
  onMap: () => void
  onAttack: () => void
  onDash: () => void
  onUltimate: () => void
  onCastSlot: (slotIndex: number) => void
  onInventory: () => void
  onSkills: () => void
  onBlacksmith: () => void
  onBests: () => void
  onTrialToggle: () => void
  onSurvivalToggle: () => void
  survivalButtonLabel: string
  trialButtonLabel: string
  hasUnspentPoints: boolean
  isPaused: boolean
}

// Single source of truth for per-skill cooldown + cost. Reads from WorldState
// fields the WorldGame already exposes; centralized here so render code can
// look up "what's the state of skill X right now" with one switch.
function getSkillRuntime(state: WorldState, id: SkillId): {
  remainingMs: number
  totalMs: number
  cost: number
  vigorOk: boolean
} {
  const now = Date.now()
  switch (id) {
    case 'smash':
      return {
        remainingMs: Math.max(0, state.spenderCooldownEndsAt - now),
        totalMs: state.spenderCooldownMs,
        cost: 40,
        vigorOk: state.vigor >= 40,
      }
    case 'lance':
      return {
        remainingMs: Math.max(0, state.lanceCooldownEndsAt - now),
        totalMs: state.lanceCooldownMs,
        cost: state.lanceCost,
        vigorOk: state.vigor >= state.lanceCost,
      }
    case 'fireball':
      return {
        remainingMs: Math.max(0, state.fireballCooldownEndsAt - now),
        totalMs: state.fireballCooldownMs,
        cost: state.fireballCost,
        vigorOk: state.vigor >= state.fireballCost,
      }
    case 'meteor':
      return {
        remainingMs: Math.max(0, state.meteorCooldownEndsAt - now),
        totalMs: state.meteorCooldownMs,
        cost: state.meteorCost,
        vigorOk: state.vigor >= state.meteorCost,
      }
    case 'hailstorm':
      return {
        remainingMs: Math.max(0, state.hailCooldownEndsAt - now),
        totalMs: state.hailCooldownMs,
        cost: 0,
        vigorOk: true,
      }
    case 'orbs':
      return {
        remainingMs: Math.max(0, state.orbsCooldownEndsAt - now),
        totalMs: state.orbsCooldownMs,
        cost: 0,
        vigorOk: true,
      }
  }
}

// Round button used everywhere in the combat cluster.
const RoundButton: React.FC<{
  size: number
  // When iconKind is set, the SkillIcon is the primary visual; label is shown
  // small underneath only on cooldown (replaced by remaining-seconds then).
  iconKind?: SkillIconKind
  label?: string
  sublabel?: string
  bg: string
  dim?: boolean
  disabled?: boolean
  onPress: () => void
  // Absolute position within the cluster. Left/top are required when used in
  // the cluster (it's `position: 'relative'`).
  left: number
  top: number
}> = ({ size, iconKind, label, sublabel, bg, dim, disabled, onPress, left, top }) => {
  const iconSize = size >= 76 ? Math.round(size * 0.56) : Math.round(size * 0.62)
  return (
    <TouchableOpacity
      style={[
        styles.roundBtn,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: bg,
          left, top,
        },
        dim && styles.roundBtnDim,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
    >
      {iconKind ? (
        <SkillIcon kind={iconKind} size={iconSize} />
      ) : (
        label && <Text style={[styles.roundBtnLabel, { fontSize: size >= 76 ? 16 : 13 }]}>{label}</Text>
      )}
      {sublabel && (
        <Text style={styles.roundBtnSub}>{sublabel}</Text>
      )}
    </TouchableOpacity>
  )
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  game,
  onTogglePause,
  onReset,
  onMap,
  onAttack,
  onDash,
  onUltimate,
  onCastSlot,
  onInventory,
  onSkills,
  onBlacksmith,
  onBests,
  onTrialToggle,
  onSurvivalToggle,
  survivalButtonLabel,
  trialButtonLabel,
  hasUnspentPoints,
  isPaused,
}) => {
  const [worldState, setWorldState] = useState<WorldState | null>(null)

  // Poll WorldState at ~15Hz for cooldowns / vigor / loadout. The rAF loop
  // in WorldCanvas covers movement render; this is just for HUD chrome.
  useEffect(() => {
    const id = setInterval(() => setWorldState(game.getState()), 66)
    return () => clearInterval(id)
  }, [game])

  // ---- Combat cluster geometry (relative to cluster top-left) ----
  // PRIMARY (88px) anchors the bottom-right corner where the thumb rests.
  // 4 skill slots (60px each) arc around the primary along a quarter-circle
  // from ~9 o'clock to ~12 o'clock. Dash + Ult are fixed at the cluster
  // corners.  Cluster bounding box: 260 wide × 260 tall.
  const PRIMARY_SIZE = 88
  const BTN = 60
  const cluster = { width: 260, height: 260 }
  // Primary anchored bottom-right
  const primaryPos = {
    left: cluster.width - PRIMARY_SIZE,
    top:  cluster.height - PRIMARY_SIZE,
  }
  // Centerpoint of the primary — origin for the arc the slots ride on.
  const cx = primaryPos.left + PRIMARY_SIZE / 2
  const cy = primaryPos.top  + PRIMARY_SIZE / 2
  const ARC_RADIUS = 118  // distance from primary center to each slot center
  // Slot angles in radians, measured CCW from +x. 0=right, π/2=down, π=left, 3π/2=up.
  // We want slots to arc up-and-left of the primary, from ~9 o'clock (π) up
  // through 11/12 o'clock (3π/2) so the thumb sweeps naturally.
  const slotAngles = [
    Math.PI,            // 9 o'clock — closest, in line with primary
    Math.PI * 1.20,     // 10 o'clock-ish (above-left)
    Math.PI * 1.40,     // 11 o'clock-ish
    Math.PI * 1.60,     // ~12-1 o'clock — top
  ]
  const slotPositions = slotAngles.map((a) => ({
    left: cx + Math.cos(a) * ARC_RADIUS - BTN / 2,
    top:  cy + Math.sin(a) * ARC_RADIUS - BTN / 2,
  }))
  // Ult sits at the top-right of the cluster, tucked above the primary
  const ultPos = { left: cluster.width - BTN, top: 8 }
  // Dash sits at the bottom-left of the cluster, opposite the primary
  const dashPos = { left: 0, top: cluster.height - BTN }

  const renderSkillSlot = (slotIndex: number) => {
    const id = worldState?.loadout.slots[slotIndex]
    const meta = id ? SKILL_META[id] : null
    const rt = id && worldState ? getSkillRuntime(worldState, id) : null
    const dim = !!(rt && (rt.remainingMs > 50 || !rt.vigorOk))
    const seconds = rt && rt.remainingMs > 500 ? (rt.remainingMs / 1000).toFixed(1) : undefined
    return (
      <RoundButton
        key={`slot${slotIndex}`}
        size={BTN}
        iconKind={id as SkillIconKind | undefined}
        label={meta?.label ?? '—'}
        sublabel={seconds}
        bg={meta?.color ?? '#3a3028'}
        dim={dim}
        disabled={dim}
        onPress={() => onCastSlot(slotIndex)}
        left={slotPositions[slotIndex].left}
        top={slotPositions[slotIndex].top}
      />
    )
  }

  const attackDim = (worldState?.attackCooldownEndsAt ?? 0) - Date.now() > 50
  const dashDim   = (worldState?.dashCooldownEndsAt ?? 0)   - Date.now() > 50
  const ultDim    = (worldState?.ultimateCooldownEndsAt ?? 0) - Date.now() > 50
  const ultRemaining = Math.max(0, (worldState?.ultimateCooldownEndsAt ?? 0) - Date.now())
  const dashRemaining = Math.max(0, (worldState?.dashCooldownEndsAt ?? 0) - Date.now())

  return (
    <View style={styles.container}>
      <View style={styles.rightSide}>
        <View style={[styles.cluster, cluster]}>
            {/* Skill slots first so PRIMARY draws on top if they overlap. */}
            {renderSkillSlot(3)}
            {renderSkillSlot(2)}
            {renderSkillSlot(1)}
            {renderSkillSlot(0)}
            {/* Dash */}
            <RoundButton
              size={BTN}
              iconKind="dash"
              sublabel={dashRemaining > 500 ? (dashRemaining / 1000).toFixed(1) : undefined}
              bg="#3a7bb0"
              dim={dashDim}
              disabled={dashDim}
              onPress={onDash}
              left={dashPos.left}
              top={dashPos.top}
            />
            {/* Ultimate */}
            <RoundButton
              size={BTN}
              iconKind="ultimate"
              sublabel={ultRemaining > 500 ? (ultRemaining / 1000).toFixed(1) : undefined}
              bg="#7a5cb0"
              dim={ultDim}
              disabled={ultDim}
              onPress={onUltimate}
              left={ultPos.left}
              top={ultPos.top}
            />
            {/* Primary attack — the anchor. Drawn last so it sits on top. */}
            <RoundButton
              size={PRIMARY_SIZE}
              iconKind="attack"
              bg="#c84236"
              dim={attackDim}
              onPress={onAttack}
              left={primaryPos.left}
              top={primaryPos.top}
            />
          </View>

          {/* Utility row — small chip buttons below the cluster. */}
          <View style={styles.utilityRow}>
            <TouchableOpacity style={[styles.chip, isPaused && styles.chipPaused]} onPress={onTogglePause}>
              <Text style={styles.chipText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onMap}>
              <Text style={styles.chipText}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onInventory}>
              <Text style={styles.chipText}>Bag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onBlacksmith}>
              <Text style={styles.chipText}>Smith</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, hasUnspentPoints && styles.chipGlow]}
              onPress={onSkills}
            >
              <Text style={styles.chipText}>
                Skills{hasUnspentPoints ? ' ●' : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onTrialToggle}>
              <Text style={styles.chipText}>{trialButtonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onSurvivalToggle}>
              <Text style={styles.chipText}>{survivalButtonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onBests}>
              <Text style={styles.chipText}>Bests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={onReset}>
              <Text style={styles.chipText}>Reset</Text>
            </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={regenerateWorld}>
            <Text style={styles.chipText}>New World</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Sits at the bottom-right of the screen. The floating joystick (peer
  // component) owns the bottom-left half — no overlap.
  container: { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12 },
  rightSide: { alignItems: 'flex-end', gap: 8 },
  cluster: { position: 'relative' },
  roundBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
  },
  roundBtnDim: { opacity: 0.45 },
  roundBtnLabel: {
    color: 'white',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roundBtnSub: {
    color: '#f4e8c8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  utilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 280 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'rgba(42, 31, 21, 0.85)' },
  chipPaused: { backgroundColor: '#FF9500' },
  chipGlow: { backgroundColor: '#a880ff' },
  chipText: { color: '#f4e8c8', fontSize: 12, fontWeight: '600' },
})
