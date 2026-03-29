"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { MissionRunCard } from "@/components/Competition/MissionRunCard";
import { CoolingDemoOverlay } from "@/components/Demo/CoolingDemoOverlay";
import { ActiveLocationCard } from "@/components/Explore/ActiveLocationCard";
import { HazardCard } from "@/components/Explore/HazardCard";
import { SchoolContextCard } from "@/components/Explore/SchoolContextCard";
import { SourceAwarenessCard } from "@/components/Explore/SourceAwarenessCard";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { WorkspaceViewToggle } from "@/components/Explore/WorkspaceViewToggle";
import { DataLayers, LayerState } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { AnalysisTrendsPanel } from "@/components/Results/AnalysisTrendsPanel";
import { NearbyPlacesList } from "@/components/Results/NearbyPlacesList";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { ElevationProfile } from "@/components/Terrain/ElevationProfile";
import { TerrainViewer } from "@/components/Terrain/TerrainViewer";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { useWorkspaceCards } from "@/hooks/useWorkspaceCards";
import { useWorkspacePresentation } from "@/hooks/useWorkspacePresentation";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { buildLocationTrends } from "@/lib/data-trends";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { getDemoById } from "@/lib/demos/registry";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { getMissionRunPreset } from "@/lib/mission-runs";
import { DEFAULT_PROFILE, PROFILES, getProfileById } from "@/lib/profiles";
import { calculateProfileScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { MissionProfile, ResultsMode, WorkspaceCardId } from "@/types";
import { useExploreInit } from "./ExploreProvider";

const CesiumGlobe = dynamic(
  () => import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
        Loading 3D globe...
      </div>
    ),
  },
);

function getInitialProfile(profileId?: string) {
  if (!profileId) {
    return getProfileById(GENERAL_EXPLORATION_PROFILE_ID);
  }

  return getProfileById(profileId);
}

