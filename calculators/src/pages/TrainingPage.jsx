import { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { xpNeededBetween } from '../lib/xp.js';
import { computeMethodTimes, sortRows, pickBestRow, efficiencyRange } from '../lib/calculatorEngine.js';
import { formatGpSigned, formatHours, formatGpCompact, formatRateK, describeGpxp } from '../lib/format.js';
import { defaultGphrPoints } from '../lib/gphrSamplePoints.js';
import { buildLineChartDatasets } from '../lib/chartData.js';
import { CHART_PALETTE } from '../lib/palette.js';
import { usePersistedGphr } from '../lib/usePersistedGphr.js';
import { MAIN_SITE_INDEX } from '../lib/sitePaths.js';
import { TrainingTimeChart } from '../components/TrainingTimeChart.jsx';

const GPHR_PRESETS = [300000, 500000, 1000000, 2000000, 5000000];

const SAMPLE = [
  ['Profitable (+3 GP/XP)', 3, 100000],
  ['Budget (\u22125 GP/XP)', -5, 250000],
  ['Standard (\u221212 GP/XP)', -12, 500000],
  ['Fast (\u221222 GP/XP)', -22, 700000],
];

function parseTable(raw) {
  const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (!lines.length) return null;
  const splitLine = (line) =>
    line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.trim().split(/\s{2,}/).map((c) => c.trim());
  const allRows = lines.map(splitLine);
  const maxCols = Math.max(...allRows.map((r) => r.length));
  if (maxCols < 2) return null;
  const dataRows = allRows.map((r) => {
    const row = [...r];
    while (row.length < maxCols) row.push('');
    return row;
  });
  return { numCols: maxCols, rows: dataRows };
}

function detectColTypes(dataRows, maxCols) {
  return Array.from({ length: maxCols }, (_, ci) => {
    const vals = dataRows.map((r) => r[ci]).filter(Boolean);
    const nums = vals
      .map((v) => parseFloat(String(v).replace(/\u2212/g, '-').replace(/,/g, '').replace(/[^\d.-]/g, '')))
      .filter((n) => !Number.isNaN(n) && Number.isFinite(n));
    if (nums.length < vals.length * 0.4) return 'name';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return Math.abs(avg) > 2000 && avg > 0 ? 'xphr' : 'gpxp';
  });
}

function buildPasteMethods(parsed, colName, colGpxp, colXphr) {
  if (!parsed || colName < 0 || colGpxp < 0 || colXphr < 0) return [];
  if (colName === colGpxp || colName === colXphr || colGpxp === colXphr) return [];
  const out = [];
  let idx = 0;
  for (const row of parsed.rows) {
    const name = row[colName]?.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
    const gpxp = parseFloat(
      String(row[colGpxp] ?? '')
        .replace(/\u2212/g, '-')
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, '') ?? '',
    );
    const xphr = parseFloat(String(row[colXphr] ?? '').replace(/,/g, '').replace(/[^\d.]/g, '') ?? '');
    if (name && !Number.isNaN(gpxp) && Number.isFinite(gpxp) && !Number.isNaN(xphr) && xphr > 0) {
      out.push({
        id: `p${idx}`,
        name,
        gpxp,
        xphr,
        color: CHART_PALETTE[out.length % CHART_PALETTE.length],
      });
      idx += 1;
    }
  }
  return out;
}

