"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getVisibleCardsForMode } from "@/lib/app-mode";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import {
  detectWorkspaceIntent,
  getPrimaryCardForIntent,
  getSuggestedCardsForShell,
  type WorkspaceIntent,
} from "@/lib/workspace-intent";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useHousingMarket } from "@/hooks/useHousingMarket";
import { useNpsTrails } from "@/hooks/useNpsTrails";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { GEODATA_RATE_LIMIT_MESSAGE, useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { useWorkspaceCards } from "@/hooks/useWorkspaceCards";
import { useWorkspacePresentation } from "@/hooks/useWorkspacePresentation";
import { ExploreState } from "@/hooks/useExploreState";
import {
  AnalysisCapabilityId,
  AnalysisCapabilityResult,
  AgentExecutionMode,
  WorkspaceCardId,
} from "@/types";

interface UseExploreDataArgs {
  state: ExploreState;
  setGeoContext: (context: GeoSightContext) => void;
}

const REPORT_STREAM_TIMEOUT_MS = 30_000;

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

async function readStreamChunkWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("GeoScribe timed out after 30 seconds without new report data."));
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
    appMode,
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
    parks: npsParks,
    loading: npsLoading,
    error: npsError,
    source: npsSource,
  } = useNpsTrails({
    selectedPoint: state.locationReady ? state.selectedPoint : null,
    profileId: activeProfile.id,
  });
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
  const {
    cards: allCards,
    visibility,
    primaryCards: allPrimaryCards,
    workspaceCards: allWorkspaceCards,
    isCardVisible,
    setCardVisible,
    reorderCards,
  } = useWorkspaceCards(activeProfile.id, appMode);

  const cards = useMemo(
    () => getVisibleCardsForMode(appMode, allCards),
    [appMode, allCards],
  );
  const primaryCards = useMemo(
    () => getVisibleCardsForMode(appMode, allPrimaryCards),
    [appMode, allPrimaryCards],
  );
  const modeWorkspaceCards = useMemo(
    () => getVisibleCardsForMode(appMode, allWorkspaceCards),
    [appMode, allWorkspaceCards],
  );

  const workspaceCards = useMemo(() => {
    const { activeLensId } = state;
    if (appMode !== "explorer" || !activeLensId) return modeWorkspaceCards;
    const lens = getExplorerLensById(activeLensId);
    if (!lens) return modeWorkspaceCards;
    const lensCardSet = new Set(lens.defaultCards);
    return modeWorkspaceCards.filter((card) => lensCardSet.has(card.id));
  }, [appMode, modeWorkspaceCards, state]);

  const allWorkspaceCardsModeFiltered = useMemo(
    () => cards.filter((card) => card.zone === "workspace"),
    [cards],
  );

  const allWorkspaceCardIds = useMemo(
    () => allWorkspaceCardsModeFiltered.map((card) => card.id),
    [allWorkspaceCardsModeFiltered],
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
    openCardIds,
    openCard,
    closeCard,
    toggleOpenCard,
    activePrimaryCardId,
    setActivePrimaryCardId,
    pinnedCardIds,
    togglePinnedCard,
    savedBoards,
    activeBoardId,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
    updateActiveBoard,
    renameBoard,
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
  const openBoardCards = useMemo(
    () =>
      openCardIds
        .map((id) => boardCards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => card !== undefined),
    [openCardIds, boardCards],
  );
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
  const [reportMode, setReportMode] = useState<AgentExecutionMode | null>(null);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(null);
  const [rateLimitToast, setRateLimitToast] = useState<string | null>(null);
  const [capabilityAnalysisLoading, setCapabilityAnalysisLoading] = useState(false);
  const [capabilityAnalysisError, setCapabilityAnalysisError] = useState<string | null>(
    null,
  );
  const [capabilityAnalysisResult, setCapabilityAnalysisResult] =
    useState<AnalysisCapabilityResult | null>(null);
  const reportRequestIdRef = useRef(0);
  const reportAbortControllerRef = useRef<AbortController | null>(null);
  const capabilityRequestIdRef = useRef(0);
  const capabilityAbortControllerRef = useRef<AbortController | null>(null);
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
      appMode,
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
      appMode,
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
    if (error === GEODATA_RATE_LIMIT_MESSAGE) {
      setRateLimitToast(GEODATA_RATE_LIMIT_MESSAGE);
    }
  }, [error]);

  useEffect(() => {
    if (!rateLimitToast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRateLimitToast(null);
    }, 5_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [rateLimitToast]);

  useEffect(() => {
    reportRequestIdRef.current += 1;
    reportAbortControllerRef.current?.abort();
    reportAbortControllerRef.current = null;
    capabilityRequestIdRef.current += 1;
    capabilityAbortControllerRef.current?.abort();
    capabilityAbortControllerRef.current = null;
    setReportOpen(false);
    setReportLoading(false);
    setReportMarkdown("");
    setReportError(null);
    setReportMode(null);
    setReportGeneratedAt(null);
    setRateLimitToast(null);
    setCapabilityAnalysisLoading(false);
    setCapabilityAnalysisError(null);
    setCapabilityAnalysisResult(null);
  }, [activeProfile.id, selectedPoint.lat, selectedPoint.lng]);

  const closeReportPanel = useCallback(() => {
    setReportOpen(false);
  }, []);

  const clearCapabilityAnalysis = useCallback(() => {
    capabilityRequestIdRef.current += 1;
    capabilityAbortControllerRef.current?.abort();
    capabilityAbortControllerRef.current = null;
    setCapabilityAnalysisLoading(false);
    setCapabilityAnalysisError(null);
    setCapabilityAnalysisResult(null);
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
      const requestId = capabilityRequestIdRef.current + 1;
      const controller = new AbortController();

      capabilityRequestIdRef.current = requestId;
      capabilityAbortControllerRef.current?.abort();
      capabilityAbortControllerRef.current = controller;
      setCapabilityAnalysisLoading(true);
      setCapabilityAnalysisError(null);
      setCapabilityAnalysisResult(null);

      try {
        if (!geodata) {
          return;
        }

        const isActiveCapabilityRequest = () =>
          requestId === capabilityRequestIdRef.current && !controller.signal.aborted;

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
            signal: controller.signal,
          },
          25_000,
        );

        if (!isActiveCapabilityRequest()) {
          return;
        }

        if (!response.ok) {
          throw new Error(await readAgentRouteError(response));
        }

        const content = (await readResponseTextWithTimeout(response, 12_000)).trim();
        if (!isActiveCapabilityRequest()) {
          return;
        }

        if (!content) {
          throw new Error("GeoSight returned an empty capability response.");
        }

        const responseMode =
          (response.headers.get("X-GeoSight-Mode") as AgentExecutionMode | null) ?? "live";
        setCapabilityAnalysisResult({
          analysisId,
          title: capability.title,
          response: content,
          model:
            responseMode === "live"
              ? capability.modelLane
              : `${capability.modelLane} ${responseMode}`,
          generatedAt: new Date().toISOString(),
          mode: responseMode,
        });
      } catch (analysisError) {
        if (requestId !== capabilityRequestIdRef.current || controller.signal.aborted) {
          return;
        }

        Sentry.captureMessage("Capability analysis fell back to deterministic", {
          level: "warning",
          extra: { error: String(analysisError) },
        });
        setCapabilityAnalysisResult({
          analysisId,
          title: capability.title,
          response: fallbackResponse,
          model: `${capability.modelLane} fallback`,
          generatedAt: new Date().toISOString(),
          mode: "deterministic",
        });
        setCapabilityAnalysisError(null);
      } finally {
        if (requestId === capabilityRequestIdRef.current) {
          setCapabilityAnalysisLoading(false);
          if (capabilityAbortControllerRef.current === controller) {
            capabilityAbortControllerRef.current = null;
          }
        }
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

    const requestId = reportRequestIdRef.current + 1;
    const controller = new AbortController();

    reportRequestIdRef.current = requestId;
    reportAbortControllerRef.current?.abort();
    reportAbortControllerRef.current = controller;
    setReportOpen(true);
    setReportLoading(true);
    setReportMarkdown("");
    setReportError(null);
    setReportMode(null);
    setReportGeneratedAt(null);

    try {
      const isActiveReportRequest = () =>
        requestId === reportRequestIdRef.current && !controller.signal.aborted;
      const response = await fetch("/api/agents/geo-scribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Generate a full site assessment report for ${selectedLocationName} at ${selectedPoint.lat}, ${selectedPoint.lng} using the ${activeProfile.name} mission profile. Use the full context bundle, cite real values with units, keep the output in markdown, and include explicit sections for data status, supported findings, limitations, and next diligence steps.`,
          context: agentContext,
        }),
        signal: controller.signal,
      });

      if (!isActiveReportRequest()) {
        return;
      }

      if (!response.ok) {
        throw new Error(await readAgentRouteError(response));
      }

      if (!response.body) {
        throw new Error("GeoScribe returned no response body.");
      }

      const responseMode =
        (response.headers.get("X-GeoSight-Mode") as AgentExecutionMode | null) ?? "live";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>;

        try {
          chunk = await readStreamChunkWithTimeout(reader, REPORT_STREAM_TIMEOUT_MS);
        } catch (streamError) {
          controller.abort();
          await reader.cancel();
          throw streamError;
        }

        const { done, value } = chunk;
        if (done) break;
        if (!isActiveReportRequest()) {
          await reader.cancel();
          return;
        }
        accumulated += decoder.decode(value, { stream: true });
        if (!isActiveReportRequest()) {
          await reader.cancel();
          return;
        }
        setReportMarkdown(accumulated);
      }

      accumulated += decoder.decode();

      if (!isActiveReportRequest()) {
        return;
      }

      if (!accumulated.trim()) {
        throw new Error("GeoScribe returned an empty report.");
      }

      setReportMode(responseMode);
      setReportGeneratedAt(new Date().toISOString());
    } catch (reportGenerationError) {
      if (requestId !== reportRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      setReportError(
        reportGenerationError instanceof Error
          ? reportGenerationError.message
          : "GeoScribe could not generate a report right now.",
      );
    } finally {
      if (requestId === reportRequestIdRef.current) {
        setReportLoading(false);
        if (reportAbortControllerRef.current === controller) {
          reportAbortControllerRef.current = null;
        }
      }
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
    // For Explorer mode with an active lens, suggest lens-specific cards not yet opened.
    // getSuggestedCardsForShell only proposes score/source-awareness/hazard-context, which are
    // mostly Pro-only in explorer mode — so the tray would always be empty for new lenses.
    const activeLensId = state.activeLensId;
    if (appMode === "explorer" && activeLensId) {
      const lens = getExplorerLensById(activeLensId);
      if (lens) {
        const lensWorkspaceCardIds = new Set(
          lens.defaultCards.filter((id) => {
            const def = allWorkspaceCardsModeFiltered.find((c) => c.id === id);
            return def?.zone === "workspace";
          }),
        );
        const pool = allWorkspaceCardsModeFiltered.filter(
          (card) => lensWorkspaceCardIds.has(card.id) && !visibility[card.id],
        );
        const sorted = [
          ...pool.filter((card) => pinnedCardIds.includes(card.id)),
          ...pool.filter((card) => !pinnedCardIds.includes(card.id)),
        ];
        return sorted.slice(0, 4);
      }
    }

    const suggestions = getSuggestedCardsForShell({
      cards: allWorkspaceCardsModeFiltered,
      intent: lastIntent,
      geodataReady: Boolean(geodata),
      hasComparison: sites.length >= 2,
      hasImagery: Boolean(previewUrl),
    }).filter((card) => !visibility[card.id]);

    return [
      ...suggestions.filter((card) => pinnedCardIds.includes(card.id)),
      ...suggestions.filter((card) => !pinnedCardIds.includes(card.id)),
    ];
  }, [allWorkspaceCardsModeFiltered, appMode, geodata, lastIntent, pinnedCardIds, previewUrl, sites.length, state.activeLensId, visibility]);

  const groundingFallbackSources = useMemo(() => [], []);

  const openCardFromTray = useCallback((cardId: WorkspaceCardId) => {
    if (!visibility[cardId]) {
      setCardVisible(cardId, true);
    }
    openCard(cardId);
    if (shellMode === "minimal") {
      setShellMode("guided");
    }
  }, [openCard, setCardVisible, setShellMode, shellMode, visibility]);

  const openAdvancedBoard = useCallback(() => {
    setShellMode("board");
    setViewMode("board");
    if (openCardIds.length === 0 && boardCards[0]) {
      openCard(boardCards[0].id);
    }
  }, [openCardIds.length, boardCards, openCard, setShellMode, setViewMode]);

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
      cards: allWorkspaceCardsModeFiltered,
      intent,
      geodataReady: Boolean(geodata),
      hasComparison: sites.length >= 2,
      hasImagery: Boolean(previewUrl),
    })[0];

    if (suggested && !visibility[suggested.id]) {
      setCardVisible(suggested.id, true);
      openCard(suggested.id);
    }
  }, [
    geodata,
    previewUrl,
    openCard,
    setActivePrimaryCardId,
    setCardVisible,
    setShellMode,
    sites.length,
    visibility,
    allWorkspaceCardsModeFiltered,
  ]);

  return {
    geodata,
    score,
    siteScore,
    loading,
    error,
    schoolContext,
    npsParks,
    npsLoading,
    npsError,
    npsSource,
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
    reorderCards,
    shellMode,
    setShellMode,
    viewMode,
    setViewMode,
    openCardIds,
    openCard,
    closeCard,
    toggleOpenCard,
    activePrimaryCardId,
    setActivePrimaryCardId,
    pinnedCardIds,
    togglePinnedCard,
    savedBoards,
    activeBoardId,
    saveCurrentBoard,
    restoreBoard,
    deleteBoard,
    updateActiveBoard,
    renameBoard,
    boardCards,
    openBoardCards,
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
    reportMode,
    reportGeneratedAt,
    rateLimitToast,
    generateReport,
    closeReportPanel,
  };
}
