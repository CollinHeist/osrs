import { useState } from "react";

const STORAGE_KEY = "slayer.globalPotions.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(potions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(potions));
  } catch {
    // ignore
  }
}

export function useGlobalPotions() {
  const [globalPotions, setGlobalPotions] = useState(load);

  function addGlobalPotion(data = {}) {
    const potion = {
      id: crypto.randomUUID(),
      name: data.name ?? "",
      costPerDose: data.costPerDose ?? 0,
      minutesPerDose: data.minutesPerDose ?? 0,
    };
    setGlobalPotions((prev) => {
      const next = [...prev, potion];
      save(next);
      return next;
    });
    return potion;
  }

  function updateGlobalPotion(id, changes) {
    setGlobalPotions((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...changes } : p));
      save(next);
      return next;
    });
  }

  function deleteGlobalPotion(id) {
    setGlobalPotions((prev) => {
      const next = prev.filter((p) => p.id !== id);
      save(next);
      return next;
    });
  }

  return { globalPotions, addGlobalPotion, updateGlobalPotion, deleteGlobalPotion };
}
