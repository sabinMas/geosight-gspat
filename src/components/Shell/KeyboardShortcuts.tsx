"use client";

import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const KEYBOARD_SHORTCUTS = [
  { keys: "Cmd/Ctrl + K", description: "Open the command palette" },
  { keys: "Escape", description: "Close the active panel or cancel drawing" },
  { keys: "1-5", description: "Switch mission lens" },
  { keys: "D", description: "Toggle drawing mode" },
  { keys: "L", description: "Toggle the layers panel" },
  { keys: "M", description: "Toggle measurement mode" },
  { keys: "F", description: "Fly to the current location" },
  { keys: "?", description: "Show keyboard shortcuts" },
] as const;

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(4,10,18,0.72)] p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />

      <section
        className="relative z-10 w-full max-w-2xl rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div>
            <div className="eyebrow">Help</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
              <Keyboard className="h-5 w-5 text-[var(--accent)]" />
              Keyboard shortcuts
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Move faster through the workspace with these shortcuts.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close keyboard shortcuts"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 px-5 py-5">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3"
            >
              <span className="text-sm text-[var(--foreground-soft)]">
                {shortcut.description}
              </span>
              <kbd className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1 font-[var(--font-jetbrains-mono)] text-xs text-[var(--foreground)]">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
