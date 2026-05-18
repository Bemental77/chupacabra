import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import {
  PickupToast,
  PICKUP_TOAST_TTL_MS,
  RARITY_COLORS,
  itemLabel,
} from '../game/Item'
import { ActivityState, formatDuration } from '../game/Activity'
import type { NPC } from '../game/WorldGame'

interface HudProps {
  game: WorldGame
  // Called when the player taps the proximity "Talk" prompt. The Hud
  // surfaces the prompt; the screen owns the modal lifecycle.
  onTalk: () => void
}

// Polls game state at ~30Hz for the HP bar. We don't use the canvas's
// requestAnimationFrame loop here so the HUD stays decoupled from rendering.
export const Hud: React.FC<HudProps> = ({ game, onTalk }) => {
  const [hp, setHp] = useState(0)
  const [maxHp, setMaxHp] = useState(100)
  const [isDead, setIsDead] = useState(false)
  const [toasts, setToasts] = useState<readonly PickupToast[]>([])
  const [tick, setTick] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpToNext, setXpToNext] = useState(50)
  const [skillPoints, setSkillPoints] = useState(0)
  const [levelUpAt, setLevelUpAt] = useState(0)
  const [vigor, setVigor] = useState(0)
  const [maxVigor, setMaxVigor] = useState(100)
  const [activity, setActivity] = useState<ActivityState>({ kind: 'idle' })
  const [difficultyTier, setDifficultyTier] = useState(1)
  const [nearestNpc, setNearestNpc] = useState<NPC | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    let last = 0
    const POLL_MS = 33
    const loop = (t: number) => {
      if (t - last >= POLL_MS) {
        const s = game.getState()
        setHp(s.playerHp)
        setMaxHp(s.playerMaxHp)
        setIsDead(s.isDead)
        setToasts(s.pickupToasts)
        setLevel(s.level)
        setXp(s.xp)
        setXpToNext(s.xpToNext)
        setSkillPoints(s.skillPoints)
        setLevelUpAt(s.lastLevelUpAt)
        setVigor(s.vigor)
        setMaxVigor(s.maxVigor)
        setActivity(s.activityState)
        setDifficultyTier(s.difficultyTier)
        setNearestNpc(s.nearestNpc)
        setTick((x) => (x + 1) & 0xffff)
        last = t
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [game])

  const frac = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  const xpFrac = xpToNext > 0 ? Math.max(0, Math.min(1, xp / xpToNext)) : 0
  const vigorFrac = maxVigor > 0 ? Math.max(0, Math.min(1, vigor / maxVigor)) : 0
  const now = Date.now()
  const levelUpAge = now - levelUpAt
  const showLevelUp = levelUpAt > 0 && levelUpAge < 1500
  // Trial run timer — counts up while running, frozen on complete.
  const runDurationMs = activity.kind === 'running'
    ? now - activity.startedAt
    : activity.kind === 'complete'
      ? activity.durationMs
      : 0

  return (
    <>
    {/* Level badge — top-left corner, separate from the centered stat stack. */}
    <View style={styles.levelBadge} pointerEvents="none">
      <Text style={styles.levelText}>
        LV {level}
        {difficultyTier > 1 && <Text style={styles.tierBadge}>  T{difficultyTier}</Text>}
      </Text>
      {skillPoints > 0 && (
        <Text style={styles.pointsText}>+{skillPoints} pt</Text>
      )}
    </View>
    {/* Centered HP (red) over MP/Vigor (blue) — primary vital readout. */}
    <View style={styles.statStack} pointerEvents="none">
      <View style={styles.hpFrame}>
        <View style={[styles.hpFill, { width: `${frac * 100}%` }]} />
        <Text style={styles.hpLabel}>
          {Math.ceil(hp).toLocaleString()} / {maxHp.toLocaleString()}
        </Text>
      </View>
      <View style={styles.vigorFrame}>
        <View style={[styles.vigorFill, { width: `${vigorFrac * 100}%` }]} />
        <Text style={styles.vigorLabel}>
          {Math.floor(vigor)} / {maxVigor}
        </Text>
      </View>
      <View style={styles.xpFrame}>
        <View style={[styles.xpFill, { width: `${xpFrac * 100}%` }]} />
        <Text style={styles.xpLabel}>
          XP {xp} / {xpToNext}
        </Text>
      </View>
    </View>
    <View style={styles.root} pointerEvents="none">
      {activity.kind === 'running' && (
        <View style={styles.trialBox}>
          <Text style={styles.trialTitle}>TRIAL · T{activity.tier}</Text>
          <Text style={styles.trialTimer}>{formatDuration(runDurationMs)}</Text>
        </View>
      )}
      {activity.kind === 'complete' && (
        <View style={[styles.trialBox, activity.isNewBest && styles.trialBoxBest]}>
          <Text style={styles.trialTitle}>
            {activity.isNewBest ? `NEW BEST · T${activity.tier}` : `COMPLETE · T${activity.tier}`}
          </Text>
          <Text style={styles.trialTimer}>{formatDuration(activity.durationMs)}</Text>
          <Text style={styles.trialSub}>
            #{activity.placement + 1} · seed {activity.seed.toString(36)}
          </Text>
        </View>
      )}
      <View style={styles.toasts}>
        {toasts.map((t) => {
          const age = now - t.spawnedAt
          if (age >= PICKUP_TOAST_TTL_MS) return null
          // Fade in then fade out around 70% of TTL.
          const frac = age / PICKUP_TOAST_TTL_MS
          const opacity = frac < 0.15 ? frac / 0.15 : frac > 0.7 ? 1 - (frac - 0.7) / 0.3 : 1
          const color = RARITY_COLORS[t.item.rarity]
          return (
            <Text
              key={t.id}
              style={[styles.toast, { color, opacity }]}
              numberOfLines={1}
            >
              + {itemLabel(t.item)}
            </Text>
          )
        })}
      </View>
      {isDead && (
        <Text style={styles.deathLabel}>You died</Text>
      )}
      {showLevelUp && (
        <Text
          style={[
            styles.levelUpLabel,
            { opacity: 1 - levelUpAge / 1500 },
          ]}
        >
          Level {level}!
        </Text>
      )}
      {/* Force redraw of toasts as their fade progresses. */}
      <View style={styles.hiddenTick}>
        <Text>{tick}</Text>
      </View>
    </View>
    {/* Proximity prompt — sibling of the stats stack so it can position
        relative to the screen, not the 200px stats column. Only shown when
        the player is next to an interactable NPC and no activity is running.
        Tappable on touch; useDesktopInput binds `E` to the same handler. */}
    {nearestNpc && activity.kind === 'idle' && (
      <TouchableOpacity
        style={styles.talkPrompt}
        onPress={onTalk}
      >
        <Text style={styles.talkPromptLabel}>
          Talk to {nearestNpc.type === 'blacksmith' ? 'Blacksmith' : nearestNpc.type}
        </Text>
        <Text style={styles.talkPromptHint}>tap · E</Text>
      </TouchableOpacity>
    )}
    </>
  )
}