export function ExploreWorkspace() {
  const init = useExploreInit();
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
  const { geodata, score, loading, error } = useSiteAnalysis(selectedPoint, activeProfile);
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

  const [layers, setLayers] = useState<LayerState>(activeProfile.defaultLayers);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [imageSummary, setImageSummary] = useState(
    "No image uploaded yet. Use the upload panel to run client-side land cover estimation.",
  );
  const [uploadedClassification, setUploadedClassification] = useState(
    geodata?.landClassification ?? [],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("analysis");

  useEffect(() => {
    setLayers(activeProfile.defaultLayers);
  }, [activeProfile]);

  useEffect(() => {
    if (!missionRunPreset || !init.judgeMode) {
      return;
    }

    setCardVisible("mission-run", true);
  }, [init.judgeMode, missionRunPreset, setCardVisible]);

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
      } catch (err) {
        if (!cancelled) {
          setInitError(
            err instanceof Error
              ? `Couldn't resolve "${locationQuery}". ${err.message}`
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

  useEffect(() => {
    if (
      !pendingDemoLoad ||
      activeProfile.id !== "data-center" ||
      !coolingDemo?.preloadedSites?.length
    ) {
      return;
    }

    loadDemoSites(coolingDemo.preloadedSites);
    const focusSite =
      coolingDemo.preloadedSites.find((candidate) => candidate.id === pendingDemoSiteId) ??
      coolingDemo.preloadedSites[0];
    if (focusSite) {
      selectPoint(focusSite.coordinates, `${focusSite.name} cooling demo`);
    }
    setPendingDemoLoad(false);
    setPendingDemoSiteId(null);
  }, [activeProfile.id, coolingDemo, loadDemoSites, pendingDemoLoad, pendingDemoSiteId, selectPoint]);

  const effectiveClassification = useMemo(
    () => (uploadedClassification.length ? uploadedClassification : geodata?.landClassification ?? []),
    [geodata?.landClassification, uploadedClassification],
  );

  const dataTrends = useMemo(() => buildLocationTrends(geodata), [geodata]);
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

  useEffect(() => {
    if (!init.judgeMode || !missionRunPreset) {
      return;
    }

    setViewMode("board");
    setActiveCardId("mission-run");
  }, [init.judgeMode, missionRunPreset, setActiveCardId, setViewMode]);

  const handleSaveCurrentSite = () => {
    if (!geodata) {
      return;
    }

    addSite({
      id: crypto.randomUUID(),
      name: `${activeProfile.name} Site ${sites.length + 1}`,
      regionName: selectedLocationName,
      profileId: activeProfile.id,
      coordinates: selectedPoint,
      geodata,
      score: score ?? calculateProfileScore(geodata, activeProfile),
    });
  };

  const handleLoadShowcase = () => {
    setActiveProfile(DEFAULT_PROFILE);
    setDemoOpen(true);
    setPendingDemoLoad(true);
    setPendingDemoSiteId(null);
  };

  const handleFocusDemoSite = (siteId: string) => {
    setActiveProfile(DEFAULT_PROFILE);
    setDemoOpen(true);
    const site = coolingDemo?.preloadedSites?.find((candidate) => candidate.id === siteId);
    if (!site) {
      return;
    }

    if (activeProfile.id === "data-center") {
      loadDemoSites(coolingDemo?.preloadedSites ?? []);
      selectPoint(site.coordinates, `${site.name} cooling demo`);
      return;
    }

    setPendingDemoSiteId(site.id);
    setPendingDemoLoad(true);
  };

  const openCardOnBoard = (cardId: WorkspaceCardId) => {
    if (!visibility[cardId]) {
      setCardVisible(cardId, true);
    }

    setActiveCardId(cardId);
    setViewMode("board");
  };

  const resultsHeader = <ResultsModeToggle mode={resultsMode} onChange={setResultsMode} />;

  const renderPrimaryCard = (cardId: WorkspaceCardId) => {
    switch (cardId) {
      case "active-location":
        return (
          <ActiveLocationCard
            key={cardId}
            geodata={geodata}
            loading={loading}
            error={error}
            locationName={selectedLocationName}
            lat={selectedPoint.lat}
            lng={selectedPoint.lng}
            profile={activeProfile}
            onSaveSite={handleSaveCurrentSite}
            onOpenSources={() => openCardOnBoard("source-awareness")}
            showSourceDetailsCta={showSourcePrompt}
            showCompareCta={showComparePrompt}
            onOpenCompare={() => openCardOnBoard("compare")}
          />
        );
      case "chat":
        return (
          <ChatPanel
            key={cardId}
            profile={activeProfile}
            location={selectedPoint}
            locationName={selectedLocationName}
            resultsMode={resultsMode}
            geodata={geodata}
            nearbyPlaces={places}
            nearbySource={nearbySource}
            dataTrends={dataTrends}
            imageSummary={imageSummary}
            classification={effectiveClassification}
          />
        );
      case "results":
        return resultsMode === "analysis" ? (
          <AnalysisTrendsPanel key={cardId} trends={dataTrends} headerContent={resultsHeader} />
        ) : (
          <NearbyPlacesList
            key={cardId}
            category={category}
            categories={categories}
            places={places}
            loading={nearbyLoading}
            error={nearbyError}
            source={nearbySource}
            onCategoryChange={setCategory}
            headerContent={resultsHeader}
          />
        );
      default:
        return null;
    }
  };

  const renderWorkspaceCard = (cardId: WorkspaceCardId) => {
    switch (cardId) {
      case "mission-run":
        return missionRunPreset ? (
          <MissionRunCard
            key={cardId}
            preset={missionRunPreset}
            profile={activeProfile}
            location={selectedPoint}
            locationName={selectedLocationName}
            geodata={geodata}
            dataTrends={dataTrends}
            nearbyPlaces={places}
            imageSummary={imageSummary}
            classification={effectiveClassification}
            score={score}
            onOpenCard={openCardOnBoard}
            autoRun={init.judgeMode}
          />
        ) : (
          <Card key={cardId}>
            <CardHeader>
              <CardTitle>Mission run</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
              Open a competition story or judge-mode deep-link to run a structured GeoSight briefing.
            </CardContent>
          </Card>
        );
      case "score":
        return (
          <ScoreCard
            key={cardId}
            score={score}
            title={`${activeProfile.name} score`}
            profile={activeProfile}
            onOpenDetails={() => openCardOnBoard("factor-breakdown")}
          />
        );
      case "factor-breakdown":
        return (
          <FactorBreakdown
            key={cardId}
            score={score}
            title={`${activeProfile.name} factor breakdown`}
          />
        );
      case "compare":
        return sites.length >= 2 ? (
          <CompareTable
            key={cardId}
            sites={sites}
            title={`${activeProfile.name} comparison`}
            emptyMessage={`Save ${activeProfile.name.toLowerCase()} candidates to compare them here.`}
          />
        ) : (
          <Card key={cardId}>
            <CardHeader>
              <CardTitle>Comparison</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
              Save at least two sites to unlock side-by-side comparison.
            </CardContent>
          </Card>
        );
      case "terrain-viewer":
        return (
          <TerrainViewer
            key={cardId}
            exaggeration={terrainExaggeration}
            onExaggerationChange={setTerrainExaggeration}
          />
        );
      case "elevation-profile":
        return (
          <ElevationProfile
            key={cardId}
            center={selectedPoint}
            region={selectedRegion}
            locationName={selectedLocationName}
          />
        );
      case "image-upload":
        return (
          <ImageUpload
            key={cardId}
            previewUrl={previewUrl}
            onClassify={(summary, buckets, nextPreviewUrl) => {
              setImageSummary(summary);
              setUploadedClassification(buckets);
              setPreviewUrl(nextPreviewUrl);
            }}
          />
        );
      case "land-classifier":
        return <LandClassifier key={cardId} results={effectiveClassification} />;
      case "source-awareness":
        return <SourceAwarenessCard key={cardId} geodata={geodata} />;
      case "school-context":
        return (
          <SchoolContextCard
            key={cardId}
            schoolContext={schoolContext}
            loading={schoolLoading}
            error={schoolError}
          />
        );
      case "hazard-context":
        return <HazardCard key={cardId} geodata={geodata} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1720px] space-y-6">
        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar
            activeProfile={activeProfile}
            profiles={PROFILES}
            selectedLocationName={selectedLocationName}
            selectedRegion={selectedRegion}
            onOpenDemo={() => setDemoOpen(true)}
            onSelectProfile={setActiveProfile}
            onSelectRegion={(region) => {
              setSelectedRegion(region);
              selectPoint(region.center, region.name);
            }}
            quickRegions={quickRegions}
          />

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <Badge>Explore workspace</Badge>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                        {init.judgeMode
                          ? "A judge-ready board for grounded spatial reasoning"
                          : "A quieter board for spatial questions"}
                      </h1>
                      <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                        {init.judgeMode
                          ? "Keep one mission run and one supporting card in focus while GeoSight turns live geodata into a trust-aware spatial briefing."
                          : "Keep the globe alive, open only the cards you need, and move between focused analysis views instead of scanning a dense page of panels."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <ThemeToggle compact />
                    <WorkspaceViewToggle mode={viewMode} onChange={setViewMode} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {(init.judgeMode
                    ? [
                        "Mission run briefing",
                        "Judge-mode supporting cards",
                        "Live-source geospatial reasoning",
                      ]
                    : [
                        "Minimal globe framing",
                        "Card library + board workflow",
                        "Live-source geospatial reasoning",
                      ]).map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <SearchBar
                  activeLocationName={selectedLocationName}
                  onLocate={(result) => {
                    setInitError(null);
                    selectPoint(result.coordinates, result.name);
                  }}
                />
              </div>
            </div>

            {initStatus === "resolving" ? (
              <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
                Resolving {init.locationQuery} and positioning the globe...
              </div>
            ) : null}

            {initError ? (
              <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                {initError}
              </div>
            ) : null}

            {activeDemo ? (
              <div
                className="rounded-[1.5rem] border px-4 py-3 text-sm"
                style={{
                  borderColor: `${activeDemo.accentColor}33`,
                  backgroundColor: `${activeDemo.accentColor}12`,
                  color: "var(--foreground)",
                }}
              >
                <span className="font-semibold">{activeDemo.name}</span>
                <span className="mx-2 text-[var(--muted-foreground)]">&middot;</span>
                {activeDemo.description}
              </div>
            ) : null}

            {init.judgeMode && missionRunPreset ? (
              <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
                <span className="font-semibold">Judge mode active.</span> GeoSight is focused on the{" "}
                {missionRunPreset.title.toLowerCase()} story with a structured mission run,
                visible provenance, and a smaller supporting-card set.
              </div>
            ) : null}

            <section className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="eyebrow">Primary focus</div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Keep one core view open
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {activePrimaryCard?.summary ??
                      "Switch between the active place, AI reasoning, and result summaries without stacking all three at once."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {primaryCards.map((card) => (
                    <Button
                      key={card.id}
                      type="button"
                      size="sm"
                      variant={card.id === activePrimaryCard?.id ? "default" : "secondary"}
                      className="rounded-full"
                      onClick={() => setActivePrimaryCardId(card.id)}
                    >
                      {card.title}
                    </Button>
                  ))}
                </div>
              </div>

              {(showImagePrompt || showComparePrompt || showSourcePrompt) && viewMode === "board" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-soft)] pt-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                    Suggested next views
                  </div>
                  {showComparePrompt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => openCardOnBoard("compare")}
                    >
                      Open comparison
                    </Button>
                  ) : null}
                  {showSourcePrompt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => openCardOnBoard("source-awareness")}
                    >
                      Open sources
                    </Button>
                  ) : null}
                  {showImagePrompt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => openCardOnBoard("land-classifier")}
                    >
                      Open land cover
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="relative min-h-[640px] overflow-hidden rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--surface-overlay)] to-transparent" />
              <CesiumGlobe
                selectedPoint={selectedPoint}
                selectedRegion={selectedRegion}
                onPointSelect={selectPoint}
                savedSites={sites}
                layers={layers}
                terrainExaggeration={terrainExaggeration}
                demoOverlays={activeDemo?.mapOverlays ?? []}
              />
              <DataLayers layers={layers} onChange={setLayers} />
              <RegionSelector
                region={selectedRegion}
                onReset={() =>
                  selectPoint(defaultCoordinates, activeDemo?.locationName ?? "Starter view")
                }
              />
            </section>
            {activePrimaryCard ? renderPrimaryCard(activePrimaryCard.id) : null}
          </div>
        </section>

        {viewMode === "board" ? (
          <WorkspaceBoard
            cards={boardCards}
            activeCardId={activeBoardCard?.id ?? null}
            onSelectCard={setActiveCardId}
            onOpenLibrary={() => setViewMode("library")}
            savedBoards={savedBoards}
            onSaveBoard={saveCurrentBoard}
            onRestoreBoard={restoreBoard}
            onDeleteBoard={deleteBoard}
          >
            {activeBoardCard ? (
              <div
                className={cn(
                  "grid gap-4",
                  activeBoardCard.defaultSize === "wide" ? "xl:grid-cols-1" : "xl:grid-cols-2",
                )}
              >
                {renderWorkspaceCard(activeBoardCard.id)}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Calm board mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-6 text-[var(--muted-foreground)]">
                  <p>
                    Your board is currently focused on the globe, active location, questions, and
                    primary results only.
                  </p>
                  <Button type="button" className="rounded-full" onClick={() => setViewMode("library")}>
                    Open card library
                  </Button>
                </CardContent>
              </Card>
            )}
          </WorkspaceBoard>
        ) : (
          <WorkspaceLibrary
            cards={cards.filter((card) => card.zone === "workspace")}
            visibility={visibility}
            onToggleCard={setCardVisible}
            onOpenCard={openCardOnBoard}
          />
        )}
      </div>

      {overlayDemo ? (
        <CoolingDemoOverlay
          demo={overlayDemo}
          open={demoOpen}
          score={score}
          sites={sites}
          onClose={() => setDemoOpen(false)}
          onLoadShowcase={handleLoadShowcase}
          onSaveCurrentSite={handleSaveCurrentSite}
          onFocusSite={handleFocusDemoSite}
        />
      ) : null}
    </main>
  );
}
