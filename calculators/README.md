# OSRS calculators (Vite + React)

Unified **Prayer**, **Herblore**, and **Training** optimizers with shared GP/XP semantics, chart filtering, and live recalculation.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output → dist/
npm run lint
npm test         # node:test on src/lib/*.test.js
```

## Deploy (GitHub Pages)

The repo workflow copies `dist/` into `_site/calculators/`. Hash routes work without server rewrites (`#/prayer`, `#/herblore`, `#/training`).

Legacy paths `prayer/`, `herblore/`, and `training/` redirect to this app.
