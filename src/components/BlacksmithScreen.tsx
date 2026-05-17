import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import { Item, Rarity, AffixKind, RARITY_COLORS, itemLabel, affixLabel } from '../game/Item'

interface Props {
  game: WorldGame
  visible: boolean
  onClose: () => void
}

interface Snapshot {
  inventory: readonly Item[]
  materials: number
}

const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 0, rare: 1, magic: 2, common: 3,
}

// Salvage payouts per item — keep this in sync with WorldGame.SALVAGE_VALUE
// so the preview ("you'll gain X materials") matches what the salvage actually
// grants. Worth a future shared constant if it drifts.
const SALVAGE_VALUE: Record<Rarity, number> = {
  common: 1,
  magic: 2,
  rare: 4,
  legendary: 10,
}

// Mirror of WorldGame.TEMPER_COST so the per-item button can show its price.
const TEMPER_COST: Record<Rarity, number> = {
  common: 3,
  magic: 5,
  rare: 8,
  legendary: 15,
}

function sortInventory(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => {
    const ra = RARITY_ORDER[a.rarity] ?? 99
    const rb = RARITY_ORDER[b.rarity] ?? 99
    if (ra !== rb) return ra - rb
    return b.id - a.id
  })
}

function poll(game: WorldGame): Snapshot {
  const s = game.getState()
  return { inventory: s.inventory, materials: s.materials }
}

