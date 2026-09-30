import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'osrs.luckTracker.v1'
const STORAGE_VERSION = 2
const DEFAULT_MODE_ID = 'default'

function emptyState() {
  return { version: STORAGE_VERSION, activities: {} }
}

function normalizeEntry(entry) {
  if (entry?.at === null || entry?.at === undefined || entry?.at === '') {
    return {
      id: String(entry?.id || crypto.randomUUID()),
      at: null,
    }
  }
  const at = Math.floor(Number(entry?.at))
  if (!Number.isInteger(at) || at < 1) return null
  return {
    id: String(entry?.id || crypto.randomUUID()),
    at,
  }
}

function toCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function normalizeCounts(progress) {
  // Version 1 progress stored a single count, which belongs to the default mode.
  if (!progress?.counts || typeof progress.counts !== 'object') {
    return { [DEFAULT_MODE_ID]: toCount(progress?.count) }
  }
  const counts = {}
  for (const [modeId, value] of Object.entries(progress.counts)) {
    counts[modeId] = toCount(value)
  }
  return counts
}

export function normalizeProgress(progress) {
  const counts = normalizeCounts(progress)
  const minutes = Number(progress?.minutesPerUnit)
  const drops = {}

  for (const [dropId, entries] of Object.entries(progress?.drops ?? {})) {
    if (!Array.isArray(entries)) continue
    drops[dropId] = entries.map(normalizeEntry).filter(Boolean)
  }
  const latestDrop = Object.values(drops)
    .flat()
    .reduce((latest, entry) => Math.max(latest, entry.at ?? 0), 0)

  // Recorded drops can never be later than the total count, so any shortfall
  // is attributed to the default mode.
  const entered = Object.values(counts).reduce((sum, value) => sum + value, 0)
  if (latestDrop > entered) {
    counts[DEFAULT_MODE_ID] = (counts[DEFAULT_MODE_ID] ?? 0) + latestDrop - entered
  }

  return {
    counts,
    count: Math.max(entered, latestDrop),
    plannedMode: typeof progress?.plannedMode === 'string' ? progress.plannedMode : DEFAULT_MODE_ID,
    minutesPerUnit: Number.isFinite(minutes) && minutes >= 0 ? minutes : 0,
    drops,
  }
}

export function normalizeState(value) {
  if (!value || typeof value !== 'object') return emptyState()
  const activities = {}
  for (const [activityId, progress] of Object.entries(value.activities ?? {})) {
    activities[activityId] = normalizeProgress(progress)
  }
  return { version: STORAGE_VERSION, activities }
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)))
  } catch {
    return emptyState()
  }
}

export function mergeStates(current, incoming) {
  const merged = normalizeState(current)

  for (const [activityId, incomingProgress] of Object.entries(incoming.activities)) {
    const existing = merged.activities[activityId]
    if (!existing) {
      merged.activities[activityId] = incomingProgress
      continue
    }

    const drops = { ...existing.drops }
    for (const [dropId, incomingEntries] of Object.entries(incomingProgress.drops)) {
      const entriesById = new Map(
        [...(drops[dropId] ?? []), ...incomingEntries].map((entry) => [entry.id, entry]),
      )
      drops[dropId] = [...entriesById.values()]
    }

    const counts = { ...existing.counts }
    for (const [modeId, value] of Object.entries(incomingProgress.counts)) {
      counts[modeId] = Math.max(counts[modeId] ?? 0, value)
    }

    merged.activities[activityId] = normalizeProgress({
      counts,
      plannedMode: incomingProgress.plannedMode,
      minutesPerUnit: incomingProgress.minutesPerUnit || existing.minutesPerUnit,
      drops,
    })
  }

  return merged
}

export function useLuckTracker() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const getProgress = useCallback((activityId) => (
    state.activities[activityId] ?? normalizeProgress()
  ), [state.activities])

  const updateProgress = useCallback((activityId, patch) => {
    setState((current) => {
      const existing = current.activities[activityId] ?? normalizeProgress()
      return {
        ...current,
        activities: {
          ...current.activities,
          [activityId]: normalizeProgress({ ...existing, ...patch }),
        },
      }
    })
  }, [])

  const addDrop = useCallback((activityId, dropId, at) => {
    setState((current) => {
      const existing = current.activities[activityId] ?? normalizeProgress()
      const entries = existing.drops[dropId] ?? []
      return {
        ...current,
        activities: {
          ...current.activities,
          [activityId]: {
            ...existing,
            drops: {
              ...existing.drops,
              [dropId]: [...entries, { id: crypto.randomUUID(), at }],
            },
          },
        },
      }
    })
  }, [])

  const removeDrop = useCallback((activityId, dropId, entryId) => {
    setState((current) => {
      const existing = current.activities[activityId] ?? normalizeProgress()
      return {
        ...current,
        activities: {
          ...current.activities,
          [activityId]: {
            ...existing,
            drops: {
              ...existing.drops,
              [dropId]: (existing.drops[dropId] ?? [])
                .filter((entry) => entry.id !== entryId),
            },
          },
        },
      }
    })
  }, [])

  const importState = useCallback((rawValue, mode) => {
    const incoming = normalizeState(rawValue)
    setState((current) => (
      mode === 'replace' ? incoming : mergeStates(current, incoming)
    ))
  }, [])

  const resetActivity = useCallback((activityId) => {
    setState((current) => {
      const activities = { ...current.activities }
      delete activities[activityId]
      return { ...current, activities }
    })
  }, [])

  return {
    state,
    getProgress,
    updateProgress,
    addDrop,
    removeDrop,
    importState,
    resetActivity,
  }
}

export function createExport(state) {
  return {
    app: 'osrs-luck-tracker',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    ...normalizeState(state),
  }
}
