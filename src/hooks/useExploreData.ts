"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCapabilityFallbackResponse,
  buildCapabilityPrompt,
  deriveSubsurfaceDatasets,
  evaluateAnalysisCapabilities,
} from "@/lib/analysis-capabilities";
import { GeoSightContext } from "@/lib/agents/agent-config";
import { buildLocationTrends } from "@/lib/data-trends";
import { fetchWithTimeout } from "@/lib/network";
import { calculateProfileScore } from "@/lib/scoring";
import {
  detectWorkspaceIntent,
  getPrimaryCardForIntent,
  getSuggestedCardsForShell,
  type WorkspaceIntent,
} from "@/lib/workspace-intent";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useHousingMarket } from "@/hooks/useHousingMarket";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { useWorkspaceCards } from "@/hooks/useWorkspaceCards";
import { useWorkspacePresentation } from "@/hooks/useWorkspacePresentation";
import { ExploreState } from "@/hooks/useExploreState";
import {
  AnalysisCapabilityId,
  AnalysisCapabilityResult,
  WorkspaceCardId,
} from "@/types";

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

async function readResponseTextWithTimeout(response: Response, timeoutMs: number) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      response.text(),
      new Promise<string>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("The AI response took too long to finish."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function laneToAgentId(capabilityId: AnalysisCapabilityId, modelLane: string) {
  if (modelLane === "writer") {
    return "geo-scribe" as const;
  }

  return "geo-analyst" as const;
}

export function useExploreData({ state, setGeoContext }: UseExploreDataArgs) {
  const {
    activeProfile,
    imageSummary,
    init,
    previewUrl,
    resultsMode,
    selectedLocationName,
    selectedPoint,
    uploadedClassification,
  } = state;
  const { geodata, score, loading, error } = useSiteAnalysis(
    selectedPoint,
    activeProfile,
    state.locationReady,
  );
  const { sites, addSite } = useSavedSites(activeProfile.id);
  const {
    housingMarket,
    loading: housingMarketLoading,
    error: housingMarketError,
  } = useHousingMarket(
    activeProfile.id === "home-buying" && state.locationReady,
    geodata?.demographics.countyName,
    geodata?.demographics.stateCode,
    selectedLocationName,
  );
  const {
    schoolContext,
    loading: schoolLoading,
    error: schoolError,
  } = useSchoolContext(selectedPoint, state.locationReady);
  const {
    category,
    setCategory,
    categories,
    places,
    loading: nearbyLoading,
    error: nearbyError,
    source: nearbySource,
  } = useNearbyPlaces(selectedPoint, selectedLocationName, state.locationReady);
  const { cards, visibility, primaryCards, workspaceCards, isCardVisible, setCardVisible } =
    useWorkspaceCards(activeProfile.id);
  const allWorkspaceCards = useMemo(
    () => cards.filter((card) => card.zone === "workspace"),
    [cards],
  );

  const allWorkspaceCardIds = useMemo(
    () => allWorkspaceCards.map((card) => card.id),
    [allWorkspaceCards],
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
    shellMode,
    setShellMode,
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
    activePrimaryCardId,
    setActivePrimaryCardId,
    pinnedCardIds,
    togglePinnedCard,
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
  const subsurfaceDatasets = useMemo(
    () => deriveSubsurfaceDatasets(geodata, state.selectedRegion),
    [geodata, state.selectedRegion],
  );
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

  const showComparePrompt = sites.length >= 2 && !isCardVisible("compare");
  const showImagePrompt = Boolean(previewUrl) && !isCardVisible("land-classifier");
  const showSourcePrompt = Boolean(geodata) && !isCardVisible("source-awareness");
  const [lastIntent, setLastIntent] = useState<WorkspaceIntent | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [capabilityAnalysisLoading, setCapabilityAnalysisLoading] = useState(false);
  const [capabilityAnalysisError, setCapabilityAnalysisError] = useState<string | null>(
    null,
  );
  const [capabilityAnalysisResult, setCapabilityAnalysisResult] =
    useState<AnalysisCapabilityResult | null>(null);
  const [capabilityPreviewDismissed, setCapabilityPreviewDismissed] = useState(false);
  const analysisCapabilities = useMemo(() => {
    const liveCapabilities = evaluateAnalysisCapabilities({
      geodata,
      profile: activeProfile,
      locationName: selectedLocationName,
      selectedRegion: state.selectedRegion,
      dataTrends: locationTrends,
      subsurfaceDatasets,
    }).filter((capability) => capability.available);

    return liveCapabilities;
  }, [
    activeProfile,
    geodata,
    locationTrends,
    selectedLocationName,
    state.selectedRegion,
    subsurfaceDatasets,
  ]);

  const agentContext = useMemo<GeoSightContext>(
    () => ({
      lat: selectedPoint.lat,
      lng: selectedPoint.lng,
      profile: activeProfile.id,
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
            analysisCapabilities,
            subsurfaceDatasets,
            globeViewMode: state.globeViewMode,
            subsurfaceRenderMode: state.subsurfaceRenderMode,
            imageSummary,
            classification: effectiveClassification,
          }
        : undefined,
      uiContext: undefined,
    }),
    [
      activeProfile.id,
      analysisCapabilities,
      effectiveClassification,
      geodata,
      imageSummary,
      locationTrends,
      nearbySource,
      places,
      resultsMode,
      schoolContext,
      selectedLocationName,
      selectedPoint.lat,
      selectedPoint.lng,
      siteScore?.total,
      state.globeViewMode,
      state.subsurfaceRenderMode,
      subsurfaceDatasets,
    ],
  );

  useEffect(() => {
    if (!state.locationReady || shellMode !== "minimal") {
      return;
    }

    if (init.locationQuery) {
      setShellMode("guided");
    }
  }, [
    init.locationQuery,
    setShellMode,
    shellMode,
    state.locationReady,
  ]);

  useEffect(() => {
    setGeoContext(agentContext);
  }, [agentContext, setGeoContext]);

  useEffect(() => {
    setReportOpen(false);
    setReportLoading(false);
    setReportMarkdown("");
    setReportError(null);
    setCapabilityAnalysisLoading(false);
    setCapabilityAnalysisError(null);
    setCapabilityAnalysisResult(null);
    setCapabilityPreviewDismissed(false);
  }, [activeProfile.id, selectedPoint.lat, selectedPoint.lng]);

  useEffect(() => {
    if (
      capabilityPreviewDismissed ||
      capabilityAnalysisLoading ||
      capabilityAnalysisError ||
      capabilityAnalysisResult ||
      analysisCapabilities.length === 0
    ) {
      return;
    }

    const starterCapability =
      analysisCapabilities.find((capability) => capability.recommended) ?? analysisCapabilities[0];

    if (!starterCapability) {
      return;
    }

    setCapabilityAnalysisResult({
      analysisId: starterCapability.analysisId,
      title: starterCapability.title,
      response: buildCapabilityFallbackResponse(starterCapability.analysisId, {
        geodata,
        profile: activeProfile,
        locationName: selectedLocationName,
        selectedRegion: state.selectedRegion,
        dataTrends: locationTrends,
        subsurfaceDatasets,
      }),
      model: `${starterCapability.modelLane} starter preview`,
      generatedAt: new Date().toISOString(),
    });
  }, [
    activeProfile,
    analysisCapabilities,
    capabilityAnalysisError,
    capabilityAnalysisLoading,
    capabilityAnalysisResult,
    capabilityPreviewDismissed,
    geodata,
    locationTrends,
    selectedLocationName,
    state.selectedRegion,
    subsurfaceDatasets,
  ]);

  const closeReportPanel = useCallback(() => {
    setReportOpen(false);
  }, []);

  const clearCapabilityAnalysis = useCallback(() => {
    setCapabilityAnalysisLoading(false);
    setCapabilityAnalysisError(null);
    setCapabilityAnalysisResult(null);
    setCapabilityPreviewDismissed(true);
  }, []);

  const runCapabilityAnalysis = useCallback(
    async (analysisId: AnalysisCapabilityId) => {
      const capability = analysisCapabilities.find((entry) => entry.analysisId === analysisId);
      if (!capability) {
        return;
      }

      const targetAgentId = laneToAgentId(analysisId, capability.modelLane);
      const prompt = buildCapabilityPrompt(analysisId, selectedLocationName);
      const fallbackResponse = buildCapabilityFallbackResponse(analysisId, {
        geodata,
        profile: activeProfile,
        locationName: selectedLocationName,
        selectedRegion: state.selectedRegion,
        dataTrends: locationTrends,
        subsurfaceDatasets,
      });

      setCapabilityAnalysisLoading(true);
      setCapabilityAnalysisError(null);
      setCapabilityPreviewDismissed(false);
      setCapabilityAnalysisResult({
        analysisId,
        title: capability.title,
        response: fallbackResponse,
        model: `${capability.modelLane} preview`,
        generatedAt: new Date().toISOString(),
      });

      try {
        if (!geodata) {
          return;
        }

        const response = await fetchWithTimeout(
          `/api/agents/${targetAgentId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: prompt,
              context: agentContext,
            }),
          },
          25_000,
        );

        if (!response.ok) {
          throw new Error(await readAgentRouteError(response));
        }

        const content = (await readResponseTextWithTimeout(response, 12_000)).trim();
        setCapabilityAnalysisResult({
          analysisId,
          title: capability.title,
          response: content || fallbackResponse,
          model: content ? capability.modelLane : `${capability.modelLane} fallback`,
          generatedAt: new Date().toISOString(),
        });
      } catch (analysisError) {
        console.warn("[capability-analysis] using deterministic fallback", analysisError);
        setCapabilityAnalysisResult({
          analysisId,
          title: capability.title,
          response: fallbackResponse,
          model: `${capability.modelLane} fallback`,
          generatedAt: new Date().toISOString(),
        });
        setCapabilityAnalysisError(null);
      } finally {
        setCapabilityAnalysisLoading(false);
      }
    },
    [
      activeProfile,
      agentContext,
      analysisCapabilities,
      geodata,
      locationTrends,
      selectedLocationName,
      state.selectedRegion,
      subsurfaceDatasets,
    ],
  );

  const generateReport = useCallback(async () => {
    if (!geodata) {
      return;
    }

    setReportOpen(true);
    setReportLoading(true);
    setReportMarkdown("");
    setReportError(null);

    try {
      const response = await fetchWithTimeout(
        "/api/agents/geo-scribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Generate a full site assessment report for ${selectedLocationName} at ${selectedPoint.lat}, ${selectedPoint.lng} using the ${activeProfile.name} mission profile. Use the full context bundle, cite real values with units, and keep the output in markdown.`,
            context: agentContext,
          }),
        },
        25_000,
      );

      if (!response.ok) {
        throw new Error(await readAgentRouteError(response));
      }

      const markdown = (await readResponseTextWithTimeout(response, 15_000)).trim();
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

  const suggestedCards = useMemo(() => {
    const suggestions = getSuggestedCardsForShell({
      cards: allWorkspaceCards,
      intent: lastIntent,
      geodataReady: Boolean(geodata),
      hasComparison: sites.length >= 2,
      hasImagery: Boolean(previewUrl),
    }).filter((card) => !visibility[card.id]);

    return [
      ...suggestions.filter((card) => pinnedCardIds.includes(card.id)),
      ...suggestions.filter((card) => !pinnedCardIds.includes(card.id)),
    ];
  }, [allWorkspaceCards, geodata, lastIntent, pinnedCardIds, previewUrl, sites.length, visibility]);

  const groundingFallbackSources = useMemo(() => [], []);

  const openCardFromTray = useCallback((cardId: WorkspaceCardId) => {
    if (!visibility[cardId]) {
      setCardVisible(cardId, true);
    }
    setActiveCardId(cardId);
    if (shellMode === "minimal") {
      setShellMode("guided");
    }
  }, [setActiveCardId, setCardVisible, setShellMode, shellMode, visibility]);

  const openAdvancedBoard = useCallback(() => {
    setShellMode("board");
    setViewMode("board");
    if (!activeCardId && boardCards[0]) {
      setActiveCardId(boardCards[0].id);
    }
  }, [activeCardId, boardCards, setActiveCardId, setShellMode, setViewMode]);

  const openLibrary = useCallback(() => {
    setShellMode("board");
    setViewMode("library");
  }, [setShellMode, setViewMode]);

  const handleLocationSelection = useCallback(() => {
    if (shellMode === "minimal") {
      setShellMode("guided");
    }
    setActivePrimaryCardId("active-location");
  }, [setActivePrimaryCardId, setShellMode, shellMode]);

  const handleQuestionIntent = useCallback((question: string) => {
    const intent = detectWorkspaceIntent(question);
    setLastIntent(intent);
    setShellMode("guided");
    setActivePrimaryCardId(getPrimaryCardForIntent(intent));

    const suggested = getSuggestedCardsForShell({
      cards: allWorkspaceCards,
      intent,
      geodataReady: Boolean(geodata),
      hasComparison: sites.length >= 2,
      hasImagery: Boolean(previewUrl),
    })[0];

    if (suggested && !visibility[suggested.id]) {
      setCardVisible(suggested.id, true);
      setActiveCardId(suggested.id);
    }
  }, [
    geodata,
    previewUrl,
    setActiveCardId,
    setActivePrimaryCardId,
    setCardVisible,
    setShellMode,
    sites.length,
    visibility,
    allWorkspaceCards,
  ]);

  return {
    geodata,
    score,
    siteScore,
    loading,
    error,
    schoolContext,
    housingMarket,
    housingMarketLoading,
    housingMarketError,
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
    shellMode,
    setShellMode,
    viewMode,
    setViewMode,
    activeCardId,
    setActiveCardId,
    activePrimaryCardId,
    setActivePrimaryCardId,
    pinnedCardIds,
    togglePinnedCard,
    savedBoards,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
    boardCards,
    activeBoardCard,
    activePrimaryCard,
    suggestedCards,
    openCardFromTray,
    openAdvancedBoard,
    openLibrary,
    handleLocationSelection,
    handleQuestionIntent,
    sites,
    addSite,
    effectiveClassification,
    locationTrends,
    subsurfaceDatasets,
    analysisCapabilities,
    capabilityAnalysisLoading,
    capabilityAnalysisError,
    capabilityAnalysisResult,
    runCapabilityAnalysis,
    clearCapabilityAnalysis,
    groundingFallbackSources,
    showComparePrompt,
    showImagePrompt,
    showSourcePrompt,
    reportOpen,
    reportLoading,
    reportMarkdown,
    reportError,
    generateReport,
    closeReportPanel,
  };
}
