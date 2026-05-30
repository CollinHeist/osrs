import { useMemo, useState } from "react";
import { fmtInt, fmtGp, fmtHours } from "../lib/format.js";
import { RECOMMENDATION_LABELS } from "../lib/constants.js";
import { EditIcon, TrashIcon } from "./Icons.jsx";

const REC_PRIORITY = { "extend-speedup": 5, extend: 4, speedup: 3, keep: 2, skip: 1 };

const GROUP_SORT_OPTIONS = [
  { id: "name", label: "Monster Name" },
  { id: "bestXp", label: "Best XP/hr" },
  { id: "bestGp", label: "Best GP/hr" },
];

/** Return the best recommendation across tasks in the group (highest priority). */
function bestRec(groupTasks) {
  let best = null;
  let bestScore = -1;
  for (const t of groupTasks) {
    const rec = t.recommendation?.type ?? "keep";
    const score = REC_PRIORITY[rec] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = rec;
    }
  }
  return best;
}

/**
 * @param {{
 *   tasks: any[];
 *   selectedId: string | null;
 *   onSelect: (id: string) => void;
 *   onEdit: (task: object) => void;
 *   onDelete: (id: string) => void;
 * }} props
 */
export function TaskList({ tasks, selectedId, onSelect, onEdit, onDelete }) {
  const [groupSort, setGroupSort] = useState("name");

  const grouped = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      const key = task.monsterName || "Unknown Monster";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }

    const groups = [...map.entries()].map(([name, groupTasks]) => {
      // Sort tasks within group: newest first
      const sorted = [...groupTasks].sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      );
      const bestXp = Math.max(0, ...groupTasks.map((t) => t.slayerXpPerHour || 0));
      const bestGp = Math.max(
        -Infinity,
        ...groupTasks.map((t) => t.metrics?.gpPerHour ?? -Infinity)
      );
      const rec = bestRec(groupTasks);
      return { name, tasks: sorted, bestXp, bestGp, rec };
    });

    // Sort groups
    groups.sort((a, b) => {
      if (groupSort === "bestXp") return b.bestXp - a.bestXp;
      if (groupSort === "bestGp") return b.bestGp - a.bestGp;
      return a.name.localeCompare(b.name);
    });

    return groups;
  }, [tasks, groupSort]);

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <p>No tasks logged yet. Click <strong>+ Log Task</strong> to get started.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-toolbar">
        <span className="toolbar-label">Group sort:</span>
        {GROUP_SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`tab-btn${groupSort === opt.id ? " tab-btn--active" : ""}`}
            onClick={() => setGroupSort(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="task-groups">
        {grouped.map((group) => (
          <div key={group.name} className="task-group">
            {/* Group header */}
            <div className="task-group-header">
              <div className="task-group-title">
                {group.rec && (
                  <span className={`badge badge-${group.rec}`}>
                    {RECOMMENDATION_LABELS[group.rec] ?? group.rec}
                  </span>
                )}
                <strong className="task-group-name">{group.name}</strong>
                <span className="task-group-count muted">
                  {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="task-group-meta muted">
                <span>Best XP: {fmtInt(group.bestXp)}/hr</span>
                {group.bestGp !== -Infinity && (
                  <span>
                    Best GP:{" "}
                    <span className={group.bestGp >= 0 ? "positive-num" : "negative-num"}>
                      {fmtGp(group.bestGp)}/hr
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Task rows */}
            {group.tasks.map((task) => {
              const rec = task.recommendation?.type;
              const isSelected = task.id === selectedId;
              return (
                <div
                  key={task.id}
                  className={`task-row${isSelected ? " task-row--selected" : ""}`}
                  onClick={() => onSelect(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(task.id)}
                >
                  <div className="task-row-left">
                    <div className="task-row-tags">
                      {rec && (
                        <span className={`badge badge-sm badge-${rec}`}>
                          {RECOMMENDATION_LABELS[rec] ?? rec}
                        </span>
                      )}
                      {task.useCannon && (
                        <span className="cannon-badge">Cannon</span>
                      )}
                    </div>
                    <div className="task-row-meta">
                      {task.location && (
                        <span className="task-row-location" title="Location">
                          📍 {task.location}
                        </span>
                      )}
                      <span className="task-row-master muted">{task.slayerMaster}</span>
                      <span className="task-row-length muted">
                        {fmtInt(task.taskLength)} kills
                      </span>
                    </div>
                  </div>

                  <div className="task-row-metrics">
                    <div className="task-row-metric">
                      <span className="metric-label">KC/hr</span>
                      <span className="metric-val">{fmtInt(task.kcPerHour)}</span>
                    </div>
                    <div className="task-row-metric">
                      <span className="metric-label">XP/hr</span>
                      <span className="metric-val accent-num">
                        {fmtInt(task.slayerXpPerHour)}
                      </span>
                    </div>
                    <div className="task-row-metric">
                      <span className="metric-label">GP/hr</span>
                      <span
                        className={`metric-val ${
                          task.metrics
                            ? task.metrics.gpPerHour >= 0
                              ? "positive-num"
                              : "negative-num"
                            : ""
                        }`}
                      >
                        {task.metrics ? fmtGp(task.metrics.gpPerHour) : "—"}
                      </span>
                    </div>
                    <div className="task-row-metric">
                      <span className="metric-label">Time</span>
                      <span className="metric-val muted">
                        {task.metrics ? fmtHours(task.metrics.timeHours) : "—"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="task-row-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn-icon btn-icon-edit"
                      title="Edit task"
                      onClick={() => onEdit(task)}
                    >
                      <EditIcon size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-icon-delete"
                      title="Delete task"
                      onClick={() => {
                        if (window.confirm(`Delete task for ${task.monsterName}?`)) {
                          onDelete(task.id);
                        }
                      }}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
