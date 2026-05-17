import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, StyleSheet, SafeAreaView } from 'react-native'
import { WorldGame } from '../game/WorldGame'
import { WorldCanvas } from '../components/WorldCanvas'
import { ControlPanel } from '../components/ControlPanel'
import { MapOverlay } from '../components/MapOverlay'
import { Hud } from '../components/Hud'
import { InventoryScreen } from '../components/InventoryScreen'
import { SkillTreeScreen } from '../components/SkillTreeScreen'
import { BlacksmithScreen } from '../components/BlacksmithScreen'
import { PersonalBestsScreen } from '../components/PersonalBestsScreen'
import { FloatingJoystick } from '../components/FloatingJoystick'
import { Colors } from '../theme/Colors'
import { useDesktopInput } from '../input/useDesktopInput'

export const MazeGameScreen: React.FC = () => {
  const gameRef = useRef(new WorldGame())
  const inputRef = useRef({ dx: 0, dy: 0 })
  const [isPaused, setIsPaused] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [inventoryVisible, setInventoryVisible] = useState(false)
  const [skillsVisible, setSkillsVisible] = useState(false)
  const [blacksmithVisible, setBlacksmithVisible] = useState(false)
  const [bestsVisible, setBestsVisible] = useState(false)
  // Cheap 4Hz poll just for the "has unspent points" glow indicator on the
  // ControlPanel — modal screens do their own polling.
  const [unspentPoints, setUnspentPoints] = useState(0)
  // Snapshot pause-state at the moment a modal opens so closing it restores
  // the prior state instead of unconditionally unpausing.
  const wasPausedBeforeModal = useRef(false)

  const handleMoveContinuous = useCallback((dx: number, dy: number) => {
    inputRef.current = { dx, dy }
  }, [])

  const handleTogglePause = useCallback(() => {
    const state = gameRef.current.togglePause()
    setIsPaused(state.isPaused)
  }, [])

  const handleReset = useCallback(() => {
    const state = gameRef.current.reset()
    setIsPaused(state.isPaused)
  }, [])

  const handleAttack = useCallback(() => {
    gameRef.current.attack()
  }, [])

  // Pass current joystick direction so dash uses what the player is holding;
  // WorldGame falls back to velocity / last facing if it's neutral.
  const handleDash = useCallback(() => {
    const { dx, dy } = inputRef.current
    gameRef.current.dash(dx, dy)
  }, [])

  const handleUltimate = useCallback(() => {
    gameRef.current.ultimate()
  }, [])

  // Loadout slots dispatch through a single callback — ControlPanel and
  // useDesktopInput both call this.
  const handleCastSlot = useCallback((slotIndex: number) => {
    gameRef.current.castSlot(slotIndex)
  }, [])

  // Activity button labels — both Trial and Survival are context-sensitive:
  // start when idle, abort during a run, return after completion. They share
  // the same activityState so only one can be active at a time.
  const [trialLabel, setTrialLabel] = useState('Trial')
  const [survivalLabel, setSurvivalLabel] = useState('Survive')
  const handleTrialToggle = useCallback(() => {
    const s = gameRef.current.getState()
    if (s.activityState.kind === 'idle') gameRef.current.startTrial()
    else if (s.activityState.kind === 'running') gameRef.current.abortActivity()
    else gameRef.current.returnFromActivity()
  }, [])
  const handleSurvivalToggle = useCallback(() => {
    const s = gameRef.current.getState()
    if (s.activityState.kind === 'idle') gameRef.current.startSurvival()
    else if (s.activityState.kind === 'running') gameRef.current.abortActivity()
    else gameRef.current.returnFromActivity()
  }, [])

  const openModalPaused = useCallback((setVisible: (v: boolean) => void) => {
    wasPausedBeforeModal.current = gameRef.current.getState().isPaused
    if (!wasPausedBeforeModal.current) {
      const state = gameRef.current.togglePause()
      setIsPaused(state.isPaused)
    }
    setVisible(true)
  }, [])

  const closeModalPaused = useCallback((setVisible: (v: boolean) => void) => {
    setVisible(false)
    if (!wasPausedBeforeModal.current && gameRef.current.getState().isPaused) {
      const state = gameRef.current.togglePause()
      setIsPaused(state.isPaused)
    }
  }, [])

  const handleOpenInventory = useCallback(() => openModalPaused(setInventoryVisible), [openModalPaused])
  const handleCloseInventory = useCallback(() => closeModalPaused(setInventoryVisible), [closeModalPaused])
  const handleOpenSkills = useCallback(() => openModalPaused(setSkillsVisible), [openModalPaused])
  const handleCloseSkills = useCallback(() => closeModalPaused(setSkillsVisible), [closeModalPaused])
  const handleOpenBlacksmith = useCallback(() => openModalPaused(setBlacksmithVisible), [openModalPaused])
  const handleCloseBlacksmith = useCallback(() => closeModalPaused(setBlacksmithVisible), [closeModalPaused])
  const handleOpenBests = useCallback(() => openModalPaused(setBestsVisible), [openModalPaused])
  const handleCloseBests = useCallback(() => closeModalPaused(setBestsVisible), [closeModalPaused])

  // Proximity-triggered NPC interaction. Dispatches to whichever modal the
  // nearest NPC owns. Currently only blacksmith exists; switch grows when
  // we add merchants, quest-givers, etc.
  const handleTalk = useCallback(() => {
    const type = gameRef.current.interactWithNearbyNpc()
    if (type === 'blacksmith') handleOpenBlacksmith()
  }, [handleOpenBlacksmith])

  useEffect(() => {
    const id = setInterval(() => {
      const s = gameRef.current.getState()
      setUnspentPoints(s.skillPoints)
      // Only the running activity's chip flips to "Abort"; the other one
      // greys out via "—" since you can't start a second activity while one
      // is running. After completion, only the chip that owns the activity
      // shows "Return".
      const inTrial    = s.activityState.kind !== 'idle' && s.activityState.activityId === 'trial'
      const inSurvival = s.activityState.kind !== 'idle' && s.activityState.activityId === 'survival'
      setTrialLabel(
        inTrial
          ? (s.activityState.kind === 'running' ? 'Abort' : 'Return')
          : (s.activityState.kind === 'idle' ? 'Trial' : '—')
      )
      setSurvivalLabel(
        inSurvival
          ? (s.activityState.kind === 'running' ? 'Abort' : 'Return')
          : (s.activityState.kind === 'idle' ? 'Survive' : '—')
      )
    }, 250)
    return () => clearInterval(id)
  }, [])

  // One-time async boot: hydrate the loadout + difficulty tier from storage
  // if a previous session saved them. No-op if nothing stored — defaults stay.
  useEffect(() => {
    void gameRef.current.loadStoredLoadout()
    void gameRef.current.loadStoredDifficultyTier()
    void gameRef.current.loadStoredMaterials()
    void gameRef.current.loadStoredInventory()
    void gameRef.current.loadStoredEquipped()
  }, [])

  // Desktop input — keyboard + mouse on web. No-op on native. Reuses the same
  // inputRef the touch joystick writes to, so the rAF loop downstream doesn't
  // care which input modality produced the (dx, dy).
  useDesktopInput({
    game: gameRef.current,
    inputRef,
    onPause: handleTogglePause,
    onMap: () => setMapVisible(true),
    onInventory: handleOpenInventory,
    onSkills: handleOpenSkills,
    onTrial: handleTrialToggle,
    onReset: handleReset,
    onTalk: handleTalk,
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <WorldCanvas
          game={gameRef.current}
          inputRef={inputRef}
          onViewportSize={() => {}}
        />
        <Hud game={gameRef.current} onTalk={handleTalk} />
        <FloatingJoystick onMove={handleMoveContinuous} />
        <View style={styles.controls}>
          <ControlPanel
            game={gameRef.current}
            onTogglePause={handleTogglePause}
            onReset={handleReset}
            onMap={() => setMapVisible(true)}
            onAttack={handleAttack}
            onDash={handleDash}
            onUltimate={handleUltimate}
            onCastSlot={handleCastSlot}
            onInventory={handleOpenInventory}
            onSkills={handleOpenSkills}
            onBlacksmith={handleOpenBlacksmith}
            onBests={handleOpenBests}
            onTrialToggle={handleTrialToggle}
            trialButtonLabel={trialLabel}
            onSurvivalToggle={handleSurvivalToggle}
            survivalButtonLabel={survivalLabel}
            hasUnspentPoints={unspentPoints > 0}
            isPaused={isPaused}
          />
        </View>
        <MapOverlay
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          game={gameRef.current}
        />
        <InventoryScreen
          game={gameRef.current}
          visible={inventoryVisible}
          onClose={handleCloseInventory}
        />
        <SkillTreeScreen
          game={gameRef.current}
          visible={skillsVisible}
          onClose={handleCloseSkills}
        />
        <BlacksmithScreen
          game={gameRef.current}
          visible={blacksmithVisible}
          onClose={handleCloseBlacksmith}
        />
        <PersonalBestsScreen
          game={gameRef.current}
          visible={bestsVisible}
          onClose={handleCloseBests}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  // Anchored bottom-right only — the floating joystick owns bottom-left.
  controls: { position: 'absolute', bottom: 0, right: 0 },
})
