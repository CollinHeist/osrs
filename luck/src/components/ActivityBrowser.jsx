import { useMemo } from 'react'
import ActivityCard from './ActivityCard'

function byName(left, right) {
  return left.name.localeCompare(right.name)
}

export default function ActivityBrowser({
  activities,
  getProgress,
  searchQuery,
  onSearchChange,
  groupByCategory,
  onGroupByCategoryChange,
  onOpen,
}) {
  const activityGroups = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    const matches = activities
      .filter((activity) => activity.name.toLocaleLowerCase().includes(query))
      .sort(byName)
    if (!groupByCategory) return [{ category: null, activities: matches }]

    const grouped = matches.reduce((groups, activity) => {
      const category = activity.category || 'Other'
      groups.set(category, [...(groups.get(category) ?? []), activity])
      return groups
    }, new Map())
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, groupedActivities]) => ({ category, activities: groupedActivities }))
  }, [activities, groupByCategory, searchQuery])

  return (
    <>
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
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label className="group-control">
          <span>Display</span>
          <select
            value={groupByCategory ? 'category' : 'list'}
            onChange={(event) => onGroupByCategoryChange(event.target.value === 'category')}
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
                progress={getProgress(activity.id)}
                onOpen={() => onOpen(activity.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
