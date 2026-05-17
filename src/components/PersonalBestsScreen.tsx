import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import { loadScores, ScoreRecord, formatDuration, ActivityId, ACTIVITY_LABELS } from '../game/Activity'

interface Props {
  game: WorldGame
  visible: boolean
  onClose: () => void
}

// One bucket per tier — populated on open by reading the per-tier score keys.
type Buckets = Record<number, ScoreRecord[]>
type ActivityBuckets = Record<ActivityId, Buckets>

const ACTIVITY_TABS: ActivityId[] = ['trial', 'survival']

export const PersonalBestsScreen: React.FC<Props> = ({ game, visible, onClose }) => {
  const [maxTier, setMaxTier] = useState(5)
  const [buckets, setBuckets] = useState<ActivityBuckets>({ trial: {}, survival: {} })
  const [activeTier, setActiveTier] = useState(1)
  const [activeActivity, setActiveActivity] = useState<ActivityId>('trial')

  // Pull the max-tier ceiling from game state and load scores for every
  // (activity, tier) pair on open. ~10 reads total — small JSON blobs.
  useEffect(() => {
    if (!visible) return
    const s = game.getState()
    setMaxTier(s.maxDifficultyTier)
    setActiveTier(s.difficultyTier)
    let cancelled = false
    ;(async () => {
      const out: ActivityBuckets = { trial: {}, survival: {} }
      for (const activity of ACTIVITY_TABS) {
        for (let t = 1; t <= s.maxDifficultyTier; t++) {
          out[activity][t] = await loadScores(activity, t)
        }
      }
      if (!cancelled) setBuckets(out)
    })()
    return () => { cancelled = true }
  }, [game, visible])

  const records = buckets[activeActivity][activeTier] ?? []

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Personal Bests</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {ACTIVITY_LABELS[activeActivity]} · top {records.length || 0} on tier {activeTier}
          </Text>

          {/* Activity tabs — Trial vs Survival. Each activity has its own
              per-tier scoreboards. */}
          <View style={styles.tabsRow}>
            {ACTIVITY_TABS.map((a) => {
              const count = Object.values(buckets[a]).reduce((sum, list) => sum + list.length, 0)
              const active = a === activeActivity
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveActivity(a)}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {ACTIVITY_LABELS[a]}
                  </Text>
                  <Text style={[styles.tabSub, active && styles.tabSubActive]}>{count}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Tier tabs — one per tier. Counts in subscript show "X runs" so the
              player can tell at a glance which tiers they've actually played. */}
          <View style={styles.tabsRow}>
            {Array.from({ length: maxTier }, (_, i) => i + 1).map((t) => {
              const count = buckets[activeActivity][t]?.length ?? 0
              const active = t === activeTier
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveTier(t)}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>T{t}</Text>
                  <Text style={[styles.tabSub, active && styles.tabSubActive]}>{count}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {records.length === 0 && (
              <Text style={styles.emptyText}>No runs yet on this tier.</Text>
            )}
            {records.map((r, idx) => {
              const date = new Date(r.timestamp)
              const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
              return (
                <View
                  key={r.timestamp}
                  style={[styles.row, idx === 0 && styles.rowFirst]}
                >
                  <Text style={[styles.rank, idx === 0 && styles.rankFirst]}>#{idx + 1}</Text>
                  <Text style={[styles.duration, idx === 0 && styles.durationFirst]}>
                    {formatDuration(r.durationMs)}
                  </Text>
                  <Text style={styles.meta}>LV {r.level}</Text>
                  <Text style={styles.meta}>{r.seed.toString(36)}</Text>
                  <Text style={styles.meta}>{dateLabel}</Text>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#2a1f15',
    borderWidth: 2,
    borderColor: '#0a0807',
    borderRadius: 10,
    padding: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#f4e8c8', fontSize: 22, fontWeight: '800' },
  closeBtn: { backgroundColor: '#5a4530', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  closeText: { color: '#f4e8c8', fontWeight: '700' },
  subtitle: { color: '#a8a08c', fontSize: 12, marginBottom: 10 },
  tabsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  tab: {
    flex: 1,
    backgroundColor: '#1a140f',
    borderWidth: 1,
    borderColor: '#3a3028',
    borderRadius: 5,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: { borderColor: '#ffd86b', backgroundColor: '#2a1f15' },
  tabLabel: { color: '#a8a08c', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  tabLabelActive: { color: '#ffd86b' },
  tabSub: { color: '#6a6052', fontSize: 10, marginTop: 1 },
  tabSubActive: { color: '#a8a08c' },
  list: { flexGrow: 0, maxHeight: 420 },
  listContent: { gap: 4 },
  emptyText: { color: '#888070', fontStyle: 'italic', textAlign: 'center', padding: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#1a140f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    gap: 12,
  },
  rowFirst: { backgroundColor: '#2a1f15', borderLeftWidth: 4, borderLeftColor: '#ffd86b' },
  rank: { color: '#a8a08c', fontWeight: '800', fontSize: 12, width: 24 },
  rankFirst: { color: '#ffd86b' },
  duration: {
    color: '#f4e8c8',
    fontWeight: '800',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  durationFirst: { color: '#ffd86b' },
  meta: { color: '#888070', fontSize: 11, fontVariant: ['tabular-nums'] },
})
