import { describe, expect, it } from 'vitest'
import {
  buildTempleDiff,
  countSelected,
  defaultSelection,
  parseCollectionLog,
  parsePlayerStats,
  selectedChanges,
  templeUrls,
} from './temple'

const activities = [
  {
    id: 'abyssal-sire',
    name: 'Abyssal Sire',
    temple: { category: 'abyssal_sire', kc: 'Abyssal Sire' },
    drops: [
      { id: 'bludgeon-piece', name: 'Bludgeon piece', templeItemIds: [13274, 13275, 13276] },
      { id: 'abyssal-head', name: 'Abyssal head' },
      { id: 'abyssal-dagger', name: 'Abyssal dagger' },
      { id: 'abyssal-orphan', name: 'Abyssal orphan' },
    ],
  },
  {
    id: 'king-black-dragon',
    name: 'King Black Dragon',
    temple: { category: 'king_black_dragon', kc: 'King Black Dragon' },
    drops: [
      { id: 'dragon-pickaxe', name: 'Dragon pickaxe' },
      { id: 'granite-maul', name: 'Granite maul', templeItemIds: [] },
    ],
  },
  { id: 'small-salvage', name: 'Small Salvage', drops: [{ id: 'rusty-locket', name: 'Rusty locket' }] },
]

const logResponse = {
  data: {
    player: 'mikael',
    player_name_with_capitalization: 'Mikael',
    last_checked: '2026-09-30 14:13:57',
    items: {
      abyssal_sire: [
        { id: 13274, count: 2, name: 'Bludgeon spine' },
        { id: 13275, count: 1, name: 'Bludgeon claw' },
        { id: 7979, count: 1, name: 'Abyssal head' },
        { id: 13262, count: 1, name: 'Abyssal orphan' },
      ],
      all_pets: [{ id: 13262, count: 1, name: 'Abyssal orphan' }],
      king_black_dragon: [{ id: 11920, count: 1, name: 'Dragon pickaxe' }],
      kalphite_queen: [{ id: 11920, count: 1, name: 'Dragon pickaxe' }],
    },
  },
}

const statsResponse = {
  data: {
    info: { Username: 'Mikael', 'Last checked': '2026-10-04 17:45:21' },
    'Abyssal Sire': 50,
    'Abyssal Sire_ehb': 1.5,
    'King Black Dragon': 26,
  },
}

describe('TempleOSRS parsing', () => {
  it('builds encoded request URLs', () => {
    const urls = templeUrls(' Lynx Titan ')
    expect(urls.collectionLog).toContain('player=Lynx%20Titan&categories=all&includenames=1')
    expect(urls.playerStats).toContain('player_stats.php?player=Lynx%20Titan&bosses=1')
  })

  it('reports TempleOSRS errors and invalid JSON', () => {
    const error = JSON.stringify({ error: { Code: 402, Message: 'Player has not synced.' } })
    expect(() => parseCollectionLog(error)).toThrow('Player has not synced.')
    expect(() => parsePlayerStats('{nope')).toThrow('not valid JSON')
    expect(() => parsePlayerStats({ data: {} })).toThrow('no player info')
  })

  it('reads collection log items and kill counts', () => {
    const log = parseCollectionLog(JSON.stringify(logResponse))
    expect(log.player).toBe('Mikael')
    expect(log.items.abyssal_sire).toHaveLength(4)

    const stats = parsePlayerStats(statsResponse)
    expect(stats.player).toBe('Mikael')
    expect(stats.kc['Abyssal Sire']).toBe(50)
  })
})

describe('TempleOSRS diff', () => {
  const log = parseCollectionLog(logResponse)
  const stats = parsePlayerStats(statsResponse)

  it('compares counts against tracker progress', () => {
    const state = {
      activities: {
        'abyssal-sire': {
          count: 60,
          drops: { 'abyssal-head': [{ id: 'a', at: 10 }], 'abyssal-dagger': [{ id: 'b', at: 20 }] },
        },
      },
    }
    const diff = buildTempleDiff(activities, state, log, stats)
    const sire = diff.changes.find((change) => change.activityId === 'abyssal-sire')

    expect(sire.kc).toEqual({ current: 60, incoming: 50, status: 'conflict' })
    expect(sire.drops).toEqual([
      { dropId: 'bludgeon-piece', name: 'Bludgeon piece', current: 0, incoming: 3, status: 'add', shared: false },
      { dropId: 'abyssal-dagger', name: 'Abyssal dagger', current: 1, incoming: 0, status: 'conflict', shared: false },
      { dropId: 'abyssal-orphan', name: 'Abyssal orphan', current: 0, incoming: 1, status: 'add', shared: false },
    ])
    expect(diff.changes.some((change) => change.activityId === 'small-salvage')).toBe(false)
  })

  it('flags shared items and untracked drops', () => {
    const diff = buildTempleDiff(activities, { activities: {} }, log, stats)
    const kbd = diff.changes.find((change) => change.activityId === 'king-black-dragon')

    expect(kbd.kc).toMatchObject({ current: 0, incoming: 26, status: 'add' })
    expect(kbd.drops.find((row) => row.dropId === 'dragon-pickaxe')).toMatchObject({ status: 'add', shared: true })
    expect(kbd.drops.find((row) => row.dropId === 'granite-maul')).toMatchObject({ status: 'missing' })
  })

  it('warns when the two pastes are for different players', () => {
    const other = { ...stats, player: 'Zezima' }
    expect(buildTempleDiff(activities, { activities: {} }, log, other).warnings).toHaveLength(1)
  })

  it('selects safe additions by default and builds the change list', () => {
    const { changes } = buildTempleDiff(activities, { activities: {} }, log, stats)
    const selection = defaultSelection(changes)

    expect(selectedChanges(changes, selection)).toEqual([
      {
        activityId: 'abyssal-sire',
        kc: 50,
        drops: [
          { dropId: 'bludgeon-piece', add: 3 },
          { dropId: 'abyssal-head', add: 1 },
          { dropId: 'abyssal-orphan', add: 1 },
        ],
      },
      { activityId: 'king-black-dragon', kc: 26, drops: [] },
    ])
    expect(countSelected(changes, selection)).toBe(5)
  })
})
