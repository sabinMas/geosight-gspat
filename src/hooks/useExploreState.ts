"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayerState } from "@/components/Globe/DataLayers";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useQuickRegions } from "@/hooks/useQuickRegions";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { getProfileById } from "@/lib/profiles";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import {
  AppMode,
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
} from "@/types";

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
  setDrawnShapes: Dispatch<SetStateAction<DrawnShape[]>>;
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
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");
  const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
  const [redoStack, setRedoStack] = useState<DrawnShape[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);

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
    setLayers(activeProfile.defaultLayers);
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
    setDrawnShapes,
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
  };
}
