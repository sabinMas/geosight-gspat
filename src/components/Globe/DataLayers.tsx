"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flame,
  Globe,
  GripVertical,
  Layers3,
  Map,
  Mountain,
  Plus,
  Route,
  Satellite,
  ScanSearch,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomLayer, CustomLayerType, GlobeViewMode, LayerState } from "@/types";
import { createCustomLayer } from "@/lib/map-layers";

/* ------------------------------------------------------------------ */
/*  Basemap options                                                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Built-in overlay definitions                                       */
/* ------------------------------------------------------------------ */

type OverlayLayerKey = "roads" | "fires" | "floodZones" | "contours" | "aoi";

const OVERLAY_OPTIONS: Array<{
  key: OverlayLayerKey;
  label: string;
  shortLabel: string;
  icon: typeof Route;
  accentClassName: string;
}> = [
  {
    key: "roads",
    label: "OSM roads",
    shortLabel: "Roads",
    icon: Route,
    accentClassName: "text-cyan-100",
  },
  {
    key: "fires",
    label: "NASA FIRMS fires",
    shortLabel: "Fires",
    icon: Flame,
    accentClassName: "text-orange-100",
  },
  {
    key: "floodZones",
    label: "Flood context",
    shortLabel: "Flood",
    icon: Waves,
    accentClassName: "text-sky-100",
  },
  {
    key: "contours",
    label: "Elevation contours",
    shortLabel: "Contours",
    icon: Mountain,
    accentClassName: "text-emerald-100",
  },
  {
    key: "aoi",
    label: "Drawn AOI",
    shortLabel: "AOI",
    icon: ScanSearch,
    accentClassName: "text-teal-100",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

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
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={10}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-soft)] accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Layer opacity"
      />
      <span className="w-8 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Built-in layer row (compact)                                       */
/* ------------------------------------------------------------------ */

interface BuiltinLayerRowProps {
  label: string;
  icon: typeof Route;
  accentClassName: string;
  enabled: boolean;
  opacity: number;
  onToggle: () => void;
  onOpacityChange: (value: number) => void;
  dragHandleProps?: {
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    draggable: true;
  };
  isDragTarget?: boolean;
}

