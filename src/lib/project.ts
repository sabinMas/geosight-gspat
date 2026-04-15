import type { LayerState } from "@/components/Globe/DataLayers";
import { getLayerBounds, type ImportedLayer } from "@/lib/file-import";
import { getProfileById } from "@/lib/profiles";
import type { WmsLayerDefinition } from "@/lib/wms-layers";
import type {
  AppMode,
  DrawnShape,
  GlobeViewMode,
  WorkspaceCardId,
} from "@/types";

const PROJECT_FILE_EXTENSION = ".geosight";

type ProjectImportedLayer = {
  name: string;
  format: string;
  features: GeoJSON.FeatureCollection;
  style: {
    color: string;
    opacity: number;
    weight?: number;
    fillOpacity?: number;
    filled?: boolean;
  };
  visible: boolean;
};

type ProjectActiveOverlays = {
  roads: boolean;
  fires: boolean;
  floodZones: boolean;
  contours: boolean;
  aoi: boolean;
  water?: boolean;
  power?: boolean;
  heatmap?: boolean;
};

export type GeoSightProject = {
  version: "1.0";
  savedAt: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    name: string;
    zoom?: number;
  };
  profile: string;
  lensId: string;
  appMode: "explorer" | "pro";
  drawnShapes: DrawnShape[];
  openCardIds: WorkspaceCardId[];
  wmsLayers: WmsLayerDefinition[];
  importedLayers: ProjectImportedLayer[];
  activeOverlays: ProjectActiveOverlays;
  basemap: "satellite" | "road" | "waterColor";
};

export interface ProjectSerializationState {
  selectedPoint: { lat: number; lng: number };
  selectedLocationName: string;
  zoom?: number;
  activeProfileId: string;
  activeLensId: string | null;
  appMode: AppMode;
  drawnShapes: DrawnShape[];
  openCardIds: WorkspaceCardId[];
  wmsLayers: WmsLayerDefinition[];
  importedLayers: ImportedLayer[];
  layers: LayerState;
  globeViewMode: GlobeViewMode;
}

export interface DeserializedProjectStatePatch {
  name: string;
  selectedPoint: { lat: number; lng: number };
  selectedLocationName: string;
  activeProfileId: string;
  activeLensId: string | null;
  appMode: AppMode;
  drawnShapes: DrawnShape[];
  openCardIds: WorkspaceCardId[];
  wmsLayers: WmsLayerDefinition[];
  importedLayers: ImportedLayer[];
  layers: LayerState;
  globeViewMode: GlobeViewMode;
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapGlobeViewModeToBasemap(globeViewMode: GlobeViewMode): GeoSightProject["basemap"] {
  if (globeViewMode === "water-terrain") {
    return "waterColor";
  }

  return globeViewMode;
}

function mapBasemapToGlobeViewMode(basemap: GeoSightProject["basemap"]): GlobeViewMode {
  if (basemap === "waterColor") {
    return "water-terrain";
  }

  return basemap;
}

function sanitizeProjectFilenameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "geosight-project";
}

function projectDownloadName(project: GeoSightProject) {
  const date = project.savedAt.slice(0, 10);
  const locationName = sanitizeProjectFilenameSegment(project.location.name);
  return `${locationName}-${date}${PROJECT_FILE_EXTENSION}`;
}

function isFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type?: unknown }).type === "FeatureCollection" &&
      "features" in value &&
      Array.isArray((value as { features?: unknown }).features),
  );
}

