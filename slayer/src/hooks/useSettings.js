import { useState } from "react";

const STORAGE_KEY = "slayer.settings.v1";

export const DEFAULT_SETTINGS = {
  // Composite-score percentile thresholds
  skipThreshold: 25,
  extendThreshold: 70,
  speedupThreshold: 40,
  // Minutes/hours
  longTaskHours: 2,
  // Weighting for composite score
  xpWeight: 0.6,
  gpWeight: 0.4,
  // Absolute thresholds used when fewer than 2 tasks are logged
  absoluteMinXpHr: 20000,
  absoluteGoodXpHr: 60000,
  absoluteMinGpHr: -50000,
  absoluteGoodGpHr: 200000,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  function updateSetting(key, value) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    save(DEFAULT_SETTINGS);
  }

  return { settings, updateSetting, resetSettings };
}
