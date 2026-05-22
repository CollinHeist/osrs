import { useState, useMemo, useEffect } from "react";
import { DEFAULT_SEGMENTS } from "./data/trees.js";
import { computeResults, computeChartData } from "./lib/petCalc.js";
import SegmentEditor from "./components/SegmentEditor.jsx";
import ProbabilityChart from "./components/ProbabilityChart.jsx";
import BreakdownTable from "./components/BreakdownTable.jsx";
import SummaryStats from "./components/SummaryStats.jsx";
import BonusesPanel from "./components/BonusesPanel.jsx";
import { computeXpMultiplier, DEFAULT_BONUSES } from "./lib/bonuses.js";

const LS_KEY = "beaver_pet_calc_v1";

const C = {
  bg:      "#0d0e0b",
  surface: "#141510",
  border:  "#282b22",
  text:    "#e8ead4",
  muted:   "#7a7d6e",
  accent:  "#c8873a",
  gold:    "#d4a84b",
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const { segments, startLevel, bonuses } = JSON.parse(raw);
      if (Array.isArray(segments) && segments.length > 0) {
        return { segments, startLevel: startLevel ?? 1, bonuses: bonuses ?? DEFAULT_BONUSES };
      }
    }
  } catch { /* ignore */ }
  return null;
}

export default function App() {
  const [segments, setSegments]     = useState(() => loadState()?.segments    ?? DEFAULT_SEGMENTS);
  const [startLevel, setStartLevel] = useState(() => loadState()?.startLevel  ?? 1);
  const [bonuses, setBonuses]       = useState(() => loadState()?.bonuses     ?? DEFAULT_BONUSES);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ segments, startLevel, bonuses })); } catch { /* ignore */ }
  }, [segments, startLevel, bonuses]);

  const xpMultiplier = useMemo(() => computeXpMultiplier(bonuses), [bonuses]);

  /** Attach fromLevel to each segment (derived from previous toLevel or startLevel). */
  const filledSegments = useMemo(
    () => segments.map((seg, i) => ({
      ...seg,
      fromLevel: i === 0 ? startLevel : segments[i - 1].toLevel,
    })),
    [segments, startLevel],
  );

  /** Highest toLevel in the plan — determines chart range and whether virtual levels are shown. */
  const maxPlanLevel = useMemo(
    () => segments.reduce((max, s) => Math.max(max, s.toLevel), 99),
    [segments],
  );

  const segmentResults = useMemo(() => computeResults(filledSegments, xpMultiplier), [filledSegments, xpMultiplier]);
  const chartData      = useMemo(() => computeChartData(filledSegments, maxPlanLevel, xpMultiplier), [filledSegments, maxPlanLevel, xpMultiplier]);

  const totalLogs   = segmentResults.reduce((s, r) => s + r.actions, 0);
  const finalChance = segmentResults.length > 0
    ? segmentResults[segmentResults.length - 1].cumChance
    : 0;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      {/* Header */}
      <header style={{
        background:     C.surface,
        borderBottom:   `1px solid ${C.border}`,
        padding:        "0 2rem",
        position:       "sticky",
        top:            0,
        zIndex:         10,
        backdropFilter: "blur(8px)",
      }}>
        <div style={{
          maxWidth:       1320,
          margin:         "0 auto",
          height:         56,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🦫</span>
            <div>
              <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: ".03em" }}>
                Beaver Pet Calculator
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                OSRS Woodcutting
              </div>
            </div>
          </div>

          <a
            href=".."
            style={{ fontSize: 12, color: C.muted, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}
          >
            ← All Tools
          </a>
        </div>
      </header>

      {/* Hero intro */}
      <div style={{
        maxWidth:  1320,
        margin:    "0 auto",
        padding:   "28px 2rem 0",
      }}>
        <h1 style={{
          fontFamily:   "'Cinzel', Georgia, serif",
          fontSize:     "clamp(1.4rem, 3vw, 1.9rem)",
          fontWeight:   600,
          color:        C.gold,
          letterSpacing: ".04em",
          marginBottom: 8,
        }}>
          Beaver Pet Chance
        </h1>
        <p style={{ fontSize: 13, color: C.muted, maxWidth: 640, lineHeight: 1.6 }}>
          Build your training plan by selecting which trees you'll cut over each level range.
          The calculator uses the OSRS formula <span style={{ fontFamily: "'Source Code Pro', monospace", color: C.text }}>1/(base − level×25)</span> per log cut,
          with per-tree base rates from the wiki.
        </p>
      </div>

      {/* Main content */}
      <main style={{
        maxWidth: 1320,
        margin:   "0 auto",
        padding:  "24px 2rem 4rem",
        display:  "grid",
        gridTemplateColumns: "minmax(320px, 380px) 1fr",
        gridTemplateRows:    "auto",
        gap:      20,
        alignItems: "start",
      }}>
        {/* Left: plan editor + bonuses */}
        <div style={{ gridColumn: 1, gridRow: "1 / 4", display: "flex", flexDirection: "column", gap: 16 }}>
          <SegmentEditor
            segments={segments}
            startLevel={startLevel}
            onSegmentsChange={setSegments}
            onStartLevelChange={setStartLevel}
          />
          <BonusesPanel bonuses={bonuses} onChange={setBonuses} />
        </div>

        {/* Right top: summary stats */}
        <div style={{ gridColumn: 2, gridRow: 1 }}>
          <SummaryStats
            totalLogs={totalLogs}
            finalChance={finalChance}
            segmentResults={segmentResults}
            chartData={chartData}
            xpMultiplier={xpMultiplier}
          />
        </div>

        {/* Right middle: chart */}
        <div style={{ gridColumn: 2, gridRow: 2 }}>
          <ProbabilityChart
            chartData={chartData}
            filledSegments={filledSegments}
            maxLevel={maxPlanLevel}
          />
        </div>

        {/* Full-width: breakdown table */}
        <div style={{ gridColumn: "1 / -1", gridRow: 3 }}>
          <BreakdownTable results={segmentResults} xpMultiplier={xpMultiplier} />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop:   `1px solid ${C.border}`,
        padding:     "16px 2rem",
        textAlign:   "center",
        fontSize:    11,
        color:       C.muted,
        fontFamily:  "'Source Code Pro', monospace",
      }}>
        Drop rates sourced from the{" "}
        <a
          href="https://oldschool.runescape.wiki/w/Beaver"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: C.accent, textDecoration: "none" }}
        >
          OSRS Wiki
        </a>
        {" "}· Formula: 1/(base − level×25) per log cut
      </footer>
    </div>
  );
}
