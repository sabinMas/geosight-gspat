"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LZString from "lz-string";
import { LayerState } from "@/components/Globe/DataLayers";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useQuickRegions } from "@/hooks/useQuickRegions";
import { resolveLocationQuery } from "@/lib/cesium-search";
import type { ImportedLayer } from "@/lib/file-import";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { getProfileById } from "@/lib/profiles";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import type { WmsLayerDefinition } from "@/lib/wms-layers";
import {
  AnalysisInputMode,
  AppMode,
  CustomLayer,
  DrawnGeometryFeatureCollection,
  DrawnShape,
  DrawingTool,
  EarthquakeEvent,
  GlobeViewMode,
  ExploreInitState,
  IdentifyResult,
  LandCoverBucket,
  LensAnalysisResult,
  MissionProfile,
  RegionSelection,
  ResultsMode,
  SubsurfaceRenderMode,
} from "@/types";
import { drawnShapesToFeatureCollection } from "@/lib/analysis-geometry";

export type ExploreInitParams = ExploreInitState;
type LayerMoveDirection = "up" | "down";
const SHAPES_URL_SYNC_DEBOUNCE_MS = 150;

export interface ExploreProjectStatePatch {
  appMode?: AppMode;
  activeProfileId?: string;
  activeLensId?: string | null;
  selectedPoint?: { lat: number; lng: number };
  selectedLocationName?: string;
  selectedLocationDisplayName?: string;
  layers?: LayerState;
  globeViewMode?: GlobeViewMode;
  drawnShapes?: DrawnShape[];
  importedLayers?: ImportedLayer[];
  wmsLayers?: WmsLayerDefinition[];
}

