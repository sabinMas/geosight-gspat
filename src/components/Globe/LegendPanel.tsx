"use client";

import { useMemo, useState } from "react";
import {
  Flame,
  LoaderCircle,
  Map,
  Route,
  TriangleAlert,
  Waves,
} from "lucide-react";
import type { ImportedLayer } from "@/lib/file-import";
import { normalizeWmsEndpoint, type WmsLayerDefinition } from "@/lib/wms-layers";
import { useRightPanel } from "@/context/RightPanelContext";
import { cn } from "@/lib/utils";

type OverlayLegendItem = {
  id: string;
  label: string;
  active: boolean;
  Icon: typeof Route;
};

interface LegendPanelProps {
  importedLayers?: ImportedLayer[];
  wmsLayers?: WmsLayerDefinition[];
  overlayItems: OverlayLegendItem[];
}

function buildLegendUrl(url: string, layers: string) {
  try {
    const legendUrl = new URL(normalizeWmsEndpoint(url));
    legendUrl.searchParams.set("SERVICE", "WMS");
    legendUrl.searchParams.set("REQUEST", "GetLegendGraphic");
    legendUrl.searchParams.set("VERSION", "1.1.1");
    legendUrl.searchParams.set("FORMAT", "image/png");
    legendUrl.searchParams.set("LAYER", layers);
    legendUrl.searchParams.set("WIDTH", "20");
    legendUrl.searchParams.set("HEIGHT", "20");
    return legendUrl.toString();
  } catch {
    return null;
  }
}

function getCategorySwatchColor(category: string) {
  switch (category) {
    case "hazard":
      return "#ff8a65";
    case "imagery":
      return "#64b5f6";
    case "geology":
      return "#c5a46d";
    case "weather":
      return "#8be9fd";
    default:
      return "var(--accent)";
  }
}

function WmsLegendGraphic({ layer }: { layer: WmsLayerDefinition }) {
  const legendUrl = useMemo(() => buildLegendUrl(layer.url, layer.layers), [layer.layers, layer.url]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    legendUrl ? "loading" : "error",
  );

  return (
    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
      {legendUrl && status !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element -- WMS legend graphics are remote service images with dynamic URLs.
        <img
          src={legendUrl}
          alt={`${layer.name} legend graphic`}
          className={status === "ready" ? "h-full w-full object-contain" : "hidden"}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
        />
      ) : null}

      {status === "loading" ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
      ) : null}

      {status === "error" ? (
        <span
          className="h-4 w-5 rounded-sm border border-white/15"
          style={{ backgroundColor: getCategorySwatchColor(layer.category) }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export function LegendPanel({
  importedLayers = [],
  wmsLayers = [],
  overlayItems,
}: LegendPanelProps) {
  const { rightPanelOpen } = useRightPanel();
  const [open, setOpen] = useState(false);
  const visibleWmsLayers = wmsLayers.filter((layer) => layer.visible ?? true);
  const visibleImportedLayers = importedLayers.filter((layer) => layer.visible);
  const hasLegendContent =
    visibleWmsLayers.length > 0 ||
    visibleImportedLayers.length > 0 ||
    overlayItems.some((item) => item.active);

  return (
    <div className={cn(
      "absolute top-20 z-40 hidden lg:flex flex-col items-end gap-2 transition-all duration-300 ease-out right-4",
      rightPanelOpen
        ? "xl:right-[calc(380px+1rem)] opacity-0 pointer-events-none"
        : "xl:right-16 opacity-100 pointer-events-auto"
    )}>
      {open ? (
        <section
          className="glass-panel max-h-[300px] w-[320px] overflow-y-auto rounded-3xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]"
          role="region"
          aria-label="Map legend"
        >
          <div className="flex items-center gap-2 border-b border-[color:var(--border-soft)] pb-3">
            <Map className="h-4 w-4 text-[var(--foreground)]" />
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">Legend</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Active map services, imports, and GeoSight overlays.
              </div>
            </div>
          </div>

          {hasLegendContent ? (
            <div className="space-y-4 pt-4">
              {visibleWmsLayers.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Map Services
                  </div>
                  {visibleWmsLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                    >
                      <WmsLegendGraphic layer={layer} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--foreground)]">
                          {layer.name}
                        </div>
                        <div className="truncate text-xs text-[var(--muted-foreground)] max-w-full">
                          {layer.attribution}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {visibleImportedLayers.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Imported Layers
                  </div>
                  {visibleImportedLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                    >
                      <span
                        className="h-4 w-6 rounded-sm border border-white/15"
                        style={{ backgroundColor: layer.style.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[var(--foreground)]">
                          {layer.name}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {layer.format.toUpperCase()}
                        </div>
                      </div>
                      <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {layer.features.features.length}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  GeoSight Overlays
                </div>
                {overlayItems.map(({ id, label, active, Icon }) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2"
                  >
                    <Icon
                      className={
                        active
                          ? "h-4 w-4 text-[var(--accent)]"
                          : "h-4 w-4 text-[var(--muted-foreground)]"
                      }
                    />
                    <span
                      className={
                        active
                          ? "text-sm font-medium text-[var(--accent)]"
                          : "text-sm text-[var(--muted-foreground)]"
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 text-sm text-[var(--muted-foreground)]">
              Turn on overlays or add a layer to populate the legend.
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        className="glass-panel inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-panel)]"
        aria-expanded={open}
        aria-label={open ? "Hide map legend" : "Show map legend"}
        onClick={() => setOpen((current) => !current)}
      >
        <Map className="h-4 w-4" />
        Legend
      </button>
    </div>
  );
}

export const DEFAULT_OVERLAY_LEGEND_ITEMS: readonly OverlayLegendItem[] = [
  { id: "roads", label: "Roads", active: false, Icon: Route },
  { id: "water", label: "Water", active: false, Icon: Waves },
  { id: "fire", label: "Fire", active: false, Icon: Flame },
  { id: "flood-zones", label: "Flood zones", active: false, Icon: TriangleAlert },
] as const;
