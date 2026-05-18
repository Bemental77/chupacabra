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

// Round button used everywhere in the combat cluster. Sits inside a flex
// row (no absolute positioning) so the cluster reflows cleanly.
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
}> = ({ size, iconKind, label, sublabel, bg, dim, disabled, onPress }) => {
  const iconSize = size >= 76 ? Math.round(size * 0.56) : Math.round(size * 0.62)
  return (
    <TouchableOpacity
      style={[
        styles.roundBtn,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: bg,
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

  // ---- Combat cluster: 3 stacked rows aligned right ----
  // Row 1: primary (gold sword) + dash (gray double-chevron) — biggest
  //        buttons, top-right corner where the thumb rests.
  // Row 2: 3 small ability circles — loadout slots 0, 1, 2.
  // Row 3: 3 small ability circles — loadout slot 3, ultimate (star), and
  //        an empty/placeholder slot if no 6th ability exists.
  // Sizes match the reference's chunky-icon read; all buttons use the same
  // RoundButton with flex layout (no absolute positioning).
  const PRIMARY_SIZE = 72
  const BTN = 56

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
        <View style={styles.cluster}>
          {/* Row 1 — primary attack + dash */}
          <View style={styles.row}>
            <RoundButton
              size={PRIMARY_SIZE}
              iconKind="attack"
              bg="#d4a13a"
              dim={attackDim}
              onPress={onAttack}
            />
            <RoundButton
              size={PRIMARY_SIZE}
              iconKind="dash"
              sublabel={dashRemaining > 500 ? (dashRemaining / 1000).toFixed(1) : undefined}
              bg="#3a3a3a"
              dim={dashDim}
              disabled={dashDim}
              onPress={onDash}
            />
          </View>
          {/* Row 2 — loadout slots 0, 1, 2 */}
          <View style={styles.row}>
            {renderSkillSlot(0)}
            {renderSkillSlot(1)}
            {renderSkillSlot(2)}
          </View>
          {/* Row 3 — loadout slot 3 + ultimate (always-on) */}
          <View style={styles.row}>
            {renderSkillSlot(3)}
            <RoundButton
              size={BTN}
              iconKind="ultimate"
              sublabel={ultRemaining > 500 ? (ultRemaining / 1000).toFixed(1) : undefined}
              bg="#3a7bb0"
              dim={ultDim}
              disabled={ultDim}
              onPress={onUltimate}
            />
          </View>
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
  cluster: { gap: 8, alignItems: 'flex-end' },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  roundBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
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
