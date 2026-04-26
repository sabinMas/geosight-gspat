"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LucideIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WorkspaceCommandItem {
  id: string;
  label: string;
  description: string;
  section: "Actions" | "Quick regions" | "Panels" | "Lenses";
  Icon: LucideIcon;
  keywords?: string;
}

interface WorkspaceCommandPaletteProps {
  open: boolean;
  items: WorkspaceCommandItem[];
  onClose: () => void;
  onSelect: (item: WorkspaceCommandItem) => void;
}

const SECTION_ORDER: WorkspaceCommandItem["section"][] = [
  "Actions",
  "Quick regions",
  "Panels",
  "Lenses",
];

export function WorkspaceCommandPalette({
  open,
  items,
  onClose,
  onSelect,
}: WorkspaceCommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      [item.label, item.description, item.section, item.keywords ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  const groupedItems = useMemo(
    () =>
      SECTION_ORDER.map((section) => ({
        section,
        items: filteredItems.filter((item) => item.section === section),
      })).filter((group) => group.items.length > 0),
    [filteredItems],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setSelectedIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (selectedIndex < filteredItems.length) {
      return;
    }

    setSelectedIndex(filteredItems.length > 0 ? filteredItems.length - 1 : 0);
  }, [filteredItems.length, selectedIndex]);

  if (!open) {
    return null;
  }

  const handleSelect = (item: WorkspaceCommandItem) => {
    onSelect(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[var(--background)]/72 px-4 pb-8 pt-20 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
        role="dialog"
        aria-modal="true"
        aria-label="Workspace command palette"
      >
        <div className="border-b border-[color:var(--border-soft)] p-3">
          <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((current) =>
                    filteredItems.length === 0 ? 0 : (current + 1) % filteredItems.length,
                  );
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((current) =>
                    filteredItems.length === 0
                      ? 0
                      : (current - 1 + filteredItems.length) % filteredItems.length,
                  );
                  return;
                }

                if (event.key === "Enter") {
                  const item = filteredItems[selectedIndex];
                  if (!item) {
                    return;
                  }

                  event.preventDefault();
                  handleSelect(item);
                }
              }}
              placeholder="Search actions, tools, quick regions, and panels"
              className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus:bg-transparent"
            />
          </div>
        </div>

        <div className="max-h-[min(70vh,42rem)] overflow-y-auto p-3">
          {groupedItems.length > 0 ? (
            <div className="space-y-4">
              {groupedItems.map((group) => (
                <section key={group.section} className="space-y-2">
                  <div className="px-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    {group.section}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const absoluteIndex = filteredItems.findIndex(
                        (candidate) => candidate.id === item.id,
                      );
                      const isSelected = absoluteIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
                            isSelected
                              ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                              : "border-transparent bg-[var(--surface-soft)] text-[var(--foreground)] hover:border-[color:var(--border-soft)] hover:bg-[var(--surface-raised)]",
                          )}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                          onClick={() => handleSelect(item)}
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                              isSelected
                                ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)]/10"
                                : "border-[color:var(--border-soft)] bg-[var(--surface-panel)]",
                            )}
                          >
                            <item.Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{item.label}</div>
                            <div
                              className={cn(
                                "mt-1 text-sm",
                                isSelected
                                  ? "text-[var(--accent-foreground)]/85"
                                  : "text-[var(--muted-foreground)]",
                              )}
                            >
                              {item.description}
                            </div>
                          </div>
                          <ArrowRight
                            className={cn(
                              "mt-1 h-4 w-4 shrink-0",
                              isSelected ? "text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)]",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
              No matches for <span className="font-medium">&ldquo;{query}&rdquo;</span>.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
          <span>Cmd/Ctrl+K to reopen</span>
          <span>Use ↑ ↓ to move, Enter to run, Esc to close</span>
        </div>
      </div>
    </div>
  );
}
