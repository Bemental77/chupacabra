import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import {
  SKILL_NODES,
  SkillBranch,
  SkillNode,
  SkillRanks,
  canPurchase,
} from '../game/SkillTree'
import { Loadout, SkillId, SKILL_META, ALL_SKILL_IDS } from '../game/Loadout'

interface Props {
  game: WorldGame
  visible: boolean
  onClose: () => void
}

interface Snapshot {
  level: number
  skillPoints: number
  skillRanks: SkillRanks
  loadout: Loadout
  difficultyTier: number
  maxDifficultyTier: number
}

const BRANCH_LABELS: Record<SkillBranch, string> = {
  combat:   'Combat',
  survival: 'Survival',
  movement: 'Movement',
}

const BRANCH_COLORS: Record<SkillBranch, string> = {
  combat:   '#c84236',
  survival: '#5b8a3a',
  movement: '#3a7bb0',
}

const BRANCH_ORDER: SkillBranch[] = ['combat', 'survival', 'movement']

function nodesByBranch(): Record<SkillBranch, SkillNode[]> {
  const out: Record<SkillBranch, SkillNode[]> = { combat: [], survival: [], movement: [] }
  for (const node of SKILL_NODES) out[node.branch].push(node)
  return out
}

export const SkillTreeScreen: React.FC<Props> = ({ game, visible, onClose }) => {
  const [snap, setSnap] = useState<Snapshot>(() => {
    const s = game.getState()
    return {
      level: s.level,
      skillPoints: s.skillPoints,
      skillRanks: s.skillRanks,
      loadout: s.loadout,
      difficultyTier: s.difficultyTier,
      maxDifficultyTier: s.maxDifficultyTier,
    }
  })

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      const s = game.getState()
      setSnap({
      level: s.level,
      skillPoints: s.skillPoints,
      skillRanks: s.skillRanks,
      loadout: s.loadout,
      difficultyTier: s.difficultyTier,
      maxDifficultyTier: s.maxDifficultyTier,
    })
    }, 80)
    return () => clearInterval(id)
  }, [game, visible])

  const handlePurchase = (nodeId: string) => {
    game.purchaseSkill(nodeId)
    const s = game.getState()
    setSnap({
      level: s.level,
      skillPoints: s.skillPoints,
      skillRanks: s.skillRanks,
      loadout: s.loadout,
      difficultyTier: s.difficultyTier,
      maxDifficultyTier: s.maxDifficultyTier,
    })
  }

  // Loadout edit state — which slot (0-3) is currently expanded for picking.
  // null when collapsed. Tapping the same slot again collapses it.
  const handleTierShift = (delta: number) => {
    game.setDifficultyTier(snap.difficultyTier + delta)
    const s = game.getState()
    setSnap({
      level: s.level,
      skillPoints: s.skillPoints,
      skillRanks: s.skillRanks,
      loadout: s.loadout,
      difficultyTier: s.difficultyTier,
      maxDifficultyTier: s.maxDifficultyTier,
    })
  }

  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const handleEquipSlot = (slotIndex: number, skillId: SkillId) => {
    game.setLoadoutSlot(slotIndex, skillId)
    const s = game.getState()
    setSnap({
      level: s.level,
      skillPoints: s.skillPoints,
      skillRanks: s.skillRanks,
      loadout: s.loadout,
      difficultyTier: s.difficultyTier,
      maxDifficultyTier: s.maxDifficultyTier,
    })
    setPickerSlot(null)
  }

  const grouped = nodesByBranch()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Skills</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>LEVEL {snap.level}</Text>
            <Text style={[styles.statText, snap.skillPoints > 0 && styles.statHighlight]}>
              POINTS {snap.skillPoints}
            </Text>
          </View>

          {/* Trial difficulty tier — scales Trial enemy HP / damage.
              Personal-best scoreboards are tracked separately per tier. */}
          <Text style={styles.sectionLabel}>TRIAL DIFFICULTY</Text>
          <View style={styles.tierRow}>
            <TouchableOpacity
              style={[styles.tierBtn, snap.difficultyTier <= 1 && styles.tierBtnDim]}
              onPress={() => handleTierShift(-1)}
              disabled={snap.difficultyTier <= 1}
            >
              <Text style={styles.tierBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.tierLabelWrap}>
              <Text style={styles.tierLabel}>T{snap.difficultyTier}</Text>
              <Text style={styles.tierMeta}>
                +{Math.round((snap.difficultyTier - 1) * 55)}% HP · +{Math.round((snap.difficultyTier - 1) * 35)}% damage
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.tierBtn, snap.difficultyTier >= snap.maxDifficultyTier && styles.tierBtnDim]}
              onPress={() => handleTierShift(1)}
              disabled={snap.difficultyTier >= snap.maxDifficultyTier}
            >
              <Text style={styles.tierBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Loadout — 4 user-equipped skill slots. Tap a slot to pick. */}
          <Text style={styles.sectionLabel}>LOADOUT</Text>
          <View style={styles.loadoutRow}>
            {snap.loadout.slots.map((id, i) => {
              const meta = SKILL_META[id]
              const expanded = pickerSlot === i
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.loadoutSlot,
                    { borderColor: meta.color },
                    expanded && { borderColor: '#ffd86b' },
                  ]}
                  onPress={() => setPickerSlot(expanded ? null : i)}
                >
                  <Text style={styles.loadoutSlotIndex}>{i + 1}</Text>
                  <Text style={[styles.loadoutSlotLabel, { color: meta.color }]}>{meta.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {pickerSlot !== null && (
            <View style={styles.pickerRow}>
              {ALL_SKILL_IDS.map((id) => {
                const meta = SKILL_META[id]
                const isCurrent = snap.loadout.slots[pickerSlot] === id
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.pickerChip,
                      { borderColor: meta.color },
                      isCurrent && styles.pickerChipCurrent,
                    ]}
                    onPress={() => handleEquipSlot(pickerSlot, id)}
                  >
                    <Text style={[styles.pickerChipLabel, { color: meta.color }]}>{meta.longLabel}</Text>
                    <Text style={styles.pickerChipDesc}>{meta.description}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          <Text style={styles.sectionLabel}>PASSIVES</Text>
          <ScrollView contentContainerStyle={styles.branches}>
            {BRANCH_ORDER.map((branch) => (
              <View key={branch} style={styles.branch}>
                <Text style={[styles.branchLabel, { color: BRANCH_COLORS[branch] }]}>
                  {BRANCH_LABELS[branch]}
                </Text>
                {grouped[branch].map((node) => {
                  const rank = snap.skillRanks[node.id] ?? 0
                  const maxed = rank >= node.maxRanks
                  const locked = node.requires
                    ? (snap.skillRanks[node.requires.nodeId] ?? 0) < node.requires.rank
                    : false
                  const purchasable = canPurchase(node, snap.skillRanks, snap.skillPoints)
                  return (
                    <TouchableOpacity
                      key={node.id}
                      style={[
                        styles.node,
                        { borderColor: BRANCH_COLORS[branch] },
                        locked && styles.nodeLocked,
                        maxed && styles.nodeMaxed,
                      ]}
                      onPress={() => purchasable && handlePurchase(node.id)}
                      disabled={!purchasable}
                    >
                      <View style={styles.nodeHeader}>
                        <Text style={styles.nodeName}>{node.name}</Text>
                        <Text style={styles.nodeRank}>
                          {rank} / {node.maxRanks}
                        </Text>
                      </View>
                      <Text style={styles.nodeDesc}>{node.description}</Text>
                      {locked && node.requires && (
                        <Text style={styles.lockNote}>
                          Requires {node.requires.nodeId} rank {node.requires.rank}
                        </Text>
                      )}
                      {!locked && !maxed && (
                        <Text style={purchasable ? styles.buyHint : styles.buyHintDisabled}>
                          {purchasable ? 'tap to buy (1 pt)' : 'no points'}
                        </Text>
                      )}
                      {maxed && <Text style={styles.maxedNote}>maxed</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
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
    maxWidth: 720,
    maxHeight: '94%',
    backgroundColor: '#2a1f15',
    borderWidth: 2,
    borderColor: '#0a0807',
    borderRadius: 10,
    padding: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#f4e8c8', fontSize: 22, fontWeight: '800' },
  closeBtn: { backgroundColor: '#5a4530', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  closeText: { color: '#f4e8c8', fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a140f',
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  statText: { color: '#f4e8c8', fontWeight: '700', fontSize: 14 },
  statHighlight: { color: '#ffd86b' },
  sectionLabel: {
    color: '#a8a08c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 6,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a140f',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tierBtn: {
    width: 36, height: 36, borderRadius: 6,
    backgroundColor: '#5a4530',
    alignItems: 'center', justifyContent: 'center',
  },
  tierBtnDim: { opacity: 0.35 },
  tierBtnText: { color: '#f4e8c8', fontSize: 22, fontWeight: '900', lineHeight: 24 },
  tierLabelWrap: { flex: 1, alignItems: 'center' },
  tierLabel: { color: '#ffd86b', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  tierMeta: { color: '#a8a08c', fontSize: 11, marginTop: 1 },
  loadoutRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  loadoutSlot: {
    flex: 1,
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadoutSlotIndex: { color: '#6a6052', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  loadoutSlotLabel: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pickerChip: {
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    minWidth: 140,
  },
  pickerChipCurrent: { backgroundColor: '#2a1f15' },
  pickerChipLabel: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  pickerChipDesc: { color: '#c0b8a4', fontSize: 10 },
  branches: { flexDirection: 'row', gap: 8 },
  branch: { flex: 1, gap: 8 },
  branchLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 1,
  },
  node: {
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderRadius: 6,
    padding: 10,
    minHeight: 96,
  },
  nodeLocked: { opacity: 0.4 },
  nodeMaxed: { opacity: 0.85 },
  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nodeName: { color: '#f4e8c8', fontWeight: '800', fontSize: 14 },
  nodeRank: { color: '#d8d0bc', fontWeight: '700', fontSize: 12 },
  nodeDesc: { color: '#c0b8a4', fontSize: 11, marginBottom: 6 },
  lockNote: { color: '#888070', fontSize: 10, fontStyle: 'italic' },
  buyHint: { color: '#ffd86b', fontSize: 10, fontWeight: '700' },
  buyHintDisabled: { color: '#6a6052', fontSize: 10 },
  maxedNote: { color: '#5b8a3a', fontSize: 10, fontWeight: '800' },
})
