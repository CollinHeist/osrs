const TEMPLE_API = 'https://templeosrs.com/api'

export function templeUrls(username) {
  const player = encodeURIComponent(username.trim())
  return {
    collectionLog: `${TEMPLE_API}/collection-log/player_collection_log.php?player=${player}&categories=all&includenames=1`,
    playerStats: `${TEMPLE_API}/player_stats.php?player=${player}&bosses=1`,
  }
}

function toCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function readResponse(raw, label) {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      throw new Error(`The ${label} text is not valid JSON.`)
    }
  }
  if (value?.error) {
    throw new Error(`TempleOSRS ${label} error: ${value.error.Message || 'Unknown error.'}`)
  }
  if (!value?.data || typeof value.data !== 'object') {
    throw new Error(`That does not look like a TempleOSRS ${label} response.`)
  }
  return value.data
}

export function parseCollectionLog(raw) {
  const data = readResponse(raw, 'collection log')
  if (!data.items || typeof data.items !== 'object') {
    throw new Error('That collection log response has no items.')
  }

  const items = {}
  for (const [category, entries] of Object.entries(data.items)) {
    if (!Array.isArray(entries)) continue
    items[category] = entries
      .map((entry) => ({
        id: Number(entry?.id),
        name: String(entry?.name ?? ''),
        count: toCount(entry?.count),
      }))
      .filter((entry) => Number.isInteger(entry.id))
  }

  return {
    player: data.player_name_with_capitalization || data.player || '',
    lastChecked: data.last_checked || null,
    items,
  }
}

export function parsePlayerStats(raw) {
  const data = readResponse(raw, 'player stats')
  if (!data.info || typeof data.info !== 'object') {
    throw new Error('That player stats response has no player info.')
  }

  const kc = {}
  for (const [key, value] of Object.entries(data)) {
    const number = Number(value)
    if (key !== 'info' && value !== null && value !== '' && Number.isFinite(number)) {
      kc[key] = toCount(number)
    }
  }

  return {
    player: data.info.player_name_with_capitalization || data.info.Username || '',
    lastChecked: data.info['Last checked'] || data.date || null,
    kc,
  }
}

const SUMMARY_CATEGORIES = new Set(['all_pets', 'skilling_pets'])

function sharedItemIds(items) {
  const seen = new Set()
  const shared = new Set()
  for (const [category, entries] of Object.entries(items)) {
    if (SUMMARY_CATEGORIES.has(category)) continue
    for (const { id } of entries) {
      if (seen.has(id)) shared.add(id)
      seen.add(id)
    }
  }
  return shared
}

function compareCounts(current, incoming) {
  if (incoming > current) return 'add'
  if (incoming < current) return 'conflict'
  return 'same'
}

function dropRow(drop, categoryItems, shared, progress) {
  const current = progress.drops[drop.id]?.length ?? 0
  const base = { dropId: drop.id, name: drop.name, current }

  // An explicit empty list marks a drop the collection log does not track.
  if (Array.isArray(drop.templeItemIds) && drop.templeItemIds.length === 0) {
    return { ...base, incoming: null, status: 'missing', shared: false }
  }

  // Items absent from the response have simply not been obtained yet.
  const name = drop.name.toLowerCase()
  const matches = Array.isArray(drop.templeItemIds)
    ? categoryItems.filter((item) => drop.templeItemIds.includes(item.id))
    : categoryItems.filter((item) => item.name.toLowerCase() === name)
  const incoming = matches.reduce((sum, item) => sum + item.count, 0)

  return {
    ...base,
    incoming,
    status: compareCounts(current, incoming),
    shared: matches.some((item) => shared.has(item.id)),
  }
}

export function buildTempleDiff(activities, state, log, stats = null) {
  const warnings = []
  if (stats && log.player && stats.player
    && log.player.toLowerCase() !== stats.player.toLowerCase()) {
    warnings.push(
      `The collection log is for ${log.player} but the player stats are for ${stats.player}.`,
    )
  }

  const shared = sharedItemIds(log.items)
  const changes = []

  for (const activity of activities) {
    const categoryItems = log.items[activity.temple?.category]
    if (!categoryItems) continue
    const progress = state.activities[activity.id] ?? { count: 0, drops: {} }

    let kc = null
    const incomingKc = stats?.kc[activity.temple.kc]
    if (activity.temple.kc && incomingKc !== undefined) {
      const status = compareCounts(progress.count, incomingKc)
      if (status !== 'same') kc = { current: progress.count, incoming: incomingKc, status }
    }

    const drops = activity.drops
      .map((drop) => dropRow(drop, categoryItems, shared, progress))
      .filter((row) => row.status !== 'same')

    const hasChanges = kc || drops.some((row) => row.status !== 'missing')
    if (!hasChanges) continue

    changes.push({
      activityId: activity.id,
      name: activity.name,
      unit: activity.unit,
      kc,
      drops,
    })
  }

  return { player: log.player || stats?.player || '', lastChecked: log.lastChecked, warnings, changes }
}

export const KC_ROW = 'kc'

export function defaultSelection(changes) {
  const selection = {}
  for (const change of changes) {
    const keys = new Set()
    if (change.kc?.status === 'add') keys.add(KC_ROW)
    for (const row of change.drops) {
      if (row.status === 'add' && !row.shared) keys.add(row.dropId)
    }
    selection[change.activityId] = keys
  }
  return selection
}

export function isSelectable(row) {
  return row?.status === 'add'
}

export function selectedChanges(changes, selection) {
  const result = []
  for (const change of changes) {
    const keys = selection[change.activityId]
    if (!keys?.size) continue

    const drops = change.drops
      .filter((row) => isSelectable(row) && keys.has(row.dropId))
      .map((row) => ({ dropId: row.dropId, add: row.incoming - row.current }))
    const kc = isSelectable(change.kc) && keys.has(KC_ROW) ? change.kc.incoming : undefined

    if (kc === undefined && drops.length === 0) continue
    result.push({ activityId: change.activityId, ...(kc === undefined ? {} : { kc }), drops })
  }
  return result
}

export function countSelected(changes, selection) {
  return selectedChanges(changes, selection)
    .reduce((sum, change) => sum + change.drops.length + (change.kc === undefined ? 0 : 1), 0)
}