export function serializeProject(state: ProjectSerializationState): GeoSightProject {
  return {
    version: "1.0",
    savedAt: new Date().toISOString(),
    name: `${state.selectedLocationName} - ${getProfileById(state.activeProfileId).name}`,
    location: {
      lat: state.selectedPoint.lat,
      lng: state.selectedPoint.lng,
      name: state.selectedLocationName,
      zoom: state.zoom,
    },
    profile: state.activeProfileId,
    lensId: state.activeLensId ?? state.activeProfileId,
    appMode: state.appMode,
    drawnShapes: state.drawnShapes,
    openCardIds: state.openCardIds,
    wmsLayers: state.wmsLayers,
    importedLayers: state.importedLayers.map((layer) => ({
      name: layer.name,
      format: layer.format,
      features: layer.features,
      style: {
        color: layer.style.color,
        opacity: layer.style.opacity,
        weight: layer.style.weight,
        fillOpacity: layer.style.fillOpacity,
        filled: layer.style.filled,
      },
      visible: layer.visible,
    })),
    activeOverlays: {
      roads: state.layers.roads,
      fires: false,
      floodZones: false,
      contours: state.layers.heatmap,
      aoi: state.drawnShapes.length > 0,
      water: state.layers.water,
      power: state.layers.power,
      heatmap: state.layers.heatmap,
    },
    basemap: mapGlobeViewModeToBasemap(state.globeViewMode),
  };
}

export function deserializeProject(project: GeoSightProject): DeserializedProjectStatePatch {
  if (project.version !== "1.0") {
    throw new Error(`Unsupported GeoSight project version: ${project.version}`);
  }

  const importedLayers: ImportedLayer[] = project.importedLayers.map((layer) => {
    if (!isFeatureCollection(layer.features)) {
      throw new Error(`Imported layer "${layer.name}" is not a valid FeatureCollection.`);
    }

    return {
      id: buildId("imported-layer"),
      name: layer.name,
      format:
        layer.format === "csv" ||
        layer.format === "kml" ||
        layer.format === "gpx" ||
        layer.format === "geojson"
          ? layer.format
          : "geojson",
      features: layer.features,
      bounds: getLayerBounds(layer.features),
      style: {
        color: layer.style.color,
        opacity: layer.style.opacity,
        weight: layer.style.weight ?? 2,
        fillOpacity: layer.style.fillOpacity ?? 0.22,
        filled: layer.style.filled ?? true,
      },
      visible: layer.visible,
    };
  });

  return {
    name: project.name,
    selectedPoint: {
      lat: project.location.lat,
      lng: project.location.lng,
    },
    selectedLocationName: project.location.name,
    activeProfileId: project.profile,
    activeLensId: project.lensId || null,
    appMode: project.appMode,
    drawnShapes: Array.isArray(project.drawnShapes) ? project.drawnShapes : [],
    openCardIds: Array.isArray(project.openCardIds) ? project.openCardIds : [],
    wmsLayers: Array.isArray(project.wmsLayers)
      ? project.wmsLayers.map((layer) => ({
          ...layer,
          visible: layer.visible ?? true,
          opacity: layer.opacity ?? 0.82,
        }))
      : [],
    importedLayers,
    layers: {
      water: project.activeOverlays.water ?? true,
      power: project.activeOverlays.power ?? false,
      roads: project.activeOverlays.roads,
      heatmap: project.activeOverlays.heatmap ?? project.activeOverlays.contours,
    },
    globeViewMode: mapBasemapToGlobeViewMode(project.basemap),
  };
}

export function downloadProject(project: GeoSightProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = projectDownloadName(project);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function loadProjectFromFile(file: File): Promise<GeoSightProject> {
  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected project file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("The selected project file is empty or malformed.");
  }

  const candidate = parsed as Partial<GeoSightProject>;
  if (
    candidate.version !== "1.0" ||
    !candidate.location ||
    typeof candidate.location.lat !== "number" ||
    typeof candidate.location.lng !== "number" ||
    typeof candidate.location.name !== "string" ||
    typeof candidate.profile !== "string" ||
    typeof candidate.appMode !== "string" ||
    !Array.isArray(candidate.drawnShapes) ||
    !Array.isArray(candidate.wmsLayers) ||
    !Array.isArray(candidate.importedLayers) ||
    !candidate.activeOverlays ||
    typeof candidate.basemap !== "string"
  ) {
    throw new Error("The selected file is not a valid GeoSight project.");
  }

  return candidate as GeoSightProject;
}