export interface ExploreState {
  init: ExploreInitParams;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeProfile: MissionProfile;
  setActiveProfile: Dispatch<SetStateAction<MissionProfile>>;
  initError: string | null;
  setInitError: Dispatch<SetStateAction<string | null>>;
  initStatus: "idle" | "resolving";
  defaultCoordinates: {
    lat: number;
    lng: number;
  };
  defaultLabel: string;
  locationReady: boolean;
  selectedPoint: {
    lat: number;
    lng: number;
  };
  selectedLocationName: string;
  selectedLocationDisplayName: string;
  selectedRegion: RegionSelection;
  selectPoint: (
    coords: { lat: number; lng: number },
    label?: string,
    displayLabel?: string,
  ) => void;
  setSelectedRegion: Dispatch<SetStateAction<RegionSelection>>;
  quickRegions: RegionSelection[];
  quickRegionsLoading: boolean;
  globeViewMode: GlobeViewMode;
  setGlobeViewMode: Dispatch<SetStateAction<GlobeViewMode>>;
  globeRotateMode: boolean;
  setGlobeRotateMode: Dispatch<SetStateAction<boolean>>;
  layers: LayerState;
  setLayers: Dispatch<SetStateAction<LayerState>>;
  subsurfaceRenderMode: SubsurfaceRenderMode;
  setSubsurfaceRenderMode: Dispatch<SetStateAction<SubsurfaceRenderMode>>;
  terrainExaggeration: number;
  setTerrainExaggeration: Dispatch<SetStateAction<number>>;
  imageSummary: string;
  setImageSummary: Dispatch<SetStateAction<string>>;
  uploadedClassification: LandCoverBucket[];
  setUploadedClassification: Dispatch<SetStateAction<LandCoverBucket[]>>;
  previewUrl: string | null;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
  resultsMode: ResultsMode;
  setResultsMode: Dispatch<SetStateAction<ResultsMode>>;
  earthquakeMarkers: EarthquakeEvent[];
  setEarthquakeMarkers: Dispatch<SetStateAction<EarthquakeEvent[]>>;
  activeLensId: string | null;
  setActiveLensId: Dispatch<SetStateAction<string | null>>;
  driveMode: boolean;
  setDriveMode: Dispatch<SetStateAction<boolean>>;
  mapEngine: "cesium" | "maplibre";
  setMapEngine: Dispatch<SetStateAction<"cesium" | "maplibre">>;
  drawingTool: DrawingTool;
  setDrawingTool: Dispatch<SetStateAction<DrawingTool>>;
  drawnShapes: DrawnShape[];
  setDrawnShapes: Dispatch<SetStateAction<DrawnShape[]>>;
  drawnGeometry: DrawnGeometryFeatureCollection;
  importedLayers: ImportedLayer[];
  activeImportedLayerId: string | null;
  setActiveImportedLayerId: Dispatch<SetStateAction<string | null>>;
  selectedImportedFeatureId: string | null;
  setSelectedImportedFeatureId: Dispatch<SetStateAction<string | null>>;
  addImportedLayer: (layer: ImportedLayer) => void;
  removeImportedLayer: (id: string) => void;
  toggleImportedLayerVisibility: (id: string) => void;
  updateImportedLayerStyle: (
    id: string,
    stylePatch: Partial<ImportedLayer["style"]>,
  ) => void;
  moveImportedLayer: (id: string, direction: LayerMoveDirection) => void;
  wmsLayers: WmsLayerDefinition[];
  addWmsLayer: (layer: WmsLayerDefinition) => void;
  removeWmsLayer: (id: string) => void;
  toggleWmsLayerVisibility: (id: string) => void;
  setWmsLayerOpacity: (id: string, opacity: number) => void;
  moveWmsLayer: (id: string, direction: LayerMoveDirection) => void;
  addDrawnShape: (shape: DrawnShape) => void;
  undoDrawing: () => void;
  redoDrawing: () => void;
  renameShape: (id: string, label: string) => void;
  removeDrawnShape: (id: string) => void;
  updateDrawnShapeVertex: (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => void;
  canUndo: boolean;
  canRedo: boolean;
  snapToGrid: boolean;
  setSnapToGrid: Dispatch<SetStateAction<boolean>>;
  applyProjectState: (patch: ExploreProjectStatePatch) => void;
  // GIS analyst tools
  featureInspectMode: boolean;
  setFeatureInspectMode: Dispatch<SetStateAction<boolean>>;
  identifyResult: IdentifyResult | null;
  setIdentifyResult: Dispatch<SetStateAction<IdentifyResult | null>>;
  goToCoordsOpen: boolean;
  setGoToCoordsOpen: Dispatch<SetStateAction<boolean>>;
  customLayers: CustomLayer[];
  addCustomLayer: (layer: Omit<CustomLayer, "id" | "order">) => void;
  removeCustomLayer: (id: string) => void;
  toggleCustomLayer: (id: string) => void;
  setCustomLayerOpacity: (id: string, opacity: number) => void;
  moveCustomLayer: (id: string, direction: LayerMoveDirection) => void;
  // Lens analysis
  analysisInputMode: AnalysisInputMode;
  setAnalysisInputMode: Dispatch<SetStateAction<AnalysisInputMode>>;
  selectedShapeId: string | null;
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>;
  analysisResult: LensAnalysisResult | null;
  setAnalysisResult: Dispatch<SetStateAction<LensAnalysisResult | null>>;
  analysisLoading: boolean;
  setAnalysisLoading: Dispatch<SetStateAction<boolean>>;
  analysisError: string | null;
  setAnalysisError: Dispatch<SetStateAction<string | null>>;
  // Route planner
  routeCoordinates: { lat: number; lng: number }[] | null;
  setRouteCoordinates: Dispatch<SetStateAction<{ lat: number; lng: number }[] | null>>;
}

function getInitialProfile(profileId?: string) {
  if (!profileId) {
    return getProfileById(GENERAL_EXPLORATION_PROFILE_ID);
  }

  return getProfileById(profileId);
}

function moveItemInList<T extends { id: string }>(
  items: T[],
  id: string,
  direction: LayerMoveDirection,
) {
  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex === -1) {
    return items;
  }

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, movedItem);
  return nextItems;
}

