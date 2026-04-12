import { CustomLayer, GlobeViewMode, LayerOpacityState, LayerState } from "@/types";

export const DEFAULT_LAYER_OPACITY: LayerOpacityState = {
  roads: 0.72,
  fires: 0.92,
  floodZones: 0.56,
  contours: 0.38,
  aoi: 0.88,
};

export const DEFAULT_LAYER_STATE: LayerState = {
  roads: true,
  fires: false,
  floodZones: false,
  contours: false,
  aoi: true,
  opacity: DEFAULT_LAYER_OPACITY,
  customLayers: [],
};

export function createLayerState(overrides?: Partial<LayerState>): LayerState {
  return {
    ...DEFAULT_LAYER_STATE,
    ...overrides,
    opacity: {
      ...DEFAULT_LAYER_OPACITY,
      ...overrides?.opacity,
    },
    customLayers: overrides?.customLayers ?? [],
  };
}

let nextCustomLayerId = 1;

export function createCustomLayer(
  params: Pick<CustomLayer, "name" | "type" | "url"> &
    Partial<Pick<CustomLayer, "wmsLayers" | "opacity">>,
  existingLayers: CustomLayer[],
): CustomLayer {
  return {
    id: `custom-${Date.now()}-${nextCustomLayerId++}`,
    name: params.name,
    type: params.type,
    url: params.url,
    wmsLayers: params.wmsLayers,
    opacity: params.opacity ?? 0.8,
    visible: true,
    order: existingLayers.length,
  };
}

export function getBasemapLabel(globeViewMode: GlobeViewMode) {
  switch (globeViewMode) {
    case "road":
      return "Road";
    case "water-terrain":
      return "Terrain / topo";
    case "satellite":
    default:
      return "Satellite";
  }
}

export function getActiveLayerLabels(
  layers: LayerState,
  globeViewMode: GlobeViewMode,
) {
  const labels = [`Basemap: ${getBasemapLabel(globeViewMode)}`];

  if (layers.roads) {
    labels.push("OSM roads overlay");
  }

  if (layers.fires) {
    labels.push("NASA FIRMS fire detections");
  }

  if (layers.floodZones) {
    labels.push("Flood context overlay");
  }

  if (layers.contours) {
    labels.push("Elevation contours");
  }

  if (layers.aoi) {
    labels.push("Drawn AOI geometry");
  }

  for (const custom of layers.customLayers) {
    if (custom.visible) {
      labels.push(`${custom.name} (${custom.type.toUpperCase()})`);
    }
  }

  return labels;
}
