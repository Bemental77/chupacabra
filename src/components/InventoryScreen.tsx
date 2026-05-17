import React, { useEffect, useState } from 'react'
import { View, Modal, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { WorldGame, EquippedSlots } from '../game/WorldGame'
import {
  Item,
  ItemSlot,
  RARITY_COLORS,
  itemLabel,
  affixLabel,
} from '../game/Item'

interface Props {
  game: WorldGame
  visible: boolean
  onClose: () => void
}

interface Snapshot {
  inventory: readonly Item[]
  equipped: EquippedSlots
  attackDamage: number
  maxSpeed: number
  playerMaxHp: number
}

// Rarity sort order: legendary > rare > magic > common, then most recent first.
const RARITY_ORDER: Record<string, number> = {
  legendary: 0, rare: 1, magic: 2, common: 3,
}

function sortInventory(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => {
    const ra = RARITY_ORDER[a.rarity] ?? 99
    const rb = RARITY_ORDER[b.rarity] ?? 99
    if (ra !== rb) return ra - rb
    return b.id - a.id
  })
}

export const InventoryScreen: React.FC<Props> = ({ game, visible, onClose }) => {
  const [snap, setSnap] = useState<Snapshot>(() => {
    const s = game.getState()
    return {
      inventory: s.inventory,
      equipped: s.equipped,
      attackDamage: s.attackDamage,
      maxSpeed: s.maxSpeed,
      playerMaxHp: s.playerMaxHp,
    }
  })

  // While the modal is open, re-poll so equip/unequip taps reflect immediately.
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      const s = game.getState()
      setSnap({
        inventory: s.inventory,
        equipped: s.equipped,
        attackDamage: s.attackDamage,
        maxSpeed: s.maxSpeed,
        playerMaxHp: s.playerMaxHp,
      })
    }, 80)
    return () => clearInterval(id)
  }, [game, visible])

  const handleEquip = (id: number) => {
    game.equip(id)
    // Update immediately so the UI doesn't wait for the poll tick.
    const s = game.getState()
    setSnap({
      inventory: s.inventory,
      equipped: s.equipped,
      attackDamage: s.attackDamage,
      maxSpeed: s.maxSpeed,
      playerMaxHp: s.playerMaxHp,
    })
  }

  const handleUnequip = (slot: ItemSlot) => {
    game.unequip(slot)
    const s = game.getState()
    setSnap({
      inventory: s.inventory,
      equipped: s.equipped,
      attackDamage: s.attackDamage,
      maxSpeed: s.maxSpeed,
      playerMaxHp: s.playerMaxHp,
    })
  }

  const sorted = sortInventory(snap.inventory)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Inventory</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Derived stats summary */}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>DMG {snap.attackDamage}</Text>
            <Text style={styles.statText}>MAX HP {snap.playerMaxHp}</Text>
            <Text style={styles.statText}>SPD {snap.maxSpeed.toFixed(2)}</Text>
          </View>

          {/* Equipped slots */}
          <Text style={styles.section}>Equipped</Text>
          <View style={styles.equippedRow}>
            <EquipSlot label="Weapon" item={snap.equipped.weapon} onTap={() => handleUnequip('weapon')} />
            <EquipSlot label="Armor"  item={snap.equipped.armor}  onTap={() => handleUnequip('armor')} />
            <EquipSlot label="Ring"   item={snap.equipped.ring}   onTap={() => handleUnequip('ring')} />
          </View>

          {/* Inventory */}
          <Text style={styles.section}>Bag ({sorted.length})</Text>
          <ScrollView style={styles.bag} contentContainerStyle={styles.bagContent}>
            {sorted.length === 0 && (
              <Text style={styles.emptyText}>Kill enemies for drops.</Text>
            )}
            {sorted.map((it) => (
              <TouchableOpacity
                key={it.id}
                style={[styles.itemRow, { borderColor: RARITY_COLORS[it.rarity] }]}
                onPress={() => handleEquip(it.id)}
              >
                <View style={styles.itemRowHeader}>
                  <Text style={[styles.itemLabel, { color: RARITY_COLORS[it.rarity] }]}>
                    {itemLabel(it)}
                  </Text>
                  <Text style={styles.equipHint}>tap to equip</Text>
                </View>
                {it.affixes.map((a, i) => (
                  <Text key={i} style={styles.affixLine}>{affixLabel(a)}</Text>
                ))}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const EquipSlot: React.FC<{ label: string; item: Item | null; onTap: () => void }> = ({ label, item, onTap }) => {
  if (!item) {
    return (
      <View style={[styles.slot, styles.slotEmpty]}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotEmptyText}>—</Text>
      </View>
    )
  }
  return (
    <TouchableOpacity
      style={[styles.slot, { borderColor: RARITY_COLORS[item.rarity] }]}
      onPress={onTap}
    >
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={[styles.slotItemLabel, { color: RARITY_COLORS[item.rarity] }]}>
        {item.rarity}
      </Text>
      {item.affixes.map((a, i) => (
        <Text key={i} style={styles.slotStat}>{affixLabel(a)}</Text>
      ))}
      <Text style={styles.unequipHint}>tap to unequip</Text>
    </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a140f',
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  statText: { color: '#f4e8c8', fontWeight: '700', fontSize: 14 },
  section: { color: '#d8d0bc', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  equippedRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  slot: {
    flex: 1,
    backgroundColor: '#1a140f',
    borderWidth: 2,
    borderColor: '#5a4530',
    borderRadius: 6,
    padding: 10,
    minHeight: 90,
  },
  slotEmpty: { borderStyle: 'dashed', opacity: 0.7 },
  slotLabel: { color: '#a8a08c', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  slotEmptyText: { color: '#6a6052', fontSize: 18, textAlign: 'center', marginTop: 12 },
  slotItemLabel: { fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  slotStat: { color: '#f4e8c8', fontSize: 12, marginTop: 2 },
  unequipHint: { color: '#888070', fontSize: 9, marginTop: 6 },
  bag: { flexGrow: 0, maxHeight: 320 },
  bagContent: { gap: 6, paddingBottom: 8 },
  emptyText: { color: '#888070', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  itemRow: {
    backgroundColor: '#1a140f',
    borderLeftWidth: 4,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemRowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  itemLabel: { fontSize: 14, fontWeight: '800' },
  affixLine: { color: '#f4e8c8', fontSize: 12, marginTop: 2 },
  equipHint: { color: '#888070', fontSize: 9 },
})