export function TrainingPage() {
  const [gphr, setGphr] = usePersistedGphr();
  const [fromLvl, setFromLvl] = useState(1);
  const [toLvl, setToLvl] = useState(99);
  const [tab, setTab] = useState('manual');
  const [pasteRaw, setPasteRaw] = useState('');
  const [colName, setColName] = useState(-1);
  const [colGpxp, setColGpxp] = useState(-1);
  const [colXphr, setColXphr] = useState(-1);
  const [manualMethods, setManualMethods] = useState(() =>
    SAMPLE.map(([n, g, x], i) => ({
      id: `m${i}`,
      name: n,
      gpxp: g,
      xphr: x,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    })),
  );
  const [sortCol, setSortCol] = useState('totalH');
  const [sortDir, setSortDir] = useState(1);

  const xpNeeded = useMemo(() => xpNeededBetween(fromLvl, toLvl), [fromLvl, toLvl]);

  const parsedTable = useMemo(() => parseTable(pasteRaw.trim()), [pasteRaw]);

  useEffect(() => {
    if (!parsedTable) return;
    const types = detectColTypes(parsedTable.rows, parsedTable.numCols);
    const pref = (type) => types.findIndex((t) => t === type);
    const cn = pref('name');
    const cg = pref('gpxp');
    const cx = pref('xphr');
    setColName(cn >= 0 ? cn : 0);
    setColGpxp(cg >= 0 ? cg : Math.min(1, parsedTable.numCols - 1));
    setColXphr(cx >= 0 ? cx : Math.min(2, parsedTable.numCols - 1));
  }, [pasteRaw, parsedTable]);

  const pasteMethods = useMemo(
    () => buildPasteMethods(parsedTable, colName, colGpxp, colXphr),
    [parsedTable, colName, colGpxp, colXphr],
  );

  const methodsForCalc = useMemo(
    () => (tab === 'paste' && pasteMethods.length ? pasteMethods : manualMethods),
    [tab, pasteMethods, manualMethods],
  );

  const { rows, best, range, emptyMsg } = useMemo(() => {
    if (xpNeeded <= 0) {
      return { rows: [], best: null, range: 0, emptyMsg: 'Set a target level higher than current.' };
    }
    if (!methodsForCalc.length) {
      return { rows: [], best: null, range: 0, emptyMsg: 'Add training methods or paste a table with column mapping.' };
    }

    const flat = [];
    for (const m of methodsForCalc) {
      const gpxp = typeof m.gpxp === 'number' ? m.gpxp : parseFloat(String(m.gpxp));
      const xphr = typeof m.xphr === 'number' ? m.xphr : parseFloat(String(m.xphr));
      if (!m.name?.trim() || Number.isNaN(gpxp) || !Number.isFinite(gpxp) || Number.isNaN(xphr) || xphr <= 0) continue;
      const t = computeMethodTimes({ xpNeeded, gpxp, xphr, gphr });
      flat.push({
        id: m.id,
        name: m.name.trim(),
        chartLabel: m.name.trim(),
        color: m.color,
        colorKey: m.id,
        gpxp,
        xphr,
        ...t,
      });
    }

    if (!flat.length) {
      return {
        rows: [],
        best: null,
        range: 0,
        emptyMsg:
          tab === 'paste' && !pasteMethods.length
            ? 'Map three distinct columns to rank pasted rows.'
            : 'Add at least one valid method (name, finite GP/XP, XP/hr > 0).',
      };
    }

    const sorted = sortRows(flat, sortCol, sortDir);
    const b = pickBestRow(sorted);
    return { rows: sorted, best: b, range: efficiencyRange(sorted, b), emptyMsg: '' };
  }, [methodsForCalc, xpNeeded, gphr, sortCol, sortDir, tab, pasteMethods.length]);

  const gphrPoints = useMemo(() => defaultGphrPoints(), []);
  const chartPayload = useMemo(() => {
    if (!rows.length || xpNeeded <= 0) return null;
    const chartRows = rows.map((r) => ({
      name: r.name,
      chartLabel: r.chartLabel,
      color: r.color,
      colorKey: r.colorKey,
      gpxp: r.gpxp,
      xphr: r.xphr,
    }));
    return buildLineChartDatasets(chartRows, xpNeeded, gphrPoints, CHART_PALETTE, '#7ac8e8');
  }, [rows, xpNeeded, gphrPoints]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir((d) => -d);
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  function updateMethod(id, patch) {
    setManualMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function addMethod() {
    setManualMethods((prev) => [
      ...prev,
      {
        id: 'm' + Math.random().toString(36).slice(2),
        name: '',
        gpxp: '',
        xphr: '',
        color: CHART_PALETTE[prev.length % CHART_PALETTE.length],
      },
    ]);
  }
  function removeMethod(id) {
    setManualMethods((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== id)));
  }

  function loadSample() {
    setManualMethods(
      SAMPLE.map(([n, g, x], i) => ({
        id: `m${i}`,
        name: n,
        gpxp: g,
        xphr: x,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      })),
    );
  }

  function clearAll() {
    setManualMethods([
      { id: 'm0', name: '', gpxp: '', xphr: '', color: CHART_PALETTE[0] },
    ]);
  }

  const previewRows = parsedTable?.rows.slice(0, 8) ?? [];
  const chartColors = {
    grid: 'rgba(30,45,64,0.7)',
    tick: '#4a6272',
    title: '#7ac8e8',
    tooltipBg: '#111620',
  };

  return (
    <div className="theme-training">
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <nav className="calc-nav">
        <NavLink to="/prayer" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Prayer
        </NavLink>
        <NavLink to="/herblore" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Herblore
        </NavLink>
        <NavLink to="/training" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
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
            ⚗
          </span>{' '}
          Training cost optimizer{' '}
          <span className="calc-page-title-icon" aria-hidden="true">
            ⚗
          </span>
        </h1>
        <p>Rank custom training methods by total effective time for your GP/hour</p>
        <div className="hr" />
      </header>

      <div className="container">
        <div className="sign-legend">
          <strong>GP/XP sign:</strong> negative = costs GP per XP (gather time applies). Positive = profit per XP (no
          gather time).
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
          <div className="panel-title">Methods</div>
          <div className="tabs">
            <button type="button" className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              Manual
            </button>
            <button type="button" className={`tab ${tab === 'paste' ? 'active' : ''}`} onClick={() => setTab('paste')}>
              Paste table
            </button>
          </div>

          {tab === 'manual' && (
            <>
              <div className="mgrid">
                <div className="mrow hdr three-cols">
                  <span>Method</span>
                  <span>GP/XP</span>
                  <span>XP/hr</span>
                  <span />
                </div>
                {manualMethods.map((m) => {
                  const gVal = parseFloat(m.gpxp);
                  const xVal = parseFloat(m.xphr);
                  const gInvalid = m.name !== '' && (Number.isNaN(gVal) || !Number.isFinite(gVal));
                  const xInvalid = m.name !== '' && (Number.isNaN(xVal) || xVal <= 0);
                  return (
                    <div className="mrow three-cols" key={m.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: m.color,
                            flexShrink: 0,
                          }}
                        />
                        <input
                          className="mi"
                          value={m.name}
                          onChange={(e) => updateMethod(m.id, { name: e.target.value })}
                          placeholder="Method name"
                        />
                      </div>
                      <input
                        className={`mi ${gInvalid ? 'invalid' : ''}`}
                        type="number"
                        step={0.01}
                        value={m.gpxp}
                        onChange={(e) => updateMethod(m.id, { gpxp: e.target.value })}
                        placeholder="-8.50"
                      />
                      <input
                        className={`mi ${xInvalid ? 'invalid' : ''}`}
                        type="number"
                        step={1000}
                        min={1}
                        value={m.xphr}
                        onChange={(e) => updateMethod(m.id, { xphr: e.target.value })}
                        placeholder="450000"
                      />
                      <button type="button" className="del" onClick={() => removeMethod(m.id)}>
                        &#10005;
                      </button>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="add-btn" onClick={addMethod}>
                + Add method
              </button>
              <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn sec" onClick={loadSample}>
                  Load sample
                </button>
                <button type="button" className="btn sec" onClick={clearAll}>
                  Clear all
                </button>
              </div>
            </>
          )}

          {tab === 'paste' && (
            <>
              <textarea
                rows={5}
                value={pasteRaw}
                onChange={(e) => setPasteRaw(e.target.value)}
                placeholder="Paste tab- or multi-space-separated columns (name, GP/XP, XP/hr)..."
              />
              {parsedTable && (
                <>
                  <div className="col-picker">
                    <div className="col-field">
                      <span className="col-label">Name column</span>
                      <select value={colName} onChange={(e) => setColName(+e.target.value)}>
                        <option value={-1}>&mdash; none &mdash;</option>
                        {Array.from({ length: parsedTable.numCols }, (_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {parsedTable.rows[0]?.[i] ?? ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-field">
                      <span className="col-label">GP/XP column</span>
                      <select value={colGpxp} onChange={(e) => setColGpxp(+e.target.value)}>
                        <option value={-1}>&mdash; none &mdash;</option>
                        {Array.from({ length: parsedTable.numCols }, (_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {parsedTable.rows[0]?.[i] ?? ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-field">
                      <span className="col-label">XP/hr column</span>
                      <select value={colXphr} onChange={(e) => setColXphr(+e.target.value)}>
                        <option value={-1}>&mdash; none &mdash;</option>
                        {Array.from({ length: parsedTable.numCols }, (_, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {parsedTable.rows[0]?.[i] ?? ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ptbl-wrap">
                    <table className="ptbl">
                      <thead>
                        <tr>
                          {Array.from({ length: parsedTable.numCols }, (_, i) => {
                            let cls = '';
                            if (i === colName) cls = 'hl-name';
                            if (i === colGpxp) cls = 'hl-gpxp';
                            if (i === colXphr) cls = 'hl-xphr';
                            return (
                              <th key={i} className={cls}>
                                Col {i + 1}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => {
                              let cls = '';
                              if (ci === colName) cls = 'hl-name';
                              if (ci === colGpxp) cls = 'hl-gpxp';
                              if (ci === colXphr) cls = 'hl-xphr';
                              return (
                                <td key={ci} className={cls}>
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="hint">
                    {pasteMethods.length
                      ? `${pasteMethods.length} row(s) live-ranked on this tab. Switch to Manual to edit rows by hand.`
                      : 'Map all three columns (distinct) to rank pasted data.'}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!emptyMsg && best && (
          <div className="callout">
            <div className="panel-title" style={{ marginBottom: '0.32rem' }}>
              Optimal choice
            </div>
            <div className="cbname" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: best.color }} />
              {best.name}
            </div>
            <div className="cstats">
              <div className="cstat">
                <div className="cslbl">GP / XP ({describeGpxp(best.gpxp).short})</div>
                <div className="csval">
                  {(best.gpxp >= 0 ? '+' : '') + best.gpxp.toFixed(2)} gp
                </div>
              </div>
              <div className="cstat">
                <div className="cslbl">XP / hour</div>
                <div className="csval">{formatRateK(best.xphr)}/hr</div>
              </div>
              <div className="cstat">
                <div className="cslbl">{best.totalCost >= 0 ? 'Total GP spent' : 'Total GP earned'}</div>
                <div className={`csval ${best.totalCost < 0 ? 'g' : ''}`}>{formatGpSigned(Math.abs(best.totalCost))}</div>
              </div>
              <div className="cstat">
                <div className="cslbl">Gather time</div>
                <div className={`csval ${best.gatherH === 0 ? 'g' : ''}`}>
                  {best.gatherH === 0 ? 'none' : formatHours(best.gatherH)}
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
            </div>
          </div>
        )}

        <div className="panel">
          <div className="tbl-hdr">
            <div className="panel-title" style={{ marginBottom: 0 }}>
              All methods
            </div>
            <div className="tbl-sub">
              {rows.length ? `${rows.length} method(s) · ${formatGpCompact(gphr)}/hr · ${xpNeeded.toLocaleString()} XP` : ''}
            </div>
          </div>
          <div className="tbl-wrap">
            {emptyMsg || !rows.length ? (
              <div className="empty">
                <div className="ico">&#128202;</div>
                <div>{emptyMsg || '—'}</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className={sortCol === 'name' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('name')}>
                      Method
                    </th>
                    <th className={sortCol === 'gpxp' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('gpxp')}>
                      GP/XP
                    </th>
                    <th className={sortCol === 'xphr' ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''} onClick={() => toggleSort('xphr')}>
                      XP/hr
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
                    const ec = eff > 80 ? '#3aaa6a' : eff > 55 ? '#d4a838' : eff > 25 ? '#cc7a4a' : '#cc4444';
                    const maxG = Math.max(...rows.map((x) => x.gpxp));
                    const minG = Math.min(...rows.map((x) => x.gpxp));
                    const maxX = Math.max(...rows.map((x) => x.xphr));
                    const gpCls = rows.length > 1 && r.gpxp === maxG ? 'best' : rows.length > 1 && r.gpxp === minG ? 'worst' : '';
                    const xhCls = rows.length > 1 && r.xphr === maxX ? 'best' : '';
                    const netCls =
                      r.totalCost < 0 ? 'best' : r.totalCost === Math.max(...rows.map((x) => x.totalCost)) && rows.length > 1 ? 'worst' : '';
                    const tCls =
                      isOpt ? 'best' : i === rows.length - 1 && sortCol === 'totalH' && sortDir === 1 ? 'worst' : '';
                    return (
                      <tr key={r.id} className={isOpt ? 'opt' : ''}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
                            {r.name}
                          </span>
                        </td>
                        <td className={gpCls}>{r.gpxp.toFixed(2)}</td>
                        <td className={xhCls}>{formatRateK(r.xphr)}/hr</td>
                        <td className={netCls}>{formatGpSigned(r.totalCost)}</td>
                        <td className={isOpt ? 'hi' : ''}>{formatHours(r.gatherH)}</td>
                        <td>{formatHours(r.trainH)}</td>
                        <td className={tCls}>{formatHours(r.totalH)}</td>
                        <td>
                          <div className="bwrap">
                            <div className="bar">
                              <div className="bfill" style={{ width: `${eff.toFixed(1)}%`, background: ec }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', color: ec, fontFamily: 'Source Code Pro, monospace' }}>
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

        {chartPayload && <TrainingTimeChart {...chartPayload} colors={chartColors} />}
      </div>
    </div>
  );
}
