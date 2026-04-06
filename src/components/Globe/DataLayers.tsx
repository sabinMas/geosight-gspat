"use client";

import { useEffect, useRef, useState } from "react";
import { Layers3, X } from "lucide-react";
import { LayerToggle } from "@/components/Shell/LayerToggle";
import { Button } from "@/components/ui/button";

export interface LayerState {
  water: boolean;
  power: boolean;
  roads: boolean;
  heatmap: boolean;
}

interface DataLayersProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
}

function isTypingContext() {
  const activeElement = document.activeElement;
  const activeTagName = activeElement?.tagName;

  return (
    activeTagName === "INPUT" ||
    activeTagName === "TEXTAREA" ||
    activeElement instanceof HTMLSelectElement ||
    activeElement?.getAttribute("contenteditable") === "true"
  );
}

export function DataLayers({ layers, onChange }: DataLayersProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!open || !rootRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || rootRef.current.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (!isTypingContext() && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="absolute bottom-10 right-4 z-20">
      <div className="relative">
        {open ? (
          <div className="glass-panel absolute bottom-14 right-0 z-10 w-[300px] rounded-3xl p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  Active Layers
                </div>
                <div className="mt-1 text-sm text-[var(--foreground-soft)]">
                  Toggle map overlays without resetting the active place.
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Close active layers panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <LayerToggle
                label="Water bodies"
                enabled={layers.water}
                onToggle={() => onChange({ ...layers, water: !layers.water })}
                accentClassName="text-cyan-300"
              />
              <LayerToggle
                label="Power"
                enabled={layers.power}
                onToggle={() => onChange({ ...layers, power: !layers.power })}
                accentClassName="text-amber-300"
              />
              <LayerToggle
                label="Roads"
                enabled={layers.roads}
                onToggle={() => onChange({ ...layers, roads: !layers.roads })}
                accentClassName="text-[var(--foreground-soft)]"
              />
              <LayerToggle
                label="Elevation heat"
                enabled={layers.heatmap}
                onToggle={() => onChange({ ...layers, heatmap: !layers.heatmap })}
                accentClassName="text-rose-300"
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Layers3 className="mr-2 h-4 w-4" />
          Layers
          <kbd className="ml-2 rounded border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
            L
          </kbd>
        </Button>
      </div>
    </div>
  );
}