export const BlacksmithScreen: React.FC<Props> = ({ game, visible, onClose }) => {
  const [snap, setSnap] = useState<Snapshot>(() => poll(game))
  const [lastSalvage, setLastSalvage] = useState<{ count: number; gained: number } | null>(null)
  // Latest tempering outcome, used to highlight the affix that just changed.
  const [lastTemper, setLastTemper] = useState<{
    itemId: number; affixKind: AffixKind; oldValue: number; newValue: number
  } | null>(null)

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setSnap(poll(game)), 100)
    return () => clearInterval(id)
  }, [game, visible])

  useEffect(() => {
    if (visible) {
      setLastSalvage(null)
      setLastTemper(null)
    }
  }, [visible])

  const handleSalvage = (max: Rarity) => {
    const result = game.salvageInventory(max)
    if (result.count > 0) setLastSalvage(result)
    setSnap(poll(game))
  }

  const handleTemper = (itemId: number, affixIndex: number) => {
    const result = game.temperItem(itemId, affixIndex)
    if (!result.success) return
    setLastTemper({
      itemId,
      affixKind: result.affixKind!,
      oldValue: result.oldValue!,
      newValue: result.newValue!,
    })
    setSnap(poll(game))
  }

  const sorted = sortInventory(snap.inventory)
  // Preview: how much you'd gain at each tier if you tapped the button now.
  const previewCommon = snap.inventory
    .filter((i) => i.rarity === 'common')
    .reduce((acc, i) => acc + SALVAGE_VALUE[i.rarity], 0)
  const previewMagicAndBelow = snap.inventory
    .filter((i) => i.rarity === 'common' || i.rarity === 'magic')
    .reduce((acc, i) => acc + SALVAGE_VALUE[i.rarity], 0)
  const countCommon = snap.inventory.filter((i) => i.rarity === 'common').length
  const countMagicAndBelow = snap.inventory.filter(
    (i) => i.rarity === 'common' || i.rarity === 'magic',
  ).length

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Blacksmith</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>MATERIALS</Text>
            <Text style={styles.materialsText}>{snap.materials}</Text>
          </View>

          {lastSalvage && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>
                Salvaged {lastSalvage.count} item{lastSalvage.count === 1 ? '' : 's'} ·
                +{lastSalvage.gained} materials
              </Text>
            </View>
          )}

          <Text style={styles.section}>Salvage</Text>
          <View style={styles.salvageRow}>
            <TouchableOpacity
              style={[styles.salvageBtn, countCommon === 0 && styles.salvageBtnDim]}
              onPress={() => handleSalvage('common')}
              disabled={countCommon === 0}
            >
              <Text style={styles.salvageLabel}>Commons</Text>
              <Text style={styles.salvageSub}>{countCommon} item · +{previewCommon}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.salvageBtn, countMagicAndBelow === 0 && styles.salvageBtnDim]}
              onPress={() => handleSalvage('magic')}
              disabled={countMagicAndBelow === 0}
            >
              <Text style={styles.salvageLabel}>Common + Magic</Text>
              <Text style={styles.salvageSub}>{countMagicAndBelow} items · +{previewMagicAndBelow}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.section}>Bag ({sorted.length})</Text>
          <ScrollView style={styles.bag} contentContainerStyle={styles.bagContent}>
            {sorted.length === 0 && (
              <Text style={styles.emptyText}>Bag empty.</Text>
            )}
            {sorted.map((it) => {
              const temperCost = TEMPER_COST[it.rarity]
              const canTemper = snap.materials >= temperCost
              const justRerolled = lastTemper && lastTemper.itemId === it.id
              return (
                <View
                  key={it.id}
                  style={[styles.itemRow, { borderColor: RARITY_COLORS[it.rarity] }]}
                >
                  <View style={styles.itemRowHeader}>
                    <Text style={[styles.itemLabel, { color: RARITY_COLORS[it.rarity] }]}>
                      {itemLabel(it)}
                    </Text>
                    <Text style={styles.itemValue}>+{SALVAGE_VALUE[it.rarity]} mat</Text>
                  </View>
                  {it.affixes.map((a, i) => {
                    const highlight = justRerolled && lastTemper!.affixKind === a.kind
                    return (
                      <View key={i} style={styles.affixRow}>
                        <Text
                          style={[styles.affixLineFlex, highlight && styles.affixLineHighlight]}
                        >
                          {affixLabel(a)}
                          {highlight && (
                            <Text style={styles.affixDelta}>
                              {'  '}({lastTemper!.oldValue} → {lastTemper!.newValue})
                            </Text>
                          )}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.affixRerollBtn,
                            !canTemper && styles.temperBtnDim,
                          ]}
                          onPress={() => handleTemper(it.id, i)}
                          disabled={!canTemper}
                        >
                          <Text style={styles.affixRerollText}>
                            ↻ {temperCost}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#f4e8c8', fontSize: 22, fontWeight: '800' },
  closeBtn: { backgroundColor: '#5a4530', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  closeText: { color: '#f4e8c8', fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    backgroundColor: '#1a140f', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 6, marginBottom: 12,
  },
  statText: { color: '#a8a08c', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  materialsText: { color: '#ffd86b', fontWeight: '900', fontSize: 22 },
  toast: {
    backgroundColor: '#1d2c1a', borderLeftWidth: 4, borderLeftColor: '#5b8a3a',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, marginBottom: 8,
  },
  toastText: { color: '#bce5a0', fontWeight: '700', fontSize: 12 },
  section: { color: '#d8d0bc', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  salvageRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  salvageBtn: {
    flex: 1, backgroundColor: '#1a140f', borderWidth: 2, borderColor: '#5a4530',
    borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12,
  },
  salvageBtnDim: { opacity: 0.4 },
  salvageLabel: { color: '#f4e8c8', fontWeight: '800', fontSize: 13 },
  salvageSub: { color: '#a8a08c', fontSize: 11, marginTop: 2 },
  bag: { flexGrow: 0, maxHeight: 320 },
  bagContent: { gap: 6, paddingBottom: 8 },
  emptyText: { color: '#888070', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  itemRow: {
    backgroundColor: '#1a140f', borderLeftWidth: 4, borderRadius: 4,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  itemRowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  itemLabel: { fontSize: 13, fontWeight: '800' },
  itemValue: { color: '#a8a08c', fontSize: 11, fontWeight: '600' },
  affixLine: { color: '#f4e8c8', fontSize: 11, marginTop: 2 },
  affixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  affixLineFlex: { color: '#f4e8c8', fontSize: 11, flex: 1 },
  affixLineHighlight: { color: '#ffd86b', fontWeight: '700' },
  affixDelta: { color: '#a8a08c', fontSize: 10, fontWeight: '600' },
  affixRerollBtn: {
    backgroundColor: '#3a3028',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  affixRerollText: { color: '#f4e8c8', fontSize: 11, fontWeight: '700' },
  temperBtnDim: { opacity: 0.35 },
})
