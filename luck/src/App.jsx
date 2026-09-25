import { useEffect, useMemo, useState } from 'react'
import ActivityBrowser from './components/ActivityBrowser'
import ActivityDetail from './components/ActivityDetail'
import DashboardTabs from './components/DashboardTabs'
import ImportExport from './components/ImportExport'
import StatsView from './components/StatsView'
import { useLuckTracker } from './hooks/useLuckTracker'

const STATS_HASH = '#stats'

function activityIdFromHash() {
  if (window.location.hash === STATS_HASH) return ''
  return decodeURIComponent(window.location.hash.replace(/^#activity=/, ''))
}

function viewFromHash() {
  return window.location.hash === STATS_HASH ? 'stats' : 'activities'
}

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(activityIdFromHash);
  const [view, setView] = useState(viewFromHash);
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
    const onHashChange = () => {
      const activityId = activityIdFromHash()
      setSelectedId(activityId)
      if (!activityId) setView(viewFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [])

  const selectedActivity = useMemo(
    () => catalog?.activities.find((activity) => activity.id === selectedId),
    [catalog, selectedId],
  )

  function selectActivity(activityId) {
    history.pushState(
      '',
      document.title,
      `#activity=${encodeURIComponent(activityId)}`,
    )
    setSelectedId(activityId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showDashboard(nextView = view) {
    const hash = nextView === 'stats' ? STATS_HASH : ''
    history.pushState('', document.title, `${window.location.pathname}${window.location.search}${hash}`)
    setSelectedId('')
    setView(nextView)
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
            onBack={() => showDashboard()}
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

            <DashboardTabs view={view} onChange={showDashboard} />

            {view === 'stats' ? (
              <StatsView
                activities={catalog.activities}
                getProgress={tracker.getProgress}
                onOpen={selectActivity}
              />
            ) : (
              <ActivityBrowser
                activities={catalog.activities}
                getProgress={tracker.getProgress}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                groupByCategory={groupByCategory}
                onGroupByCategoryChange={setGroupByCategory}
                onOpen={selectActivity}
              />
            )}

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
