import type { LayerState } from "@/components/Globe/DataLayers";
import type { GlobeViewMode } from "@/types";

const VIEW_LABELS: Record<GlobeViewMode, string> = {
  satellite: "satellite basemap",
  road: "road basemap",
  "water-terrain": "water/terrain basemap",
};

export function getActiveLayerLabels(
  layers: LayerState,
  viewMode: GlobeViewMode,
): string[] {
  const labels: string[] = [VIEW_LABELS[viewMode] ?? viewMode];
  if (layers.water) labels.push("water overlay");
  if (layers.power) labels.push("power grid overlay");
  if (layers.roads) labels.push("roads overlay");
  if (layers.heatmap) labels.push("heatmap overlay");
  return labels;
}
