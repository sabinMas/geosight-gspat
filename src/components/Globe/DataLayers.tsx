"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Layers3, Link2, Plus, X } from "lucide-react";
import { LayerToggle } from "@/components/Shell/LayerToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportedLayer } from "@/lib/file-import";
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
}

interface DataLayersProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  importedLayers?: ImportedLayer[];
  activeImportedLayerId?: string | null;
  onToggleImportedLayerVisibility?: (id: string) => void;
  onRemoveImportedLayer?: (id: string) => void;
  onFlyToImportedLayer?: (layer: ImportedLayer) => void;
  onOpenImportedLayerTable?: (layer: ImportedLayer) => void;
  wmsLayers?: WmsLayerDefinition[];
  onAddWmsLayer?: (layer: WmsLayerDefinition) => void;
  onRemoveWmsLayer?: (id: string) => void;
  onToggleWmsLayerVisibility?: (id: string) => void;
  onSetWmsLayerOpacity?: (id: string, opacity: number) => void;
}

export function DataLayers({
  layers,
  onChange,
  open: controlledOpen,
  onOpenChange,
  importedLayers = [],
  activeImportedLayerId = null,
  onToggleImportedLayerVisibility,
  onRemoveImportedLayer,
  onFlyToImportedLayer,
  onOpenImportedLayerTable,
  wmsLayers = [],
  onAddWmsLayer,
  onRemoveWmsLayer,
  onToggleWmsLayerVisibility,
  onSetWmsLayerOpacity,
}: DataLayersProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [customWmsOpen, setCustomWmsOpen] = useState(false);
  const [customWmsUrl, setCustomWmsUrl] = useState("");
  const [customWmsError, setCustomWmsError] = useState<string | null>(null);
  const [customWmsHint, setCustomWmsHint] = useState<string | null>(null);
  const [customWmsBusy, setCustomWmsBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wmsLayersById = new Map(wmsLayers.map((layer) => [layer.id, layer]));
  const open = controlledOpen ?? internalOpen;

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
    <div ref={rootRef} className="absolute bottom-10 right-4 z-20">
      <div className="relative">
        {open ? (
          <div
            className="glass-panel absolute bottom-14 right-0 z-10 max-h-[70vh] w-[320px] overflow-y-auto rounded-3xl p-3 scrollbar-thin"
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
                  <p className="text-[11px] leading-5 text-[var(--muted-foreground)]">
                    GeoSight validates GetCapabilities and adds the first advertised layer.
                  </p>
                  {customWmsError ? (
                    <p className="text-[11px] text-[var(--danger-foreground)]">{customWmsError}</p>
                  ) : null}
                  {customWmsHint ? (
                    <p className="text-[11px] text-[var(--muted-foreground)]">{customWmsHint}</p>
                  ) : null}
                </div>
              ) : null}

              {customWmsHint && !customWmsOpen ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">{customWmsHint}</p>
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
                      <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
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
                          <div className="truncate text-sm font-medium text-[var(--foreground)]">
                            {layer.name}
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
                            className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
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
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
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
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                        onClick={() => onFlyToImportedLayer?.(layer)}
                        aria-label={`Fly to imported layer ${layer.name}`}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                          style={{ backgroundColor: layer.style.color, opacity: layer.visible ? 1 : 0.45 }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-sm font-medium text-[var(--foreground)]"
                            style={{ opacity: layer.visible ? 1 : 0.65 }}
                          >
                            {layer.name}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {layer.format.toUpperCase()} · {layer.features.features.length} features
                          </div>
                        </div>
                        <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {layer.visible ? "Visible" : "Hidden"}
                        </span>
                      </button>

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
