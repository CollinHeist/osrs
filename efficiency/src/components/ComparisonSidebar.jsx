/**
 * Sidebar list of named comparisons with add / rename / delete.
 *
 * @param {{
 *   comparisons: { id: string, name: string, options: unknown[] }[];
 *   activeId: string;
 *   onSelect: (id: string) => void;
 *   onAdd: () => void;
 *   onRename: (id: string, name: string) => void;
 *   onDelete: (id: string) => void;
 * }} props
 */
export function ComparisonSidebar({
  comparisons,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}) {
  return (
    <aside className="sidebar panel">
      <div className="panel-head">
        <h2 className="panel-title">Comparisons</h2>
        <button type="button" className="btn-primary btn-sm" onClick={onAdd}>
          + New
        </button>
      </div>
      <ul className="comparison-list">
        {comparisons.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id} className={`comparison-item${active ? " is-active" : ""}`}>
              <button
                type="button"
                className="comparison-select"
                onClick={() => onSelect(c.id)}
              >
                <span className="comparison-name">{c.name}</span>
                <span className="comparison-meta muted">
                  {c.options.length} option{c.options.length !== 1 ? "s" : ""}
                </span>
              </button>
              {active && (
                <div className="comparison-actions">
                  <input
                    className="input-inline"
                    type="text"
                    value={c.name}
                    aria-label="Rename comparison"
                    onChange={(e) => onRename(c.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    disabled={comparisons.length <= 1}
                    title={
                      comparisons.length <= 1
                        ? "Keep at least one comparison"
                        : "Delete comparison"
                    }
                    onClick={() => onDelete(c.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
