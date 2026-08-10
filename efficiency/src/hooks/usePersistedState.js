import { useEffect, useRef, useState } from "react";

/**
 * Persist React state to localStorage with a short debounce.
 * Caller supplies the initial value (including any localStorage hydrate + validate).
 *
 * @template T
 * @param {string} key
 * @param {T | (() => T)} initial
 * @param {number} [debounceMs=200]
 * @returns {[T, import("react").Dispatch<import("react").SetStateAction<T>>]}
 */
export function usePersistedState(key, initial, debounceMs = 200) {
  const [state, setState] = useState(() =>
    typeof initial === "function" ? initial() : initial
  );

  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // quota / private mode — ignore
      }
    }, debounceMs);
    return () => clearTimeout(timer.current);
  }, [key, state, debounceMs]);

  return [state, setState];
}
