"use client";

import { Droplets, Map, Satellite } from "lucide-react";
import { GlobeViewMode, SubsurfaceRenderMode } from "@/types";
import { Button } from "@/components/ui/button";

const VIEW_OPTIONS: Array<{
  mode: GlobeViewMode;
  label: string;
  icon: typeof Satellite;
}> = [
  { mode: "satellite", label: "Satellite", icon: Satellite },
  { mode: "road", label: "Road", icon: Map },
  { mode: "water-terrain", label: "Water / terrain", icon: Droplets },
];

interface GlobeViewSelectorProps {
  globeViewMode: GlobeViewMode;
  onChange: (mode: GlobeViewMode) => void;
  subsurfaceRenderMode: SubsurfaceRenderMode;
}

export function GlobeViewSelector({
  globeViewMode,
  onChange,
  subsurfaceRenderMode,
}: GlobeViewSelectorProps) {
  return (
    <div className="glass-panel absolute left-4 top-4 z-10 w-[320px] rounded-3xl p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Globe view</div>
          <div className="mt-1 text-sm text-[var(--foreground-soft)]">
            Change the Earth view without resetting overlays or workspace state.
          </div>
        </div>
        <div
          className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]"
          title="Surface only disables subsurface datasets and terrain exaggeration for a cleaner globe view."
        >
          {subsurfaceRenderMode.replace("_", " ")}
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
              onClick={() => onChange(option.mode)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
