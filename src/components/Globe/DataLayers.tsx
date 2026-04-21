"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Globe, Layers3, Link2, Plus, Trash2, X } from "lucide-react";
import { LayerStyleEditor } from "@/components/Globe/LayerStyleEditor";
import { LayerToggle } from "@/components/Shell/LayerToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportedLayer } from "@/lib/file-import";
import { cn } from "@/lib/utils";
import type { CustomLayer, CustomLayerType, DrawnShape } from "@/types";
import {
  normalizeWmsEndpoint,
  validateWmsEndpoint,
  WMS_CATALOG,
  type WmsLayerDefinition,
} from "@/lib/wms-layers";

export interface LayerState {
  water: boolean;
  power: boolean;
  roads: boolean;
  heatmap: boolean;
  buildings: boolean;
}

// ---------------------------------------------------------------------------
// Shared opacity slider
// ---------------------------------------------------------------------------
function OpacitySlider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={10} max={100} step={1} value={Math.round(value * 100)} disabled={disabled}
        onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-soft)] accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Layer opacity" />
      <span className="w-8 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{Math.round(value * 100)}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom layer row (user-added WMS/WMTS/XYZ)
// ---------------------------------------------------------------------------
interface CustomLayerRowProps {
  layer: CustomLayer;
  onToggle: () => void;
  onOpacityChange: (v: number) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function CustomLayerRow({ layer, onToggle, onOpacityChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: CustomLayerRowProps) {
  return (
    <div className={cn("group rounded-xl border p-2.5 transition",
      layer.visible ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)]" : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]")}>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="text-[var(--muted-foreground)] disabled:opacity-20" aria-label="Move layer up"><ChevronUp className="h-3 w-3" /></button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="text-[var(--muted-foreground)] disabled:opacity-20" aria-label="Move layer down"><ChevronDown className="h-3 w-3" /></button>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--accent)]">
          <Globe className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm text-[var(--foreground)]">{layer.name}</span>
          <span className="block truncate text-xs text-[var(--muted-foreground)]">{layer.type.toUpperCase()}{layer.wmsLayers ? ` · ${layer.wmsLayers}` : ""}</span>
        </div>
        <button type="button" onClick={onToggle}
          className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition", layer.visible ? "text-[var(--accent)]" : "text-[var(--muted-foreground)] opacity-50")}
          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}>
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onRemove}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] opacity-0 transition hover:text-[var(--danger-foreground)] group-hover:opacity-100"
          aria-label={`Remove ${layer.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {layer.visible && (
        <div className="mt-1.5 pl-14">
          <OpacitySlider value={layer.opacity} disabled={!layer.visible} onChange={onOpacityChange} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add custom layer form
// ---------------------------------------------------------------------------
const LAYER_TYPE_OPTIONS: Array<{ value: CustomLayerType; label: string; placeholder: string }> = [
  { value: "wms", label: "WMS", placeholder: "https://example.com/wms?service=WMS" },
  { value: "wmts", label: "WMTS", placeholder: "https://example.com/wmts" },
  { value: "xyz", label: "XYZ tiles", placeholder: "https://tiles.example.com/{z}/{x}/{y}.png" },
];

function AddCustomLayerForm({ onAdd, onCancel }: { onAdd: (layer: Omit<CustomLayer, "id" | "order">) => void; onCancel: () => void }) {
  const [layerType, setLayerType] = useState<CustomLayerType>("wms");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [wmsLayers, setWmsLayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => { urlRef.current?.focus(); }, []);

  const typeOption = LAYER_TYPE_OPTIONS.find((o) => o.value === layerType)!;

  const handleSubmit = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) { setError("URL is required"); return; }
    try { new URL(trimmedUrl); } catch { setError("Enter a valid URL"); return; }
    const layerName = name.trim() || trimmedUrl.split("/").pop()?.split("?")[0] || "Untitled layer";
    onAdd({ name: layerName, type: layerType, url: trimmedUrl, wmsLayers: layerType === "wms" ? wmsLayers.trim() || undefined : undefined, opacity: 1, visible: true });
  };

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 space-y-2">
      <div className="flex gap-1">
        {LAYER_TYPE_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" onClick={() => setLayerType(opt.value)}
            className={cn("rounded-full px-2.5 py-0.5 text-xs transition cursor-pointer",
              layerType === opt.value ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--surface-panel)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
            {opt.label}
          </button>
        ))}
      </div>
      <Input ref={urlRef} value={url} onChange={(e) => { setUrl(e.target.value); setError(null); }} placeholder={typeOption.placeholder} className="h-8 text-xs" aria-label="Layer URL" />
      {layerType === "wms" && (
        <Input value={wmsLayers} onChange={(e) => setWmsLayers(e.target.value)} placeholder="Layer names (comma-separated, optional)" className="h-8 text-xs" aria-label="WMS layer names" />
      )}
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name (optional)" className="h-8 text-xs" aria-label="Display name" />
      {error && <p className="text-xs text-[var(--danger-foreground)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="rounded-full h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" className="rounded-full h-7 text-xs" onClick={handleSubmit}>Add layer</Button>
      </div>
    </div>
  );
}

interface DataLayersProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  importedLayers?: ImportedLayer[];
  activeImportedLayerId?: string | null;
  onToggleImportedLayerVisibility?: (id: string) => void;
  onUpdateImportedLayerStyle?: (id: string, stylePatch: Partial<ImportedLayer["style"]>) => void;
  onRemoveImportedLayer?: (id: string) => void;
  onFlyToImportedLayer?: (layer: ImportedLayer) => void;
  onOpenImportedLayerTable?: (layer: ImportedLayer) => void;
  onMoveImportedLayer?: (id: string, direction: "up" | "down") => void;
  drawnShapes?: DrawnShape[];
  wmsLayers?: WmsLayerDefinition[];
  onAddWmsLayer?: (layer: WmsLayerDefinition) => void;
  onRemoveWmsLayer?: (id: string) => void;
  onToggleWmsLayerVisibility?: (id: string) => void;
  onSetWmsLayerOpacity?: (id: string, opacity: number) => void;
  onMoveWmsLayer?: (id: string, direction: "up" | "down") => void;
  customLayers?: CustomLayer[];
  onAddCustomLayer?: (layer: Omit<CustomLayer, "id" | "order">) => void;
  onRemoveCustomLayer?: (id: string) => void;
  onToggleCustomLayer?: (id: string) => void;
  onSetCustomLayerOpacity?: (id: string, opacity: number) => void;
  onMoveCustomLayer?: (id: string, direction: "up" | "down") => void;
}

export function DataLayers({
  layers,
  onChange,
  open: controlledOpen,
  onOpenChange,
  importedLayers = [],
  activeImportedLayerId = null,
  onToggleImportedLayerVisibility,
  onUpdateImportedLayerStyle,
  onRemoveImportedLayer,
  onFlyToImportedLayer,
  onOpenImportedLayerTable,
  onMoveImportedLayer,
  drawnShapes = [],
  wmsLayers = [],
  onAddWmsLayer,
  onRemoveWmsLayer,
  onToggleWmsLayerVisibility,
  onSetWmsLayerOpacity,
  onMoveWmsLayer,
  customLayers = [],
  onAddCustomLayer,
  onRemoveCustomLayer,
  onToggleCustomLayer,
  onSetCustomLayerOpacity,
  onMoveCustomLayer,
}: DataLayersProps) {
  const [showAddCustomLayer, setShowAddCustomLayer] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [customWmsOpen, setCustomWmsOpen] = useState(false);
  const [customWmsUrl, setCustomWmsUrl] = useState("");
  const [customWmsError, setCustomWmsError] = useState<string | null>(null);
  const [customWmsHint, setCustomWmsHint] = useState<string | null>(null);
  const [customWmsBusy, setCustomWmsBusy] = useState(false);
  const [editingImportedLayerId, setEditingImportedLayerId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wmsLayersById = new Map(wmsLayers.map((layer) => [layer.id, layer]));
  const open = controlledOpen ?? internalOpen;
  const hasRadiusShape = drawnShapes.some((shape) => shape.type === "circle");

  const setOpen = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const nextValue = typeof value === "function" ? value(open) : value;

    if (controlledOpen === undefined) {
      setInternalOpen(nextValue);
    }

    onOpenChange?.(nextValue);
  }, [controlledOpen, onOpenChange, open]);

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
  }, [open, setOpen]);

  const handleCatalogToggle = (definition: WmsLayerDefinition) => {
    if (wmsLayersById.has(definition.id)) {
      onRemoveWmsLayer?.(definition.id);
      return;
    }

    onAddWmsLayer?.({
      ...definition,
      visible: true,
      opacity: definition.opacity ?? 0.82,
    });
  };

  const handleAddCustomWms = async () => {
    setCustomWmsBusy(true);
    setCustomWmsError(null);
    setCustomWmsHint(null);

    try {
      const result = await validateWmsEndpoint(customWmsUrl);
      if (!result.valid || result.layers.length === 0) {
        setCustomWmsError("That endpoint did not return a usable WMS capabilities document.");
        return;
      }

      const normalizedUrl = normalizeWmsEndpoint(customWmsUrl);
      const parsedUrl = new URL(normalizedUrl);
      const firstLayer = result.layers[0];
      const inferredName =
        firstLayer === "0"
          ? `${parsedUrl.hostname.replace(/^www\./, "")} WMS`
          : firstLayer.replace(/[_-]+/g, " ").trim();

      onAddWmsLayer?.({
        id: `custom-wms-${Date.now()}`,
        name: inferredName,
        url: normalizedUrl,
        layers: firstLayer,
        category: "custom",
        attribution: parsedUrl.hostname.replace(/^www\./, ""),
        visible: true,
        opacity: 0.82,
      });

      setCustomWmsHint(`Added ${inferredName} using the first advertised layer (${firstLayer}).`);
      setCustomWmsUrl("");
      setCustomWmsOpen(false);
    } catch (error) {
      setCustomWmsError(
        error instanceof Error ? error.message : "That WMS endpoint could not be validated.",
      );
    } finally {
      setCustomWmsBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="absolute right-4 top-4 z-20">
      <div className="relative">
        {open ? (
          <div
            className="glass-panel absolute right-0 top-14 z-10 max-h-[70vh] w-[320px] overflow-y-auto rounded-3xl p-3 scrollbar-thin"
            role="region"
            aria-label="Map layer controls"
          >
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
                ariaLabel={`${layers.water ? "Hide" : "Show"} water bodies layer`}
              />
              <LayerToggle
                label="Power"
                enabled={layers.power}
                onToggle={() => onChange({ ...layers, power: !layers.power })}
                accentClassName="text-amber-300"
                ariaLabel={`${layers.power ? "Hide" : "Show"} power layer`}
              />
              <LayerToggle
                label="Roads"
                enabled={layers.roads}
                onToggle={() => onChange({ ...layers, roads: !layers.roads })}
                accentClassName="text-[var(--foreground-soft)]"
                ariaLabel={`${layers.roads ? "Hide" : "Show"} roads layer`}
              />
              <LayerToggle
                label="Elevation heat"
                enabled={layers.heatmap}
                onToggle={() => onChange({ ...layers, heatmap: !layers.heatmap })}
                accentClassName="text-rose-300"
                ariaLabel={`${layers.heatmap ? "Hide" : "Show"} elevation heat layer`}
              />
              <LayerToggle
                label="3D Buildings"
                enabled={layers.buildings}
                onToggle={() => onChange({ ...layers, buildings: !layers.buildings })}
                accentClassName="text-violet-300"
                ariaLabel={`${layers.buildings ? "Hide" : "Show"} 3D buildings layer`}
              />
            </div>

            <div className="mt-4 space-y-3 border-t border-[color:var(--border-soft)] pt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    Map Services
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Add live WMS overlays on top of the current basemap.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  aria-label="Add a custom WMS endpoint"
                  onClick={() => {
                    setCustomWmsOpen((current) => !current);
                    setCustomWmsError(null);
                    setCustomWmsHint(null);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Custom
                </Button>
              </div>

              {customWmsOpen ? (
                <div className="space-y-2 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                  <Input
                    value={customWmsUrl}
                    onChange={(event) => setCustomWmsUrl(event.target.value)}
                    placeholder="https://example.com/wms"
                    aria-label="Custom WMS endpoint URL"
                    className="h-10 rounded-xl bg-[var(--surface-panel)] px-3"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      aria-label="Cancel adding a custom WMS endpoint"
                      onClick={() => {
                        setCustomWmsOpen(false);
                        setCustomWmsError(null);
                        setCustomWmsHint(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="rounded-full"
                      aria-label="Validate and add this WMS endpoint"
                      onClick={() => {
                        void handleAddCustomWms();
                      }}
                      disabled={customWmsBusy || customWmsUrl.trim().length === 0}
                    >
                      {customWmsBusy ? "Checking..." : "Add WMS"}
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                    GeoSight validates GetCapabilities and adds the first advertised layer.
                  </p>
                  {customWmsError ? (
                    <p className="text-xs text-[var(--danger-foreground)]">{customWmsError}</p>
                  ) : null}
                  {customWmsHint ? (
                    <p className="text-xs text-[var(--muted-foreground)]">{customWmsHint}</p>
                  ) : null}
                </div>
              ) : null}

              {customWmsHint && !customWmsOpen ? (
                <p className="text-xs text-[var(--muted-foreground)]">{customWmsHint}</p>
              ) : null}

              <div className="space-y-2">
                {WMS_CATALOG.map((definition) => {
                  const active = wmsLayersById.has(definition.id);

                  return (
                    <button
                      key={definition.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-left transition hover:border-[color:var(--accent-strong)]"
                      onClick={() => handleCatalogToggle(definition)}
                      aria-label={`${active ? "Remove" : "Add"} ${definition.name}`}
                      aria-pressed={active}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--foreground)]">
                          {definition.name}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {definition.attribution} · {definition.category}
                        </div>
                      </div>
                      <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {active ? "On" : "Off"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {wmsLayers.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Active services
                  </div>
                  {wmsLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              aria-label={`Move ${layer.name} up`}
                              disabled={wmsLayers[0]?.id === layer.id}
                              onClick={() => onMoveWmsLayer?.(layer.id, "up")}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              aria-label={`Move ${layer.name} down`}
                              disabled={wmsLayers[wmsLayers.length - 1]?.id === layer.id}
                              onClick={() => onMoveWmsLayer?.(layer.id, "down")}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <div className="truncate text-sm font-medium text-[var(--foreground)]">
                              {layer.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                            <Link2 className="h-3 w-3" />
                            {layer.attribution}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label={`Remove map service ${layer.name}`}
                          onClick={() => onRemoveWmsLayer?.(layer.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant={layer.visible ?? true ? "default" : "secondary"}
                          className="rounded-full"
                          aria-label={layer.visible ?? true ? `Hide ${layer.name}` : `Show ${layer.name}`}
                          aria-pressed={layer.visible ?? true}
                          onClick={() => onToggleWmsLayerVisibility?.(layer.id)}
                        >
                          {layer.visible ?? true ? (
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {layer.visible ?? true ? "Hide" : "Show"}
                        </Button>
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`wms-opacity-${layer.id}`}
                            className="mb-1 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
                          >
                            Opacity {(layer.opacity ?? 0.82).toFixed(2)}
                          </label>
                          <input
                            id={`wms-opacity-${layer.id}`}
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={layer.opacity ?? 0.82}
                            onChange={(event) =>
                              onSetWmsLayerOpacity?.(layer.id, Number.parseFloat(event.target.value))
                            }
                            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
                            aria-label={`Set opacity for ${layer.name}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-2 border-t border-[color:var(--border-soft)] pt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    Imported Layers
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    User-uploaded data overlays rendered on the globe.
                  </div>
                </div>
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                  {importedLayers.length}
                </span>
              </div>

              {importedLayers.length > 0 ? (
                <div className="space-y-2">
                  {importedLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)]"
                    >
                      <div className="flex items-center gap-3 px-3 py-3">
                        <button
                          type="button"
                          className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                          style={{ backgroundColor: layer.style.color, opacity: layer.visible ? 1 : 0.45 }}
                          aria-label={`Edit style for ${layer.name}`}
                          aria-pressed={editingImportedLayerId === layer.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingImportedLayerId((current) =>
                              current === layer.id ? null : layer.id,
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              aria-label={`Move ${layer.name} up`}
                              disabled={importedLayers[0]?.id === layer.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onMoveImportedLayer?.(layer.id, "up");
                              }}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              aria-label={`Move ${layer.name} down`}
                              disabled={importedLayers[importedLayers.length - 1]?.id === layer.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onMoveImportedLayer?.(layer.id, "down");
                              }}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <div
                              className="truncate text-sm font-medium text-[var(--foreground)]"
                              style={{ opacity: layer.visible ? 1 : 0.65 }}
                            >
                              {layer.name}
                            </div>
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {layer.format.toUpperCase()} · {layer.features.features.length} features
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                            {layer.visible ? "Visible" : "Hidden"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            aria-label={`Fly to imported layer ${layer.name}`}
                            onClick={() => onFlyToImportedLayer?.(layer)}
                          >
                            Fly to
                          </Button>
                        </div>
                      </div>

                      {editingImportedLayerId === layer.id ? (
                        <div className="px-3 pb-3">
                          <LayerStyleEditor
                            style={layer.style}
                            onChange={(stylePatch) => onUpdateImportedLayerStyle?.(layer.id, stylePatch)}
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-soft)] px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={activeImportedLayerId === layer.id ? "default" : "secondary"}
                          className="rounded-full"
                          aria-label={`Open attribute table for ${layer.name}`}
                          aria-pressed={activeImportedLayerId === layer.id}
                          onClick={() => onOpenImportedLayerTable?.(layer)}
                        >
                          Table
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={layer.visible ? "default" : "secondary"}
                          className="rounded-full"
                          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                          aria-pressed={layer.visible}
                          onClick={() => onToggleImportedLayerVisibility?.(layer.id)}
                        >
                          {layer.visible ? (
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {layer.visible ? "Hide" : "Show"}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label={`Remove imported layer ${layer.name}`}
                          onClick={() => onRemoveImportedLayer?.(layer.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                  Import GeoJSON, KML, CSV, or GPX to add your own data overlays.
                </div>
              )}

              {hasRadiusShape ? (
                <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3 text-xs leading-5 text-[var(--muted-foreground)]">
                  Circle tools show proximity zones — use the GeoSight analysis panel to query what falls within this area.
                </div>
              ) : null}

              {/* Custom layers section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Custom Layers</span>
                  {!showAddCustomLayer && (
                    <button type="button" onClick={() => setShowAddCustomLayer(true)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
                      aria-label="Add custom layer">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
                {showAddCustomLayer && (
                  <AddCustomLayerForm
                    onAdd={(layer) => { onAddCustomLayer?.(layer); setShowAddCustomLayer(false); }}
                    onCancel={() => setShowAddCustomLayer(false)}
                  />
                )}
                {customLayers.length > 0 ? (
                  <div className="space-y-1.5">
                    {customLayers.map((layer, i) => (
                      <CustomLayerRow key={layer.id} layer={layer}
                        onToggle={() => onToggleCustomLayer?.(layer.id)}
                        onOpacityChange={(v) => onSetCustomLayerOpacity?.(layer.id, v)}
                        onRemove={() => onRemoveCustomLayer?.(layer.id)}
                        onMoveUp={() => onMoveCustomLayer?.(layer.id, "up")}
                        onMoveDown={() => onMoveCustomLayer?.(layer.id, "down")}
                        isFirst={i === 0}
                        isLast={i === customLayers.length - 1}
                      />
                    ))}
                  </div>
                ) : !showAddCustomLayer ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-4 text-xs text-[var(--muted-foreground)]">
                    Add WMS, WMTS, or XYZ tile layers from any public endpoint.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
          aria-expanded={open}
          aria-label={open ? "Close map layers panel" : "Open map layers panel"}
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