function BuiltinLayerRow({
  label,
  icon: Icon,
  accentClassName,
  enabled,
  opacity,
  onToggle,
  onOpacityChange,
  dragHandleProps,
  isDragTarget,
}: BuiltinLayerRowProps) {
  return (
    <div
      {...dragHandleProps}
      className={cn(
        "group rounded-xl border p-2.5 transition",
        enabled
          ? "border-cyan-300/20 bg-cyan-400/8"
          : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
        isDragTarget && "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--background)]",
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--muted-foreground)] opacity-40 group-hover:opacity-100 active:cursor-grabbing" />
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]",
            accentClassName,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
          {label}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
            enabled
              ? "text-[var(--accent)]"
              : "text-[var(--muted-foreground)] opacity-50",
          )}
          aria-label={enabled ? `Hide ${label}` : `Show ${label}`}
        >
          {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
      {enabled && (
        <div className="mt-1.5 pl-[calc(0.875rem+0.5rem+1.75rem+0.5rem)]">
          <OpacitySlider
            value={opacity}
            disabled={!enabled}
            onChange={onOpacityChange}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom layer row                                                   */
/* ------------------------------------------------------------------ */

interface CustomLayerRowProps {
  layer: CustomLayer;
  onToggle: () => void;
  onOpacityChange: (value: number) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function CustomLayerRow({
  layer,
  onToggle,
  onOpacityChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: CustomLayerRowProps) {
  return (
    <div
      className={cn(
        "group rounded-xl border p-2.5 transition",
        layer.visible
          ? "border-purple-300/20 bg-purple-400/8"
          : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-[var(--muted-foreground)] disabled:opacity-20"
            aria-label="Move layer up"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="text-[var(--muted-foreground)] disabled:opacity-20"
            aria-label="Move layer down"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-purple-200">
          <Globe className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm text-[var(--foreground)]">
            {layer.name}
          </span>
          <span className="block truncate text-[10px] text-[var(--muted-foreground)]">
            {layer.type.toUpperCase()}
            {layer.wmsLayers ? ` · ${layer.wmsLayers}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
            layer.visible
              ? "text-purple-300"
              : "text-[var(--muted-foreground)] opacity-50",
          )}
          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        >
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] opacity-0 transition hover:text-[var(--danger-foreground)] group-hover:opacity-100"
          aria-label={`Remove ${layer.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {layer.visible && (
        <div className="mt-1.5 pl-[calc(0.75rem+0.5rem+1.75rem+0.5rem)]">
          <OpacitySlider
            value={layer.opacity}
            disabled={!layer.visible}
            onChange={onOpacityChange}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-layer form                                                     */
/* ------------------------------------------------------------------ */

const LAYER_TYPE_OPTIONS: Array<{ value: CustomLayerType; label: string; placeholder: string }> = [
  { value: "wms", label: "WMS", placeholder: "https://example.com/wms?service=WMS" },
  { value: "wmts", label: "WMTS", placeholder: "https://example.com/wmts" },
  { value: "xyz", label: "XYZ tiles", placeholder: "https://tiles.example.com/{z}/{x}/{y}.png" },
];

function AddLayerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (layer: Pick<CustomLayer, "name" | "type" | "url" | "wmsLayers">) => void;
  onCancel: () => void;
}) {
  const [layerType, setLayerType] = useState<CustomLayerType>("wms");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [wmsLayers, setWmsLayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
  }, []);

  const typeOption = LAYER_TYPE_OPTIONS.find((o) => o.value === layerType)!;

  const handleSubmit = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Enter a valid URL");
      return;
    }

    const layerName = name.trim() || trimmedUrl.split("/").pop()?.split("?")[0] || "Untitled layer";

    onAdd({
      name: layerName,
      type: layerType,
      url: trimmedUrl,
      wmsLayers: layerType === "wms" ? wmsLayers.trim() || undefined : undefined,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--accent-strong)] bg-[var(--surface-soft)] p-3">
      <div className="text-xs font-medium text-[var(--foreground)]">Add external layer</div>

      {/* Type selector */}
      <div className="flex gap-1.5">
        {LAYER_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLayerType(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              layerType === opt.value
                ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                : "border-[color:var(--border-soft)] text-[var(--muted-foreground)]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* URL */}
      <input
        ref={urlRef}
        type="url"
        placeholder={typeOption.placeholder}
        value={url}
        onChange={(e) => { setUrl(e.target.value); setError(null); }}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[color:var(--accent)] focus:outline-none"
      />

      {/* WMS layers param */}
      {layerType === "wms" && (
        <input
          type="text"
          placeholder="Layer name(s), e.g. 0,1 or my:layer"
          value={wmsLayers}
          onChange={(e) => setWmsLayers(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[color:var(--accent)] focus:outline-none"
        />
      )}

      {/* Name */}
      <input
        type="text"
        placeholder="Layer name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[color:var(--accent)] focus:outline-none"
      />

      {error && (
        <p className="text-xs text-[var(--danger-foreground)]">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-full text-xs"
          onClick={handleSubmit}
        >
          Add layer
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DataLayers component                                          */
/* ------------------------------------------------------------------ */

interface DataLayersProps {
  layers: LayerState;
  onChange: Dispatch<SetStateAction<LayerState>>;
  globeViewMode: GlobeViewMode;
  onChangeGlobeViewMode: (mode: GlobeViewMode) => void;
}

export function DataLayers({
  layers,
  onChange,
  globeViewMode,
  onChangeGlobeViewMode,
}: DataLayersProps) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
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

  /* Built-in layer mutations */
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

  /* Built-in layer drag-reorder */
  const [builtinOrder, setBuiltinOrder] = useState<OverlayLayerKey[]>(() =>
    OVERLAY_OPTIONS.map((o) => o.key),
  );

  const orderedBuiltins = builtinOrder.map(
    (key) => OVERLAY_OPTIONS.find((o) => o.key === key)!,
  );

  const handleBuiltinDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleBuiltinDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleBuiltinDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setBuiltinOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleBuiltinDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /* Custom layer mutations */
  const addCustomLayer = useCallback(
    (params: Pick<CustomLayer, "name" | "type" | "url" | "wmsLayers">) => {
      onChange((current) => ({
        ...current,
        customLayers: [
          ...current.customLayers,
          createCustomLayer(params, current.customLayers),
        ],
      }));
      setShowAddForm(false);
    },
    [onChange],
  );

  const removeCustomLayer = (id: string) => {
    onChange((current) => ({
      ...current,
      customLayers: current.customLayers.filter((l) => l.id !== id),
    }));
  };

  const toggleCustomLayer = (id: string) => {
    onChange((current) => ({
      ...current,
      customLayers: current.customLayers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      ),
    }));
  };

  const setCustomLayerOpacity = (id: string, opacity: number) => {
    onChange((current) => ({
      ...current,
      customLayers: current.customLayers.map((l) =>
        l.id === id ? { ...l, opacity } : l,
      ),
    }));
  };

  const moveCustomLayer = (id: string, direction: -1 | 1) => {
    onChange((current) => {
      const idx = current.customLayers.findIndex((l) => l.id === id);
      if (idx < 0) return current;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= current.customLayers.length) return current;
      const next = [...current.customLayers];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...current, customLayers: next };
    });
  };

  const activeCount =
    OVERLAY_OPTIONS.filter((o) => layers[o.key]).length +
    layers.customLayers.filter((l) => l.visible).length;

  return (
    <div ref={rootRef} className="absolute bottom-4 right-4 z-20">
      <div className="relative">
        {open ? (
          <div className="glass-panel absolute bottom-16 right-0 z-10 flex w-[min(22rem,calc(100vw-2rem))] max-h-[75vh] flex-col rounded-[2rem] p-3 shadow-[var(--shadow-panel)]">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Layer manager
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Close layer manager"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4">
              {/* Basemap section */}
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Basemap
                </div>
                <div className="flex gap-1.5">
                  {VIEW_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = option.mode === globeViewMode;

                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => onChangeGlobeViewMode(option.mode)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition",
                          active
                            ? "border-cyan-300/30 bg-cyan-400/10"
                            : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
                        )}
                        aria-pressed={active}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]",
                            active ? "text-cyan-100" : "text-[var(--muted-foreground)]",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--foreground)]">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overlay stack — built-in layers with drag reorder */}
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Overlay stack
                </div>
                <div className="space-y-1.5">
                  {orderedBuiltins.map((option, index) => (
                    <BuiltinLayerRow
                      key={option.key}
                      label={option.label}
                      icon={option.icon}
                      accentClassName={option.accentClassName}
                      enabled={layers[option.key]}
                      opacity={layers.opacity[option.key]}
                      onToggle={() => setLayerEnabled(option.key)}
                      onOpacityChange={(value) => setLayerOpacity(option.key, value)}
                      isDragTarget={dragOverIndex === index && dragIndex !== index}
                      dragHandleProps={{
                        draggable: true,
                        onDragStart: () => handleBuiltinDragStart(index),
                        onDragEnd: handleBuiltinDragEnd,
                        onDragOver: (e) => handleBuiltinDragOver(e, index),
                        onDrop: () => handleBuiltinDrop(index),
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom layers section */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    External layers
                  </span>
                  {!showAddForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground-soft)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent)]"
                    >
                      <Plus className="h-3 w-3" />
                      Add WMS / tiles
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <AddLayerForm
                    onAdd={addCustomLayer}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                {layers.customLayers.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {layers.customLayers.map((layer, idx) => (
                      <CustomLayerRow
                        key={layer.id}
                        layer={layer}
                        onToggle={() => toggleCustomLayer(layer.id)}
                        onOpacityChange={(v) => setCustomLayerOpacity(layer.id, v)}
                        onRemove={() => removeCustomLayer(layer.id)}
                        onMoveUp={() => moveCustomLayer(layer.id, -1)}
                        onMoveDown={() => moveCustomLayer(layer.id, 1)}
                        isFirst={idx === 0}
                        isLast={idx === layers.customLayers.length - 1}
                      />
                    ))}
                  </div>
                ) : !showAddForm ? (
                  <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                    Add WMS, WMTS, or XYZ tile layers from external GIS services.
                  </p>
                ) : null}
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
          {activeCount > 0 && (
            <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-semibold text-[var(--accent-foreground)]">
              {activeCount}
            </span>
          )}
          <kbd className="ml-2 hidden rounded border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)] sm:inline-flex">
            L
          </kbd>
        </Button>
      </div>
    </div>
  );
}
