"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * Like useState, but remembers the last value in localStorage (shared across
 * pages/reloads by key) — used for filters like date range or platform so
 * they don't reset every time you navigate.
 *
 * Starts at `defaultValue` (safe for SSR, avoids hydration mismatches), then
 * syncs from localStorage right after mount.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw));
    } catch {
      // ignore malformed/inaccessible storage — fall back to defaultValue
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback((v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // storage unavailable (private browsing, quota) — value still works in-memory
    }
  }, [key]);

  return [value, update];
}
