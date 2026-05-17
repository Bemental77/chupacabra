import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Platform-aware persistence wrapper. Web uses `localStorage` (synchronous
// under the hood, wrapped in a resolved Promise for a unified async API).
// Native uses `AsyncStorage`. All callers should `await` even on web — the
// shape is identical and that's the only way to keep the code path the same.
//
// Keep keys namespaced with the `chupacabra:` prefix (project_persistence_layer
// memory). All writes are best-effort: a quota error or unavailable storage
// must not crash the game.

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    }
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      } catch {}
      return
    }
    try {
      await AsyncStorage.setItem(key, value)
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
      } catch {}
      return
    }
    try {
      await AsyncStorage.removeItem(key)
    } catch {}
  },
}
