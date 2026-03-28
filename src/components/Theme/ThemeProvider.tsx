"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ThemeMode } from "@/types";

const STORAGE_KEY = "geosight.theme-mode.v1";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: Exclude<ThemeMode, "system">;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Exclude<ThemeMode, "system"> {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }

  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<Exclude<ThemeMode, "system">>("dark");

  useEffect(() => {
    const nextMode = readStoredThemeMode();
    const nextResolved = nextMode === "system" ? getSystemTheme() : nextMode;
    setModeState(nextMode);
    setResolvedTheme(nextResolved);
    document.documentElement.dataset.theme = nextResolved;
    document.documentElement.style.colorScheme = nextResolved;
  }, []);

  useEffect(() => {
    const nextResolved = mode === "system" ? getSystemTheme() : mode;
    setResolvedTheme(nextResolved);
    document.documentElement.dataset.theme = nextResolved;
    document.documentElement.style.colorScheme = nextResolved;

    if (mode === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      const nextResolved = media.matches ? "light" : "dark";
      setResolvedTheme(nextResolved);
      document.documentElement.dataset.theme = nextResolved;
      document.documentElement.style.colorScheme = nextResolved;
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode: setModeState,
    }),
    [mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeProvider.");
  }

  return context;
}
