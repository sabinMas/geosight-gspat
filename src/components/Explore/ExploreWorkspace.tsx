"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { FileText, Sparkles } from "lucide-react";
import { DemoFallbackBanner } from "@/components/Demo/DemoFallbackBanner";
import { CoolingDemoOverlay } from "@/components/Demo/CoolingDemoOverlay";
import { GeoScribeReportPanel } from "@/components/Explore/GeoScribeReportPanel";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { ExplorePrimaryPanel, ExploreWorkspacePanel } from "@/components/Explore/ExploreWorkspacePanels";
import { WorkspaceViewToggle } from "@/components/Explore/WorkspaceViewToggle";
import { DataLayers } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreState } from "@/hooks/useExploreState";
import { DEFAULT_PROFILE, PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { WorkspaceCardId } from "@/types";
import { useExploreInit } from "./ExploreProvider";
const CesiumGlobe = dynamic(() => import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe), { ssr: false, loading: () => <div className="flex h-full items-center justify-center rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]">Loading 3D globe...</div> });
export function ExploreWorkspace() {
  const init = useExploreInit();
  const { setGeoContext } = useAgentPanel();
  const state = useExploreState(init);
  const data = useExploreData({ state, setGeoContext });
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
    const site = state.coolingDemo?.preloadedSites?.find((candidate) => candidate.id === siteId);
    if (!site) {
      return;
    }
    if (state.activeProfile.id === "data-center") {
      data.loadDemoSites(state.coolingDemo?.preloadedSites ?? []);
      state.selectPoint(site.coordinates, `${site.name} cooling demo`);
      return;
    }
    state.setPendingDemoSiteId(site.id);
    state.setPendingDemoLoad(true);
  };
  const openCardOnBoard = (cardId: WorkspaceCardId) => {
    if (!data.visibility[cardId]) {
      data.setCardVisible(cardId, true);
    }
    data.setActiveCardId(cardId);
    data.setViewMode("board");
  };
  const resultsHeader = <ResultsModeToggle mode={state.resultsMode} onChange={state.setResultsMode} />;
  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1720px] space-y-6">
        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar activeProfile={state.activeProfile} profiles={PROFILES} selectedLocationName={state.selectedLocationName} selectedRegion={state.selectedRegion} onOpenDemo={() => state.setDemoOpen(true)} onSelectProfile={state.setActiveProfile} onSelectRegion={(region) => { state.setSelectedRegion(region); state.selectPoint(region.center, region.name); }} quickRegions={state.quickRegions} />
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <Badge>Explore workspace</Badge>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                        {state.init.judgeMode
                          ? "A judge-ready board for grounded spatial reasoning"
                          : "A quieter board for spatial questions"}
                      </h1>
                      <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                        {state.init.judgeMode
                          ? "Keep one mission run and one supporting card in focus while GeoSight turns live geodata into a trust-aware spatial briefing."
                          : "Keep the globe alive, open only the cards you need, and move between focused analysis views instead of scanning a dense page of panels."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                    <WorkspaceViewToggle mode={data.viewMode} onChange={data.setViewMode} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {(state.init.judgeMode
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
                  activeLocationName={state.selectedLocationName}
                  onLocate={(result) => {
                    state.setInitError(null);
                    state.selectPoint(result.coordinates, result.name);
                  }}
                />
              </div>
            </div>
            {state.initStatus === "resolving" ? (
              <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
                Resolving {state.init.locationQuery} and positioning the globe...
              </div>
            ) : null}
            {state.initError ? (
              <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                {state.initError}
              </div>
            ) : null}
            {state.activeDemo ? (
              <div
                className="rounded-[1.5rem] border px-4 py-3 text-sm"
                style={{
                  borderColor: `${state.activeDemo.accentColor}33`,
                  backgroundColor: `${state.activeDemo.accentColor}12`,
                  color: "var(--foreground)",
                }}
              >
                <span className="font-semibold">{state.activeDemo.name}</span>
                <span className="mx-2 text-[var(--muted-foreground)]">&middot;</span>
                {state.activeDemo.description}
              </div>
            ) : null}
            {state.init.judgeMode && state.missionRunPreset ? (
              <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
                <span className="font-semibold">Judge mode active.</span> GeoSight is focused on the{" "}
                {state.missionRunPreset.title.toLowerCase()} story with a structured mission run,
                visible provenance, and a smaller supporting-card set.
              </div>
            ) : null}
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
            <section className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="eyebrow">Primary focus</div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Keep one core view open
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {data.activePrimaryCard?.summary ??
                      "Switch between the active place, AI reasoning, and result summaries without stacking all three at once."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.primaryCards.map((card) => (
                    <Button
                      key={card.id}
                      type="button"
                      size="sm"
                      variant={card.id === data.activePrimaryCard?.id ? "default" : "secondary"}
                      className="rounded-full"
                      onClick={() => data.setActivePrimaryCardId(card.id)}
                    >
                      {card.title}
                    </Button>
                  ))}
                </div>
              </div>
              {(data.showImagePrompt || data.showComparePrompt || data.showSourcePrompt) &&
              data.viewMode === "board" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-soft)] pt-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                    Suggested next views
                  </div>
                  {data.showComparePrompt ? (
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
                  {data.showSourcePrompt ? (
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
                  {data.showImagePrompt ? (
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
                selectedPoint={state.selectedPoint}
                selectedRegion={state.selectedRegion}
                onPointSelect={state.selectPoint}
                savedSites={data.sites}
                layers={state.layers}
                terrainExaggeration={state.terrainExaggeration}
                demoOverlays={state.activeDemo?.mapOverlays ?? []}
              />
              <DataLayers layers={state.layers} onChange={state.setLayers} />
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
            {data.activePrimaryCard ? (
              <ExplorePrimaryPanel cardId={data.activePrimaryCard.id} state={state} data={data} headerContent={resultsHeader} onSaveCurrentSite={handleSaveCurrentSite} onOpenCard={openCardOnBoard} />
            ) : null}
          </div>
        </section>
        {data.viewMode === "board" ? (
          <WorkspaceBoard
            cards={data.boardCards}
            activeCardId={data.activeBoardCard?.id ?? null}
            onSelectCard={data.setActiveCardId}
            onOpenLibrary={() => data.setViewMode("library")}
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
                  onOpenCard={openCardOnBoard}
                />
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
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={() => data.setViewMode("library")}
                  >
                    Open card library
                  </Button>
                </CardContent>
              </Card>
            )}
          </WorkspaceBoard>
        ) : (
          <WorkspaceLibrary cards={data.cards.filter((card) => card.zone === "workspace")} visibility={data.visibility} onToggleCard={data.setCardVisible} onOpenCard={openCardOnBoard} />
        )}
      </div>
      {state.overlayDemo ? (
        <CoolingDemoOverlay demo={state.overlayDemo} open={state.demoOpen} score={data.siteScore} sites={data.sites} onClose={() => state.setDemoOpen(false)} onLoadShowcase={handleLoadShowcase} onSaveCurrentSite={handleSaveCurrentSite} onFocusSite={handleFocusDemoSite} />
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
