"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { FileText, PanelLeft, Sparkles, X } from "lucide-react";
import { DemoFallbackBanner } from "@/components/Demo/DemoFallbackBanner";
import { CoolingDemoOverlay } from "@/components/Demo/CoolingDemoOverlay";
import { AddViewTray } from "@/components/Explore/AddViewTray";
import { GeoScribeReportPanel } from "@/components/Explore/GeoScribeReportPanel";
import {
  ExplorePrimaryPanel,
  ExploreWorkspacePanel,
} from "@/components/Explore/ExploreWorkspacePanels";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { WorkspaceViewToggle } from "@/components/Explore/WorkspaceViewToggle";
import { DataLayers } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreState } from "@/hooks/useExploreState";
import { DEFAULT_PROFILE, PROFILES } from "@/lib/profiles";
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
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
        Loading 3D globe...
      </div>
    ),
  },
);

export function ExploreWorkspace() {
  const init = useExploreInit();
  const { setGeoContext, setUiContext } = useAgentPanel();
  const state = useExploreState(init);
  const data = useExploreData({ state, setGeoContext });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  };

  const handleLoadShowcase = () => {
    state.setActiveProfile(DEFAULT_PROFILE);
    state.setDemoOpen(true);
    state.setPendingDemoLoad(true);
    state.setPendingDemoSiteId(null);
  };

  const handleFocusDemoSite = (siteId: string) => {
    state.setActiveProfile(DEFAULT_PROFILE);
    state.setDemoOpen(true);
    const site = state.coolingDemo?.preloadedSites?.find(
      (candidate) => candidate.id === siteId,
    );
    if (!site) {
      return;
    }
    if (state.activeProfile.id === "data-center") {
      data.loadDemoSites(state.coolingDemo?.preloadedSites ?? []);
      state.selectPoint(site.coordinates, `${site.name} cooling demo`);
      data.handleLocationSelection();
      return;
    }
    state.setPendingDemoSiteId(site.id);
    state.setPendingDemoLoad(true);
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
    (state.activeDemo ? 1 : 0) +
    (state.init.judgeMode ? 1 : 0) +
    (data.activePrimaryCard ? 1 : 0) +
    (data.activeBoardCard ? 1 : 0) +
    data.suggestedCards.length;

  useEffect(() => {
    setUiContext({
      activeProfile: state.activeProfile.id,
      visiblePrimaryCardId: data.activePrimaryCard?.id ?? null,
      visibleWorkspaceCardIds: visibleUiCardIds,
      visibleControlCount,
      visibleTextBlockCount,
      shellMode: data.shellMode,
      judgeMode: state.init.judgeMode,
      locationSelected: state.locationReady,
      geodataLoading: data.loading,
      geodataLoaded: Boolean(data.geodata),
      reportOpen: data.reportOpen,
      demoOpen: state.demoOpen,
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
    state.activeProfile.id,
    state.demoOpen,
    state.init.judgeMode,
    state.locationReady,
    visibleControlCount,
    visibleTextBlockCount,
    visibleUiCardIds,
  ]);

  const sidebarElement = (
    <Sidebar
      activeProfile={state.activeProfile}
      profiles={PROFILES}
      selectedLocationName={state.selectedLocationName}
      selectedRegion={state.selectedRegion}
      onOpenDemo={() => state.setDemoOpen(true)}
      onSelectProfile={state.setActiveProfile}
      onSelectRegion={(region) => {
        state.setSelectedRegion(region);
        state.selectPoint(region.center, region.name);
        data.handleLocationSelection();
      }}
      quickRegions={state.quickRegions}
    />
  );

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1680px] space-y-5">
        <section className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Explore workspace
                </span>
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {data.shellMode}
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                  {state.init.judgeMode
                    ? "A judge-ready spatial reasoning flow"
                    : "Start with one place, then reveal only the views you need"}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                  {state.init.judgeMode
                    ? "GeoSight is focused on a guided competition story with a tighter board and visible trust signals."
                    : "The globe stays live, the first panel stays calm, and deeper cards appear only when the question calls for them."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                className="rounded-full xl:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft className="mr-2 h-4 w-4" />
                Mission controls
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={!data.geodata || data.loading || data.reportLoading}
                onClick={() => void data.generateReport()}
              >
                <FileText className="mr-2 h-4 w-4" />
                {data.reportLoading ? "Generating report..." : "Generate report"}
              </Button>
              <ThemeToggle compact />
              {data.shellMode === "board" ? (
                <WorkspaceViewToggle mode={data.viewMode} onChange={data.setViewMode} />
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(state.init.judgeMode
              ? [
                  "Mission run stays in focus",
                  "Supporting evidence opens on demand",
                  "Trust and score stay one step away",
                ]
              : [
                  "Prompt-first location flow",
                  "One primary panel at a time",
                  "Advanced board only when you ask for it",
                ]).map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {state.initStatus === "resolving" ? (
          <div className="rounded-[1.35rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
            Resolving {state.init.locationQuery} and positioning the globe...
          </div>
        ) : null}
        {state.initError ? (
          <div className="rounded-[1.35rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
            {state.initError}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden xl:block">{sidebarElement}</div>

          <div className="space-y-4">
            <SearchBar
              activeLocationName={state.selectedLocationName}
              onLocate={(result) => {
                state.setInitError(null);
                state.selectPoint(result.coordinates, result.name);
                data.handleLocationSelection();
              }}
            />

            {(state.activeDemo || state.init.judgeMode) && (
              <details className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                  Current story context
                </summary>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {state.activeDemo ? (
                    <p>
                      <span className="font-semibold text-[var(--foreground)]">
                        {state.activeDemo.name}
                      </span>{" "}
                      {state.activeDemo.description}
                    </p>
                  ) : null}
                  {state.init.judgeMode && state.missionRunPreset ? (
                    <p>
                      Judge mode is focused on the{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {state.missionRunPreset.title.toLowerCase()}
                      </span>{" "}
                      mission run and a smaller supporting-card set.
                    </p>
                  ) : null}
                </div>
              </details>
            )}

            {data.showDemoFallback && state.activeDemo ? (
              <div className="space-y-3">
                <DemoFallbackBanner onDismiss={data.dismissDemoFallback} />
                <section className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
                  <Image
                    src={state.activeDemo.fallbackScreenshot}
                    alt={`${state.activeDemo.name} captured workspace preview`}
                    width={1600}
                    height={900}
                    className="block h-auto w-full object-cover"
                  />
                </section>
              </div>
            ) : null}

            <section className="relative min-h-[640px] overflow-hidden rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--surface-overlay)] to-transparent" />
              <CesiumGlobe
                selectedPoint={state.selectedPoint}
                selectedRegion={state.selectedRegion}
                onPointSelect={(coords) => {
                  state.selectPoint(coords);
                  data.handleLocationSelection();
                }}
                savedSites={data.sites}
                layers={state.layers}
                terrainExaggeration={state.terrainExaggeration}
                demoOverlays={state.activeDemo?.mapOverlays ?? []}
              />
              {data.shellMode === "board" ? (
                <DataLayers layers={state.layers} onChange={state.setLayers} />
              ) : null}
              <RegionSelector
                region={state.selectedRegion}
                onReset={() =>
                  state.selectPoint(
                    state.defaultCoordinates,
                    state.activeDemo?.locationName ?? "Starter view",
                  )
                }
              />
            </section>

            <section className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="eyebrow">Primary focus</div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Keep one core view open
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {data.activePrimaryCard?.summaryVariant ??
                      "Switch between the active place, AI reasoning, and result summaries without stacking all three at once."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
        </section>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-[var(--background)]/70 backdrop-blur-sm xl:hidden">
          <div className="absolute inset-y-0 left-0 w-full max-w-sm p-4">
            <div className="mb-3 flex justify-end">
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
            {sidebarElement}
          </div>
        </div>
      ) : null}

      {state.overlayDemo ? (
        <CoolingDemoOverlay
          demo={state.overlayDemo}
          open={state.demoOpen}
          score={data.siteScore}
          sites={data.sites}
          onClose={() => state.setDemoOpen(false)}
          onLoadShowcase={handleLoadShowcase}
          onSaveCurrentSite={handleSaveCurrentSite}
          onFocusSite={handleFocusDemoSite}
        />
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
