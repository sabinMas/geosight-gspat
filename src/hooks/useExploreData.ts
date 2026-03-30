"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GeoSightContext } from "@/lib/agents/agent-config";
import { buildLocationTrends } from "@/lib/data-trends";
import { calculateProfileScore } from "@/lib/scoring";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { useWorkspaceCards } from "@/hooks/useWorkspaceCards";
import { useWorkspacePresentation } from "@/hooks/useWorkspacePresentation";
import { ExploreState } from "@/hooks/useExploreState";

interface UseExploreDataArgs {
  state: ExploreState;
  setGeoContext: (context: GeoSightContext) => void;
}

async function readAgentRouteError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "GeoScribe could not generate a report right now.";
  }

  const text = (await response.text()).trim();
  return text || "GeoScribe could not generate a report right now.";
}

export function useExploreData({ state, setGeoContext }: UseExploreDataArgs) {
  const {
    activeDemo,
    activeProfile,
    coolingDemo,
    imageSummary,
    init,
    missionRunPreset,
    pendingDemoLoad,
    pendingDemoSiteId,
    previewUrl,
    resultsMode,
    selectPoint,
    selectedLocationName,
    selectedPoint,
    setPendingDemoLoad,
    setPendingDemoSiteId,
    uploadedClassification,
  } = state;
  const { geodata, score, loading, error } = useSiteAnalysis(
    selectedPoint,
    activeProfile,
  );
  const { sites, addSite, loadDemoSites } = useSavedSites(activeProfile.id);
  const {
    schoolContext,
    loading: schoolLoading,
    error: schoolError,
  } = useSchoolContext(selectedPoint);
  const {
    category,
    setCategory,
    categories,
    places,
    loading: nearbyLoading,
    error: nearbyError,
    source: nearbySource,
  } = useNearbyPlaces(selectedPoint, selectedLocationName);
  const { cards, visibility, primaryCards, workspaceCards, isCardVisible, setCardVisible } =
    useWorkspaceCards(activeProfile.id);

  const allWorkspaceCardIds = useMemo(
    () => cards.filter((card) => card.zone === "workspace").map((card) => card.id),
    [cards],
  );
  const visibleWorkspaceCardIds = useMemo(
    () => workspaceCards.map((card) => card.id),
    [workspaceCards],
  );
  const visiblePrimaryCardIds = useMemo(
    () => primaryCards.map((card) => card.id),
    [primaryCards],
  );

  const {
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
    activePrimaryCardId,
    setActivePrimaryCardId,
    savedBoards,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
  } = useWorkspacePresentation(
    activeProfile.id,
    allWorkspaceCardIds,
    visibleWorkspaceCardIds,
    visiblePrimaryCardIds,
    setCardVisible,
  );

  const effectiveClassification = useMemo(
    () =>
      uploadedClassification.length
        ? uploadedClassification
        : geodata?.landClassification ?? [],
    [geodata?.landClassification, uploadedClassification],
  );
  const locationTrends = useMemo(() => buildLocationTrends(geodata), [geodata]);
  const siteScore = useMemo(
    () => score ?? (geodata ? calculateProfileScore(geodata, activeProfile) : null),
    [activeProfile, geodata, score],
  );
  const boardCards = useMemo(
    () => workspaceCards.filter((card) => visibility[card.id]),
    [visibility, workspaceCards],
  );
  const activeBoardCard =
    boardCards.find((card) => card.id === activeCardId) ?? boardCards[0] ?? null;
  const activePrimaryCard =
    primaryCards.find((card) => card.id === activePrimaryCardId) ?? primaryCards[0] ?? null;
  const coolingDemoSites = useMemo(
    () => coolingDemo?.preloadedSites ?? [],
    [coolingDemo?.preloadedSites],
  );

  const showComparePrompt = sites.length >= 2 && !isCardVisible("compare");
  const showImagePrompt = Boolean(previewUrl) && !isCardVisible("land-classifier");
  const showSourcePrompt = Boolean(geodata) && !isCardVisible("source-awareness");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [slowDemoLoading, setSlowDemoLoading] = useState(false);
  const [demoFallbackDismissed, setDemoFallbackDismissed] = useState(false);

  const agentContext = useMemo<GeoSightContext>(
    () => ({
      lat: selectedPoint.lat,
      lng: selectedPoint.lng,
      profile: activeProfile.id,
      missionId: missionRunPreset?.id,
      score: geodata ? siteScore?.total : undefined,
      dataBundle: geodata
        ? {
            locationName: selectedLocationName,
            resultsMode,
            geodata,
            schoolContext,
            nearbyPlaces: places,
            nearbySource,
            dataTrends: locationTrends,
            imageSummary,
            classification: effectiveClassification,
          }
        : undefined,
    }),
    [
      activeProfile.id,
      effectiveClassification,
      geodata,
      imageSummary,
      locationTrends,
      missionRunPreset?.id,
      nearbySource,
      places,
      resultsMode,
      schoolContext,
      selectedLocationName,
      selectedPoint.lat,
      selectedPoint.lng,
      siteScore?.total,
    ],
  );

  useEffect(() => {
    if (!missionRunPreset || !init.judgeMode) {
      return;
    }

    setCardVisible("mission-run", true);
  }, [init.judgeMode, missionRunPreset, setCardVisible]);

  useEffect(() => {
    if (!pendingDemoLoad || activeProfile.id !== "data-center" || !coolingDemoSites.length) {
      return;
    }

    loadDemoSites(coolingDemoSites);
    const focusSite =
      coolingDemoSites.find((candidate) => candidate.id === pendingDemoSiteId) ??
      coolingDemoSites[0];

    if (focusSite) {
      selectPoint(focusSite.coordinates, `${focusSite.name} cooling demo`);
    }

    setPendingDemoLoad(false);
    setPendingDemoSiteId(null);
  }, [
    activeProfile.id,
    coolingDemoSites,
    loadDemoSites,
    pendingDemoLoad,
    pendingDemoSiteId,
    selectPoint,
    setPendingDemoLoad,
    setPendingDemoSiteId,
  ]);

  useEffect(() => {
    if (!init.judgeMode || !missionRunPreset) {
      return;
    }

    setViewMode("board");
    setActiveCardId("mission-run");
  }, [init.judgeMode, missionRunPreset, setActiveCardId, setViewMode]);

  useEffect(() => {
    setGeoContext(agentContext);
  }, [agentContext, setGeoContext]);

  useEffect(() => {
    setReportOpen(false);
    setReportLoading(false);
    setReportMarkdown("");
    setReportError(null);
  }, [activeProfile.id, selectedPoint.lat, selectedPoint.lng]);

  useEffect(() => {
    setSlowDemoLoading(false);
    setDemoFallbackDismissed(false);
  }, [activeDemo?.id, selectedPoint.lat, selectedPoint.lng]);

  useEffect(() => {
    if (!activeDemo || !loading) {
      setSlowDemoLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setSlowDemoLoading(true);
    }, 8_000);

    return () => window.clearTimeout(timeout);
  }, [activeDemo, loading, selectedPoint.lat, selectedPoint.lng]);

  const closeReportPanel = useCallback(() => {
    setReportOpen(false);
  }, []);

  const dismissDemoFallback = useCallback(() => {
    setDemoFallbackDismissed(true);
  }, []);

  const generateReport = useCallback(async () => {
    if (!geodata) {
      return;
    }

    setReportOpen(true);
    setReportLoading(true);
    setReportMarkdown("");
    setReportError(null);

    try {
      const response = await fetch("/api/agents/geo-scribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Generate a full site assessment report for ${selectedLocationName} at ${selectedPoint.lat}, ${selectedPoint.lng} using the ${activeProfile.name} mission profile. Use the full context bundle, cite real values with units, and keep the output in markdown.`,
          context: agentContext,
        }),
      });

      if (!response.ok) {
        throw new Error(await readAgentRouteError(response));
      }

      const markdown = (await response.text()).trim();
      if (!markdown) {
        throw new Error("GeoScribe returned an empty report.");
      }

      setReportMarkdown(markdown);
    } catch (reportGenerationError) {
      setReportError(
        reportGenerationError instanceof Error
          ? reportGenerationError.message
          : "GeoScribe could not generate a report right now.",
      );
    } finally {
      setReportLoading(false);
    }
  }, [
    activeProfile.name,
    agentContext,
    geodata,
    selectedLocationName,
    selectedPoint.lat,
    selectedPoint.lng,
  ]);

  return {
    geodata,
    score,
    siteScore,
    loading,
    error,
    schoolContext,
    schoolLoading,
    schoolError,
    category,
    setCategory,
    categories,
    places,
    nearbyLoading,
    nearbyError,
    nearbySource,
    cards,
    visibility,
    primaryCards,
    workspaceCards,
    isCardVisible,
    setCardVisible,
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
    activePrimaryCardId,
    setActivePrimaryCardId,
    savedBoards,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
    boardCards,
    activeBoardCard,
    activePrimaryCard,
    sites,
    addSite,
    loadDemoSites,
    effectiveClassification,
    locationTrends,
    showComparePrompt,
    showImagePrompt,
    showSourcePrompt,
    reportOpen,
    reportLoading,
    reportMarkdown,
    reportError,
    generateReport,
    closeReportPanel,
    showDemoFallback:
      Boolean(activeDemo?.fallbackScreenshot) &&
      Boolean(activeDemo) &&
      loading &&
      slowDemoLoading &&
      !demoFallbackDismissed,
    dismissDemoFallback,
  };
}
