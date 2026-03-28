"use client";

import dynamic from "next/dynamic";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { CoolingDemoOverlay } from "@/components/Demo/CoolingDemoOverlay";
import { ActiveLocationCard } from "@/components/Explore/ActiveLocationCard";
import { SchoolContextCard } from "@/components/Explore/SchoolContextCard";
import { SourceAwarenessCard } from "@/components/Explore/SourceAwarenessCard";
import { WorkspaceCustomizer } from "@/components/Explore/WorkspaceCustomizer";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSchoolContext } from "@/hooks/useSchoolContext";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { useWorkspaceCards } from "@/hooks/useWorkspaceCards";
import { resolveLocationQuery } from "@/lib/cesium-search";
import { buildLocationTrends } from "@/lib/data-trends";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { getDemoById } from "@/lib/demos/registry";
import { GENERAL_EXPLORATION_PROFILE_ID } from "@/lib/landing";
import { DEFAULT_PROFILE, PROFILES, getProfileById } from "@/lib/profiles";
import { calculateProfileScore } from "@/lib/scoring";
import { WorkspaceCardId, MissionProfile, ResultsMode } from "@/types";
import { useExploreInit } from "./ExploreProvider";

const CesiumGlobe = dynamic(
  () => import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-cyan-400/20 bg-slate-950/60 text-slate-300">
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

function SectionFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</div>
        <p className="text-sm leading-6 text-slate-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function ExploreWorkspace() {
  const init = useExploreInit();
  const activeDemo = useMemo(() => getDemoById(init.demoId), [init.demoId]);
  const coolingDemo = useMemo(() => getDemoById("pnw-cooling"), []);
  const overlayDemo = coolingDemo ?? activeDemo;

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
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const defaultCoordinates = activeDemo?.coordinates ?? { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng };
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
    category,
    setCategory,
    categories,
    places,
    loading: nearbyLoading,
    error: nearbyError,
    source: nearbySource,
  } = useNearbyPlaces(selectedPoint, selectedLocationName);
  const {
    schoolContext,
    loading: schoolLoading,
    error: schoolError,
  } = useSchoolContext(selectedPoint);
  const {
    cards,
    visibility,
    primaryCards,
    workspaceCards,
    isCardVisible,
    setCardVisible,
    showCard,
  } = useWorkspaceCards(activeProfile.id);

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
    if (!pendingDemoLoad || activeProfile.id !== "data-center" || !coolingDemo?.preloadedSites?.length) {
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

  const visibleWorkspaceCardIds = workspaceCards.map((card) => card.id);
  const visibleTerrainCards = visibleWorkspaceCardIds.filter((cardId) =>
    ["terrain-viewer", "elevation-profile"].includes(cardId),
  ) as WorkspaceCardId[];
  const visibleMediaCards = visibleWorkspaceCardIds.filter((cardId) =>
    ["image-upload", "land-classifier"].includes(cardId),
  ) as WorkspaceCardId[];
  const visiblePlanningCards = visibleWorkspaceCardIds.filter((cardId) =>
    ["score", "factor-breakdown", "compare"].includes(cardId),
  ) as WorkspaceCardId[];
  const visibleContextCards = visibleWorkspaceCardIds.filter((cardId) =>
    ["source-awareness"].includes(cardId),
  ) as WorkspaceCardId[];

  const showComparePrompt = sites.length >= 2 && !isCardVisible("compare");
  const showImagePrompt = Boolean(previewUrl) && !isCardVisible("land-classifier");
  const showSourcePrompt = Boolean(geodata) && !isCardVisible("source-awareness");

  const resultsHeader = (
    <ResultsModeToggle mode={resultsMode} onChange={setResultsMode} />
  );

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
            onOpenSources={() => showCard("source-awareness")}
            showSourceDetailsCta={showSourcePrompt}
            showCompareCta={showComparePrompt}
            onOpenCompare={() => showCard("compare")}
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
      case "score":
        return (
          <ScoreCard
            key={cardId}
            score={score}
            title={`${activeProfile.name} score`}
            profile={activeProfile}
            onOpenDetails={() => showCard("factor-breakdown")}
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
        ) : null;
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
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen overflow-hidden p-4">
      <div className="grid gap-4 xl:grid-cols-[320px_1.2fr_420px]">
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
          <SearchBar
            activeLocationName={selectedLocationName}
            onLocate={(result) => {
              setInitError(null);
              selectPoint(result.coordinates, result.name);
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceCustomizer
              open={customizerOpen}
              cards={cards}
              visibility={visibility}
              onOpen={() => setCustomizerOpen(true)}
              onClose={() => setCustomizerOpen(false)}
              onToggleCard={setCardVisible}
            />
            {showImagePrompt ? (
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => showCard("land-classifier")}>
                Open land cover card
              </Button>
            ) : null}
          </div>

          {initStatus === "resolving" ? (
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-50">
              Resolving {init.locationQuery} and positioning the globe...
            </div>
          ) : null}

          {initError ? (
            <div className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {initError}
            </div>
          ) : null}

          {activeDemo ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: `${activeDemo.accentColor}33`,
                backgroundColor: `${activeDemo.accentColor}12`,
                color: "#e2e8f0",
              }}
            >
              <span className="font-semibold text-white">{activeDemo.name}</span>
              <span className="mx-2 text-slate-400">•</span>
              {activeDemo.description}
            </div>
          ) : null}

          <section className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-slate-950/60">
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
        </div>

        <aside className="flex flex-col gap-4">
          {primaryCards.map((card) => renderPrimaryCard(card.id))}
        </aside>
      </div>

      <div className="mt-6 space-y-8">
        {visiblePlanningCards.length > 0 ? (
          <SectionFrame
            title="Workspace cards"
            description="Open only the deeper planning cards you want in view. These stay below the fold to keep the first impression calm."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visiblePlanningCards.map((cardId) => renderWorkspaceCard(cardId))}
            </div>
          </SectionFrame>
        ) : null}

        {visibleTerrainCards.length > 0 ? (
          <SectionFrame
            title="Terrain tools"
            description="Open terrain controls and elevation analysis only when the question needs topography."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleTerrainCards.map((cardId) => renderWorkspaceCard(cardId))}
            </div>
          </SectionFrame>
        ) : null}

        {visibleMediaCards.length > 0 ? (
          <SectionFrame
            title="Imagery tools"
            description="Use satellite upload and land-cover interpretation on demand instead of keeping them in the first view."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleMediaCards.map((cardId) => renderWorkspaceCard(cardId))}
            </div>
          </SectionFrame>
        ) : null}

        {visibleContextCards.length > 0 ? (
          <SectionFrame
            title="Trust and provenance"
            description="Inspect live vs derived signals, regional coverage, and freshness only when you need a deeper reliability check."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleContextCards.map((cardId) => renderWorkspaceCard(cardId))}
            </div>
          </SectionFrame>
        ) : null}

        {!workspaceCards.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Calm workspace mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
              <p>
                Your workspace is currently focused on the globe, active location, questions, and
                primary results only.
              </p>
              <Button type="button" className="rounded-2xl" onClick={() => setCustomizerOpen(true)}>
                Add cards
              </Button>
            </CardContent>
          </Card>
        ) : null}
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
