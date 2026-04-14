# Tangleroot Tracker

OSRS farming pet probability logger. Track your daily harvests, visualise your cumulative drop chance, and see exactly where you sit on the P-curve.

## Setup

Requires Node.js 18+.

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
```

## Features

- Log each harvest day with exact patch counts
- Daily chance calculated per OSRS Wiki base chances (formula: 1 / (base − level×25))
- Cumulative probability tracked across all logged days
- **Charts tab:**
  - Luck gauge — see where you sit among all players doing your route
  - P-curve — your actual cumulative probability vs the expected geometric curve, with p50/p90 thresholds
  - Daily chance bar chart with average reference line
  - Histogram of daily % distribution across all logged days
- Data persists in browser localStorage automatically
- Export as JSON (re-importable) or CSV (for spreadsheets)
- Import JSON: merge or replace

## Base chances (OSRS Wiki)

| Patch        | Base   |
|-------------|--------|
| Herb        | 12,150 |
| Cactus      | 14,833 |
| Maple       | 20,000 |
| Papaya      | 9,000  |
| Calquat     | 6,000  |
| Ironwood    | 15,000 |
| Redwood     | 5,000  |
| Seaweed     | 7,500  |
| Mushroom    | 7,500  |
| Hespori     | 4,950 (level-independent) |
