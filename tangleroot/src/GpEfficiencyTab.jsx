import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { WIKI_HARVESTS, PATCH_TYPE_ORDER, chancePerRollFromBase } from "./wikiHarvests.js";

const LS_GP_KEY = "tangleroot_gp_efficiency_v1";

// ─── Palette (mirrored from App.jsx) ──────────────────────────────────────────
const C = {
  bg:        "#0e0f0e",
  surface:   "#161714",
  card:      "#1c1e1b",
  border:    "#2a2d27",
  accent:    "#7cb87a",
  accentDim: "#4a7348",
  accentBg:  "#1a2619",
  text:      "#e8ead4",
  muted:     "#7a7d6e",
  gold:      "#d4a84b",
  red:       "#c45c3a",
  redBg:     "#2a1510",
  redDim:    "#7a3020",
  blue:      "#6a9fd4",
};

const S = {
  secLabel: { fontSize: "0.6rem", letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", margin: "0 0 0.6rem" },
  card: {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
    padding: "0.9rem", marginBottom: "0.65rem",
  },
  chartCard: {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px",
    padding: "1.1rem 1.1rem 0.9rem", marginBottom: "1rem",
  },
  chartTitle: { fontSize: "0.62rem", letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: "0.9rem" },
  chartNote: { fontSize: "0.6rem", color: C.muted, marginTop: "0.6rem", lineHeight: 1.7 },
  numInput: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px",
    color: C.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem",
    padding: "4px 6px", textAlign: "right", width: "100%", boxSizing: "border-box",
  },
  th: {
    textAlign: "left", padding: "0.35rem 0.65rem", color: C.muted, fontSize: "0.58rem",
    letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, fontWeight: 400,
  },
  thRight: {
    textAlign: "right", padding: "0.35rem 0.65rem", color: C.muted, fontSize: "0.58rem",
    letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, fontWeight: 400,
  },
  td:      { padding: "0.5rem 0.65rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" },
  tdRight: { padding: "0.5rem 0.65rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", textAlign: "right" },
  empty: { textAlign: "center", color: C.muted, fontSize: "0.72rem", padding: "2.5rem 1rem", letterSpacing: "0.04em", lineHeight: 1.8 },
  tabBar: { display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "1rem" },
  tab: {
    padding: "0.28rem 0.6rem", fontSize: "0.6rem", letterSpacing: "0.07em", textTransform: "uppercase",
    cursor: "pointer", border: `1px solid ${C.border}`, background: "transparent",
    fontFamily: "'IBM Plex Mono', monospace", borderRadius: "3px", color: C.muted,
  },
  tabActive: { background: C.accentBg, border: `1px solid ${C.accentDim}`, color: C.accent },
  btnSecondary: {
    background: "transparent", border: `1px solid ${C.border}`, color: C.muted,
    padding: "0.28rem 0.55rem", borderRadius: "3px", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.04em",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt1in(p) {
  if (p <= 0) return "—";
  if (p >= 1) return "1/1";
  return `1/${Math.round(1 / p).toLocaleString()}`;
}

function fmtGp(n) {
  if (!isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toLocaleString();
}

// ─── Static derived data ───────────────────────────────────────────────────────
// Keep only patch types with 2+ crops that have differing base values,
// meaning the pet rate actually varies across the crops in that type.
const PATCH_GROUPS = (() => {
  const map = new Map();
  for (const h of WIKI_HARVESTS) {
    if (!map.has(h.patchType)) map.set(h.patchType, []);
    map.get(h.patchType).push(h);
  }
  return PATCH_TYPE_ORDER
    .filter(pt => {
      const crops = map.get(pt);
      if (!crops || crops.length < 2) return false;
      const uniqueBases = new Set(crops.map(c => c.base));
      return uniqueBases.size > 1;
    })
    .map(pt => ({ patchType: pt, crops: map.get(pt) }));
})();

// Default rolls-per-harvest for the eligible patch types. Trees give 1 roll per
// check-health; allotments/hops yield many items per patch action.
const DEFAULT_ROLLS = {
  "Allotment": 10,
  "Hops":      10,
  "Bush":       4,
  "Tree":       1,
  "Cactus":     1,
};

// ─── localStorage ─────────────────────────────────────────────────────────────
function loadGpData() {
  try {
    const raw = localStorage.getItem(LS_GP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveGpData(data) {
  try { localStorage.setItem(LS_GP_KEY, JSON.stringify(data)); } catch {}
}

// ─── Recharts custom tooltip ───────────────────────────────────────────────────
function BarTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px",
      padding: "0.45rem 0.7rem", fontSize: "0.67rem", fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ color: C.text, fontWeight: 600, marginBottom: "0.2rem" }}>{d.produce}</div>
      <div style={{ color: C.accent }}>Expected GP/pet: {fmtGp(d.expectedGpPerPet)}</div>
      <div style={{ color: C.muted }}>Pet rate/roll: {fmt1in(d.p)}</div>
      {d.relRatio === null
        ? <div style={{ color: C.accent }}>Cheapest option</div>
        : <div style={{ color: C.gold }}>{d.relRatio.toFixed(2)}× more expensive</div>
      }
    </div>
  );
}

// ─── Input row for a single crop ──────────────────────────────────────────────
function CropInputRow({ crop, level, priceData, defaultRolls, onChange }) {
  /**
   * Renders a table row for one crop: name, min level, seed cost input,
   * rolls-per-harvest input, and computed pet rate per roll.
   */
  const p = chancePerRollFromBase(crop.base, level);
  const costGp = parseFloat(priceData?.costGp) || 0;
  const rolls  = parseFloat(priceData?.rollsPerHarvest) || defaultRolls;
  const hasPrice = costGp > 0;

  const costPerRoll     = hasPrice ? costGp / rolls : null;
  const expectedGpPerPet = hasPrice ? costPerRoll / p : null;

  return (
    <tr>
      <td style={S.td}>
        <span style={{ color: C.text, fontSize: "0.72rem" }}>{crop.produce}</span>
        <span style={{ color: C.muted, fontSize: "0.58rem", marginLeft: "0.4rem" }}>Lv.{crop.minLevel}</span>
      </td>
      <td style={{ ...S.td, width: "130px" }}>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="—"
          value={priceData?.costGp ?? ""}
          onChange={e => onChange(crop.id, "costGp", e.target.value)}
          style={S.numInput}
        />
      </td>
      <td style={{ ...S.td, width: "80px" }}>
        <input
          type="number"
          min={1}
          step={1}
          placeholder={String(defaultRolls)}
          value={priceData?.rollsPerHarvest ?? ""}
          onChange={e => onChange(crop.id, "rollsPerHarvest", e.target.value)}
          style={S.numInput}
        />
      </td>
      <td style={{ ...S.tdRight, color: C.muted, fontSize: "0.68rem" }}>
        {fmt1in(p)}
      </td>
      <td style={{ ...S.tdRight, fontWeight: hasPrice ? 600 : 400, color: hasPrice ? C.accent : C.muted, fontSize: "0.72rem" }}>
        {expectedGpPerPet !== null ? fmtGp(expectedGpPerPet) : "—"}
      </td>
    </tr>
  );
}

// ─── Comparison bar chart ──────────────────────────────────────────────────────
function ComparisonChart({ comparisons }) {
  /**
   * Horizontal bar chart showing expected GP per pet for each crop.
   * The most efficient crop gets the accent color; others use gold/red gradients.
   */
  if (comparisons.length < 1) return null;

  const best = comparisons[0].expectedGpPerPet;
  const chartData = comparisons.map((c, i) => ({
    ...c,
    relRatio: i === 0 ? null : c.expectedGpPerPet / best,
    gpLabel: i === 0 ? "best" : `${(c.expectedGpPerPet / best).toFixed(1)}×`,
  }));

  // Color scale: best = accent, worst = red
  function barColor(idx, total) {
    if (idx === 0) return C.accent;
    if (total <= 2) return C.gold;
    const t = idx / (total - 1);
    return t < 0.5 ? C.gold : C.red;
  }

  const axTick = { fill: C.muted, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div style={S.chartCard}>
      <div style={S.chartTitle}>Expected GP per pet (lower = more efficient)</div>
      <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36 + 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 80, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={axTick}
            tickLine={false}
            axisLine={{ stroke: C.border }}
            tickFormatter={v => fmtGp(v)}
          />
          <YAxis
            type="category"
            dataKey="produce"
            tick={{ ...axTick, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={76}
          />
          <Tooltip content={<BarTip />} />
          <Bar dataKey="expectedGpPerPet" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="gpLabel"
              position="right"
              style={{ fill: C.muted, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
            />
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={barColor(idx, chartData.length)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={S.chartNote}>
        Ratio shown on each bar is how many times more expensive per pet vs. the cheapest option.
        Assumes one seed cost per planted patch.
      </div>
    </div>
  );
}

// ─── Ranking table ─────────────────────────────────────────────────────────────
function RankingTable({ comparisons }) {
  /**
   * Summary table ranking crops by GP efficiency from most to least efficient.
   */
  if (comparisons.length === 0) return null;

  const best = comparisons[0].expectedGpPerPet;

  return (
    <div style={S.card}>
      <p style={{ ...S.secLabel, margin: "0 0 0.65rem" }}>Ranking — most to least GP-efficient</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
        <thead>
          <tr>
            <th style={S.th}>#</th>
            <th style={S.th}>Crop</th>
            <th style={S.thRight}>Seed cost</th>
            <th style={S.thRight}>Rolls/harvest</th>
            <th style={S.thRight}>Pet rate/roll</th>
            <th style={S.thRight}>Cost/roll</th>
            <th style={S.thRight}>GP/pet (exp.)</th>
            <th style={S.thRight}>vs. best</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c, idx) => {
            const costPerRoll = c.costGp / c.rolls;
            const ratio = c.expectedGpPerPet / best;
            return (
              <tr key={c.id}>
                <td style={{ ...S.td, color: idx === 0 ? C.accent : C.muted, fontWeight: idx === 0 ? 600 : 400 }}>
                  {idx + 1}
                </td>
                <td style={S.td}>
                  <span style={{ color: idx === 0 ? C.text : C.muted, fontWeight: idx === 0 ? 600 : 400 }}>
                    {c.produce}
                  </span>
                  <span style={{ color: C.muted, fontSize: "0.58rem", marginLeft: "0.35rem" }}>
                    Lv.{c.minLevel}
                  </span>
                </td>
                <td style={{ ...S.tdRight, color: C.muted }}>{fmtGp(c.costGp)}</td>
                <td style={{ ...S.tdRight, color: C.muted }}>{c.rolls}</td>
                <td style={{ ...S.tdRight, color: C.muted }}>{fmt1in(c.p)}</td>
                <td style={{ ...S.tdRight, color: C.muted }}>{fmtGp(costPerRoll)}</td>
                <td style={{ ...S.tdRight, color: idx === 0 ? C.accent : C.gold, fontWeight: 600 }}>
                  {fmtGp(c.expectedGpPerPet)}
                </td>
                <td style={{ ...S.tdRight, color: ratio <= 1 ? C.accent : ratio < 2 ? C.gold : C.red }}>
                  {idx === 0 ? <span style={{ color: C.accentDim }}>—</span> : `${ratio.toFixed(2)}×`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function GpEfficiencyTab({ level }) {
  /**
   * Tab for comparing the GP cost to obtain Tangleroot across different crops
   * of the same patch type. Prices are persisted in localStorage only and are
   * not included in the main tracker's JSON export.
   */
  const [gpData, setGpData] = useState(loadGpData);
  const [selectedPatchType, setSelectedPatchType] = useState("Tree");

  // Persist price data to localStorage whenever it changes (separate from main JSON)
  useEffect(() => { saveGpData(gpData); }, [gpData]);

  function handleChange(harvestId, field, rawValue) {
    const value = rawValue === "" ? undefined : rawValue;
    setGpData(prev => {
      const existing = prev[harvestId] ?? {};
      const updated = { ...existing, [field]: value };
      // Remove the key entirely when both fields are cleared to keep storage tidy
      if (!updated.costGp && !updated.rollsPerHarvest) {
        const { [harvestId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [harvestId]: updated };
    });
  }

  function clearPatchTypePrices() {
    const cropIds = new Set(
      (PATCH_GROUPS.find(g => g.patchType === selectedPatchType)?.crops ?? []).map(c => c.id)
    );
    setGpData(prev => {
      const next = { ...prev };
      for (const id of cropIds) delete next[id];
      return next;
    });
  }

  const selectedGroup = PATCH_GROUPS.find(g => g.patchType === selectedPatchType);
  const crops = selectedGroup?.crops ?? [];
  const defaultRolls = DEFAULT_ROLLS[selectedPatchType] ?? 1;

  // Compute comparison rows for any crop that has a cost entered
  const comparisons = crops
    .map(crop => {
      const d = gpData[crop.id] ?? {};
      const costGp = parseFloat(d.costGp) || 0;
      if (!costGp) return null;
      const rolls = parseFloat(d.rollsPerHarvest) || defaultRolls;
      const p = chancePerRollFromBase(crop.base, level);
      const costPerRoll = costGp / rolls;
      const expectedGpPerPet = costPerRoll / p;
      return { ...crop, costGp, rolls, p, expectedGpPerPet };
    })
    .filter(Boolean)
    .sort((a, b) => a.expectedGpPerPet - b.expectedGpPerPet);

  const hasPrices = comparisons.length > 0;

  return (
    <div>
      {/* Explanation */}
      <div style={{ ...S.card, marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.68rem", color: C.muted, margin: 0, lineHeight: 1.8 }}>
          Compare the GP cost to obtain Tangleroot across different plants of the same type.
          Enter the seed (or run) cost for each crop you want to compare — prices are saved in your
          browser and are <span style={{ color: C.accent }}>not exported</span> with your tracker data.
          <br />
          <span style={{ fontSize: "0.62rem" }}>
            <strong style={{ color: C.text }}>Rolls/harvest</strong> = how many pet rolls a single
            harvest action gives (e.g. 1 for trees, or your typical herb/allotment yield).
            Defaults: {defaultRolls} for <span style={{ color: C.gold }}>{selectedPatchType}</span>.
          </span>
        </p>
      </div>

      {/* Patch type selector */}
      <p style={{ ...S.secLabel, margin: "0 0 0.5rem" }}>Patch type</p>
      <div style={S.tabBar}>
        {PATCH_GROUPS.map(g => (
          <button
            key={g.patchType}
            style={{
              ...S.tab,
              ...(selectedPatchType === g.patchType ? S.tabActive : {}),
            }}
            onClick={() => setSelectedPatchType(g.patchType)}
          >
            {g.patchType}
            <span style={{ color: C.muted, marginLeft: "0.3rem", fontSize: "0.55rem" }}>
              ({g.crops.length})
            </span>
          </button>
        ))}
      </div>

      {/* Input table */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.65rem" }}>
          <p style={{ ...S.secLabel, margin: 0 }}>
            {selectedPatchType} crops — Lv.{level} chance
          </p>
          {hasPrices && (
            <button style={S.btnSecondary} onClick={clearPatchTypePrices}>
              clear prices
            </button>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
          <thead>
            <tr>
              <th style={S.th}>Crop</th>
              <th style={{ ...S.th, width: "130px" }}>Seed cost (GP)</th>
              <th style={{ ...S.th, width: "80px" }}>Rolls</th>
              <th style={S.thRight}>Pet rate/roll</th>
              <th style={S.thRight}>GP/pet (exp.)</th>
            </tr>
          </thead>
          <tbody>
            {crops.map(crop => (
              <CropInputRow
                key={crop.id}
                crop={crop}
                level={level}
                priceData={gpData[crop.id]}
                defaultRolls={defaultRolls}
                onChange={handleChange}
              />
            ))}
          </tbody>
        </table>
        {crops.length === 0 && (
          <div style={S.empty}>No crops found for this patch type.</div>
        )}
      </div>

      {/* Comparison results */}
      {hasPrices && (
        <>
          <ComparisonChart comparisons={comparisons} />
          {comparisons.length >= 2 && <RankingTable comparisons={comparisons} />}
          {comparisons.length === 1 && (
            <div style={{ ...S.card, color: C.muted, fontSize: "0.68rem", lineHeight: 1.8 }}>
              Enter prices for at least two crops to see a side-by-side comparison.
              <br />
              <span style={{ color: C.accent }}>
                {comparisons[0].produce}
              </span>
              {" "}costs approximately{" "}
              <span style={{ color: C.gold, fontWeight: 600 }}>
                {fmtGp(comparisons[0].expectedGpPerPet)} GP
              </span>
              {" "}per expected Tangleroot at Lv.{level}.
            </div>
          )}
        </>
      )}

      {!hasPrices && (
        <div style={S.empty}>
          <div style={{ fontSize: "2rem", marginBottom: "0.65rem" }}>☘</div>
          Enter a seed cost above to see the expected GP per Tangleroot.<br />
          <span style={{ fontSize: "0.62rem" }}>
            Prices are stored in your browser only and are never exported.
          </span>
        </div>
      )}
    </div>
  );
}
