#!/usr/bin/env python3
"""
Fetch an Old School RuneScape wiki monster page and merge one loot entry into the
gearsim ``loot.json`` array (by monster ``id``: replaces an existing row or appends).

Uses the rendered HTML (?action=render) so subtemplates like {{HerbDropLines}} are
expanded. Drop tables are read from <table class="... item-drops ..."> rows.

Item ``id`` and ``value`` (GP) both come from ``prices.json``, keyed by exact item
name (case-insensitive; first matching row wins). Use ``--no-prices`` to omit the
``value`` field while still resolving ``id``. Rows written to ``loot.json`` never
include ``value`` (the app uses ``prices.json`` for EV).

Requires: pip install beautifulsoup4

Example:
  python3 gearsim/scripts/wiki_loot_to_json.py \\
    --url https://oldschool.runescape.wiki/w/Vyrewatch_Sentinel

  # Preview only (does not modify loot.json):
  python3 gearsim/scripts/wiki_loot_to_json.py --title Vorkath --dry-run

Wiki API / HTTP etiquette: https://oldschool.runescape.wiki/w/RuneScape:Copyrights
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path
from typing import Any

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependency: pip install beautifulsoup4", file=sys.stderr)
    sys.exit(1)

WIKI_ORIGIN = "https://oldschool.runescape.wiki"
USER_AGENT = "osrs-gearsim-wiki-loot-parser/1.0 (loot.json helper; contact: repo maintainer)"


def default_loot_json_path() -> Path:
    """``gearsim/public/data/loot.json`` next to the gearsim package root."""
    return Path(__file__).resolve().parent.parent / "public" / "data" / "loot.json"


def entry_without_item_values(entry: dict[str, Any]) -> dict[str, Any]:
    """Deep copy with ``value`` removed from each drop item (loot.json on-disk shape)."""
    data = copy.deepcopy(entry)
    for table in data.get("drops", []):
        for it in table.get("items", []):
            it.pop("value", None)
    return data


def merge_loot_entry(loot_path: Path, entry: dict[str, Any]) -> bool:
    """
    Read JSON array from ``loot_path``, replace or append ``entry`` by ``entry['id']``.
    Returns True if an existing row was replaced, False if appended.
    """
    loot_path.parent.mkdir(parents=True, exist_ok=True)
    if loot_path.exists():
        with open(loot_path, encoding="utf-8") as f:
            raw = json.load(f)
        if not isinstance(raw, list):
            raise ValueError(f"{loot_path} must contain a JSON array")
        arr: list[Any] = raw
    else:
        arr = []

    eid = entry["id"]
    replaced = False
    for i, row in enumerate(arr):
        if isinstance(row, dict) and row.get("id") == eid:
            arr[i] = entry
            replaced = True
            break
    if not replaced:
        arr.append(entry)

    with open(loot_path, "w", encoding="utf-8") as f:
        json.dump(arr, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return replaced


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en-GB,en;q=0.9"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def page_title_from_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if not parsed.netloc.endswith("runescape.wiki"):
        raise ValueError(f"Expected an oldschool.runescape.wiki URL, got: {url!r}")
    path = parsed.path
    prefix = "/w/"
    if not path.startswith(prefix):
        raise ValueError(f"Wiki article URL should contain {prefix!r}, got path: {path!r}")
    title = urllib.parse.unquote(path[len(prefix) :])
    if not title:
        raise ValueError("Could not derive MediaWiki page title from URL")
    return title.replace("_", " ")


def raw_wikitext_url(title: str) -> str:
    q = urllib.parse.quote(title.replace(" ", "_"), safe="():%")
    return f"{WIKI_ORIGIN}/w/{q}?action=raw"


def render_html_url(title: str) -> str:
    q = urllib.parse.quote(title.replace(" ", "_"), safe="():%")
    return f"{WIKI_ORIGIN}/w/{q}?action=render"


def parse_infobox_monster(wikitext: str) -> dict[str, Any]:
    """
    Extract name, combat level, and monster ids from {{Infobox Monster ...}}.
    """
    m = re.search(
        r"\{\{\s*Infobox\s+Monster\b", wikitext, flags=re.IGNORECASE
    )
    if not m:
        return {"name": None, "level": None, "ids": []}

    i = m.start()
    depth = 0
    while i < len(wikitext):
        if wikitext.startswith("{{", i):
            depth += 1
            i += 2
        elif wikitext.startswith("}}", i):
            depth -= 1
            i += 2
            if depth == 0:
                body = wikitext[m.start() : i]
                break
        else:
            i += 1
    else:
        body = wikitext[m.start() :]

    def field(pat: str) -> str | None:
        mm = re.search(pat, body, flags=re.IGNORECASE | re.DOTALL)
        return mm.group(1).strip() if mm else None

    name = field(r"\|\s*name\s*=\s*([^|\n]+)")
    combat = field(r"\|\s*combat\s*=\s*([0-9]+)")
    level = int(combat) if combat and combat.isdigit() else None

    ids: list[int] = []
    for mm in re.finditer(r"\|\s*id\s*(\d+)\s*=\s*([0-9]+)", body, flags=re.IGNORECASE):
        ids.append(int(mm.group(2)))

    return {"name": name, "level": level, "ids": ids}


def strip_commas_num(s: str) -> str:
    return s.replace(",", "").replace("\u202f", "").strip()


def parse_rarity(cell) -> tuple[float, float] | None:
    span = cell.find("span", attrs={"data-drop-fraction": True})
    if span and span.get("data-drop-fraction"):
        raw = strip_commas_num(span["data-drop-fraction"])
        if "/" in raw:
            a, b = raw.split("/", 1)
            try:
                return (float(a), float(b))
            except ValueError:
                pass

    text = cell.get_text(" ", strip=True)
    text = re.split(r"\s*[;\[]", text, maxsplit=1)[0].strip()
    if not text:
        return None
    low = text.lower()
    if low.startswith("always"):
        return (1.0, 1.0)
    if low in ("unknown", "random", "varies", "n/a", "not sold"):
        return None

    m = re.match(
        r"^\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*$",
        strip_commas_num(text),
    )
    if m:
        return (float(m.group(1)), float(m.group(2)))

    m = re.match(r"^\s*1\s*/\s*([\d,]+(?:\.\d+)?)\s*$", text, flags=re.IGNORECASE)
    if m:
        denom = float(strip_commas_num(m.group(1)))
        if denom > 0:
            return (1.0, denom)

    return None


def parse_quantity(cell) -> int | list[int]:
    raw = cell.get("data-sort-value")
    if raw is not None and str(raw).strip() != "":
        try:
            v = float(str(raw).strip())
            if abs(v - round(v)) < 1e-9:
                return int(round(v))
            return [int(v), int(v)]
        except ValueError:
            pass

    text = unescape(cell.get_text(" ", strip=True))
    text = re.sub(r"\s*\([^)]*noted[^)]*\)", "", text, flags=re.IGNORECASE).strip()
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-")

    m = re.match(r"^(\d+)\s*-\s*(\d+)$", text)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return [a, b] if a != b else a

    m = re.match(r"^(\d+)\s*$", text)
    if m:
        return int(m.group(1))

    return 1


def heading_before_table(table) -> str:
    prev = table.find_previous_sibling()
    while prev is not None:
        classes = prev.get("class") or []
        if prev.name == "div" and "mw-heading3" in classes:
            h3 = prev.find("h3")
            if h3:
                return h3.get_text(strip=True)
            return prev.get_text(" ", strip=True)
        if prev.name == "div" and "mw-heading2" in classes:
            break
        prev = prev.find_previous_sibling()
    return "Unknown"


def parse_item_drop_tables(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.select("table.wikitable.item-drops")
    out: list[dict[str, Any]] = []

    for table in tables:
        table_name = heading_before_table(table)
        items: list[dict[str, Any]] = []
        rows = table.select("tbody > tr")
        if not rows:
            continue
        for tr in rows[1:]:
            cells = tr.find_all("td", recursive=False)
            if len(cells) < 4:
                continue
            item_cell = cells[1]
            link = item_cell.find("a", href=True, title=True)
            if not link:
                continue
            name = link.get("title", "").strip() or link.get_text(strip=True)
            if not name or name.lower() == "nothing":
                continue

            qty = parse_quantity(cells[2])
            rarity = parse_rarity(cells[3])
            if rarity is None:
                continue

            def _num(x: float) -> int | float:
                if isinstance(x, float) and x.is_integer():
                    return int(x)
                return x

            items.append(
                {
                    "name": name,
                    "quantity": qty,
                    "rarity": [_num(rarity[0]), _num(rarity[1])],
                }
            )

        if items:
            out.append({"table_name": table_name, "items": items})

    return out


def load_prices_catalog(path: str) -> dict[str, tuple[int, int]]:
    """
    Build case-insensitive item name -> (id, value) from prices.json.
    Same id/value semantics as gearsim/src/lib/normalizeData.js buildPriceById.
    First row wins for each distinct name.
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    by_name: dict[str, tuple[int, int]] = {}
    if not isinstance(data, list):
        raise ValueError("prices.json should be a JSON array of objects with id and name")
    for row in data:
        if not isinstance(row, dict):
            continue
        iid = row.get("id")
        name = row.get("name")
        if not isinstance(iid, int) or not isinstance(name, str):
            continue
        raw_val = row.get("value")
        if isinstance(raw_val, (int, float)):
            val = int(raw_val)
        else:
            val = 0
        key = name.casefold()
        if key not in by_name:
            by_name[key] = (iid, val)
    return by_name


