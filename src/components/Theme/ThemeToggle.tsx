"use client";

import { ReactNode } from "react";
import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMode } from "@/types";
import { useThemeMode } from "./ThemeProvider";

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof SunMedium;
}> = [
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "system", label: "System", icon: LaptopMinimal },
];

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { mode } = useThemeMode();

  if (compact) {
    return (
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1 shadow-[var(--shadow-soft)]"
        title="Toggle workspace theme"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ThemeToggleButton
              key={option.value}
              active={mode === option.value}
              value={option.value}
              label={option.label}
              compact
            >
              <Icon className="h-4 w-4" />
            </ThemeToggleButton>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Color theme" className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <ThemeToggleButton
            key={option.value}
            active={mode === option.value}
            value={option.value}
            label={option.label}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </ThemeToggleButton>
        );
      })}
    </div>
  );
}

function ThemeToggleButton({
  active,
  value,
  children,
  label,
  compact = false,
}: {
  active: boolean;
  value: ThemeMode;
  children: ReactNode;
  label: string;
  compact?: boolean;
}) {
  const { setMode } = useThemeMode();

  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size={compact ? "icon" : "sm"}
      className={active ? "rounded-full ring-2 ring-[var(--accent)]/40" : "rounded-full"}
      onClick={() => setMode(value)}
      aria-label={`Switch to ${label} theme`}
      role="radio"
      aria-checked={active}
      title={`Switch to ${label} theme`}
    >
      {children}
    </Button>
  );
}
