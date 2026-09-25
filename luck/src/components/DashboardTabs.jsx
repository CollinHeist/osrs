const TABS = [
  { id: 'activities', label: 'Activities' },
  { id: 'stats', label: 'Statistics' },
]

export default function DashboardTabs({ view, onChange }) {
  return (
    <nav className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={view === tab.id}
          className={view === tab.id ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
