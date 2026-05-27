# OSRS Gear Simulator

Vite + React app: melee DPS / TTK, gear optimization with an ownership + GP budget model, and loot-based GP/hr (expected values).

## Data refresh

Game data is generated into `public/data/` (no network at build time):

```bash
npm run build:data
```

Bundled JSON shapes (see `public/data/`):

- **monsters.json** — array of `{ id, name, version, skills: { hp, def, … }, defensive: { stab, slash, crush } }`.
- **items.json** — array of `{ id, name, slot, offensive, bonuses, speed }` (numeric `id`).
- **prices.json** — array of `{ id, name, value }` (`value` = GP for loot EV).
- **loot.json** — array of `{ id, name, drops: [ { table_name, items: [{ id, name, quantity, rarity }] } ] }` (`rarity` = `[hits, rolls]` drop rate).

Edit `scripts/build-data.mjs` if you regenerate curated subsets. For full coverage, replace with a pipeline that emits the same field names (`meta.schemaVersion` documents revisions).

## Commands

| Command | Description |
|--------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production bundle (does not overwrite `public/data`) |
| `npm test` | Vitest (melee engine golden checks) |
