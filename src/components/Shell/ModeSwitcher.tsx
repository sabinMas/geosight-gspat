"use client";

import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { isExplorerMode } from "@/lib/app-mode";
import type { AppMode } from "@/types";

interface ModeSwitcherProps {
  mode: AppMode;
  onSetMode: (mode: AppMode) => void;
}

export function ModeSwitcher({ mode, onSetMode }: ModeSwitcherProps) {
  const inExplorer = isExplorerMode(mode);

  return (
    <button
      type="button"
      onClick={() => onSetMode(inExplorer ? "pro" : "explorer")}
      aria-label={inExplorer ? "Switch to Pro mode" : "Switch to Explorer mode"}
      aria-pressed={!inExplorer}
      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
      title={
        inExplorer
          ? "Switch to Pro mode for scoring, factor breakdown, and advanced analysis tools."
          : "Switch back to Explorer mode for a simplified, plain-English view."
      }
    >
      {inExplorer ? (
        <>
          Pro workspace
          <ArrowUpRight className="h-3.5 w-3.5" />
        </>
      ) : (
        <>
          <ChevronLeft className="h-3.5 w-3.5" />
          Explorer
        </>
      )}
    </button>
  );
}
