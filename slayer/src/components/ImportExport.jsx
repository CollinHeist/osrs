import { useRef, useState } from "react";

/**
 * Download all tasks as a dated JSON file.
 * @param {object[]} tasks
 */
function doExport(tasks) {
  const json = JSON.stringify(tasks, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slayer-tasks-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   tasks: object[];
 *   onImport: (tasks: object[], mode: "replace" | "merge") => void;
 * }} props
 */
export function ImportExport({ tasks, onImport }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // { tasks, count } awaiting confirmation
  const [error, setError] = useState(null);

  function handleExport() {
    doExport(tasks);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array of tasks");
        if (parsed.length === 0) throw new Error("File contains no tasks");
        const invalid = parsed.filter((t) => !t.monsterName && !t.monsterId);
        if (invalid.length === parsed.length)
          throw new Error("File does not appear to contain valid task data");
        setPending({ tasks: parsed, count: parsed.length });
      } catch (err) {
        setError(err.message);
      }
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsText(file);

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function confirm(mode) {
    onImport(pending.tasks, mode);
    setPending(null);
  }

  function dismiss() {
    setPending(null);
    setError(null);
  }

  return (
    <>
      <div className="ie-buttons">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleExport}
          disabled={tasks.length === 0}
          title="Download all tasks as a JSON file"
        >
          ↓ Export
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setError(null);
            fileRef.current?.click();
          }}
          title="Load tasks from a JSON file"
        >
          ↑ Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="ie-error" onClick={() => setError(null)} title="Dismiss">
          ⚠ {error}
        </div>
      )}

      {pending && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div className="modal-panel ie-modal">
            <h2>Import {pending.count} task{pending.count !== 1 ? "s" : ""}</h2>
            <p className="muted" style={{ margin: "0.5rem 0 1.25rem" }}>
              How would you like to handle the imported tasks?
            </p>
            <div className="ie-options">
              <button
                type="button"
                className="ie-option"
                onClick={() => confirm("merge")}
              >
                <span className="ie-option-title">Merge</span>
                <span className="ie-option-desc muted">
                  Add imported tasks alongside your existing {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
              </button>
              <button
                type="button"
                className="ie-option ie-option-danger"
                onClick={() => confirm("replace")}
              >
                <span className="ie-option-title">Replace all</span>
                <span className="ie-option-desc muted">
                  Delete your {tasks.length} existing task{tasks.length !== 1 ? "s" : ""} and load the imported ones
                </span>
              </button>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button type="button" className="btn-secondary" onClick={dismiss}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
