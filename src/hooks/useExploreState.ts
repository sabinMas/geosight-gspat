"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayerState } from "@/components/Globe/DataLayers";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useQuickRegions } from "@/hooks/useQuickRegions";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { getDemoById } from "@/lib/demos/registry";
import { getProfileById } from "@/lib/profiles";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import {
  AppMode,
  DemoOverlay,
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
  activeDemo: DemoOverlay | null;
  coolingDemo: DemoOverlay | null;
  overlayDemo: DemoOverlay | null;
  dismissOverlayDemo: () => void;
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

  const activeDemo = useMemo(() => getDemoById(init.demoId), [init.demoId]);
  const coolingDemo = useMemo(() => getDemoById("pnw-cooling"), []);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const overlayDemo = useMemo(
    () =>
      activeDemo?.entryMode === "overlay" && !overlayDismissed ? activeDemo : null,
    [activeDemo, overlayDismissed],
  );
  const [activeProfile, setActiveProfile] = useState<MissionProfile>(() =>
    getInitialProfile(init.profileId),
  );
  const [initError, setInitError] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<"idle" | "resolving">(
    init.locationQuery ? "resolving" : "idle",
  );
  const [locationReady, setLocationReady] = useState(false);

  const defaultCoordinates = {
    lat: DEFAULT_GLOBE_VIEW.lat,
    lng: DEFAULT_GLOBE_VIEW.lng,
  };
  const defaultLabel = init.locationQuery ? "Resolving location..." : "Starter view";

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
    },
    [selectGlobePoint],
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
  const [resultsMode, setResultsMode] = useState<ResultsMode>("analysis");
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
    if (!locationQuery) {
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
  }, [init.locationQuery, selectPoint]);

  return {
    init,
    appMode,
    setAppMode,
    activeDemo,
    coolingDemo,
    overlayDemo,
    dismissOverlayDemo: () => setOverlayDismissed(true),
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
  };
}
