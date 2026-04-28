/**
 * Parse tab-separated wiki prayer rows into bones with standardized GP/XP (negative = cost).
 */
export function parsePrayerPaste(raw, { gilded, chaos, libation }) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed = [];
  const mNames = ['Gilded Altar', 'Chaos Altar', 'Libation Bowl'];
  const mEn = [gilded, chaos, libation];
  const mDef = [643000, 860000, 1100000];

  for (const line of lines) {
    const cols = line.split('\t').map((c) => c.trim());
    if (cols.length < 3) continue;
    const name = cols[0].replace(/\[.*?\]/g, '').trim();
    if (!name || /^(bone|method|altar|item|name|type)/i.test(name)) continue;

    const nums = cols.slice(1).map((c) => {
      const n = parseFloat(c.replace(/,/g, '').replace(/[^\d.-]/g, ''));
      return Number.isNaN(n) ? null : n;
    });

    const gpxpV = nums.filter((n) => n !== null && Math.abs(n) >= 0.1 && Math.abs(n) < 600);
    const xphrV = nums.filter((n) => n !== null && n > 5000 && n < 5000000);
    if (!gpxpV.length) continue;

    const methods = [];
    for (let i = 0; i < Math.min(gpxpV.length, 3); i++) {
      if (!mEn[i]) continue;
      const rawGpxp = gpxpV[i];
      const gpxp = rawGpxp > 0 ? -Math.abs(rawGpxp) : rawGpxp;
      const xphr = xphrV[i] || mDef[i];
      methods.push({ method: mNames[i], gpxp, xphr });
    }
    if (methods.length) parsed.push({ name, methods });
  }
  return parsed;
}