const styles = StyleSheet.create({
  // Container for trial/toasts/death overlay — sits beneath the centered
  // stat stack but uses the old top-left anchor so existing layout for those
  // elements still works.
  root: {
    position: 'absolute',
    top: 92,
    left: 12,
    width: 220,
  },
  // Top-left badge with level + skill points (kept out of the centered stack
  // so the stack reads as cleanly as the reference).
  levelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  // Centered HP (red) + MP/Vigor (blue) + thin XP bar. Anchored top-center
  // via absolute positioning with left/right: 0 + alignItems: center on the
  // parent stack.
  statStack: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 3,
  },
  hpFrame: {
    width: 260,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2a1f15',
    borderWidth: 2,
    borderColor: '#0a0807',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#c84236',
  },
  hpLabel: {
    color: '#f4e8c8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontVariant: ['tabular-nums'],
  },
  levelText: {
    color: '#f4e8c8',
    fontSize: 13,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tierBadge: {
    color: '#ffd86b',
    fontSize: 12,
    fontWeight: '800',
  },
  pointsText: {
    color: '#ffd86b',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  xpFrame: {
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2a1f15',
    borderWidth: 1,
    borderColor: '#0a0807',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  xpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#e8c84a',
  },
  xpLabel: {
    color: '#f4e8c8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  vigorFrame: {
    width: 220,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1f1610',
    borderWidth: 2,
    borderColor: '#0a0807',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vigorFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4a8fd9',
  },
  vigorLabel: {
    color: '#f4e8c8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontVariant: ['tabular-nums'],
  },
  trialBox: {
    marginTop: 8,
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderColor: '#5a4530',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  trialBoxBest: { borderColor: '#ffd86b' },
  trialTitle: {
    color: '#f4e8c8',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  trialTimer: {
    color: '#ffd86b',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  trialSub: {
    color: '#a8a08c',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  levelUpLabel: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    color: '#ffd86b',
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  toasts: { marginTop: 6, gap: 1 },
  toast: {
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  deathLabel: {
    marginTop: 8,
    color: '#ff5050',
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  hiddenTick: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  talkPrompt: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderColor: '#ffd86b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 6,
  },
  talkPromptLabel: { color: '#f4e8c8', fontWeight: '800', fontSize: 13 },
  talkPromptHint: { color: '#a8a08c', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
})
