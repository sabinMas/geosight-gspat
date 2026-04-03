"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FileText, Sparkles, X } from "lucide-react";
import { AddViewTray } from "@/components/Explore/AddViewTray";
import { AnalysisOverviewBanner } from "@/components/Explore/AnalysisOverviewBanner";
import { GeoScribeReportPanel } from "@/components/Explore/GeoScribeReportPanel";
import {
  ExplorePrimaryPanel,
  ExploreWorkspacePanel,
} from "@/components/Explore/ExploreWorkspacePanels";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { DataLayers } from "@/components/Globe/DataLayers";
import { GlobeViewSelector } from "@/components/Globe/GlobeViewSelector";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { ModeSwitcher } from "@/components/Shell/ModeSwitcher";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { StatePanel } from "@/components/Status/StatePanel";
import { isExplorerMode } from "@/lib/app-mode";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreState } from "@/hooks/useExploreState";
import { PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { WorkspaceCardId } from "@/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useExploreInit } from "./ExploreProvider";

const CesiumGlobe = dynamic(
  () =>
    import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
        Loading 3D globe...
      </div>
    ),
  },
);

const BOARD_MODE_NOTICE_STORAGE_KEY = "geosight-board-mode-notice-shown";

export function ExploreWorkspace() {
  const init = useExploreInit();
  const { setGeoContext, setUiContext, primeAgent } = useAgentPanel();
  const state = useExploreState(init);
  const data = useExploreData({ state, setGeoContext });
  const inExplorer = isExplorerMode(state.appMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: "info" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!workspaceNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setWorkspaceNotice(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [workspaceNotice]);

  const handleSaveCurrentSite = () => {
    if (!data.geodata || !data.siteScore) {
      return;
    }

    data.addSite({
      id: crypto.randomUUID(),
      name: `${state.activeProfile.name} Site ${data.sites.length + 1}`,
      regionName: state.selectedLocationName,
      profileId: state.activeProfile.id,
      coordinates: state.selectedPoint,
      geodata: data.geodata,
      score: data.siteScore,
    });

    setWorkspaceNotice({
      tone: "info",
      message: `${state.selectedLocationName} saved.`,
    });
  };

  const handleOpenGuidedMode = () => {
    if (!state.locationReady) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Select a location first.",
      });
      return;
    }

    data.setShellMode("guided");
    data.setViewMode("board");
    setWorkspaceNotice({
      tone: "info",
      message: "Focused mode active.",
    });
  };

  const handleOpenBoardMode = () => {
    data.openAdvancedBoard();

    if (typeof window === "undefined") {
      return;
    }

    const noticeAlreadySeen =
      window.localStorage.getItem(BOARD_MODE_NOTICE_STORAGE_KEY) === "true";
    if (!noticeAlreadySeen) {
      window.localStorage.setItem(BOARD_MODE_NOTICE_STORAGE_KEY, "true");
      setWorkspaceNotice({
        tone: "info",
        message: "Board mode active.",
      });
    }
  };

  const openCard = (cardId: WorkspaceCardId) => {
    if (data.shellMode === "board") {
      if (!data.visibility[cardId]) {
        data.setCardVisible(cardId, true);
      }
      data.setActiveCardId(cardId);
      data.setViewMode("board");
      return;
    }

    data.openCardFromTray(cardId);
  };

  const resultsHeader = (
    <ResultsModeToggle mode={state.resultsMode} onChange={state.setResultsMode} />
  );
  const reportPrompt = useMemo(
    () =>
      `Generate a full intelligence report for the ${state.activeProfile.name} mission at ${state.selectedLocationName}. Keep it grounded in the live GeoSight context, call out data gaps explicitly, and structure it as a professional site assessment briefing.`,
    [state.activeProfile.name, state.selectedLocationName],
  );
  const reportSources = useMemo(
    () =>
      data.geodata
        ? [
            data.geodata.sources.climate,
            data.geodata.sources.hazards,
            data.geodata.sources.floodZone,
            data.geodata.sources.broadband,
            data.geodata.sources.school,
            data.geodata.sources.groundwater,
            data.geodata.sources.soilProfile,
            data.geodata.sources.seismicDesign,
          ]
        : [],
    [data.geodata],
  );

  const handleOpenLibraryMode = () => {
    data.openLibrary();
  };

  const handleGenerateReport = () => {
    if (!data.geodata) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Select a location first to generate a report.",
      });
      return;
    }

    if (data.loading) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Analysis still loading — try again shortly.",
      });
      return;
    }

    primeAgent("geo-scribe", reportPrompt);
    void data.generateReport();
  };

  const visibleUiCardIds = useMemo(
    () =>
      data.shellMode === "board"
        ? data.boardCards.map((card) => card.id)
        : data.activeBoardCard
          ? [data.activeBoardCard.id]
          : [],
    [data.activeBoardCard, data.boardCards, data.shellMode],
  );

  const visibleControlCount =
    6 +
    data.primaryCards.length +
    data.suggestedCards.length +
    (data.shellMode === "board" ? data.boardCards.length : visibleUiCardIds.length);

  const visibleTextBlockCount =
    5 +
    (state.overlayDemo ? 1 : 0) +
    (data.activePrimaryCard ? 1 : 0) +
    (data.activeBoardCard ? 1 : 0) +
    data.suggestedCards.length;

  useEffect(() => {
    setUiContext({
      activeProfile: state.activeProfile.id,
      reportDraftTemplate: reportPrompt,
      visiblePrimaryCardId: data.activePrimaryCard?.id ?? null,
      visibleWorkspaceCardIds: visibleUiCardIds,
      visibleControlCount,
      visibleTextBlockCount,
      shellMode: data.shellMode,
      locationSelected: state.locationReady,
      geodataLoading: data.loading,
      geodataLoaded: Boolean(data.geodata),
      reportOpen: data.reportOpen,
      demoOpen: Boolean(state.overlayDemo),
    });
  }, [
    data.activeBoardCard,
    data.activePrimaryCard,
    data.geodata,
    data.loading,
    data.reportOpen,
    data.shellMode,
    data.suggestedCards.length,
    setUiContext,
    reportPrompt,
    state.activeProfile.id,
    state.overlayDemo,
    state.locationReady,
    visibleControlCount,
    visibleTextBlockCount,
    visibleUiCardIds,
  ]);

  const sidebarElement = (
    <Sidebar
      activeProfile={state.activeProfile}
      profiles={PROFILES}
      selectedRegion={state.selectedRegion}
      onSelectProfile={(profile) => {
        state.setActiveProfile(profile);
        setSidebarOpen(false);
      }}
      onSelectRegion={(region) => {
        const regionLabel =
          state.activeProfile.id === "home-buying"
            ? region.secondaryLabel?.split(" · ")[0] ?? region.name
            : region.name;
        state.setSelectedRegion(region);
        state.selectPoint(region.center, regionLabel, regionLabel);
        data.handleLocationSelection();
        setSidebarOpen(false);
      }}
      quickRegions={state.quickRegions}
      quickRegionsLoading={state.quickRegionsLoading}
    />
  );

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1680px] space-y-5">
        <section className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] cursor-default select-none">
                  {inExplorer ? "Explorer" : "Pro workspace"}
                </span>
                {inExplorer && state.activeLensId && (() => {
                  const lens = getExplorerLensById(state.activeLensId);
                  return lens ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] pl-3 pr-1.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-foreground)] cursor-default select-none">
                      {lens.label}
                      <button
                        type="button"
                        onClick={() => state.setActiveLensId(null)}
                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[color:var(--accent-strong)]/20"
                        aria-label="Clear lens filter"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ) : null;
                })()}
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] cursor-default select-none">
                  {data.shellMode}
                </span>
              </div>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                {inExplorer
                  ? "Pick a place and see what's there — in plain English"
                  : "Start with one place, then reveal only the views you need"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ModeSwitcher mode={state.appMode} onSetMode={state.setAppMode} />
              <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1 shadow-[var(--shadow-soft)]">
                <Button
                  type="button"
                  size="sm"
                  variant={data.shellMode === "board" ? "ghost" : "default"}
                  className="rounded-full"
                  onClick={handleOpenGuidedMode}
                  title="Guided mode keeps the workspace focused and reveals supporting views on demand."
                >
                  Guided
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    data.shellMode === "board" && data.viewMode === "board"
                      ? "default"
                      : "ghost"
                  }
                  className="rounded-full"
                  onClick={handleOpenBoardMode}
                  title="Board mode opens the full advanced workspace."
                >
                  Board
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    data.shellMode === "board" && data.viewMode === "library"
                      ? "default"
                      : "ghost"
                  }
                  className="rounded-full"
                  onClick={handleOpenLibraryMode}
                  title="Library mode lets you browse every available GeoSight card."
                >
                  Library
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => openCard("compare")}
                  title="Compare saved locations side by side."
                >
                  Compare
                </Button>
              </div>
            </div>
          </div>

          {workspaceNotice ? (
            <div
              className={cn(
                "mt-4 rounded-2xl px-4 py-3 text-sm",
                workspaceNotice.tone === "warning"
                  ? "border border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]"
                  : "border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
              )}
            >
              {workspaceNotice.message}
            </div>
          ) : null}

        </section>

        {state.initStatus === "resolving" ? (
          <StatePanel
            tone="loading"
            eyebrow="Location setup"
            title={`Resolving ${state.init.locationQuery} and positioning the globe`}
            description="GeoSight is turning the requested place into map coordinates and preparing the first live location bundle."
            compact
          />
        ) : null}
        {state.initError ? (
          <StatePanel
            tone="error"
            eyebrow="Location setup"
            title="GeoSight could not lock onto that place"
            description={state.initError}
            compact
          />
        ) : null}

        <section className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <div className="hidden h-full flex-shrink-0 xl:block">{sidebarElement}</div>

          <div className="space-y-4">
            <SearchBar
              submitLabel={state.locationReady ? "Update analysis" : "Run analysis"}
              syncValue={
                state.locationReady
                  ? state.selectedLocationDisplayName
                  : state.init.locationQuery ?? ""
              }
              onLocate={(result) => {
                state.setInitError(null);
                state.selectPoint(
                  result.coordinates,
                  result.fullName ?? result.name,
                  result.shortName,
                );
                data.handleLocationSelection();
              }}
            />

            {state.overlayDemo ? (
              <section className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="eyebrow">Current story context</div>
                    <div>
                      <h2 className="text-base font-semibold text-[var(--foreground)]">
                        {state.overlayDemo.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                        {state.overlayDemo.tagline}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={state.dismissOverlayDemo}
                    aria-label="Dismiss demo story context"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {state.overlayDemo.description}
                </p>
              </section>
            ) : null}

            <ClientErrorBoundary
              title="The globe view needs a quick reset"
              message="GeoSight kept the rest of the workspace alive. Retry the globe, switch regions, or keep working from the cards while the globe re-initializes."
            >
              <section className="relative flex-1 min-h-0 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] md:min-h-[680px] min-h-[640px] xl:min-h-[720px]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--surface-overlay)] to-transparent" />
                <CesiumGlobe
                  selectedPoint={state.selectedPoint}
                  selectedRegion={state.selectedRegion}
                  globeViewMode={state.globeViewMode}
                  globeRotateMode={state.globeRotateMode}
                  subsurfaceRenderMode={state.subsurfaceRenderMode}
                  onPointSelect={(coords) => {
                    state.selectPoint(coords);
                    data.handleLocationSelection();
                  }}
                  savedSites={data.sites}
                  layers={state.layers}
                  subsurfaceDatasets={data.subsurfaceDatasets}
                  terrainExaggeration={state.terrainExaggeration}
                  earthquakeMarkers={state.earthquakeMarkers}
                  driveMode={state.driveMode}
                  onExitDriveMode={() => state.setDriveMode(false)}
                />
                <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={state.globeRotateMode ? "default" : "secondary"}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
                    aria-pressed={state.globeRotateMode}
                    aria-label={
                      state.globeRotateMode
                        ? "Disable 3D explore rotate mode"
                        : "Enable 3D explore rotate mode"
                    }
                    onClick={() => state.setGlobeRotateMode((current) => !current)}
                  >
                    <span className="mr-2 text-base leading-none">⊕</span>
                    {state.globeRotateMode ? "3D explore" : "Rotate mode"}
                  </Button>
                  <Button
                    type="button"
                    variant={state.driveMode ? "default" : "secondary"}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
                    aria-pressed={state.driveMode}
                    aria-label={state.driveMode ? "Exit drive mode" : "Enter drive mode"}
                    onClick={() => state.setDriveMode((current) => !current)}
                  >
                    <span className="mr-2 text-base leading-none">🚗</span>
                    {state.driveMode ? "Driving" : "Drive"}
                  </Button>
                </div>
                <GlobeViewSelector
                  globeViewMode={state.globeViewMode}
                  onChange={state.setGlobeViewMode}
                  subsurfaceRenderMode={state.subsurfaceRenderMode}
                />
                {data.shellMode === "board" ? (
                  <DataLayers layers={state.layers} onChange={state.setLayers} />
                ) : null}
                <RegionSelector
                  region={state.selectedRegion}
                  locationTooltip={state.selectedLocationName}
                  onReset={() => {
                    state.selectPoint(
                      state.selectedPoint,
                      state.selectedLocationName,
                      state.selectedLocationDisplayName,
                    );
                    data.handleLocationSelection();
                  }}
                />
              </section>
            </ClientErrorBoundary>

            {(state.locationReady || data.loading || data.error) ? (
              <AnalysisOverviewBanner
                geodata={data.geodata}
                score={data.siteScore}
                profile={state.activeProfile}
                locationName={state.selectedLocationName}
                loading={data.loading}
                error={data.error}
                onOpenFactorBreakdown={() => openCard("factor-breakdown")}
                onOpenSources={() => openCard("source-awareness")}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => openCard("compare")}
              >
                ⊕ Compare locations
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={data.reportLoading}
                onClick={handleGenerateReport}
              >
                <FileText className="mr-2 h-4 w-4" />
                {data.reportLoading ? "Generating report..." : "Generate report"}
              </Button>
              {data.primaryCards.map((card) => (
                <Button
                  key={card.id}
                  type="button"
                  size="sm"
                  variant={
                    card.id === data.activePrimaryCard?.id ? "default" : "secondary"
                  }
                  className="rounded-full"
                  onClick={() => data.setActivePrimaryCardId(card.id)}
                >
                  {card.title}
                </Button>
              ))}
            </div>

            {data.activePrimaryCard ? (
              <ExplorePrimaryPanel
                cardId={data.activePrimaryCard.id}
                state={state}
                data={data}
                headerContent={resultsHeader}
                onSaveCurrentSite={handleSaveCurrentSite}
                onOpenCard={openCard}
              />
            ) : null}

            {data.shellMode === "board" ? (
              data.viewMode === "board" ? (
                <WorkspaceBoard
                  cards={data.boardCards}
                  activeCardId={data.activeBoardCard?.id ?? null}
                  onSelectCard={data.setActiveCardId}
                  onOpenLibrary={data.openLibrary}
                  savedBoards={data.savedBoards}
                  onSaveBoard={data.saveCurrentBoard}
                  onRestoreBoard={data.restoreBoard}
                  onDeleteBoard={data.deleteBoard}
                >
                  {data.activeBoardCard ? (
                    <div
                      className={cn(
                        "grid gap-4",
                        data.activeBoardCard.defaultSize === "wide"
                          ? "xl:grid-cols-1"
                          : "xl:grid-cols-2",
                      )}
                    >
                      <ExploreWorkspacePanel
                        cardId={data.activeBoardCard.id}
                        state={state}
                        data={data}
                        onOpenCard={openCard}
                      />
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Calm board mode</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm leading-6 text-[var(--muted-foreground)]">
                        <p>
                          Your board is currently focused on the globe, active location,
                          questions, and primary results only.
                        </p>
                        <Button
                          type="button"
                          className="rounded-full"
                          onClick={data.openLibrary}
                        >
                          Open card library
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </WorkspaceBoard>
              ) : (
                <WorkspaceLibrary
                  cards={data.cards.filter((card) => card.zone === "workspace")}
                  visibility={data.visibility}
                  onToggleCard={data.setCardVisible}
                  onOpenCard={openCard}
                />
              )
            ) : (
              <>
                {data.activeBoardCard ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                      Supporting view
                    </div>
                    <ExploreWorkspacePanel
                      cardId={data.activeBoardCard.id}
                      state={state}
                      data={data}
                      onOpenCard={openCard}
                    />
                  </section>
                ) : null}

                <AddViewTray
                  cards={data.suggestedCards}
                  pinnedCardIds={data.pinnedCardIds}
                  onOpenCard={data.openCardFromTray}
                  onTogglePinned={data.togglePinnedCard}
                  onOpenBoard={data.openAdvancedBoard}
                />
              </>
            )}
          </div>
        </section>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-[var(--background)]/70 backdrop-blur-sm xl:hidden">
          <div className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col p-4">
            <div className="mb-3 flex shrink-0 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{sidebarElement}</div>
          </div>
        </div>
      ) : null}

      <GeoScribeReportPanel
        open={data.reportOpen}
        locationName={state.selectedLocationName}
        loading={data.reportLoading}
        error={data.reportError}
        markdown={data.reportMarkdown}
        mode={data.reportMode}
        generatedAt={data.reportGeneratedAt}
        sources={reportSources}
        sourceNotes={data.geodata?.sourceNotes ?? []}
        onClose={data.closeReportPanel}
      />
    </main>
  );
}
