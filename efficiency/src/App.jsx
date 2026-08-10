import { ComparisonSidebar } from "./components/ComparisonSidebar.jsx";
import { OptionEditor } from "./components/OptionEditor.jsx";
import { PlotControls } from "./components/PlotControls.jsx";
import { EfficiencyChart } from "./components/EfficiencyChart.jsx";
import { BestSummary } from "./components/BestSummary.jsx";
import { ImportExport } from "./components/ImportExport.jsx";
import { usePersistedState } from "./hooks/usePersistedState.js";
import {
  STORAGE_KEY,
  createDefaultState,
  newId,
  validateImport,
} from "./lib/storage.js";
import "./App.css";

/**
 * Load persisted state, falling back to defaults if the stored blob is invalid.
 * @returns {object}
 */
function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return createDefaultState();
    const result = validateImport(JSON.parse(raw));
    if (result.ok) return result.state;
  } catch {
    // ignore
  }
  return createDefaultState();
}

export default function App() {
  const [state, setState] = usePersistedState(STORAGE_KEY, loadInitialState);

  const active =
    state.comparisons.find((c) => c.id === state.activeId) ??
    state.comparisons[0];

  const rewardProfit = state.plot.rewardProfit !== false;

  function patchState(partial) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function updateComparison(id, patch) {
    setState((prev) => ({
      ...prev,
      comparisons: prev.comparisons.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  }

  function addComparison() {
    const id = newId();
    setState((prev) => ({
      ...prev,
      activeId: id,
      comparisons: [
        ...prev.comparisons,
        {
          id,
          name: `Comparison ${prev.comparisons.length + 1}`,
          options: [],
        },
      ],
    }));
  }

  function deleteComparison(id) {
    setState((prev) => {
      if (prev.comparisons.length <= 1) return prev;
      const comparisons = prev.comparisons.filter((c) => c.id !== id);
      const activeId =
        prev.activeId === id ? comparisons[0].id : prev.activeId;
      return { ...prev, comparisons, activeId };
    });
  }

  function addOption() {
    if (!active) return;
    const n = active.options.length + 1;
    updateComparison(active.id, {
      options: [
        ...active.options,
        {
          id: newId(),
          name: `Option ${n}`,
          xpHr: 100_000,
          gpHr: 0,
        },
      ],
    });
  }

  function handleImport(imported, mode) {
    if (mode === "replace") {
      setState(imported);
      return;
    }

    // Merge: append comparisons with fresh ids to avoid collisions
    setState((prev) => {
      const merged = imported.comparisons.map((c) => ({
        ...c,
        id: newId(),
        options: c.options.map((o) => ({ ...o, id: newId() })),
      }));
      const comparisons = [...prev.comparisons, ...merged];
      return {
        ...prev,
        comparisons,
        activeId: merged[0]?.id ?? prev.activeId,
        plot: {
          minGpHr: Math.min(prev.plot.minGpHr, imported.plot.minGpHr),
          maxGpHr: Math.max(prev.plot.maxGpHr, imported.plot.maxGpHr),
          rewardProfit: prev.plot.rewardProfit !== false,
        },
      };
    });
  }

  if (!active) {
    return (
      <div className="app">
        <p className="muted">No comparisons loaded.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div>
          <a className="home" href="../">
            ← All Tools
          </a>
          <h1>Activity Efficiency</h1>
          <p className="sub">
            Compare training methods by effective XP/hr across money-maker GP rates
          </p>
        </div>
        <ImportExport state={state} onImport={handleImport} />
      </header>

      <div className="layout">
        <ComparisonSidebar
          comparisons={state.comparisons}
          activeId={active.id}
          onSelect={(id) => patchState({ activeId: id })}
          onAdd={addComparison}
          onRename={(id, name) => updateComparison(id, { name })}
          onDelete={deleteComparison}
        />

        <div className="main-col">
          <OptionEditor
            options={active.options}
            onChange={(options) => updateComparison(active.id, { options })}
            onAdd={addOption}
          />
          <PlotControls
            minGpHr={state.plot.minGpHr}
            maxGpHr={state.plot.maxGpHr}
            rewardProfit={rewardProfit}
            onChange={(plot) => patchState({ plot })}
          />
          <EfficiencyChart
            options={active.options}
            minGpHr={state.plot.minGpHr}
            maxGpHr={state.plot.maxGpHr}
            rewardProfit={rewardProfit}
          />
          <BestSummary
            options={active.options}
            minGpHr={state.plot.minGpHr}
            maxGpHr={state.plot.maxGpHr}
            rewardProfit={rewardProfit}
          />
        </div>
      </div>
    </div>
  );
}
