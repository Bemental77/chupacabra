import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { WorldGame } from '../game/WorldGame'

// Desktop input layer. Mounts keyboard + mouse listeners on `document` only on
// web; mobile native is a no-op. Writes to the same `inputRef = {dx, dy}` the
// touch joystick uses, so the rAF loop in WorldCanvas is input-agnostic.
//
// Movement: WASD or arrow keys, normalized so diagonals aren't faster.
// Attack:   F or mouse left-click on the game canvas.
// Smash:    Q or mouse right-click on the game canvas.
// Dash:     Space (direction = current input or last facing).
// Skills:   1-4 = loadout slots (configurable in the Skills tab). R = Ultimate.
// Talk:     E (only fires when standing next to an interactable NPC).
// Modals:   M=Map, B=Bag, K=Skills, T=Trial, R=Reset.
// Pause:    Esc or P.
//
// Action keys ignore key-repeat (we don't want holding F to bypass cooldown).
// Movement keys recompute the input vector on every keydown/keyup. Window blur
// clears the keys map so a held key doesn't strand the player.

export interface DesktopInputCallbacks {
  game: WorldGame
  inputRef: React.MutableRefObject<{ dx: number; dy: number }>
  onPause: () => void
  onMap: () => void
  onInventory: () => void
  onSkills: () => void
  onTrial: () => void
  onReset: () => void
  onTalk: () => void
}

const MOVEMENT_KEYS = new Set([
  'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
])

export function useDesktopInput(cb: DesktopInputCallbacks): void {
  // onReset stays on the interface (callers pass it) but isn't bound to a key
  // — destructive actions deserve an explicit chip tap.
  const { game, inputRef, onPause, onMap, onInventory, onSkills, onTrial, onTalk } = cb
  const keysRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (typeof document === 'undefined') return
    const keys = keysRef.current

    const recomputeMovement = () => {
      const left  = (keys['a'] || keys['A'] || keys['ArrowLeft'])  ? 1 : 0
      const right = (keys['d'] || keys['D'] || keys['ArrowRight']) ? 1 : 0
      const up    = (keys['w'] || keys['W'] || keys['ArrowUp'])    ? 1 : 0
      const down  = (keys['s'] || keys['S'] || keys['ArrowDown'])  ? 1 : 0
      let dx = right - left
      let dy = down - up
      const len = Math.hypot(dx, dy)
      if (len > 1) { dx /= len; dy /= len }
      inputRef.current = { dx, dy }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key
      // Prevent default early for keys we know we own — Space scrolls, arrows
      // scroll, /-key opens browser find on some platforms.
      if (MOVEMENT_KEYS.has(k) || k === ' ') e.preventDefault()
      if (e.repeat) {
        // Movement keys are already in `keys`; action keys would double-fire.
        return
      }
      keys[k] = true

      switch (k) {
        case ' ':
          game.dash(inputRef.current.dx, inputRef.current.dy)
          break
        case 'f': case 'F':
          game.attack()
          break
        case 'q': case 'Q':
          game.spender()
          break
        case '1': game.castSlot(0); break
        case '2': game.castSlot(1); break
        case '3': game.castSlot(2); break
        case '4': game.castSlot(3); break
        case 'r': case 'R':
          game.ultimate()
          break
        case 'p': case 'P': case 'Escape':
          onPause()
          break
        case 'm': case 'M': onMap();        break
        case 'b': case 'B': onInventory();  break
        case 'k': case 'K': onSkills();     break
        case 't': case 'T': onTrial();      break
        case 'e': case 'E': onTalk();       break
        // Reset is intentionally NOT bound to a hotkey — it wipes the entire
        // run (clearing inventory + level + skills) and one-tap rebinds for
        // destructive actions are a trap. Bind via the chip button instead.
      }
      if (MOVEMENT_KEYS.has(k)) recomputeMovement()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false
      if (MOVEMENT_KEYS.has(e.key)) recomputeMovement()
    }

    // Only treat clicks ON THE GAME CANVAS as combat input. Clicks on
    // ControlPanel buttons and modals bubble to document too, so we filter on
    // the target's tagName — Skia renders to a <canvas> element on web.
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || target.tagName !== 'CANVAS') return
      if (e.button === 0) {
        game.attack()
      } else if (e.button === 2) {
        e.preventDefault()
        game.spender()
      }
    }

    const onContextMenu = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'CANVAS') e.preventDefault()
    }

    // Clear held keys when the tab loses focus so a held W doesn't strand the
    // player after a window switch.
    const onBlur = () => {
      for (const k of Object.keys(keys)) keys[k] = false
      recomputeMovement()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('blur', onBlur)
    }
  }, [game, inputRef, onPause, onMap, onInventory, onSkills, onTrial, onTalk])
}
