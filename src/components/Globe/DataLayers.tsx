"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Flame,
  Layers3,
  Map,
  Mountain,
  Route,
  Satellite,
  ScanSearch,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobeViewMode, LayerState } from "@/types";

const VIEW_OPTIONS: Array<{
  mode: GlobeViewMode;
  label: string;
  description: string;
  icon: typeof Satellite;
}> = [
  {
    mode: "satellite",
    label: "Satellite",
    description: "Aerial imagery with labels for fast orientation.",
    icon: Satellite,
  },
  {
    mode: "road",
    label: "Road",
    description: "Clean street-forward basemap for travel and access checks.",
    icon: Map,
  },
  {
    mode: "water-terrain",
    label: "Terrain",
    description: "Hillshade-style terrain view for relief and topo cues.",
    icon: Mountain,
  },
];

type OverlayLayerKey = "roads" | "fires" | "floodZones" | "contours" | "aoi";
type LayerStatusNotice = {
  tone: "info" | "warning";
  label: string;
  description: string;
};

const OVERLAY_OPTIONS: Array<{
  key: OverlayLayerKey;
  label: string;
  description: string;
  icon: typeof Route;
  accentClassName: string;
}> = [
  {
    key: "roads",
    label: "OSM roads",
    description: "Transparent road and label overlay above imagery.",
    icon: Route,
    accentClassName: "text-cyan-100",
  },
  {
    key: "fires",
    label: "NASA FIRMS fires",
    description: "Recent active fire detections near the current place.",
    icon: Flame,
    accentClassName: "text-orange-100",
  },
  {
    key: "floodZones",
    label: "Flood context",
    description: "FEMA flood imagery where available, with global fallback context in analysis.",
    icon: Waves,
    accentClassName: "text-sky-100",
  },
  {
    key: "contours",
    label: "Elevation contours",
    description: "Topo-style contour overlay for relief, ridgelines, and drainages.",
    icon: Mountain,
    accentClassName: "text-emerald-100",
  },
  {
    key: "aoi",
    label: "Drawn AOI",
    description: "Show or hide the GeoJSON shapes used for downstream analysis.",
    icon: ScanSearch,
    accentClassName: "text-teal-100",
  },
];

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

function ToggleSwitch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border transition",
        enabled
          ? "border-cyan-300/40 bg-cyan-400/80"
          : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
      )}
    >
      <span
        className={cn(
          "mx-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
          enabled ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function OpacitySlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={10}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value) / 100)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-soft)] accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Overlay opacity"
      />
      <span className="w-10 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function formatScaleLabel(metersPerPixel: number | null | undefined) {
  if (metersPerPixel === null || metersPerPixel === undefined || Number.isNaN(metersPerPixel)) {
    return null;
  }

  return metersPerPixel >= 1000
    ? `${(metersPerPixel / 1000).toFixed(1)} km/pixel`
    : `${Math.round(metersPerPixel)} m/pixel`;
}

function getOverlayStatusNotice(
  key: OverlayLayerKey,
  enabled: boolean,
  globeViewMode: GlobeViewMode,
  overlayMetersPerPixel: number | null | undefined,
): LayerStatusNotice | null {
  if (!enabled || key === "aoi") {
    return null;
  }

  if (key === "roads" && globeViewMode === "road") {
    return {
      tone: "info",
      label: "Road basemap active",
      description: "Road detail is already visible in the current basemap, so the separate OSM roads overlay stays idle.",
    };
  }

  const threshold =
    key === "roads"
      ? 700
      : key === "contours"
        ? 900
        : key === "floodZones"
          ? 2200
          : key === "fires"
            ? 2500
            : null;

  if (
    threshold !== null &&
    overlayMetersPerPixel !== null &&
    overlayMetersPerPixel !== undefined &&
    overlayMetersPerPixel > threshold
  ) {
    const scaleLabel = formatScaleLabel(overlayMetersPerPixel);
    return {
      tone: "warning",
      label: "Zoom in to load",
      description:
        key === "roads"
          ? `OSM roads and labels wait for street-scale zoom. ${scaleLabel ? `Current camera scale is about ${scaleLabel}.` : ""}`.trim()
          : key === "contours"
            ? `Contours wait for a tighter terrain-scale view. ${scaleLabel ? `Current camera scale is about ${scaleLabel}.` : ""}`.trim()
            : key === "floodZones"
              ? `Flood imagery waits for a closer parcel or neighborhood view. ${scaleLabel ? `Current camera scale is about ${scaleLabel}.` : ""}`.trim()
              : `Fire detections wait for a closer regional view. ${scaleLabel ? `Current camera scale is about ${scaleLabel}.` : ""}`.trim(),
    };
  }

  return null;
}

