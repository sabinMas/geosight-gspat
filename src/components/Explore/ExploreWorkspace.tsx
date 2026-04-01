"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FileText, MoreHorizontal, PanelLeft, Sparkles, X } from "lucide-react";
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
import { ProfileSelector } from "@/components/Shell/ProfileSelector";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { StatePanel } from "@/components/Status/StatePanel";
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
  const [lensPickerOpen, setLensPickerOpen] = useState(false);
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
      message: `Saved ${state.selectedLocationName} to your comparison list.`,
    });
  };

  const handleOpenGuidedMode = () => {
    if (!state.locationReady) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Focus a place first to unlock guided mode.",
      });
      return;
    }

    data.setShellMode("guided");
    data.setViewMode("board");
    setWorkspaceNotice({
      tone: "info",
      message: "Focused mode keeps one primary view open and reveals supporting cards only when you need them.",
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
        message: "Board mode unlocks the full card workspace and saved layout flow.",
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
      `Generate a full intelligence report for the ${state.activeProfile.name} lens at ${state.selectedLocationName}. Keep it grounded in the live GeoSight context, call out data gaps explicitly, and structure it for a clear decision-ready briefing.`,
    [state.activeProfile.name, state.selectedLocationName],
  );

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
        message: "GeoSight is still gathering the live context for this place. Report generation unlocks when the main analysis finishes.",
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
        setLensPickerOpen(false);
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
    <main className="h-screen overflow-hidden px-4 py-4 md:px-6">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-5 overflow-hidden">
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground)]">
                <span className="font-semibold">GeoSight</span>
                <span className="text-[var(--muted-foreground)]">/</span>
                <span>{state.activeProfile.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setLensPickerOpen((current) => !current)}
                >
                  Change lens
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1 shadow-[var(--shadow-soft)]">
                  <Button
                    type="button"
                    size="sm"
                    variant={data.shellMode === "board" ? "ghost" : "default"}
                    className="rounded-full"
                    onClick={handleOpenGuidedMode}
                  >
                    Focused
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={data.shellMode === "board" ? "default" : "ghost"}
                    className="rounded-full"
                    onClick={handleOpenBoardMode}
                  >
                    Board
                  </Button>
                </div>

                <details className="relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)] shadow-[var(--shadow-soft)]">
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-2 shadow-[var(--shadow-panel)]">
                    <button
                      type="button"
                      onClick={() => {
                        setLensPickerOpen((current) => !current);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                    >
                      Change lens
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] xl:hidden"
                    >
                      Quick regions
                    </button>
                  </div>
                </details>

                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full xl:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeft className="mr-2 h-4 w-4" />
                  Regions
                </Button>
              </div>
            </div>

            {lensPickerOpen ? (
              <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <ProfileSelector
                  activeProfileId={state.activeProfile.id}
                  profiles={PROFILES}
                  onSelectProfile={(profile) => {
                    state.setActiveProfile(profile);
                    setLensPickerOpen(false);
                  }}
                />
              </div>
            ) : null}
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

          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="eyebrow">Search and investigate</div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    {state.locationReady ? "Update the active place" : "Start with a real place"}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {state.locationReady
                      ? `GeoSight is reading ${state.selectedLocationName} through the ${state.activeProfile.name} lens. Search again to re-run the analysis somewhere else.`
                      : `Search a city, neighborhood, address, landmark, or coordinates. GeoSight will build the map context, run the ${state.activeProfile.name} lens, and show the evidence behind the result.`}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)] lg:max-w-sm">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    What the lens changes
                  </div>
                  <div className="mt-2">{state.activeProfile.tagline}</div>
                </div>
              </div>

              <div className="mt-4">
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
              </div>

              {!state.locationReady ? (
                <div className="mt-4 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    First run tip
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
                    If you want the cleanest first experience, search a place you already know and
                    scan the analysis overview first. Factor breakdown and board mode stay available
                    once you have the basics.
                  </div>
                </div>
              ) : null}
            </section>

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
                />
                <div className="absolute right-4 top-4 z-20">
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

            <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Choose your next view
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {data.activePrimaryCard?.summaryVariant ??
                      "Start with the location summary, then switch to reasoning or nearby discovery as needed."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
              </div>
            </section>

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
        onClose={data.closeReportPanel}
      />
    </main>
  );
}
