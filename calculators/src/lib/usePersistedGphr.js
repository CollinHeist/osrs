import { useState, useEffect } from 'react';

const STORAGE_KEY = 'osrsCalcGphr';
const DEFAULT = 1_000_000;

function readGphr() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/**
 * GP/hour shared across calculator routes (Prayer, Herblore, Training).
 */
export function usePersistedGphr() {
  const [gphr, setGphr] = useState(readGphr);

  useEffect(() => {
    try {
      if (Number.isFinite(gphr) && gphr >= 0) localStorage.setItem(STORAGE_KEY, String(gphr));
    } catch {
      /* ignore quota / private mode */
    }
  }, [gphr]);

  return [gphr, setGphr];
}