interface LayerRowProps {
  label: string;
  description: string;
  icon: typeof Route;
  accentClassName: string;
  enabled: boolean;
  opacity: number;
  statusNotice: LayerStatusNotice | null;
  onToggle: () => void;
  onOpacityChange: (value: number) => void;
}

function LayerRow({
  label,
  description,
  icon: Icon,
  accentClassName,
  enabled,
  opacity,
  statusNotice,
  onToggle,
  onOpacityChange,
}: LayerRowProps) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border p-3 transition",
        enabled
          ? "border-cyan-300/30 bg-cyan-400/10"
          : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]",
              accentClassName,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} label={label} />
      </div>
      <div className="mt-3">
        <OpacitySlider
          value={opacity}
          disabled={!enabled}
          onChange={onOpacityChange}
        />
      </div>
      {statusNotice ? (
        <div
          className={cn(
            "mt-3 rounded-[1rem] border px-3 py-2 text-xs leading-5",
            statusNotice.tone === "warning"
              ? "border-amber-300/25 bg-amber-400/10 text-amber-50"
              : "border-cyan-300/25 bg-cyan-400/10 text-cyan-50",
          )}
        >
          <div className="font-medium uppercase tracking-[0.16em]">{statusNotice.label}</div>
          <div className="mt-1 text-[11px] leading-5 opacity-80">{statusNotice.description}</div>
        </div>
      ) : null}
    </div>
  );
}

interface DataLayersProps {
  layers: LayerState;
  onChange: Dispatch<SetStateAction<LayerState>>;
  globeViewMode: GlobeViewMode;
  onChangeGlobeViewMode: (mode: GlobeViewMode) => void;
  overlayMetersPerPixel?: number | null;
}

export function DataLayers({
  layers,
  onChange,
  globeViewMode,
  onChangeGlobeViewMode,
  overlayMetersPerPixel = null,
}: DataLayersProps) {
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

  const setLayerEnabled = (key: OverlayLayerKey) => {
    onChange((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const setLayerOpacity = (key: keyof LayerState["opacity"], value: number) => {
    onChange((current) => ({
      ...current,
      opacity: {
        ...current.opacity,
        [key]: value,
      },
    }));
  };

  return (
    <div ref={rootRef} className="absolute bottom-4 right-4 z-20">
      <div className="relative">
        {open ? (
          <div className="glass-panel absolute bottom-16 right-0 z-10 flex w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] flex-col rounded-[2rem] p-3 shadow-[var(--shadow-panel)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  Layers and basemap
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--foreground-soft)]">
                  Visible layers stay in sync with exports and lens prompts.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Close layers panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto pr-1">
              <div className="mb-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Basemap
                </div>
                <div className="grid gap-2">
                  {VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = option.mode === globeViewMode;

                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => onChangeGlobeViewMode(option.mode)}
                        className={cn(
                          "flex items-start gap-3 rounded-[1.3rem] border p-3 text-left transition",
                          active
                            ? "border-cyan-300/30 bg-cyan-400/10"
                            : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
                        )}
                        aria-pressed={active}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]",
                            active ? "text-cyan-100" : "text-[var(--muted-foreground)]",
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                            {option.label}
                            {active ? (
                              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-0.5 text-xs uppercase tracking-[0.14em] text-cyan-100">
                                Active
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Overlay stack
                </div>
                <div className="space-y-2">
                  {OVERLAY_OPTIONS.map((option) => (
                    <LayerRow
                      key={option.key}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      accentClassName={option.accentClassName}
                      enabled={layers[option.key]}
                      opacity={layers.opacity[option.key]}
                      statusNotice={getOverlayStatusNotice(
                        option.key,
                        layers[option.key],
                        globeViewMode,
                        overlayMetersPerPixel,
                      )}
                      onToggle={() => setLayerEnabled(option.key)}
                      onOpacityChange={(value) => setLayerOpacity(option.key, value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="min-h-11 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 shadow-[var(--shadow-panel)]"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Layers3 className="mr-2 h-4 w-4" />
          Layers
          <kbd className="ml-2 hidden rounded border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)] sm:inline-flex">
            L
          </kbd>
        </Button>
      </div>
    </div>
  );
}
