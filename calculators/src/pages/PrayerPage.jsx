import { useMemo, useState, useDeferredValue, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { xpNeededBetween } from '../lib/xp.js';
import { computeMethodTimes, sortRows, pickBestRow, efficiencyRange } from '../lib/calculatorEngine.js';
import { formatGpSigned, formatHours, formatGpCompact, formatRateK, describeGpxp } from '../lib/format.js';
import { defaultGphrPoints } from '../lib/gphrSamplePoints.js';
import { buildLineChartDatasets } from '../lib/chartData.js';
import { CHART_PALETTE } from '../lib/palette.js';
import { parsePrayerPaste } from '../lib/prayerParse.js';
import {
  loadCalculatorSnapshot,
  saveCalculatorSnapshot,
  CALCULATOR_STORAGE_KEYS,
} from '../lib/calculatorStorage.js';
import { MAIN_SITE_INDEX } from '../lib/sitePaths.js';
import { TrainingTimeChart } from '../components/TrainingTimeChart.jsx';
import { ProfitTimeCreditToggle } from '../components/ProfitTimeCreditToggle.jsx';
import { useProfitTimeCredit } from '../lib/useProfitTimeCredit.js';

const PRAYER_SAMPLE = [
  ['Regular bones', 0.9, 23100, 0.46, 30800],
  ['Big bones', 0.63, 81900, 0.32, 109200],
  ['Babydragon bones', 0.71, 97200, 0.36, 129600],
  ['Wyrm bones', 2.31, 205000, 1.19, 273000],
  ['Dragon bones', 8.78, 643000, 4.52, 860000],
  ['Wyvern bones', 6.99, 643000, 3.6, 860000],
  ['Drake bones', 3.31, 324000, 1.7, 432000],
  ['Lava dragon bones', 6.61, 595000, 3.4, 794000],
  ['Hydra bones', 10.39, 756000, 5.35, 1008000],
  ['Dagannoth bones', 12.33, 875000, 6.35, 1167000],
  ['Ourg bones', 58.4, 980000, 30.04, 1307000],
  ['Superior dragon bones', 44.26, 1340000, 22.76, 1800000],
];

function sampleToBones(gilded, chaos) {
  return PRAYER_SAMPLE.map(([name, gg, gx, cg, cx]) => {
    const methods = [];
    if (gilded) methods.push({ method: 'Gilded Altar', gpxp: -Math.abs(gg), xphr: gx });
    if (chaos) methods.push({ method: 'Chaos Altar', gpxp: -Math.abs(cg), xphr: cx });
    return { name, methods };
  }).filter((b) => b.methods.length);
}

const GPHR_PRESETS = [300000, 500000, 1000000, 2000000, 5000000];

const PRAYER_DEFAULTS = {
  gphr: 1_000_000,
  fromLvl: 1,
  toLvl: 99,
  gilded: true,
  chaos: true,
  libation: false,
  sensitivity: 0,
  actionEff: 0,
  sticky: true,
  tab: 'paste',
  pasteRaw: '',
  bones: [],
  manualRows: [{ id: 'm0', name: '', gildedGpxp: '', chaosGpxp: '', xphr: '643000' }],
  sortCol: 'totalH',
  sortDir: 1,
};

function normalizePrayer(raw) {
  const s = { ...PRAYER_DEFAULTS, ...raw };
  s.gphr = Number(s.gphr);
  if (!Number.isFinite(s.gphr) || s.gphr < 0) s.gphr = PRAYER_DEFAULTS.gphr;
  s.fromLvl = Math.min(99, Math.max(1, Math.floor(Number(s.fromLvl)) || PRAYER_DEFAULTS.fromLvl));
  s.toLvl = Math.min(99, Math.max(1, Math.floor(Number(s.toLvl)) || PRAYER_DEFAULTS.toLvl));
  s.gilded = Boolean(s.gilded);
  s.chaos = Boolean(s.chaos);
  s.libation = Boolean(s.libation);
  s.sensitivity = Number.isFinite(Number(s.sensitivity)) ? Number(s.sensitivity) : 0;
  s.actionEff = Number.isFinite(Number(s.actionEff)) ? Number(s.actionEff) : 0;
  s.sticky = s.sticky !== false;
  s.tab = s.tab === 'manual' ? 'manual' : 'paste';
  s.pasteRaw = typeof s.pasteRaw === 'string' ? s.pasteRaw : '';
  s.bones = Array.isArray(s.bones) ? s.bones : [];
  s.sortCol = typeof s.sortCol === 'string' ? s.sortCol : PRAYER_DEFAULTS.sortCol;
  s.sortDir = s.sortDir === -1 ? -1 : 1;
  s.manualRows =
    Array.isArray(s.manualRows) && s.manualRows.length
      ? s.manualRows.map((r, i) => ({
          id: typeof r?.id === 'string' ? r.id : `m${i}`,
          name: r?.name != null ? String(r.name) : '',
          gildedGpxp: r?.gildedGpxp != null ? String(r.gildedGpxp) : '',
          chaosGpxp: r?.chaosGpxp != null ? String(r.chaosGpxp) : '',
          xphr: r?.xphr != null ? String(r.xphr) : '643000',
        }))
      : PRAYER_DEFAULTS.manualRows.map((r) => ({ ...r }));
  return s;
}

export function PrayerPage() {
  const [initial] = useState(() =>
    normalizePrayer(loadCalculatorSnapshot(CALCULATOR_STORAGE_KEYS.prayer, PRAYER_DEFAULTS)),
  );

  const [gphr, setGphr] = useState(initial.gphr);
  const [fromLvl, setFromLvl] = useState(initial.fromLvl);
  const [toLvl, setToLvl] = useState(initial.toLvl);
  const [gilded, setGilded] = useState(initial.gilded);
  const [chaos, setChaos] = useState(initial.chaos);
  const [libation, setLibation] = useState(initial.libation);
  const [sensitivity, setSensitivity] = useState(initial.sensitivity);
  const [actionEff, setActionEff] = useState(initial.actionEff);
  const [sticky, setSticky] = useState(initial.sticky);
  const [tab, setTab] = useState(initial.tab);
  const [pasteRaw, setPasteRaw] = useState(initial.pasteRaw);
  const deferredPaste = useDeferredValue(pasteRaw);
  const [bones, setBones] = useState(initial.bones);
  const [parseStatus, setParseStatus] = useState({ type: '', msg: '' });

  const [manualRows, setManualRows] = useState(initial.manualRows);
  const [sortCol, setSortCol] = useState(initial.sortCol);
  const [sortDir, setSortDir] = useState(initial.sortDir);
  const [profitTimeCredit, setProfitTimeCredit] = useProfitTimeCredit();

  useEffect(() => {
    saveCalculatorSnapshot(CALCULATOR_STORAGE_KEYS.prayer, {
      gphr,
      fromLvl,
      toLvl,
      gilded,
      chaos,
      libation,
      sensitivity,
      actionEff,
      sticky,
      tab,
      pasteRaw,
      bones,
      manualRows,
      sortCol,
      sortDir,
    });
  }, [
    gphr,
    fromLvl,
    toLvl,
    gilded,
    chaos,
    libation,
    sensitivity,
    actionEff,
    sticky,
    tab,
    pasteRaw,
    bones,
    manualRows,
    sortCol,
    sortDir,
  ]);

  const xpNeeded = useMemo(() => xpNeededBetween(fromLvl, toLvl), [fromLvl, toLvl]);

  const bonesFromManual = useMemo(() => {
    const out = [];
    for (const row of manualRows) {
      const name = row.name.trim();
      const gv = parseFloat(row.gildedGpxp);
      const cv = parseFloat(row.chaosGpxp);
      const xv = parseFloat(row.xphr) || 643000;
      if (!name) continue;
      const methods = [];
      if (gilded && !Number.isNaN(gv)) methods.push({ method: 'Gilded Altar', gpxp: -Math.abs(gv), xphr: xv });
      if (chaos && !Number.isNaN(cv))
        methods.push({ method: 'Chaos Altar', gpxp: -Math.abs(cv), xphr: xv * 1.337 });
      if (methods.length) out.push({ name, methods });
    }
    return out;
  }, [manualRows, gilded, chaos]);

  const effectiveBones = tab === 'manual' ? bonesFromManual : bones;

  const sensFrac = sensitivity / 100;
  const actionFrac = actionEff / 100;

  const { rows, best, range, emptyMsg } = useMemo(() => {
    if (xpNeeded <= 0) {
      return { rows: [], best: null, range: 0, emptyMsg: 'Set a target level higher than current.' };
    }
    if (!effectiveBones.length) {
      return {
        rows: [],
        best: null,
        range: 0,
        emptyMsg:
          tab === 'manual'
            ? 'Add bone rows with GP/XP (positive numbers are treated as GP cost per XP).'
            : 'Paste wiki data or load sample data to begin.',
      };
    }

    const flat = [];
    for (const bone of effectiveBones) {
      for (const m of bone.methods) {
        if (m.method === 'Gilded Altar' && !gilded) continue;
        if (m.method === 'Chaos Altar' && !chaos) continue;
        if (m.method === 'Libation Bowl' && !libation) continue;

        const adjGpxp = m.gpxp * (1 + sensFrac);
        const adjXphr = m.xphr * (1 + actionFrac);
        const t = computeMethodTimes({ xpNeeded, gpxp: adjGpxp, xphr: adjXphr, gphr, profitTimeCredit });
        const shortM = m.method.replace(' Altar', '').replace('Libation Bowl', 'Shards');
        flat.push({
          id: `${bone.name}::${m.method}`,
          name: bone.name,
          method: m.method,
          chartLabel: `${bone.name} (${shortM})`,
          colorKey: bone.name,
          borderDash: m.method === 'Chaos Altar' ? [6, 3] : m.method === 'Libation Bowl' ? [2, 3] : [],
          gpxp: adjGpxp,
          xphr: adjXphr,
          baseGpxp: m.gpxp,
          ...t,
        });
      }
    }

    if (!flat.length) {
      return { rows: [], best: null, range: 0, emptyMsg: 'No methods enabled or no matching data.' };
    }

    const sorted = sortRows(flat, sortCol, sortDir);
    const b = pickBestRow(sorted);
    const rng = efficiencyRange(sorted, b);
    return { rows: sorted, best: b, range: rng, emptyMsg: '' };
  }, [
    effectiveBones,
    xpNeeded,
    gphr,
    gilded,
    chaos,
    libation,
    sensFrac,
    actionFrac,
    sortCol,
    sortDir,
    tab,
    profitTimeCredit,
  ]);

  const gphrPoints = useMemo(() => defaultGphrPoints(), []);
  const chartPayload = useMemo(() => {
    if (!rows.length || xpNeeded <= 0) return null;
    const chartRows = rows.map((r) => ({
      name: r.name,
      chartLabel: r.chartLabel,
      colorKey: r.colorKey,
      gpxp: r.gpxp,
      xphr: r.xphr,
      borderDash: r.borderDash,
    }));
    return buildLineChartDatasets(chartRows, xpNeeded, gphrPoints, CHART_PALETTE, '#f0c94a', profitTimeCredit);
  }, [rows, xpNeeded, gphrPoints, profitTimeCredit]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir((d) => -d);
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  function applySticky(next) {
    setSticky(next);
  }

  useEffect(() => {
    if (tab !== 'paste') return;
    const t = deferredPaste.trim();
    if (!t) {
      setParseStatus({ type: '', msg: '' });
      setBones([]);
      return;
    }
    const parsed = parsePrayerPaste(t, { gilded, chaos, libation });
    if (!parsed.length) {
      setParseStatus({ type: 'err', msg: 'Could not parse. Paste wiki table rows (tab-separated).' });
      setBones([]);
      return;
    }
    setBones(parsed);
    setParseStatus({ type: 'ok', msg: `Parsed ${parsed.length} bone(s).` });
  }, [deferredPaste, tab, gilded, chaos, libation]);

  function loadSample() {
    const b = sampleToBones(gilded, chaos);
    setBones(b);
    setParseStatus({ type: 'ok', msg: `Loaded ${b.length} bones (sample).` });
  }

  function updateManualRow(id, patch) {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addManualRow() {
    setManualRows((prev) => [
      ...prev,
      { id: 'm' + Math.random().toString(36).slice(2), name: '', gildedGpxp: '', chaosGpxp: '', xphr: '643000' },
    ]);
  }
  function removeManualRow(id) {
    setManualRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  const sensLabel =
    sensitivity === 0
      ? 'No adjustment — raw GP/XP values'
      : `GP/XP scaled by ${sensitivity > 0 ? '+' : ''}${sensitivity}% (${sensitivity > 0 ? 'more costly' : 'cheaper'} than listed)`;
  const actionLabel =
    actionEff === 0
      ? 'No adjustment — wiki XP/hr'
      : `XP/hr scaled by ${actionEff > 0 ? '+' : ''}${actionEff}% (${actionEff > 0 ? 'faster' : 'slower'})`;

  const chartColors = {
    grid: 'rgba(51,42,16,0.45)',
    tick: '#8a7850',
    title: '#c9a227',
    tooltipBg: '#191408',
  };

  return (
    <div className="theme-prayer">
      <link
        href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Source+Code+Pro:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <nav className="calc-nav">
        <NavLink to="/prayer" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Prayer
        </NavLink>
        <NavLink to="/herblore" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Herblore
        </NavLink>
        <NavLink to="/training" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Training
        </NavLink>
      </nav>
      <header className="calc-header">
        <a href={MAIN_SITE_INDEX} className="home-link">
          &larr; All tools
        </a>
        <div className="hr" />
        <h1 className="calc-page-title">
          <span className="calc-page-title-icon" aria-hidden="true">
            🦴
          </span>{' '}
          Prayer Bone Optimizer{' '}
          <span className="calc-page-title-icon" aria-hidden="true">
            🦴
          </span>
        </h1>
        {/* <p>Find the optimal bone given your gold-per-hour income rate</p> */}
        <div className="hr" />
      </header>

      <div className="container">
        <div className="sign-legend">
          <strong>GP/XP sign:</strong> negative = costs GP per XP (money leaves your bank). Positive = profit per XP
          (no GP gathering time). Wiki prayer tables often show costs as positive numbers — this tool stores them as
          negatives internally. Optional <strong>Credit profit as gather time</strong> is in the Gold accumulation rate
          panel.
        </div>

        <div className="panel">
          <div className="panel-title">Gold accumulation rate</div>
          <div className="row">
            <label>Your GP/hour:</label>
            <div className="input-wrap">
              <span className="pfx">gp/h</span>
              <input type="number" min={0} step={50000} value={gphr} onChange={(e) => setGphr(+e.target.value)} />
            </div>
            <div className="presets">
              {GPHR_PRESETS.map((v) => (
                <button type="button" key={v} className="preset-btn" onClick={() => setGphr(v)}>
                  {v >= 1e6 ? `${v / 1e6}m` : `${v / 1e3}k`}
                </button>
              ))}
            </div>
          </div>
          <ProfitTimeCreditToggle enabled={profitTimeCredit} onChange={setProfitTimeCredit} />
        </div>

        <div className="panel">
          <div className="panel-title">Experience target</div>
          <div className="row">
            <label>Current level:</label>
            <select value={fromLvl} onChange={(e) => setFromLvl(+e.target.value)}>
              {Array.from({ length: 99 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <label>&rarr; Target:</label>
            <select value={toLvl} onChange={(e) => setToLvl(+e.target.value)}>
              {Array.from({ length: 99 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <span className="xp-note">
              {xpNeeded > 0 ? `\u2192 ${xpNeeded.toLocaleString()} XP needed` : 'Target must be higher than current.'}
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Training methods</div>
          <div className="toggles">
            <label className="toggle">
              <input type="checkbox" checked={gilded} onChange={(e) => setGilded(e.target.checked)} />
              Gilded altar
            </label>
            <label className="toggle">
              <input type="checkbox" checked={chaos} onChange={(e) => setChaos(e.target.checked)} />
              Chaos altar
            </label>
            <label className="toggle">
              <input type="checkbox" checked={libation} onChange={(e) => setLibation(e.target.checked)} />
              Libation bowl (shards)
            </label>
          </div>
        </div>

        <div className={`sticky-controls ${sticky ? '' : 'unstuck'}`}>
          <button
            type="button"
            className={`pin-btn ${sticky ? 'active' : ''}`}
            onClick={() => applySticky(!sticky)}
            title="Toggle sticky controls"
          >
            {sticky ? '📌 pinned' : '📌 unpinned'}
          </button>
          <div className="panel">
            <div className="panel-title">Sensitivity</div>
            <div className="row" style={{ marginBottom: '0.72rem' }}>
              <label>Price adjustment:</label>
              <div className="input-wrap" style={{ maxWidth: 160 }}>
                <input
                  type="number"
                  min={-50}
                  max={200}
                  step={0.5}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value) || 0)}
                />
                <span className="pfx">%</span>
              </div>
              <span className="xp-note">{sensLabel}</span>
            </div>
            <div className="row">
              <label>Action efficiency:</label>
              <div className="input-wrap" style={{ maxWidth: 160 }}>
                <input
                  type="number"
                  min={-75}
                  max={50}
                  step={0.5}
                  value={actionEff}
                  onChange={(e) => setActionEff(parseFloat(e.target.value) || 0)}
                />
                <span className="pfx">%</span>
              </div>
              <span className="xp-note">{actionLabel}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Bone data</div>
          <div className="tabs">
            <button type="button" className={`tab ${tab === 'paste' ? 'active' : ''}`} onClick={() => setTab('paste')}>
              Paste from wiki
            </button>
            <button type="button" className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              Manual entry
            </button>
          </div>

          {tab === 'paste' && (
            <>
              <textarea
                rows={4}
                value={pasteRaw}
                onChange={(e) => setPasteRaw(e.target.value)}
                placeholder="Paste tab-separated prayer training table rows from the OSRS wiki..."
              />
              <div className="hint">
                Data updates as you paste. GP/XP columns that look like wiki &quot;cost&quot; positives are converted to
                negative GP/XP automatically.
              </div>
              <div className="hint" style={{ marginTop: '0.32rem' }}>
                Wiki:{' '}
                <a
                  className="wiki-link"
                  href="https://oldschool.runescape.wiki/w/Pay-to-play_Prayer_training#Experience_rates_and_cost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Prayer training
                </a>
              </div>
              <div style={{ marginTop: '0.72rem', display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                <button type="button" className="btn sec" onClick={loadSample}>
                  Load sample data
                </button>
                {parseStatus.msg && <span className={`status ${parseStatus.type}`}>{parseStatus.msg}</span>}
              </div>
            </>
          )}

          {tab === 'manual' && (
            <>
              <div className="mgrid">
                <div className="mrow hdr prayer-cols">
                  <span>Bone name</span>
                  <span>GP/XP (gilded)</span>
                  <span className="hide-sm">GP/XP (chaos)</span>
                  <span>XP/hr (gilded)</span>
                  <span />
                </div>
                {manualRows.map((row) => (
                  <div className="mrow prayer-cols" key={row.id}>
                    <input
                      className="mi"
                      value={row.name}
                      onChange={(e) => updateManualRow(row.id, { name: e.target.value })}
                      placeholder="Dragon bones"
                    />
                    <input
                      className="mi"
                      type="number"
                      step={0.01}
                      value={row.gildedGpxp}
                      onChange={(e) => updateManualRow(row.id, { gildedGpxp: e.target.value })}
                      placeholder="8.78 (cost)"
                    />
                    <input
                      className="mi hide-sm"
                      type="number"
                      step={0.01}
                      value={row.chaosGpxp}
                      onChange={(e) => updateManualRow(row.id, { chaosGpxp: e.target.value })}
                      placeholder="4.52"
                    />
                    <input
                      className="mi"
                      type="number"
                      step={1000}
                      value={row.xphr}
                      onChange={(e) => updateManualRow(row.id, { xphr: e.target.value })}
                      placeholder="643000"
                    />
                    <button type="button" className="del" onClick={() => removeManualRow(row.id)}>
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-btn" onClick={addManualRow}>
                + Add bone
              </button>
              <div className="hint" style={{ marginTop: '0.5rem' }}>
                Enter GP/XP as positive wiki-style costs; they are converted to negative GP/XP for ranking.
              </div>
            </>
          )}
        </div>

        {!emptyMsg && best && (
          <div className="callout">
            <div className="panel-title" style={{ marginBottom: '0.32rem' }}>
              Optimal choice
            </div>
            <div className="cbname">
              {best.name} &mdash; {best.method}
            </div>
            <div className="cstats">
              <div className="cstat">
                <div className="cslbl">GP / XP ({describeGpxp(best.gpxp).short})</div>
                <div className="csval">{best.gpxp.toFixed(2)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">{best.totalCost >= 0 ? 'Total GP spent' : 'Total GP earned'}</div>
                <div className="csval">{formatGpSigned(best.totalCost)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">Gather time</div>
                <div className="csval">
                  {best.gpxp > 0 && best.gatherH === 0 ? 'none' : formatHours(best.gatherH)}
                </div>
              </div>
              <div className="cstat">
                <div className="cslbl">Train time</div>
                <div className="csval">{formatHours(best.trainH)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">Total effective time</div>
                <div className="csval g">{formatHours(best.totalH)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">XP / hour</div>
                <div className="csval">{formatRateK(best.xphr)}/hr</div>
              </div>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="tbl-hdr">
            <div className="panel-title" style={{ marginBottom: 0 }}>
              All options
            </div>
            <div className="tbl-sub">
              {rows.length
                ? `${rows.length} options · ${formatGpCompact(gphr)}/hr · ${xpNeeded.toLocaleString()} XP`
                : ''}
            </div>
          </div>
          <div className="tbl-wrap">
            {emptyMsg || !rows.length ? (
              <div className="empty">
                <div className="ico">&#129460;</div>
                <div>{emptyMsg || '—'}</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className={sortCol === 'name' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('name')}>
                      Bone
                    </th>
                    <th
                      className={`ctr ${sortCol === 'method' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}`}
                      onClick={() => toggleSort('method')}
                    >
                      Method
                    </th>
                    <th className={sortCol === 'gpxp' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('gpxp')}>
                      GP/XP
                    </th>
                    <th
                      className={sortCol === 'totalCost' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}
                      onClick={() => toggleSort('totalCost')}
                    >
                      Net GP
                    </th>
                    <th
                      className={sortCol === 'gatherH' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}
                      onClick={() => toggleSort('gatherH')}
                    >
                      Gather
                    </th>
                    <th
                      className={sortCol === 'trainH' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}
                      onClick={() => toggleSort('trainH')}
                    >
                      Train
                    </th>
                    <th className={sortCol === 'totalH' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('totalH')}>
                      Total
                    </th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isOpt = r === best;
                    const eff = range > 0 ? 100 * (1 - (r.totalH - best.totalH) / range) : 100;
                    const ec = eff > 80 ? '#4aad52' : eff > 55 ? '#c9a227' : eff > 25 ? '#c48a4a' : '#c44';
                    const minG = Math.min(...rows.map((x) => x.gpxp));
                    const maxG = Math.max(...rows.map((x) => x.gpxp));
                    const gpCls = rows.length > 1 && r.gpxp === minG ? 'best' : rows.length > 1 && r.gpxp === maxG ? 'worst' : '';
                    const tCls =
                      isOpt ? 'best' : i === rows.length - 1 && sortCol === 'totalH' && sortDir === 1 ? 'worst' : '';
                    return (
                      <tr key={r.id} className={isOpt ? 'opt' : ''}>
                        <td>{r.name}</td>
                        <td className="ctr">{r.method}</td>
                        <td className={gpCls}>{r.gpxp.toFixed(2)}</td>
                        <td>{formatGpSigned(r.totalCost)}</td>
                        <td className={isOpt ? 'hi' : ''}>{formatHours(r.gatherH)}</td>
                        <td>{formatHours(r.trainH)}</td>
                        <td className={tCls}>{formatHours(r.totalH)}</td>
                        <td>
                          <div className="bwrap">
                            <div className="bar">
                              <div className="bfill" style={{ width: `${eff.toFixed(1)}%`, background: ec }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: ec, fontFamily: 'Source Code Pro, monospace' }}>
                              {eff.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {chartPayload && (
          <TrainingTimeChart {...chartPayload} colors={chartColors} allowNegativeY={profitTimeCredit} />
        )}
      </div>
    </div>
  );
}
