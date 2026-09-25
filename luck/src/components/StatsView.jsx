import { useMemo } from 'react'
import { buildInsights } from '../lib/insights'
import { formatDuration, formatNumber, formatPercent, formatRate } from '../lib/format'
import InsightList from './InsightList'
import MetricCard from './MetricCard'

function signed(value) {
  const formatted = formatNumber(Math.abs(value), 1)
  return value >= 0 ? `+${formatted}` : `−${formatted}`
}

function dropRow(item, onOpen, value, detail) {
  return {
    key: `${item.activity.id}-${item.drop.id}`,
    imageUrl: item.drop.imageUrl,
    title: item.drop.name,
    subtitle: `${item.activity.name} · ${item.drop.rateLabel || formatRate(item.drop.rate)}`,
    value,
    detail,
    onClick: () => onOpen(item.activity.id),
  }
}

function activityRow(entry, onOpen, value, detail) {
  return {
    key: entry.activity.id,
    imageUrl: entry.activity.imageUrl,
    title: entry.activity.name,
    subtitle: `${entry.obtained}/${entry.total} uniques · ${formatNumber(entry.expected, 1)} expected`,
    value,
    detail,
    onClick: () => onOpen(entry.activity.id),
  }
}

function greenlogRow(entry, onOpen) {
  const { activity } = entry
  const units = entry.expectedUnits === null
    ? 'Very long'
    : `${formatNumber(entry.expectedUnits)} ${activity.unit.plural}`
  return {
    key: activity.id,
    imageUrl: activity.imageUrl,
    title: activity.name,
    subtitle: `${entry.missing} missing · median ${formatNumber(entry.medianUnits)} ${activity.unit.plural}`,
    value: entry.expectedHours === null ? units : formatDuration(entry.expectedHours),
    detail: entry.expectedHours === null ? 'Add a pace to rank by time' : `≈ ${units}`,
    onClick: () => onOpen(activity.id),
  }
}

export default function StatsView({ activities, getProgress, onOpen }) {
  const insights = useMemo(
    () => buildInsights(activities, getProgress),
    [activities, getProgress],
  )
  const { overview } = insights
  const uniqueDelta = overview.uniquesObtained - overview.uniquesExpected

  if (overview.activitiesStarted === 0) {
    return (
      <div className="empty-activities">
        No progress tracked yet. Log a count or a drop on any activity to see your statistics.
      </div>
    )
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">Across every grind</div>
          <h2>Your luck at a glance</h2>
        </div>
        <p>Only activities with a count or a logged drop are included.</p>
      </div>

      <section className="stats-overview" aria-label="Overall statistics">
        <MetricCard
          label="Activities started"
          value={`${overview.activitiesStarted}/${overview.activitiesTotal}`}
          detail={`${overview.greenlogs} greenlogged`}
        />
        <MetricCard
          label="Uniques logged"
          value={`${overview.uniquesObtained}/${overview.uniquesTracked}`}
          detail="First copy of each"
        />
        <MetricCard
          label="Uniques vs. rate"
          value={signed(uniqueDelta)}
          detail={`${formatNumber(overview.uniquesExpected, 1)} expected by your counts`}
          tone={uniqueDelta >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Tracked play time"
          value={overview.timedActivities ? formatDuration(overview.playHours) : '—'}
          detail={overview.timedActivities
            ? `Across ${overview.timedActivities} paced ${overview.timedActivities === 1 ? 'activity' : 'activities'}`
            : 'Add an average time to an activity'}
        />
      </section>

      <div className="insight-grid">
        <InsightList
          title="Driest items"
          description="Still missing, ranked by how rare it is to go this long without one."
          tone="unlucky"
          emptyText="Nothing is dry yet."
          rows={insights.driestItems.map((item) => dropRow(
            item,
            onOpen,
            formatPercent(item.dryChance, 2),
            `${formatNumber(item.streak)} ${item.activity.unit.plural} dry`,
          ))}
        />
        <InsightList
          title="Least dry items"
          description="First copies that came earliest relative to their drop rate."
          tone="lucky"
          emptyText="Log a drop at a known count to see your quickest finds."
          rows={insights.luckiestDrops.map((item) => dropRow(
            item,
            onOpen,
            formatPercent(item.chance, 2),
            `at ${formatNumber(item.firstAt)} ${item.activity.unit.plural}`,
          ))}
        />
        <InsightList
          title="Most spooned activities"
          description="Chance a fresh player would have at least as many uniques by your count."
          tone="lucky"
          emptyText="No activity is ahead of rate yet."
          rows={insights.luckiestActivities.map((entry) => activityRow(
            entry,
            onOpen,
            `Top ${formatPercent(entry.atLeastChance, 1, true)}`,
            `${signed(entry.obtained - entry.expected)} vs. rate`,
          ))}
        />
        <InsightList
          title="Most unlucky activities"
          description="Chance a fresh player would have this few uniques or fewer by your count."
          tone="unlucky"
          emptyText="No activity is behind rate. Enjoy it while it lasts."
          rows={insights.unluckiestActivities.map((entry) => activityRow(
            entry,
            onOpen,
            `Bottom ${formatPercent(entry.atMostChance, 1, true)}`,
            `${signed(entry.obtained - entry.expected)} vs. rate`,
          ))}
        />
        <InsightList
          title="Fastest next greenlog"
          description="Expected time to finish each log from where you are now."
          emptyText="Every started activity is already greenlogged."
          rows={insights.fastestGreenlogs.map((entry) => greenlogRow(entry, onOpen))}
        />
      </div>
    </>
  )
}
