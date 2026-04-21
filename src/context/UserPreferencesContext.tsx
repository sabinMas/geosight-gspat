"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "geosight.user-preferences.v1";

export interface UserPreferences {
  accentColor: string | null; // null = use theme default
  fontScale: number;          // 0.9 | 1 | 1.15
}

interface UserPreferencesContextValue {
  prefs: UserPreferences;
  setAccentColor: (hex: string | null) => void;
  setFontScale: (scale: number) => void;
}

const DEFAULTS: UserPreferences = { accentColor: null, fontScale: 1 };

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

function readStored(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      accentColor: typeof parsed.accentColor === "string" ? parsed.accentColor : null,
      fontScale: typeof parsed.fontScale === "number" ? parsed.fontScale : 1,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeStored(prefs: UserPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  return [r, g, b]
    .map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); })
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function applyAccentToDOM(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const { r, g, b } = rgb;
  const fg = luminance(rgb) > 0.4 ? "#0a1a2a" : "#eefcff";
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.14)`);
  root.style.setProperty("--accent-strong", `rgba(${r},${g},${b},0.34)`);
  root.style.setProperty("--accent-hover", `rgba(${r},${g},${b},0.20)`);
  root.style.setProperty("--accent-foreground", fg);
  root.style.setProperty("--ring", `rgba(${r},${g},${b},0.46)`);
  root.style.setProperty("--border-strong", `rgba(${r},${g},${b},0.34)`);
  root.style.setProperty("--color-primary", hex);
  root.style.setProperty("--evidence-derived-bg", `rgba(${r},${g},${b},0.10)`);
  root.style.setProperty("--evidence-derived-border", `rgba(${r},${g},${b},0.28)`);
}

function clearAccentFromDOM() {
  [
    "--accent", "--accent-soft", "--accent-strong", "--accent-hover",
    "--accent-foreground", "--ring", "--border-strong", "--color-primary",
    "--evidence-derived-bg", "--evidence-derived-border",
  ].forEach((p) => document.documentElement.style.removeProperty(p));
}

function applyFontScaleToDOM(scale: number) {
  document.documentElement.style.setProperty("--font-scale", String(scale));
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);

  // Hydrate from storage and apply CSS vars on mount
  useEffect(() => {
    const stored = readStored();
    setPrefs(stored);
    if (stored.accentColor) applyAccentToDOM(stored.accentColor);
    applyFontScaleToDOM(stored.fontScale);
  }, []);

  const setAccentColor = useCallback((hex: string | null) => {
    setPrefs((prev) => {
      const next = { ...prev, accentColor: hex };
      writeStored(next);
      hex ? applyAccentToDOM(hex) : clearAccentFromDOM();
      return next;
    });
  }, []);

  const setFontScale = useCallback((scale: number) => {
    setPrefs((prev) => {
      const next = { ...prev, fontScale: scale };
      writeStored(next);
      applyFontScaleToDOM(scale);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ prefs, setAccentColor, setFontScale }),
    [prefs, setAccentColor, setFontScale],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  return ctx;
}
