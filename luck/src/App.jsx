import { useEffect, useMemo, useState } from 'react'
import ActivityCard from './components/ActivityCard'
import ActivityDetail from './components/ActivityDetail'
import ImportExport from './components/ImportExport'
import { useLuckTracker } from './hooks/useLuckTracker'

function activityIdFromHash() {
  return decodeURIComponent(window.location.hash.replace(/^#activity=/, ''))
}

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(activityIdFromHash);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const tracker = useLuckTracker();

  useEffect(() => {
    let active = true
    fetch('./data/activities.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`)
        return response.json()
      })
      .then((value) => {
        if (active) setCatalog(value)
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Could not load the activity catalog.')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setSelectedId(activityIdFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const selectedActivity = useMemo(
    () => catalog?.activities.find((activity) => activity.id === selectedId),
    [catalog, selectedId],
  )
  const activityGroups = useMemo(() => {
    if (!catalog) return []
    const query = searchQuery.trim().toLocaleLowerCase()
    const activities = catalog.activities.filter((activity) => (
      activity.name.toLocaleLowerCase().includes(query)
    ))
    if (!groupByCategory) {
      return [{
        category: null,
        activities: activities.sort((left, right) => left.name.localeCompare(right.name)),
      }]
    }

    const grouped = activities.reduce((groups, activity) => {
      const category = activity.category || 'Other'
      groups.set(category, [...(groups.get(category) ?? []), activity])
      return groups
    }, new Map())
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, groupedActivities]) => ({
        category,
        activities: groupedActivities,
      }))
  }, [catalog, groupByCategory, searchQuery])

  function selectActivity(activityId) {
    history.pushState(
      '',
      document.title,
      `#activity=${encodeURIComponent(activityId)}`,
    )
    setSelectedId(activityId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showDashboard() {
    history.pushState('', document.title, `${window.location.pathname}${window.location.search}`)
    setSelectedId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="../" className="home-link">← OSRS Tools</a>
        <span className="brand">Luck Tracker</span>
        <ImportExport state={tracker.state} onImport={tracker.importState} />
      </header>

      <main>
        {loadError && (
          <div className="load-state error">
            <h1>Could not load activities</h1>
            <p>{loadError}</p>
          </div>
        )}

        {!catalog && !loadError && (
          <div className="load-state">Loading activity catalog…</div>
        )}

        {catalog && selectedActivity && (
          <ActivityDetail
            activity={selectedActivity}
            progress={tracker.getProgress(selectedActivity.id)}
            onBack={showDashboard}
            onUpdate={(patch) => tracker.updateProgress(selectedActivity.id, patch)}
            onAddDrop={(dropId, at) => tracker.addDrop(selectedActivity.id, dropId, at)}
            onRemoveDrop={(dropId, entryId) => (
              tracker.removeDrop(selectedActivity.id, dropId, entryId)
            )}
            onReset={() => tracker.resetActivity(selectedActivity.id)}
          />
        )}

        {catalog && !selectedActivity && (
          <>
            <section className="dashboard-hero">
              <div className="eyebrow">Old School RuneScape</div>
              <h1>How lucky are you, really?</h1>
              <p>
                Log every unique, measure your dry streaks, and estimate the grind
                left between you and the green log.
              </p>
            </section>

            {selectedId && (
              <aside className="rate-note">
                That activity is not in this catalog. Showing all activities instead.
              </aside>
            )}

            <div className="section-heading">
              <div>
                <div className="eyebrow">Your grinds</div>
                <h2>Choose an activity</h2>
              </div>
              <p>Progress stays in this browser. Export a backup whenever you like.</p>
            </div>

            <section className="dashboard-controls" aria-label="Activity list controls">
              <label className="search-control">
                <span>Search activities</span>
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Tempoross, Zulrah…"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <label className="group-control">
                <span>Display</span>
                <select
                  value={groupByCategory ? 'category' : 'list'}
                  onChange={(event) => setGroupByCategory(event.target.value === 'category')}
                >
                  <option value="list">Single list</option>
                  <option value="category">Group by category</option>
                </select>
              </label>
            </section>

            {activityGroups.every((group) => group.activities.length === 0) ? (
              <div className="empty-activities">
                No activities match “{searchQuery.trim()}”.
              </div>
            ) : activityGroups.map((group) => (
              <section className="activity-section" key={group.category || 'all'}>
                {group.category && (
                  <div className="category-heading">
                    <h3>{group.category}</h3>
                    <span>{group.activities.length}</span>
                  </div>
                )}
                <div className="activity-grid">
                  {group.activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      progress={tracker.getProgress(activity.id)}
                      onOpen={() => selectActivity(activity.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            <footer className="method-note">
              <strong>How the math works</strong>
              <p>
                Item dryness is the chance of going at least as many eligible rolls
                without that drop. Overall luck is the chance a fresh player would
                have every tracked unique by your count. Exclusive loot tables are
                calculated as exclusive outcomes, not independent drops.
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