export function useExploreState(init: ExploreInitParams): ExploreState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectPointUrlSyncTimeoutRef = useRef<number | null>(null);
  const shapesUrlSyncTimeoutRef = useRef<number | null>(null);
  const hydratedShapesFromUrlRef = useRef(false);
  const lastShapesParamRef = useRef<string | null>(searchParams.get("shapes"));
  const pendingProjectLayersRef = useRef<LayerState | null>(null);
  const appModeRef = useRef<AppMode>(init.appMode ?? "explorer");
  const drawnShapesRef = useRef<DrawnShape[]>([]);
  const [appMode, setAppModeState] = useState<AppMode>(init.appMode ?? "explorer");

  const setAppMode = useCallback(
    (mode: AppMode) => {
      appModeRef.current = mode;
      setAppModeState(mode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", mode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [activeProfile, setActiveProfile] = useState<MissionProfile>(() =>
    getInitialProfile(init.profileId),
  );
  const [initError, setInitError] = useState<string | null>(null);
  const hasDirectCoords =
    init.lat !== undefined && init.lng !== undefined &&
    Number.isFinite(init.lat) && Number.isFinite(init.lng);
  const [initStatus, setInitStatus] = useState<"idle" | "resolving">(
    (init.locationQuery && !hasDirectCoords) ? "resolving" : "idle",
  );
  const [locationReady, setLocationReady] = useState(hasDirectCoords);

  const defaultCoordinates = hasDirectCoords
    ? { lat: init.lat!, lng: init.lng! }
    : { lat: DEFAULT_GLOBE_VIEW.lat, lng: DEFAULT_GLOBE_VIEW.lng };
  const defaultLabel = hasDirectCoords
    ? (init.locationQuery ?? `${init.lat!.toFixed(4)}, ${init.lng!.toFixed(4)}`)
    : init.locationQuery
      ? "Resolving location..."
      : "Starter view";

  const {
    selectedPoint,
    selectedLocationName,
    selectedLocationDisplayName,
    selectedRegion,
    selectPoint: selectGlobePoint,
    setSelectedRegion,
  } = useGlobeInteraction(defaultCoordinates, defaultLabel);

  const selectPoint = useCallback(
    (coords: { lat: number; lng: number }, label?: string, displayLabel?: string) => {
      setLocationReady(true);
      selectGlobePoint(coords, label, displayLabel);
      if (selectPointUrlSyncTimeoutRef.current !== null) {
        window.clearTimeout(selectPointUrlSyncTimeoutRef.current);
      }

      selectPointUrlSyncTimeoutRef.current = window.setTimeout(() => {
        // Keep URL in sync so the page is bookmarkable / shareable.
        // Use window.location.search instead of the React searchParams closure
        // to avoid stale captures when consecutive searches fire rapidly.
        const params = new URLSearchParams(window.location.search);
        params.set("lat", coords.lat.toFixed(6));
        params.set("lng", coords.lng.toFixed(6));
        params.set("mode", appModeRef.current);
        const currentShapesParam =
          drawnShapesRef.current.length > 0
            ? LZString.compressToEncodedURIComponent(JSON.stringify(drawnShapesRef.current))
            : null;
        if (currentShapesParam) {
          params.set("shapes", currentShapesParam);
        } else {
          params.delete("shapes");
        }
        if (label) {
          params.set("location", label);
        } else {
          params.delete("location");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        selectPointUrlSyncTimeoutRef.current = null;
      }, SHAPES_URL_SYNC_DEBOUNCE_MS);
    },
    [selectGlobePoint, router, pathname],
  );

  const [layers, setLayers] = useState<LayerState>(activeProfile.defaultLayers);
  const [globeViewMode, setGlobeViewMode] = useState<GlobeViewMode>("satellite");
  const [globeRotateMode, setGlobeRotateMode] = useState(false);
  const [subsurfaceRenderMode, setSubsurfaceRenderMode] =
    useState<SubsurfaceRenderMode>("surface_only");
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [imageSummary, setImageSummary] = useState(
    "No image uploaded yet. Use the upload panel to run client-side land cover estimation.",
  );
  const [uploadedClassification, setUploadedClassification] = useState<LandCoverBucket[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("nearby_places");
  const [earthquakeMarkers, setEarthquakeMarkers] = useState<EarthquakeEvent[]>([]);
  const [activeLensId, setActiveLensId] = useState<string | null>(init.lensId ?? null);
  const [driveMode, setDriveMode] = useState(false);
  const [mapEngine, setMapEngine] = useState<"cesium" | "maplibre">("cesium");
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");
  const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
  const [importedLayers, setImportedLayers] = useState<ImportedLayer[]>([]);
  const [activeImportedLayerId, setActiveImportedLayerId] = useState<string | null>(null);
  const [selectedImportedFeatureId, setSelectedImportedFeatureId] = useState<string | null>(null);
  const [wmsLayers, setWmsLayers] = useState<WmsLayerDefinition[]>([]);
  const [redoStack, setRedoStack] = useState<DrawnShape[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  // GIS analyst tools
  const [featureInspectMode, setFeatureInspectMode] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(null);
  const [goToCoordsOpen, setGoToCoordsOpen] = useState(false);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  // Lens analysis
  const [analysisInputMode, setAnalysisInputMode] = useState<AnalysisInputMode>("location");
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LensAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[] | null>(null);

  useEffect(() => {
    drawnShapesRef.current = drawnShapes;
  }, [drawnShapes]);

  const applyProjectState = useCallback((patch: ExploreProjectStatePatch) => {
    if (patch.appMode) {
      setAppMode(patch.appMode);
    }

    if (patch.activeProfileId) {
      if (patch.layers) {
        pendingProjectLayersRef.current = patch.layers;
      }
      setActiveProfile(getProfileById(patch.activeProfileId));
    }

    if (patch.activeLensId !== undefined) {
      setActiveLensId(patch.activeLensId);
    }

    if (patch.layers && !patch.activeProfileId) {
      setLayers(patch.layers);
    }

    if (patch.globeViewMode) {
      setGlobeViewMode(patch.globeViewMode);
    }

    if (patch.drawnShapes) {
      setDrawnShapes(patch.drawnShapes);
      setRedoStack([]);
    }

    if (patch.importedLayers) {
      setImportedLayers(patch.importedLayers);
      setActiveImportedLayerId(patch.importedLayers[0]?.id ?? null);
      setSelectedImportedFeatureId(null);
    }

    if (patch.wmsLayers) {
      setWmsLayers(patch.wmsLayers);
    }

    if (patch.selectedPoint) {
      selectPoint(
        patch.selectedPoint,
        patch.selectedLocationName,
        patch.selectedLocationDisplayName ?? patch.selectedLocationName,
      );
    }
  }, [selectPoint, setAppMode]);

  const addImportedLayer = useCallback((layer: ImportedLayer) => {
    setImportedLayers((prev) => [...prev, layer]);
    setActiveImportedLayerId((current) => current ?? layer.id);
  }, []);

  const removeImportedLayer = useCallback((id: string) => {
    setImportedLayers((prev) => {
      const next = prev.filter((layer) => layer.id !== id);
      setActiveImportedLayerId((current) => (current === id ? next[0]?.id ?? null : current));
      setSelectedImportedFeatureId(null);
      return next;
    });
  }, []);

  const toggleImportedLayerVisibility = useCallback((id: string) => {
    setImportedLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer,
      ),
    );
  }, []);

  const updateImportedLayerStyle = useCallback((
    id: string,
    stylePatch: Partial<ImportedLayer["style"]>,
  ) => {
    setImportedLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              style: {
                ...layer.style,
                ...stylePatch,
              },
            }
          : layer,
      ),
    );
  }, []);

  const moveImportedLayer = useCallback((id: string, direction: LayerMoveDirection) => {
    setImportedLayers((prev) => moveItemInList(prev, id, direction));
  }, []);

  const addWmsLayer = useCallback((layer: WmsLayerDefinition) => {
    setWmsLayers((prev) => [
      ...prev.filter((existingLayer) => existingLayer.id !== layer.id),
      {
        ...layer,
        visible: layer.visible ?? true,
        opacity: layer.opacity ?? 0.82,
      },
    ]);
  }, []);

  const removeWmsLayer = useCallback((id: string) => {
    setWmsLayers((prev) => prev.filter((layer) => layer.id !== id));
  }, []);

  const toggleWmsLayerVisibility = useCallback((id: string) => {
    setWmsLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, visible: !(layer.visible ?? true) } : layer,
      ),
    );
  }, []);

  const setWmsLayerOpacity = useCallback((id: string, opacity: number) => {
    setWmsLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, opacity } : layer,
      ),
    );
  }, []);

  const moveWmsLayer = useCallback((id: string, direction: LayerMoveDirection) => {
    setWmsLayers((prev) => moveItemInList(prev, id, direction));
  }, []);

  const addCustomLayer = useCallback((params: Omit<CustomLayer, "id" | "order">) => {
    setCustomLayers((prev) => [
      ...prev,
      { ...params, id: crypto.randomUUID(), order: prev.length },
    ]);
  }, []);

  const removeCustomLayer = useCallback((id: string) => {
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const toggleCustomLayer = useCallback((id: string) => {
    setCustomLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }, []);

  const setCustomLayerOpacity = useCallback((id: string, opacity: number) => {
    setCustomLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l)),
    );
  }, []);

  const moveCustomLayer = useCallback((id: string, direction: LayerMoveDirection) => {
    setCustomLayers((prev) => moveItemInList(prev, id, direction));
  }, []);

  const addDrawnShape = useCallback((shape: DrawnShape) => {
    setDrawnShapes((prev) => [...prev, shape]);
    setRedoStack([]);
  }, []);

  const undoDrawing = useCallback(() => {
    setDrawnShapes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redoDrawing = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setDrawnShapes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const renameShape = useCallback((id: string, label: string) => {
    setDrawnShapes((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  }, []);

  const removeDrawnShape = useCallback((id: string) => {
    setDrawnShapes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateDrawnShapeVertex = useCallback(
    (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => {
      setDrawnShapes((prev) =>
        prev.map((s) =>
          s.id === shapeId
            ? { ...s, coordinates: s.coordinates.map((c, i) => (i === vertexIndex ? coord : c)) }
            : s,
        ),
      );
    },
    [],
  );
  const { quickRegions, quickRegionsLoading } = useQuickRegions(
    selectedPoint,
    locationReady,
    activeProfile.id,
  );

  useEffect(() => {
    if (pendingProjectLayersRef.current) {
      setLayers(pendingProjectLayersRef.current);
      pendingProjectLayersRef.current = null;
      return;
    }

    setLayers(activeProfile.defaultLayers);
  }, [activeProfile]);

  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  useEffect(() => {
    const shapesParam = searchParams.get("shapes");
    if (shapesParam === lastShapesParamRef.current && hydratedShapesFromUrlRef.current) {
      return;
    }

    if (!shapesParam) {
      if (lastShapesParamRef.current !== null) {
        setDrawnShapes([]);
        setRedoStack([]);
      }
      lastShapesParamRef.current = null;
      hydratedShapesFromUrlRef.current = true;
      return;
    }

    try {
      const serialized = LZString.decompressFromEncodedURIComponent(shapesParam);
      if (!serialized) {
        throw new Error("Shapes payload could not be decompressed.");
      }

      const parsed = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        throw new Error("Shapes payload is not an array.");
      }

      setDrawnShapes(parsed as DrawnShape[]);
      setRedoStack([]);
      lastShapesParamRef.current = shapesParam;
    } catch {
      lastShapesParamRef.current = null;
    } finally {
      hydratedShapesFromUrlRef.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hydratedShapesFromUrlRef.current) {
      return;
    }

    const nextShapesParam =
      drawnShapes.length > 0
        ? LZString.compressToEncodedURIComponent(JSON.stringify(drawnShapes))
        : null;
    const currentShapesParam = searchParams.get("shapes");

    if (nextShapesParam === currentShapesParam) {
      lastShapesParamRef.current = nextShapesParam;
      return;
    }

    if (shapesUrlSyncTimeoutRef.current !== null) {
      window.clearTimeout(shapesUrlSyncTimeoutRef.current);
    }

    shapesUrlSyncTimeoutRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextShapesParam) {
        params.set("shapes", nextShapesParam);
      } else {
        params.delete("shapes");
      }

      lastShapesParamRef.current = nextShapesParam;
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      shapesUrlSyncTimeoutRef.current = null;
    }, SHAPES_URL_SYNC_DEBOUNCE_MS);

    return () => {
      if (shapesUrlSyncTimeoutRef.current !== null) {
        window.clearTimeout(shapesUrlSyncTimeoutRef.current);
      }
    };
  }, [drawnShapes, pathname, router, searchParams]);

  useEffect(() => {
    return () => {
      if (selectPointUrlSyncTimeoutRef.current !== null) {
        window.clearTimeout(selectPointUrlSyncTimeoutRef.current);
      }
      if (shapesUrlSyncTimeoutRef.current !== null) {
        window.clearTimeout(shapesUrlSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const locationQuery = init.locationQuery;
    // Skip geocoding when precise coords were already provided via URL params
    if (!locationQuery || hasDirectCoords) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setInitStatus("resolving");
      setInitError(null);

      try {
        const result = await resolveLocationQuery(locationQuery);
        if (!cancelled) {
          const resolvedLabel = result.fullName ?? result.name;
          const resolvedDisplayLabel = result.shortName ?? result.name;
          selectPoint(result.coordinates, resolvedLabel, resolvedDisplayLabel);
        }
      } catch (error) {
        if (!cancelled) {
          setInitError(
            error instanceof Error
              ? `Couldn't resolve "${locationQuery}". ${error.message}`
              : `Couldn't resolve "${locationQuery}".`,
          );
        }
      } finally {
        if (!cancelled) {
          setInitStatus("idle");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [init.locationQuery, hasDirectCoords, selectPoint]);

  const drawnGeometry = useMemo(
    () => drawnShapesToFeatureCollection(drawnShapes),
    [drawnShapes],
  );

  return {
    init,
    appMode,
    setAppMode,
    activeProfile,
    setActiveProfile,
    initError,
    setInitError,
    initStatus,
    defaultCoordinates,
    defaultLabel,
    locationReady,
    selectedPoint,
    selectedLocationName,
    selectedLocationDisplayName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
    quickRegionsLoading,
    globeViewMode,
    setGlobeViewMode,
    globeRotateMode,
    setGlobeRotateMode,
    layers,
    setLayers,
    subsurfaceRenderMode,
    setSubsurfaceRenderMode,
    terrainExaggeration,
    setTerrainExaggeration,
    imageSummary,
    setImageSummary,
    uploadedClassification,
    setUploadedClassification,
    previewUrl,
    setPreviewUrl,
    resultsMode,
    setResultsMode,
    earthquakeMarkers,
    setEarthquakeMarkers,
    activeLensId,
    setActiveLensId,
    driveMode,
    setDriveMode,
    mapEngine,
    setMapEngine,
    drawingTool,
    setDrawingTool,
    drawnShapes,
    setDrawnShapes,
    drawnGeometry,
    importedLayers,
    activeImportedLayerId,
    setActiveImportedLayerId,
    selectedImportedFeatureId,
    setSelectedImportedFeatureId,
    addImportedLayer,
    removeImportedLayer,
    toggleImportedLayerVisibility,
    updateImportedLayerStyle,
    moveImportedLayer,
    wmsLayers,
    addWmsLayer,
    removeWmsLayer,
    toggleWmsLayerVisibility,
    setWmsLayerOpacity,
    moveWmsLayer,
    addDrawnShape,
    undoDrawing,
    redoDrawing,
    renameShape,
    removeDrawnShape,
    updateDrawnShapeVertex,
    canUndo: drawnShapes.length > 0,
    canRedo: redoStack.length > 0,
    snapToGrid,
    setSnapToGrid,
    applyProjectState,
    // GIS analyst tools
    featureInspectMode,
    setFeatureInspectMode,
    identifyResult,
    setIdentifyResult,
    goToCoordsOpen,
    setGoToCoordsOpen,
    customLayers,
    addCustomLayer,
    removeCustomLayer,
    toggleCustomLayer,
    setCustomLayerOpacity,
    moveCustomLayer,
    // Lens analysis
    analysisInputMode,
    setAnalysisInputMode,
    selectedShapeId,
    setSelectedShapeId,
    analysisResult,
    setAnalysisResult,
    analysisLoading,
    setAnalysisLoading,
    analysisError,
    setAnalysisError,
    routeCoordinates,
    setRouteCoordinates,
  };
}
