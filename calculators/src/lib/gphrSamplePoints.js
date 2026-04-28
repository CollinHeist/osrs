/** GP/hr axis sample points (matches legacy training chart range). */
export function defaultGphrPoints() {
  const pts = [];
  for (let v = 500000; v <= 1000000; v += 100000) pts.push(v);
  for (let v = 1250000; v <= 5000000; v += 250000) pts.push(v);
  for (let v = 6000000; v <= 10000000; v += 1000000) pts.push(v);
  return pts;
}
