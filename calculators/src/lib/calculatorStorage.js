/** Legacy shared GP/hr key (older builds); migrated into per-page snapshots. */
const LEGACY_GPHR_KEY = 'osrsCalcGphr';

/** Shared across Prayer / Herblore / Training: credit profitable GP/XP as negative gather time. */
const PROFIT_TIME_CREDIT_KEY = 'osrs-calculators-profit-time-credit';

export function loadProfitTimeCredit() {
  try {
    const v = localStorage.getItem(PROFIT_TIME_CREDIT_KEY);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export function saveProfitTimeCredit(enabled) {
  try {
    localStorage.setItem(PROFIT_TIME_CREDIT_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const CALCULATOR_STORAGE_KEYS = {
  prayer: 'osrs-calculators-prayer-v1',
  herblore: 'osrs-calculators-herblore-v1',
  training: 'osrs-calculators-training-v1',
};

/**
 * Load a JSON object from localStorage merged with defaults.
 * Fills `gphr` from legacy key when missing so existing users keep their rate.
 */
export function loadCalculatorSnapshot(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...defaults, ...parsed };
    const g = Number(merged.gphr);
    if (!Number.isFinite(g) || g < 0) {
      try {
        const legacy = localStorage.getItem(LEGACY_GPHR_KEY);
        const n = Number(legacy);
        merged.gphr = Number.isFinite(n) && n >= 0 ? n : defaults.gphr;
      } catch {
        merged.gphr = defaults.gphr;
      }
    } else {
      merged.gphr = g;
    }
    return merged;
  } catch {
    return { ...defaults };
  }
}

/**
 * Persist calculator page state. Also updates legacy GP/hr key so older links stay coherent.
 */
export function saveCalculatorSnapshot(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    const g = Number(data.gphr);
    if (Number.isFinite(g) && g >= 0) {
      localStorage.setItem(LEGACY_GPHR_KEY, String(g));
    }
  } catch {
    /* quota / private mode */
  }
}
