/**
 * Keep rows that are within a tolerance of the best total time
 * at at least one GP/hr sample point (same rule for all calculators).
 */
export function rowIndicesNearOptimal(rowData) {
  if (!rowData.length || !rowData[0]?.length) return [];
  const numPts = rowData[0].length;
  const keep = rowData.map(() => false);

  for (let pi = 0; pi < numPts; pi++) {
    const colVals = rowData.map((d) => d[pi]);
    const minV = Math.min(...colVals);
    const maxV = Math.max(...colVals);
    const tol = (maxV - minV) * 0.1 + Math.abs(minV) * 0.02;
    for (let ri = 0; ri < rowData.length; ri++) {
      if (rowData[ri][pi] <= minV + tol) keep[ri] = true;
    }
  }
  return keep;
}

export function filterChartRows(rows, rowData) {
  const keep = rowIndicesNearOptimal(rowData);
  const filteredRows = rows.filter((_, i) => keep[i]);
  const filteredData = rowData.filter((_, i) => keep[i]);
  return { filteredRows, filteredData, keep };
}
