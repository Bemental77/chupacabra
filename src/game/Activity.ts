// Phase 4 endgame: bounded "activity" runs that produce a score. The first
// activity is `trial` — a maze-arena clear-all-enemies race against the clock.
// Scoreboards persist locally via `chupacabra:scores:<id>` per the persistence
// memory note. Backend leaderboards are a Phase 5 concern.

export type ActivityId = 'trial' | 'survival'

// Per-activity sort direction. Trial is a race — lower duration is better.
// Survival is hold-the-line — higher duration is better.
export const ACTIVITY_SCORE_ORDER: Record<ActivityId, 'asc' | 'desc'> = {
  trial: 'asc',
  survival: 'desc',
}

export const ACTIVITY_LABELS: Record<ActivityId, string> = {
  trial: 'Trial',
  survival: 'Survival',
}

export type ActivityState =
  | { kind: 'idle' }
  | {
      kind: 'running'
      activityId: ActivityId
      seed: number
      tier: number
      startedAt: number
      totalEnemies: number
      // World-space coordinates the player is returned to on exit.
      returnX: number
      returnY: number
    }
  | {
      kind: 'complete'
      activityId: ActivityId
      seed: number
      tier: number
      durationMs: number
      isNewBest: boolean
      placement: number
      // Same return coords — kept so the "Return" button can teleport back.
      returnX: number
      returnY: number
    }

export interface ScoreRecord {
  durationMs: number     // lower is better for time-based activities
  timestamp: number
  seed: number
  level: number
  tier: number
}

import { storage } from '../storage/storage'

const SCORE_KEY_PREFIX = 'chupacabra:scores:'
const MAX_STORED = 20

// Per-tier scoreboards live under separate keys — a tier-3 personal best
// shouldn't be shadowed by a casual tier-1 run.
function scoreKey(activityId: ActivityId, tier: number): string {
  return `${SCORE_KEY_PREFIX}${activityId}:t${tier}`
}

export async function loadScores(activityId: ActivityId, tier: number): Promise<ScoreRecord[]> {
  try {
    const raw = await storage.getItem(scoreKey(activityId, tier))
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.slice(0, MAX_STORED) as ScoreRecord[]
  } catch {
    return []
  }
}

export interface SaveResult {
  isNewBest: boolean
  placement: number  // 0-indexed; -1 if it didn't make the top
}

export async function saveScore(
  activityId: ActivityId,
  record: ScoreRecord,
): Promise<SaveResult> {
  try {
    const existing = await loadScores(activityId, record.tier)
    const order = ACTIVITY_SCORE_ORDER[activityId]
    const all = [...existing, record].sort((a, b) =>
      order === 'asc' ? a.durationMs - b.durationMs : b.durationMs - a.durationMs,
    )
    const top = all.slice(0, MAX_STORED)
    const placement = top.findIndex((r) => r.timestamp === record.timestamp)
    await storage.setItem(scoreKey(activityId, record.tier), JSON.stringify(top))
    return { isNewBest: placement === 0, placement }
  } catch {
    return { isNewBest: false, placement: -1 }
  }
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms))
  const m = Math.floor(total / 60000)
  const s = Math.floor((total % 60000) / 1000)
  const cs = Math.floor((total % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
