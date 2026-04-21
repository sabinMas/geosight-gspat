"use client";

import { Check, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { cn } from "@/lib/utils";

// ── Accent color presets ──────────────────────────────────────────────────────

const ACCENT_PRESETS: Array<{ label: string; hex: string | null }> = [
  { label: "Default",  hex: null       },
  { label: "Cyan",     hex: "#53ddff"  },
  { label: "Blue",     hex: "#60a5fa"  },
  { label: "Purple",   hex: "#a78bfa"  },
  { label: "Green",    hex: "#34d399"  },
  { label: "Amber",    hex: "#fbbf24"  },
  { label: "Orange",   hex: "#fb923c"  },
  { label: "Pink",     hex: "#f472b6"  },
];

// ── Font scale options ────────────────────────────────────────────────────────

const FONT_SCALE_OPTIONS: Array<{ label: string; value: number; description: string }> = [
  { label: "S", value: 0.9,  description: "Small"   },
  { label: "M", value: 1,    description: "Default" },
  { label: "L", value: 1.15, description: "Large"   },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { prefs, setAccentColor, setFontScale } = useUserPreferences();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(4,10,18,0.72)] p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close settings"
        onClick={onClose}
      />

      <section
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div>
            <div className="eyebrow">Workspace</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
              <Settings className="h-5 w-5 text-[var(--accent)]" />
              Settings
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-7 p-5">

          {/* ── Theme ── */}
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Theme
            </div>
            <ThemeToggle />
          </div>

          {/* ── Accent color ── */}
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Accent color
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Accent color">
              {ACCENT_PRESETS.map((preset) => {
                const isActive = prefs.accentColor === preset.hex;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${preset.label} accent color`}
                    onClick={() => setAccentColor(preset.hex)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
                      isActive
                        ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)]"
                        : "border-[color:var(--border-soft)] bg-[var(--surface-soft)] hover:bg-[var(--surface-raised)]",
                    )}
                  >
                    {/* Swatch */}
                    <span
                      className="relative flex h-7 w-7 items-center justify-center rounded-full border-2"
                      style={
                        preset.hex
                          ? { backgroundColor: preset.hex, borderColor: preset.hex }
                          : {
                              background: "conic-gradient(from 0deg, #53ddff, #a78bfa, #34d399, #fb923c, #53ddff)",
                              borderColor: "var(--border-strong)",
                            }
                      }
                    >
                      {isActive && (
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: preset.hex ? "#0a1a2a" : "var(--foreground)" }}
                        />
                      )}
                    </span>
                    <span className={cn(
                      "text-[11px] leading-none",
                      isActive
                        ? "font-medium text-[var(--accent-foreground)]"
                        : "text-[var(--muted-foreground)]",
                    )}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Text size ── */}
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Text size
            </div>
            <div
              className="flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1"
              role="radiogroup"
              aria-label="Text size"
            >
              {FONT_SCALE_OPTIONS.map((option) => {
                const isActive = prefs.fontScale === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${option.description} text size`}
                    onClick={() => setFontScale(option.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
                      isActive
                        ? "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <span
                      className="font-semibold leading-none"
                      style={{ fontSize: `${option.value * 0.875}rem` }}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs">{option.description}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Scales all text in the workspace. Takes effect immediately.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
