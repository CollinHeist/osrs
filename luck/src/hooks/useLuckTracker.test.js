import { describe, expect, it } from 'vitest'
import { mergeStates, normalizeProgress, normalizeState } from './useLuckTracker'

describe('progress storage', () => {
  it('migrates a version 1 count into the default mode', () => {
    const state = normalizeState({
      version: 1,
      activities: { araxxor: { count: 120, minutesPerUnit: 2, drops: {} } },
    })
    expect(state.version).toBe(2)
    expect(state.activities.araxxor).toMatchObject({
      counts: { default: 120 },
      count: 120,
      plannedMode: 'default',
    })
  })

  it('derives the total count and attributes missing kills to the default mode', () => {
    const progress = normalizeProgress({
      counts: { default: 10, destroyed: 5 },
      drops: { nid: [{ id: 'a', at: 30 }] },
    })
    expect(progress.counts).toEqual({ default: 25, destroyed: 5 })
    expect(progress.count).toBe(30)
  })

  it('merges imports using the larger count for each mode', () => {
    const current = {
      activities: { araxxor: { counts: { default: 100, destroyed: 10 }, drops: {} } },
    }
    const incoming = normalizeState({
      activities: {
        araxxor: { counts: { default: 80, destroyed: 40 }, plannedMode: 'destroyed', drops: {} },
      },
    })
    const merged = mergeStates(current, incoming).activities.araxxor
    expect(merged.counts).toEqual({ default: 100, destroyed: 40 })
    expect(merged.count).toBe(140)
    expect(merged.plannedMode).toBe('destroyed')
  })
})
