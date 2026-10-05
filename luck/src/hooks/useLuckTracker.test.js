import { describe, expect, it } from 'vitest'
import {
  applyTempleChanges,
  mergeStates,
  normalizeProgress,
  normalizeState,
} from './useLuckTracker'

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

describe('TempleOSRS import', () => {
  it('sets the total kill count while preserving other modes', () => {
    const current = normalizeState({
      activities: { araxxor: { counts: { default: 100, destroyed: 30 }, drops: {} } },
    })
    const next = applyTempleChanges(current, [{ activityId: 'araxxor', kc: 233, drops: [] }])
    expect(next.activities.araxxor.counts).toEqual({ default: 203, destroyed: 30 })
    expect(next.activities.araxxor.count).toBe(233)
  })

  it('appends drops with unknown kill numbers without removing existing entries', () => {
    const current = normalizeState({
      activities: { zulrah: { counts: { default: 50 }, drops: { 'magic-fang': [{ id: 'a', at: 12 }] } } },
    })
    const next = applyTempleChanges(current, [
      { activityId: 'zulrah', drops: [{ dropId: 'magic-fang', add: 2 }] },
      { activityId: 'vorkath', kc: 10, drops: [{ dropId: 'vorki', add: 1 }] },
    ])

    const fangs = next.activities.zulrah.drops['magic-fang']
    expect(fangs).toHaveLength(3)
    expect(fangs[0]).toEqual({ id: 'a', at: 12 })
    expect(fangs.slice(1).every((entry) => entry.at === null)).toBe(true)
    expect(next.activities.zulrah.count).toBe(50)
    expect(next.activities.vorkath).toMatchObject({ count: 10, counts: { default: 10 } })
    expect(next.activities.vorkath.drops.vorki).toHaveLength(1)
  })
})
