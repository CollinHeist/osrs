import { useRef, useState } from "react";
import { validateImport } from "../lib/storage.js";

/**
 * Download full app state as dated JSON.
 *
 * @param {object} state
 */
function doExport(state) {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `efficiency-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   state: object;
 *   onImport: (state: object, mode: "replace" | "merge") => void;
 * }} props
 */
export function ImportExport({ state, onImport }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(/** @type {string} */ (ev.target?.result));
        const result = validateImport(parsed);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPending({
          state: result.state,
          count: result.state.comparisons.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid JSON");
      }
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirm(mode) {
    onImport(pending.state, mode);
    setPending(null);
  }

  function dismiss() {
    setPending(null);
    setError(null);
  }

  const existingCount = state.comparisons?.length ?? 0;

  return (
    <>
      <div className="ie-buttons">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => doExport(state)}
          title="Download all comparisons as JSON"
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
          title="Load comparisons from JSON"
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
            <h2>
              Import {pending.count} comparison
              {pending.count !== 1 ? "s" : ""}
            </h2>
            <p className="muted" style={{ margin: "0.5rem 0 1.25rem" }}>
              How would you like to handle the imported data?
            </p>
            <div className="ie-options">
              <button
                type="button"
                className="ie-option"
                onClick={() => confirm("merge")}
              >
                <span className="ie-option-title">Merge</span>
                <span className="ie-option-desc muted">
                  Add imported comparisons alongside your existing {existingCount}
                </span>
              </button>
              <button
                type="button"
                className="ie-option ie-option-danger"
                onClick={() => confirm("replace")}
              >
                <span className="ie-option-title">Replace all</span>
                <span className="ie-option-desc muted">
                  Delete your {existingCount} existing comparison
                  {existingCount !== 1 ? "s" : ""} and load the imported ones
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
