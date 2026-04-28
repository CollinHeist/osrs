/** Parse wiki table from Herblore training (Making potions section). */

export function parseNum(s) {
  if (!s) return null;
  const t = String(s)
    .replace(/\u2212/g, '-')
    .replace(/−/g, '-')
    .replace(/,/g, '')
    .replace(/\[[\d\s]+\]/g, '')
    .trim();
  const m = t.match(/-?\d+\.?\d*/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function moneyCell(td) {
  const coin = td.querySelector?.('span.coins');
  if (coin) return parseNum(coin.textContent);
  if (/N\/A/i.test(td.textContent)) return null;
  return parseNum(td.textContent);
}

export function parseXpHrCell(td) {
  const raw = td.textContent.replace(/\u2212/g, '-');
  const m = raw.match(/[\d,]+(?:\.\d+)?/);
  return m ? parseNum(m[0]) : null;
}

export function parseRowsFromWikitable(table) {
  const out = [];
  let lastLevel = null;
  for (const tr of table.querySelectorAll('tr')) {
    const tds = [...tr.querySelectorAll('td')];
    if (tds.length < 14) continue;

    const n = tds.length;
    let level;
    let name;
    let linkEl;
    let xp;
    let xphr;
    let moneyStart;

    if (n >= 17) {
      level = parseNum(tds[0].textContent);
      if (level == null) continue;
      linkEl = tds[2].querySelector('a');
      name = linkEl ? linkEl.textContent.trim() : tds[2].textContent.trim();
      xp = parseNum(tds[7].textContent);
      xphr = parseXpHrCell(tds[8]);
      moneyStart = 9;
      lastLevel = level;
    } else {
      if (lastLevel == null) continue;
      level = lastLevel;
      linkEl = tds[1].querySelector('a');
      name = linkEl ? linkEl.textContent.trim() : tds[1].textContent.trim();
      xp = parseNum(tds[4].textContent);
      xphr = parseXpHrCell(tds[5]);
      moneyStart = 6;
    }

    const slice = tds.slice(moneyStart, moneyStart + 8);
    if (slice.length < 8) continue;
    const pxBase = moneyCell(slice[2]);
    const pxChem = moneyCell(slice[3]);
    const pxAlch = moneyCell(slice[4]);
    const pxGog = moneyCell(slice[5]);
    const pxBoth = moneyCell(slice[6]);

    if (!name || xp == null || xphr == null || xphr <= 0) continue;

    out.push({
      name,
      level: level != null ? level : lastLevel,
      xp: +xp,
      xphr: +xphr,
      profits: { base: pxBase, chem: pxChem, alch: pxAlch, gog: pxGog, both: pxBoth },
    });
  }
  return out;
}

export function parseWikiTableFromDoc(doc) {
  const tables = [...doc.querySelectorAll('table.wikitable')];
  if (!tables.length) return [];
  let best = [];
  for (const table of tables) {
    const rows = parseRowsFromWikitable(table);
    if (rows.length > best.length) best = rows;
  }
  return best;
}

export function pickWikiProfit(profits, { chem, alch, gog }) {
  const p = profits;
  if (alch && gog) {
    if (p.both != null) return p.both;
    if (p.alch != null) return p.alch;
    if (p.gog != null) return p.gog;
    return p.base;
  }
  if (alch) {
    if (p.alch != null) return p.alch;
    return p.base;
  }
  if (chem && gog) {
    if (p.gog != null) return p.gog;
    if (p.chem != null) return p.chem;
    return p.base;
  }
  if (gog) {
    if (p.gog != null) return p.gog;
    return p.base;
  }
  if (chem) {
    if (p.chem != null) return p.chem;
    return p.base;
  }
  return p.base;
}

export const WIKI_API =
  'https://oldschool.runescape.wiki/api.php?action=parse&page=Herblore_training&section=3&prop=text&format=json&origin=*';

export function potionRowKey(p) {
  return JSON.stringify({ n: p.name, l: p.level == null ? null : p.level, x: p.xphr });
}
