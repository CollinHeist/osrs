import { useMemo, useState, useEffect, useDeferredValue } from 'react';
import { NavLink } from 'react-router-dom';
import { xpNeededBetween } from '../lib/xp.js';
import { computeMethodTimes, sortRows, pickBestRow, efficiencyRange } from '../lib/calculatorEngine.js';
import { formatGpSigned, formatHours, formatGpCompact, formatRateK, describeGpxp } from '../lib/format.js';
import { defaultGphrPoints } from '../lib/gphrSamplePoints.js';
import { buildLineChartDatasets } from '../lib/chartData.js';
import { CHART_PALETTE } from '../lib/palette.js';
import {
  parseWikiTableFromDoc,
  pickWikiProfit,
  WIKI_API,
  potionRowKey,
} from '../lib/herbloreWiki.js';
import {
  loadCalculatorSnapshot,
  saveCalculatorSnapshot,
  CALCULATOR_STORAGE_KEYS,
} from '../lib/calculatorStorage.js';
import { MAIN_SITE_INDEX } from '../lib/sitePaths.js';
import { TrainingTimeChart } from '../components/TrainingTimeChart.jsx';
import { ProfitTimeCreditToggle } from '../components/ProfitTimeCreditToggle.jsx';
import { useProfitTimeCredit } from '../lib/useProfitTimeCredit.js';

const GPHR_PRESETS = [300000, 500000, 1000000, 2000000, 5000000];

const HERB_DEFAULTS = {
  gphr: 1_000_000,
  fromLvl: 3,
  toLvl: 99,
  onlyReachable: false,
  eqChem: false,
  eqAlch: false,
  eqGog: false,
  sensitivity: 0,
  actionEff: 0,
  sticky: true,
  tab: 'fetch',
  potions: [],
  excludedKeys: [],
  manualRows: [{ id: 'h0', name: '', gpxp: '', xphr: '' }],
  pasteRaw: '',
  sortCol: 'totalH',
  sortDir: 1,
};

