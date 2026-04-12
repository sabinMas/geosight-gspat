"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useQuickRegions } from "@/hooks/useQuickRegions";
import {
  drawnShapesToFeatureCollection,
  updateShapeVertex as updateShapeVertexValue,
  withShapeMeasurement,
} from "@/lib/analysis-geometry";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { createLayerState } from "@/lib/map-layers";
import { getProfileById } from "@/lib/profiles";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import {
  AnalysisInputMode,
  AppMode,
  DrawnGeometryFeatureCollection,
  DrawnShape,
  DrawingTool,
  EarthquakeEvent,
  GlobeViewMode,
  ExploreInitState,
  LandCoverBucket,
  MissionProfile,
  RegionSelection,
  ResultsMode,
  SubsurfaceRenderMode,
  LensAnalysisResult,
  LayerState,
  IdentifyResult,
} from "@/types";
import { DrawingDraftState } from "@/context/AnalysisContext";

export type ExploreInitParams = ExploreInitState;

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
  drawingTool: DrawingTool;
  setDrawingTool: Dispatch<SetStateAction<DrawingTool>>;
  drawnShapes: DrawnShape[];
  drawnGeometry: DrawnGeometryFeatureCollection;
  setDrawnShapes: Dispatch<SetStateAction<DrawnShape[]>>;
  addDrawnShape: (shape: DrawnShape) => void;
  undoDrawing: () => void;
  redoDrawing: () => void;
  renameShape: (id: string, label: string) => void;
  removeDrawnShape: (id: string) => void;
  updateDrawnShapeVertex: (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => void;
  selectedShapeId: string | null;
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>;
  analysisInputMode: AnalysisInputMode;
  setAnalysisInputMode: Dispatch<SetStateAction<AnalysisInputMode>>;
  analysisResult: LensAnalysisResult | null;
  setAnalysisResult: Dispatch<SetStateAction<LensAnalysisResult | null>>;
  analysisLoading: boolean;
  setAnalysisLoading: Dispatch<SetStateAction<boolean>>;
  analysisError: string | null;
  setAnalysisError: Dispatch<SetStateAction<string | null>>;
  drawingDraft: DrawingDraftState;
  setDrawingDraft: Dispatch<SetStateAction<DrawingDraftState>>;
  requestUndoDraftVertex: () => void;
  undoDraftNonce: number;
  requestCompleteDrawing: () => void;
  completeDrawingNonce: number;
  canUndo: boolean;
  canRedo: boolean;
  snapToGrid: boolean;
  setSnapToGrid: Dispatch<SetStateAction<boolean>>;
  identifyMode: boolean;
  setIdentifyMode: Dispatch<SetStateAction<boolean>>;
  identifyResult: IdentifyResult | null;
  setIdentifyResult: Dispatch<SetStateAction<IdentifyResult | null>>;
}

function getInitialProfile(profileId?: string) {
  if (!profileId) {
    return getProfileById(GENERAL_EXPLORATION_PROFILE_ID);
  }

  return getProfileById(profileId);
}

export function useExploreState(init: ExploreInitParams): ExploreState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appMode, setAppModeState] = useState<AppMode>(init.appMode ?? "explorer");

  const setAppMode = useCallback(
    (mode: AppMode) => {
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
      // Keep URL in sync so the page is bookmarkable / shareable
      const params = new URLSearchParams(searchParams.toString());
      params.set("lat", coords.lat.toFixed(6));
      params.set("lng", coords.lng.toFixed(6));
      if (label) {
        params.set("location", label);
      } else {
        params.delete("location");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [selectGlobePoint, router, pathname, searchParams],
  );

  const [layers, setLayers] = useState<LayerState>(() =>
    createLayerState(activeProfile.defaultLayers),
  );
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
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");
  const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
  const [redoStack, setRedoStack] = useState<DrawnShape[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [identifyMode, setIdentifyMode] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [analysisInputMode, setAnalysisInputMode] = useState<AnalysisInputMode>("location");
  const [analysisResult, setAnalysisResult] = useState<LensAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<DrawingDraftState>({
    tool: "none",
    vertexCount: 0,
    measurementLabel: null,
    canUndo: false,
    canComplete: false,
  });
  const [undoDraftNonce, setUndoDraftNonce] = useState(0);
  const [completeDrawingNonce, setCompleteDrawingNonce] = useState(0);

  const drawnGeometry = useMemo(
    () => drawnShapesToFeatureCollection(drawnShapes),
    [drawnShapes],
  );

  const addDrawnShape = useCallback((shape: DrawnShape) => {
    const normalizedShape = withShapeMeasurement(shape);
    setDrawnShapes((prev) => [...prev, normalizedShape]);
    setRedoStack([]);
    setSelectedShapeId(normalizedShape.id);
    setAnalysisInputMode("geometry");
  }, []);

  const undoDrawing = useCallback(() => {
    setDrawnShapes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      const next = prev.slice(0, -1);
      setSelectedShapeId(next.at(-1)?.id ?? null);
      return next;
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
    setSelectedShapeId((current) => (current === id ? null : current));
  }, []);

  const updateDrawnShapeVertex = useCallback(
    (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => {
      setDrawnShapes((prev) =>
        prev.map((s) =>
          s.id === shapeId
            ? updateShapeVertexValue(s, vertexIndex, coord)
            : s,
        ),
      );
    },
    [],
  );

  const requestUndoDraftVertex = useCallback(() => {
    setUndoDraftNonce((current) => current + 1);
  }, []);

  const requestCompleteDrawing = useCallback(() => {
    setCompleteDrawingNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!drawnShapes.length) {
      setSelectedShapeId(null);
      if (analysisInputMode === "geometry") {
        setAnalysisInputMode("location");
      }
    } else if (!selectedShapeId || !drawnShapes.some((shape) => shape.id === selectedShapeId)) {
      setSelectedShapeId(drawnShapes[drawnShapes.length - 1]?.id ?? null);
    }
  }, [analysisInputMode, drawnShapes, selectedShapeId]);

  useEffect(() => {
    if (drawingTool === "none") {
      setDrawingDraft({
        tool: "none",
        vertexCount: 0,
        measurementLabel: null,
        canUndo: false,
        canComplete: false,
      });
    } else {
      setDrawingDraft((current) => ({
        ...current,
        tool: drawingTool,
      }));
    }
  }, [drawingTool]);
  const { quickRegions, quickRegionsLoading } = useQuickRegions(
    selectedPoint,
    locationReady,
    activeProfile.id,
  );

  useEffect(() => {
    setLayers(createLayerState(activeProfile.defaultLayers));
  }, [activeProfile]);

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
    drawingTool,
    setDrawingTool,
    drawnShapes,
    drawnGeometry,
    setDrawnShapes,
    addDrawnShape,
    undoDrawing,
    redoDrawing,
    renameShape,
    removeDrawnShape,
    updateDrawnShapeVertex,
    selectedShapeId,
    setSelectedShapeId,
    analysisInputMode,
    setAnalysisInputMode,
    analysisResult,
    setAnalysisResult,
    analysisLoading,
    setAnalysisLoading,
    analysisError,
    setAnalysisError,
    drawingDraft,
    setDrawingDraft,
    requestUndoDraftVertex,
    undoDraftNonce,
    requestCompleteDrawing,
    completeDrawingNonce,
    canUndo: drawnShapes.length > 0,
    canRedo: redoStack.length > 0,
    snapToGrid,
    setSnapToGrid,
    identifyMode,
    setIdentifyMode,
    identifyResult,
    setIdentifyResult,
  };
}