def attach_ids_and_values(
    drops: list[dict[str, Any]],
    catalog: dict[str, tuple[int, int]],
    *,
    include_values: bool,
) -> list[str]:
    """Resolve ``id`` (and optionally ``value``) from prices.json by wiki item name."""
    warnings: list[str] = []
    for table in drops:
        for it in table.get("items", []):
            name = it.get("name", "")
            hit = catalog.get(name.casefold()) if isinstance(name, str) else None
            if hit is None:
                it["id"] = None
                if include_values:
                    it["value"] = None
                warnings.append(f"No prices.json row for item name: {name!r}")
            else:
                iid, val = hit
                it["id"] = iid
                if include_values:
                    it["value"] = val
    return warnings


def build_entry(
    *,
    page_title: str,
    infobox: dict[str, Any],
    drops: list[dict[str, Any]],
    monster_id: int | None,
) -> dict[str, Any]:
    ids: list[int] = infobox.get("ids") or []
    mid = monster_id
    if mid is None and ids:
        mid = ids[0]
    if mid is None:
        raise ValueError(
            "Could not determine monster id: infobox has no id1.. fields; pass --monster-id"
        )

    name = infobox.get("name") or page_title
    level = infobox.get("level")
    if level is None:
        raise ValueError("Could not read combat level from infobox (|combat=)")

    return {
        "id": mid,
        "name": name,
        "level": level,
        "drops": drops,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--url",
        help="Full wiki article URL (e.g. https://oldschool.runescape.wiki/w/Vyrewatch_Sentinel)",
    )
    ap.add_argument(
        "--title",
        help="MediaWiki page title instead of --url (e.g. Vyrewatch Sentinel)",
    )
    ap.add_argument(
        "--prices-json",
        default="gearsim/public/data/prices.json",
        help="Path to prices.json for item id and GP value (default: gearsim/public/data/prices.json)",
    )
    ap.add_argument(
        "--no-prices",
        action="store_true",
        help="Omit ``value`` from output; still resolve ``id`` from prices.json",
    )
    ap.add_argument(
        "--monster-id",
        type=int,
        default=None,
        help="Override monster npc id (default: first |idN= from infobox)",
    )
    ap.add_argument(
        "--loot-json",
        type=Path,
        default=None,
        help="Loot array JSON to merge into (default: gearsim/public/data/loot.json beside this script)",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not write loot.json; print the single merged entry JSON to stdout",
    )
    ap.add_argument(
        "--warn-missing",
        action="store_true",
        help="Print drop item names not found in prices.json to stderr",
    )
    args = ap.parse_args()

    if bool(args.url) == bool(args.title):
        ap.error("Provide exactly one of --url or --title")

    title = page_title_from_url(args.url) if args.url else args.title.strip()
    if not title:
        ap.error("Empty page title")

    try:
        raw = fetch(raw_wikitext_url(title))
        html = fetch(render_html_url(title))
    except urllib.error.HTTPError as e:
        print(f"HTTP error fetching wiki: {e}", file=sys.stderr)
        sys.exit(1)

    infobox = parse_infobox_monster(raw)
    drops = parse_item_drop_tables(html)
    if not drops:
        print(
            "No item-drops tables found. The page layout may have changed, or this is not a monster drops page.",
            file=sys.stderr,
        )
        sys.exit(2)

    catalog = load_prices_catalog(args.prices_json)
    warns = attach_ids_and_values(
        drops,
        catalog,
        include_values=not args.no_prices,
    )
    if args.warn_missing:
        for w in warns:
            print(w, file=sys.stderr)

    if warns and not args.warn_missing:
        print(
            "Warning: some items were not found in prices.json (null id). "
            "Use --warn-missing to list them.",
            file=sys.stderr,
        )

    entry = build_entry(
        page_title=title,
        infobox=infobox,
        drops=drops,
        monster_id=args.monster_id,
    )

    loot_path = args.loot_json if args.loot_json is not None else default_loot_json_path()
    entry_for_loot = entry_without_item_values(entry)

    if args.dry_run:
        sys.stdout.write(json.dumps(entry_for_loot, indent=2, ensure_ascii=False) + "\n")
        return

    replaced = merge_loot_entry(loot_path, entry_for_loot)
    action = "Updated" if replaced else "Appended"
    print(
        f"{action} {loot_path} (monster id={entry_for_loot['id']}, name={entry_for_loot['name']!r})",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