function normalizeHerblore(raw) {
  const s = { ...HERB_DEFAULTS, ...raw };
  s.gphr = Number(s.gphr);
  if (!Number.isFinite(s.gphr) || s.gphr < 0) s.gphr = HERB_DEFAULTS.gphr;
  s.fromLvl = Math.min(99, Math.max(1, Math.floor(Number(s.fromLvl)) || HERB_DEFAULTS.fromLvl));
  s.toLvl = Math.min(99, Math.max(1, Math.floor(Number(s.toLvl)) || HERB_DEFAULTS.toLvl));
  s.onlyReachable = Boolean(s.onlyReachable);
  s.eqChem = Boolean(s.eqChem);
  s.eqAlch = Boolean(s.eqAlch);
  s.eqGog = Boolean(s.eqGog);
  s.sensitivity = Number.isFinite(Number(s.sensitivity)) ? Number(s.sensitivity) : 0;
  s.actionEff = Number.isFinite(Number(s.actionEff)) ? Number(s.actionEff) : 0;
  s.sticky = s.sticky !== false;
  s.tab = ['fetch', 'paste', 'manual'].includes(s.tab) ? s.tab : 'fetch';
  s.pasteRaw = typeof s.pasteRaw === 'string' ? s.pasteRaw : '';
  s.potions = Array.isArray(s.potions) ? s.potions : [];
  s.excludedKeys = Array.isArray(s.excludedKeys) ? s.excludedKeys.map(String) : [];
  s.sortCol = typeof s.sortCol === 'string' ? s.sortCol : HERB_DEFAULTS.sortCol;
  s.sortDir = s.sortDir === -1 ? -1 : 1;
  s.manualRows =
    Array.isArray(s.manualRows) && s.manualRows.length
      ? s.manualRows.map((r, i) => ({
          id: typeof r?.id === 'string' ? r.id : `h${i}`,
          name: r?.name != null ? String(r.name) : '',
          gpxp: r?.gpxp != null ? String(r.gpxp) : '',
          xphr: r?.xphr != null ? String(r.xphr) : '',
        }))
      : HERB_DEFAULTS.manualRows.map((r) => ({ ...r }));
  return s;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function HerblorePage() {
  const [initial] = useState(() =>
    normalizeHerblore(loadCalculatorSnapshot(CALCULATOR_STORAGE_KEYS.herblore, HERB_DEFAULTS)),
  );

  const [gphr, setGphr] = useState(initial.gphr);
  const [fromLvl, setFromLvl] = useState(initial.fromLvl);
  const [toLvl, setToLvl] = useState(initial.toLvl);
  const [onlyReachable, setOnlyReachable] = useState(initial.onlyReachable);
  const [eqChem, setEqChem] = useState(initial.eqChem);
  const [eqAlch, setEqAlch] = useState(initial.eqAlch);
  const [eqGog, setEqGog] = useState(initial.eqGog);
  const [sensitivity, setSensitivity] = useState(initial.sensitivity);
  const [actionEff, setActionEff] = useState(initial.actionEff);
  const [sticky, setSticky] = useState(initial.sticky);
  const [tab, setTab] = useState(initial.tab);
  const [potions, setPotions] = useState(initial.potions);
  const [excluded, setExcluded] = useState(() => new Set(initial.excludedKeys ?? []));
  const [sortCol, setSortCol] = useState(initial.sortCol);
  const [sortDir, setSortDir] = useState(initial.sortDir);
  const [profitTimeCredit, setProfitTimeCredit] = useProfitTimeCredit();
  const [fetchStatus, setFetchStatus] = useState({ type: '', msg: '' });
  const [pasteRaw, setPasteRaw] = useState(initial.pasteRaw);
  const [parseStatus, setParseStatus] = useState({ type: '', msg: '' });
  const deferredPaste = useDeferredValue(pasteRaw);

  const [manualRows, setManualRows] = useState(initial.manualRows);

  useEffect(() => {
    saveCalculatorSnapshot(CALCULATOR_STORAGE_KEYS.herblore, {
      gphr,
      fromLvl,
      toLvl,
      onlyReachable,
      eqChem,
      eqAlch,
      eqGog,
      sensitivity,
      actionEff,
      sticky,
      tab,
      potions,
      excludedKeys: [...excluded].sort(),
      manualRows,
      pasteRaw,
      sortCol,
      sortDir,
    });
  }, [
    gphr,
    fromLvl,
    toLvl,
    onlyReachable,
    eqChem,
    eqAlch,
    eqGog,
    sensitivity,
    actionEff,
    sticky,
    tab,
    potions,
    excluded,
    manualRows,
    pasteRaw,
    sortCol,
    sortDir,
  ]);

  const xpNeeded = useMemo(() => xpNeededBetween(fromLvl, toLvl), [fromLvl, toLvl]);
  const sensFrac = sensitivity / 100;
  const actionFrac = actionEff / 100;

  const potionsFromManual = useMemo(() => {
    const out = [];
    for (const row of manualRows) {
      const name = row.name.trim();
      const gpxp = parseFloat(row.gpxp);
      const xphr = parseFloat(row.xphr);
      if (!name || Number.isNaN(gpxp) || Number.isNaN(xphr) || xphr <= 0) continue;
      out.push({
        name,
        level: 1,
        xp: 0,
        xphr,
        profits: { base: gpxp, chem: null, alch: null, gog: null, both: null },
      });
    }
    return out;
  }, [manualRows]);

  const effectivePotions = tab === 'manual' ? potionsFromManual : potions;

  async function fetchWiki() {
    setFetchStatus({ type: '', msg: 'Loading…' });
    try {
      const r = await fetch(WIKI_API);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const html = j.parse && j.parse.text && j.parse.text['*'];
      if (!html) throw new Error('Unexpected API response');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const list = parseWikiTableFromDoc(doc);
      if (!list.length) throw new Error('No table rows parsed');
      setPotions(list);
      setFetchStatus({ type: 'ok', msg: `Loaded ${list.length} potion rows` });
    } catch (e) {
      setFetchStatus({ type: 'err', msg: `${e.message} — try Paste HTML tab` });
    }
  }

  useEffect(() => {
    if (tab !== 'paste') return;
    const raw = deferredPaste.trim();
    if (!raw) {
      setParseStatus({ type: '', msg: '' });
      return;
    }
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const list = parseWikiTableFromDoc(doc);
      if (!list.length) {
        setParseStatus({ type: 'err', msg: 'Could not find table.wikitable with data rows.' });
        return;
      }
      setPotions(list);
      setParseStatus({ type: 'ok', msg: `Parsed ${list.length} rows` });
    } catch (e) {
      setParseStatus({ type: 'err', msg: e.message || 'Parse failed' });
    }
  }, [deferredPaste, tab]);

  const { rows, best, range, emptyMsg } = useMemo(() => {
    if (xpNeeded <= 0) {
      return { rows: [], best: null, range: 0, emptyMsg: 'Set a target level higher than current.' };
    }
    if (!effectivePotions.length) {
      return {
        rows: [],
        best: null,
        range: 0,
        emptyMsg: 'Fetch the wiki table or enter data manually.',
      };
    }

    let eligibleBeforeEx = 0;
    let excludedAmongEligible = 0;
    const flat = [];

    for (const p of effectivePotions) {
      if (onlyReachable && p.level != null && p.level > fromLvl) continue;
      const wikiPx = pickWikiProfit(p.profits, { chem: eqChem, alch: eqAlch, gog: eqGog });
      if (wikiPx == null || !Number.isFinite(wikiPx)) continue;

      const adjXphr = p.xphr * (1 + actionFrac);
      if (adjXphr <= 0) continue;

      eligibleBeforeEx += 1;
      const pkey = potionRowKey(p);
      if (excluded.has(pkey)) {
        excludedAmongEligible += 1;
        continue;
      }

      const gpxp = wikiPx * (1 + sensFrac);
      const t = computeMethodTimes({ xpNeeded, gpxp, xphr: adjXphr, gphr, profitTimeCredit });
      /** Wiki-style total GP over the goal: positive = profit, negative = cost */
      const netGp = xpNeeded * gpxp;

      flat.push({
        pid: pkey,
        name: p.name,
        lvl: p.level,
        gpxp,
        wikiGpxp: wikiPx,
        chartLabel: p.name,
        colorKey: p.name,
        ...t,
        netGp,
        xphr: adjXphr,
      });
    }

    if (!flat.length) {
      const msg =
        eligibleBeforeEx > 0 && excludedAmongEligible === eligibleBeforeEx
          ? 'Every eligible potion is excluded — restore some from the list above or clear excluded.'
          : 'No rows left — try unchecking filters, different equipment, or refresh wiki data.';
      return { rows: [], best: null, range: 0, emptyMsg: msg };
    }

    const sorted = sortRows(flat, sortCol, sortDir);
    const b = pickBestRow(sorted);
    return { rows: sorted, best: b, range: efficiencyRange(sorted, b), emptyMsg: '' };
  }, [
    effectivePotions,
    xpNeeded,
    gphr,
    fromLvl,
    onlyReachable,
    eqChem,
    eqAlch,
    eqGog,
    sensFrac,
    actionFrac,
    excluded,
    sortCol,
    sortDir,
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
    }));
    return buildLineChartDatasets(chartRows, xpNeeded, gphrPoints, CHART_PALETTE, '#8ef0a8', profitTimeCredit);
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

  function excludeRow(pid) {
    setExcluded((prev) => new Set([...prev, pid]));
  }
  function removeExcluded(k) {
    setExcluded((prev) => {
      const n = new Set(prev);
      n.delete(k);
      return n;
    });
  }
  function clearExcluded() {
    setExcluded(new Set());
  }

  function updateManualRow(id, patch) {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addManualRow() {
    setManualRows((prev) => [...prev, { id: 'h' + Math.random().toString(36).slice(2), name: '', gpxp: '', xphr: '' }]);
  }
  function removeManualRow(id) {
    setManualRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  const sensLabel =
    sensitivity === 0
      ? 'No price adjustment — GP/XP is wiki value for your equipment toggles'
      : `GP/XP scaled by ${sensitivity > 0 ? '+' : ''}${sensitivity}% (${sensitivity > 0 ? 'worse' : 'better'} than listed)`;
  const actionLabel =
    actionEff === 0
      ? 'No adjustment — wiki XP/hr'
      : `XP/hr ${actionEff > 0 ? '+' : ''}${actionEff}% (${actionEff > 0 ? 'faster' : 'slower'})`;

  const chartColors = {
    grid: 'rgba(31,53,40,0.5)',
    tick: '#5a7a66',
    title: '#6ecf8a',
    tooltipBg: '#101a14',
  };

  const excludedKeys = [...excluded].sort();

  return (
    <div className="theme-herblore">
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Source+Code+Pro:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <nav className="calc-nav">
        <NavLink to="/prayer" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Prayer
        </NavLink>
        <NavLink to="/herblore" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
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
            🌿
          </span>{' '}
          Herblore Training Optimizer{' '}
          <span className="calc-page-title-icon" aria-hidden="true">
            🌿
          </span>
        </h1>
        {/* <p>Determine the optimal Herblore training method</p> */}
        <div className="hr" />
      </header>

      <div className="container">
        <div className="sign-legend">
          <strong>GP/XP (effective)</strong> uses the wiki Profit/XP column for your equipment toggles.
          Negative = costs GP per XP (gather time applies); positive = profit per XP (no gather time by default). Use{' '}
          <strong>Credit profit as gather time</strong> in the Gold accumulation rate panel to value profit at your
          GP/hour.
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
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <label className="toggle" style={{ maxWidth: 'none' }}>
              <input type="checkbox" checked={onlyReachable} onChange={(e) => setOnlyReachable(e.target.checked)} />
              <span>Only list potions at or below current Herblore level (wiki Level column).</span>
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Equipment (wiki Profit/XP columns)</div>
          <div className="toggles">
            <label className="toggle">
              <input type="checkbox" checked={eqChem} onChange={(e) => setEqChem(e.target.checked)} />
              Amulet of chemistry
            </label>
            <label className="toggle">
              <input type="checkbox" checked={eqAlch} onChange={(e) => setEqAlch(e.target.checked)} />
              Alchemist&apos;s amulet
            </label>
            <label className="toggle">
              <input type="checkbox" checked={eqGog} onChange={(e) => setEqGog(e.target.checked)} />
              Prescription goggles
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
            {sticky ? 'pinned' : 'unpinned'}
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
          <div className="panel-title">Potion data</div>
          <div className="tabs">
            <button type="button" className={`tab ${tab === 'fetch' ? 'active' : ''}`} onClick={() => setTab('fetch')}>
              Fetch from wiki
            </button>
            <button type="button" className={`tab ${tab === 'paste' ? 'active' : ''}`} onClick={() => setTab('paste')}>
              Paste HTML
            </button>
            <button type="button" className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              Manual
            </button>
          </div>

          {tab === 'fetch' && (
            <>
              <p className="hint" style={{ fontStyle: 'normal', marginBottom: '0.75rem' }}>
                Pulls section <strong>Making potions</strong> from the wiki API (live GE prices).
              </p>
              <button type="button" className="btn" onClick={fetchWiki}>
                Fetch Making potions table
              </button>
              {fetchStatus.msg && <span className={`status ${fetchStatus.type}`}>{fetchStatus.msg}</span>}
              <div className="hint" style={{ marginTop: '0.65rem' }}>
                Wiki:{' '}
                <a
                  className="wiki-link"
                  href="https://oldschool.runescape.wiki/w/Herblore_training#Making_potions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Herblore training — Making potions
                </a>
              </div>
            </>
          )}

          {tab === 'paste' && (
            <>
              <textarea
                rows={5}
                value={pasteRaw}
                onChange={(e) => setPasteRaw(e.target.value)}
                placeholder="Paste HTML containing table.wikitable (with span.coins cells)…"
              />
              <div className="hint">Updates automatically after you paste (debounced).</div>
              {parseStatus.msg && <span className={`status ${parseStatus.type}`}>{parseStatus.msg}</span>}
            </>
          )}

          {tab === 'manual' && (
            <>
              <div className="mgrid">
                <div className="mrow hdr three-cols">
                  <span>Potion name</span>
                  <span>GP/XP</span>
                  <span>XP/hr</span>
                  <span />
                </div>
                {manualRows.map((row) => (
                  <div className="mrow three-cols" key={row.id}>
                    <input
                      className="mi"
                      value={row.name}
                      onChange={(e) => updateManualRow(row.id, { name: e.target.value })}
                      placeholder="Super restore"
                    />
                    <input
                      className="mi"
                      type="number"
                      step={0.01}
                      value={row.gpxp}
                      onChange={(e) => updateManualRow(row.id, { gpxp: e.target.value })}
                      placeholder="-7.5"
                    />
                    <input
                      className="mi"
                      type="number"
                      step={1000}
                      value={row.xphr}
                      onChange={(e) => updateManualRow(row.id, { xphr: e.target.value })}
                      placeholder="356000"
                    />
                    <button type="button" className="del" onClick={() => removeManualRow(row.id)}>
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-btn" onClick={addManualRow}>
                + Add row
              </button>
            </>
          )}
        </div>

        {!emptyMsg && best && (
          <div className="callout">
            <div className="panel-title" style={{ marginBottom: '0.32rem' }}>
              Optimal choice
            </div>
            <div className="cbname">{best.name}</div>
            <div className="cstats">
              <div className="cstat">
                <div className="cslbl">Effective GP/XP ({describeGpxp(best.gpxp).short})</div>
                <div className="csval">{best.gpxp.toFixed(2)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">Wiki GP/XP (equipment only, no price %)</div>
                <div className="csval">{best.wikiGpxp != null ? best.wikiGpxp.toFixed(2) : '—'}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">Net GP (for this XP goal)</div>
                <div className={`csval${best.netGp > 0 ? ' g' : ''}`}>{formatGpSigned(best.netGp)}</div>
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
                <div className="cslbl">Total time</div>
                <div className="csval g">{formatHours(best.totalH)}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">XP/hr</div>
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
                ? `${rows.length} methods${excluded.size ? ` · ${excluded.size} excluded` : ''} · ${formatGpCompact(gphr)}/hr · ${xpNeeded.toLocaleString()} XP`
                : ''}
            </div>
          </div>

          <div className={`ex-wrap ${excludedKeys.length ? 'show' : ''}`}>
            <div className="panel-title" style={{ marginBottom: '0.35rem' }}>
              Excluded potions
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              Hidden from table, callout, and chart. Remove with ×.
            </p>
            <div className="ex-chips">
              {excludedKeys.map((k) => {
                let label = k;
                try {
                  label = JSON.parse(k).n;
                } catch {
                  /* ignore */
                }
                return (
                  <span key={k} className="ex-chip">
                    <span>{escapeHtml(label)}</span>
                    <button type="button" onClick={() => removeExcluded(k)} title="Include again">
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <button type="button" className="btn sec" onClick={clearExcluded}>
              Clear all excluded
            </button>
          </div>

          <div className="tbl-wrap">
            {emptyMsg || !rows.length ? (
              <div className="empty">
                <div className="ico">&#127807;</div>
                <div>{emptyMsg || '—'}</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className={sortCol === 'name' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('name')}>
                      Potion
                    </th>
                    <th className={sortCol === 'lvl' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('lvl')}>
                      Lvl
                    </th>
                    <th className={sortCol === 'gpxp' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('gpxp')}>
                      GP/XP (effective)
                    </th>
                    <th
                      className={sortCol === 'netGp' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}
                      onClick={() => toggleSort('netGp')}
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
                    <th />
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
                    return (
                      <tr key={r.pid + String(i)} className={isOpt ? 'opt' : ''}>
                        <td>{escapeHtml(r.name)}</td>
                        <td>{r.lvl != null ? r.lvl : '—'}</td>
                        <td className={gpCls}>{r.gpxp.toFixed(2)}</td>
                        <td className={r.netGp > 0 ? 'best' : ''}>{formatGpSigned(r.netGp)}</td>
                        <td className={isOpt ? 'hi' : ''}>{formatHours(r.gatherH)}</td>
                        <td>{formatHours(r.trainH)}</td>
                        <td className={isOpt ? 'best' : ''}>{formatHours(r.totalH)}</td>
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
                        <td>
                          <button type="button" className="ex-btn" onClick={() => excludeRow(r.pid)} title="Exclude from ranking">
                            Exclude
                          </button>
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
