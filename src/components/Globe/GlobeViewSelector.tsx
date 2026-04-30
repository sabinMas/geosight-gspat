"use client";

import { useEffect, useRef, useState } from "react";
import { Droplets, Map, Satellite, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobeViewMode, SubsurfaceRenderMode } from "@/types";

const VIEW_OPTIONS: Array<{
  mode: GlobeViewMode;
  label: string;
  icon: typeof Satellite;
}> = [
  { mode: "satellite", label: "Satellite", icon: Satellite },
  { mode: "road", label: "Road", icon: Map },
  { mode: "water-terrain", label: "Terrain", icon: Droplets },
];

interface GlobeViewSelectorProps {
  globeViewMode: GlobeViewMode;
  onChange: (mode: GlobeViewMode) => void;
  subsurfaceRenderMode: SubsurfaceRenderMode;
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

export function GlobeViewSelector({
  globeViewMode,
  onChange,
  subsurfaceRenderMode,
}: GlobeViewSelectorProps) {
  const [globeViewOpen, setGlobeViewOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!globeViewOpen || !rootRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || rootRef.current.contains(target)) {
        return;
      }

      setGlobeViewOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGlobeViewOpen(false);
        return;
      }

      if (!isTypingContext() && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setGlobeViewOpen((current) => !current);
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
  }, [globeViewOpen]);

  return (
    <div ref={rootRef} className="absolute left-4 top-4 z-20">
      {globeViewOpen ? (
        <button
          type="button"
          aria-label="Dismiss map style menu"
          className="fixed inset-0 z-0 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setGlobeViewOpen(false)}
        />
      ) : null}

      <div className="relative z-10">
        <Button
          type="button"
          variant="secondary"
          className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
          aria-expanded={globeViewOpen}
          aria-controls="geosight-map-style-menu"
          onClick={() => setGlobeViewOpen((current) => !current)}
        >
          <Satellite className="mr-2 h-4 w-4" />
          Map Style
          <kbd className="ml-2 rounded border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
            M
          </kbd>
        </Button>

        {globeViewOpen ? (
          <div
            id="geosight-map-style-menu"
            className="absolute left-0 top-14 z-10 w-[320px] rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 shadow-[var(--shadow-panel)] backdrop-blur-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Map Style</div>
                <div className="mt-1 text-sm text-[var(--foreground-soft)]">
                  Change the Earth view without resetting overlays or workspace state.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]"
                  title="Surface only disables subsurface datasets and terrain exaggeration for a cleaner globe view."
                >
                  {subsurfaceRenderMode.replace("_", " ")}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setGlobeViewOpen(false)}
                  aria-label="Close map style menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.mode === globeViewMode;

                return (
                  <Button
                    key={option.mode}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "secondary"}
                    className="justify-start rounded-2xl"
                    aria-pressed={active}
                    title={`Switch to ${option.label} globe view`}
                    onClick={() => {
                      onChange(option.mode);
                      setGlobeViewOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
