import { filterChartRows } from './chartFilter.js';
import { formatGphrAxis } from './format.js';

export function totalTimeAtGphr(xpNeeded, gpxp, xphr, gphr, profitTimeCredit = false) {
  const totalCost = xpNeeded * (-gpxp);
  const gatherH = profitTimeCredit || totalCost > 0 ? totalCost / gphr : 0;
  const trainH = xpNeeded / xphr;
  return gatherH + trainH;
}

export function buildRowData(rows, xpNeeded, gphrPoints, profitTimeCredit = false) {
  return rows.map((r) =>
    gphrPoints.map((g) => totalTimeAtGphr(xpNeeded, r.gpxp, r.xphr, g, profitTimeCredit)),
  );
}

export function buildEnvelope(rowData, rows) {
  if (!rowData.length) return { envelopeData: [], envelopeRow: [] };
  const numPts = rowData[0].length;
  const envelopeData = [];
  const envelopeRow = [];
  for (let pi = 0; pi < numPts; pi++) {
    const vals = rowData.map((d) => d[pi]);
    const minV = Math.min(...vals);
    envelopeData.push(+minV.toFixed(4));
    const ri = rowData.findIndex((d) => Math.abs(d[pi] - minV) < 1e-5);
    envelopeRow.push(ri >= 0 ? rows[ri].chartLabel ?? rows[ri].name : '');
  }
  return { envelopeData, envelopeRow };
}

/**
 * Build Chart.js datasets with unified filtering + optimal envelope.
 * @param {Array<{name:string,chartLabel?:string,gpxp:number,xphr:number,color?:string,borderDash?:number[]}>} rows
 */
export function buildLineChartDatasets(rows, xpNeeded, gphrPoints, palette, envelopeColor, profitTimeCredit = false) {
  const labels = gphrPoints.map(formatGphrAxis);
  const rowData = buildRowData(rows, xpNeeded, gphrPoints, profitTimeCredit);
  const { envelopeData, envelopeRow } = buildEnvelope(rowData, rows);
  const { filteredRows, filteredData } = filterChartRows(rows, rowData);

  let ci = 0;
  const colorByKey = {};
  const datasets = filteredData.map((data, fi) => {
    const r = filteredRows[fi];
    const key = r.colorKey ?? r.name;
    if (!colorByKey[key]) colorByKey[key] = palette[ci++ % palette.length];
    const color = r.color ?? colorByKey[key];
    return {
      label: r.chartLabel ?? r.name,
      data: data.map((v) => +v.toFixed(4)),
      borderColor: color,
      backgroundColor: 'transparent',
      borderDash: r.borderDash ?? [],
      borderWidth: 1.8,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.25,
    };
  });

  datasets.unshift({
    label: '\u2605 Optimal',
    data: envelopeData,
    borderColor: envelopeColor,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2.8,
    pointRadius: 0,
    pointHoverRadius: 5,
    tension: 0.25,
    fill: false,
    order: 0,
    envelopeRow,
  });

  return { labels, datasets };
}
