"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { LayerState } from "@/components/Globe/DataLayers";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { getDemoById } from "@/lib/demos/registry";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { getMissionRunPreset } from "@/lib/mission-run-presets";
import { getProfileById } from "@/lib/profiles";
import {
  DemoOverlay,
  ExploreInitState,
  LandCoverBucket,
  MissionProfile,
  RegionSelection,
  ResultsMode,
} from "@/types";

export type ExploreInitParams = ExploreInitState;

export interface ExploreState {
  init: ExploreInitParams;
  activeDemo: DemoOverlay | null;
  coolingDemo: DemoOverlay | null;
  overlayDemo: DemoOverlay | null;
  missionRunPreset: ReturnType<typeof getMissionRunPreset>;
  activeProfile: MissionProfile;
  setActiveProfile: Dispatch<SetStateAction<MissionProfile>>;
  initError: string | null;
  setInitError: Dispatch<SetStateAction<string | null>>;
  initStatus: "idle" | "resolving";
  demoOpen: boolean;
  setDemoOpen: Dispatch<SetStateAction<boolean>>;
  pendingDemoLoad: boolean;
  setPendingDemoLoad: Dispatch<SetStateAction<boolean>>;
  pendingDemoSiteId: string | null;
  setPendingDemoSiteId: Dispatch<SetStateAction<string | null>>;
  defaultCoordinates: {
    lat: number;
    lng: number;
  };
  defaultLabel: string;
  selectedPoint: {
    lat: number;
    lng: number;
  };
  selectedLocationName: string;
  selectedRegion: RegionSelection;
  selectPoint: (coords: { lat: number; lng: number }, label?: string) => void;
  setSelectedRegion: Dispatch<SetStateAction<RegionSelection>>;
  quickRegions: RegionSelection[];
  layers: LayerState;
  setLayers: Dispatch<SetStateAction<LayerState>>;
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
  const activeDemo = useMemo(() => getDemoById(init.demoId), [init.demoId]);
  const coolingDemo = useMemo(() => getDemoById("pnw-cooling"), []);
  const overlayDemo = coolingDemo ?? activeDemo;
  const missionRunPreset = useMemo(
    () =>
      getMissionRunPreset(
        init.missionRunPresetId ?? activeDemo?.competition?.missionRunPresetId ?? null,
      ),
    [activeDemo?.competition?.missionRunPresetId, init.missionRunPresetId],
  );

  const [activeProfile, setActiveProfile] = useState<MissionProfile>(() =>
    getInitialProfile(init.profileId ?? activeDemo?.profileId),
  );
  const [initError, setInitError] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<"idle" | "resolving">(
    init.locationQuery ? "resolving" : "idle",
  );
  const [demoOpen, setDemoOpen] = useState(activeDemo?.entryMode === "overlay");
  const [pendingDemoLoad, setPendingDemoLoad] = useState(activeDemo?.entryMode === "overlay");
  const [pendingDemoSiteId, setPendingDemoSiteId] = useState<string | null>(null);

  const defaultCoordinates = activeDemo?.coordinates ?? {
    lat: DEFAULT_VIEW.lat,
    lng: DEFAULT_VIEW.lng,
  };
  const defaultLabel = init.locationQuery
    ? "Resolving location..."
    : activeDemo?.locationName ?? "Starter view";

  const {
    selectedPoint,
    selectedLocationName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
  } = useGlobeInteraction(defaultCoordinates, defaultLabel, activeProfile.demoSites ?? []);

  const [layers, setLayers] = useState<LayerState>(activeProfile.defaultLayers);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [imageSummary, setImageSummary] = useState(
    "No image uploaded yet. Use the upload panel to run client-side land cover estimation.",
  );
  const [uploadedClassification, setUploadedClassification] = useState<LandCoverBucket[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("analysis");

  useEffect(() => {
    setLayers(activeProfile.defaultLayers);
  }, [activeProfile]);

  useEffect(() => {
    if (init.locationQuery || !activeDemo || activeDemo.entryMode !== "workspace") {
      return;
    }

    selectPoint(activeDemo.coordinates, activeDemo.locationName);
  }, [activeDemo, init.locationQuery, selectPoint]);

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
          selectPoint(result.coordinates, result.name);
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
    activeDemo,
    coolingDemo,
    overlayDemo,
    missionRunPreset,
    activeProfile,
    setActiveProfile,
    initError,
    setInitError,
    initStatus,
    demoOpen,
    setDemoOpen,
    pendingDemoLoad,
    setPendingDemoLoad,
    pendingDemoSiteId,
    setPendingDemoSiteId,
    defaultCoordinates,
    defaultLabel,
    selectedPoint,
    selectedLocationName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
    layers,
    setLayers,
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
