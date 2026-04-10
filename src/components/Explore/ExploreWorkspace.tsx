"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Car, FileText, Globe, Link2, Menu, Plus, Sparkles, X } from "lucide-react";
import { AddViewTray } from "@/components/Explore/AddViewTray";
import { AnalysisOverviewBanner } from "@/components/Explore/AnalysisOverviewBanner";
import { MapCallout } from "@/components/Globe/MapCallout";
import { CardDisplayProvider } from "@/context/CardDisplayContext";
import { GeoScribeReportPanel } from "@/components/Explore/GeoScribeReportPanel";
import {
  ExplorePrimaryPanel,
  ExploreWorkspacePanel,
} from "@/components/Explore/ExploreWorkspacePanels";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { DataLayers } from "@/components/Globe/DataLayers";
import { DrawingToolbar } from "@/components/Globe/DrawingToolbar";
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
import { DrawnShape, WorkspaceCardId } from "@/types";
import { Button } from "../ui/button";
import { useExploreInit } from "./ExploreProvider";

const CesiumGlobe = dynamic(
  () =>
    import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }, []);

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
        message: "Workspace mode active.",
      });
    }
  };

  const openCard = (cardId: WorkspaceCardId) => {
    if (data.shellMode === "board") {
      if (!data.visibility[cardId]) {
        data.setCardVisible(cardId, true);
      }
      data.openCard(cardId);
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

  const handleShapeComplete = useCallback((shape: DrawnShape) => {
    state.addDrawnShape(shape);
    if (shape.type !== "marker") {
      state.setDrawingTool("none");
    }
  }, [state]);

  const handleExportGeoJSON = useCallback(() => {
    const features = state.drawnShapes.map((shape) => {
      const props: Record<string, unknown> = { label: shape.label ?? shape.type };
      if (shape.measurementLabel) props.measurement = shape.measurementLabel;

      if (shape.type === "marker") {
        const c = shape.coordinates[0];
        return { type: "Feature", properties: props, geometry: { type: "Point", coordinates: [c.lng, c.lat] } };
      }
      if (shape.type === "measure") {
        return { type: "Feature", properties: props, geometry: { type: "LineString", coordinates: shape.coordinates.map((c) => [c.lng, c.lat]) } };
      }
      if (shape.type === "circle") {
        const center = shape.coordinates[0];
        props.radiusKm = shape.coordinates.length > 1
          ? Math.sqrt(Math.pow(shape.coordinates[1].lat - center.lat, 2) + Math.pow(shape.coordinates[1].lng - center.lng, 2)) * 111
          : 0;
        return { type: "Feature", properties: props, geometry: { type: "Point", coordinates: [center.lng, center.lat] } };
      }
      const ring = [...shape.coordinates, shape.coordinates[0]].map((c) => [c.lng, c.lat]);
      return { type: "Feature", properties: props, geometry: { type: "Polygon", coordinates: [ring] } };
    });

    const geojson = { type: "FeatureCollection", features };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "geosight-shapes.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }, [state.drawnShapes]);

  const visibleUiCardIds = useMemo(
    () =>
      data.shellMode === "board"
        ? data.boardCards.map((card) => card.id)
        : data.openBoardCards.map((card) => card.id),
    [data.openBoardCards, data.boardCards, data.shellMode],
  );

  const visibleControlCount =
    6 +
    data.primaryCards.length +
    data.suggestedCards.length +
    (data.shellMode === "board" ? data.boardCards.length : visibleUiCardIds.length);

  const visibleTextBlockCount =
    5 +
    (data.activePrimaryCard ? 1 : 0) +
    data.openBoardCards.length +
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
    data.openBoardCards,
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

  const rightPanelOpen = Boolean(
    data.activePrimaryCard ||
    data.openBoardCards.length > 0 ||
    data.shellMode === "board"
  );

  // Card content rendered in right panel (desktop) or inline below globe (mobile)
  const rightPanelContent = (
    <div className="space-y-4 p-4">
      {/* Primary card tabs */}
      {data.primaryCards.length > 0 && data.shellMode !== "board" ? (
        <div className="flex flex-wrap gap-1.5">
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
      ) : null}

      {/* Primary panel */}
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

      {/* Open workspace cards (guided mode) */}
      {data.shellMode !== "board" && data.openBoardCards.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            Supporting view
          </div>
          {data.openBoardCards.map((card) => (
            <ExploreWorkspacePanel
              key={card.id}
              cardId={card.id}
              state={state}
              data={data}
              onOpenCard={openCard}
            />
          ))}
        </section>
      ) : null}

      {/* Board / Library */}
      {data.shellMode === "board" ? (
        data.viewMode === "board" ? (
          <WorkspaceBoard
            cards={data.boardCards}
            openCardIds={data.openCardIds}
            onToggleCard={data.toggleOpenCard}
            onOpenLibrary={data.openLibrary}
            onReorderCards={data.reorderCards}
            savedBoards={data.savedBoards}
            activeBoardId={data.activeBoardId}
            onSaveBoard={data.saveCurrentBoard}
            onRestoreBoard={data.restoreBoard}
            onDeleteBoard={data.deleteBoard}
            onUpdateActiveBoard={data.updateActiveBoard}
            onRenameBoard={data.renameBoard}
          >
            {data.openBoardCards.length > 0 ? (
              <div className="space-y-4">
                {data.openBoardCards.map((card) => (
                  <ExploreWorkspacePanel
                    key={card.id}
                    cardId={card.id}
                    state={state}
                    data={data}
                    onOpenCard={openCard}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[120px] items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={data.openLibrary}
                >
                  Open card library
                </Button>
              </div>
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
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col xl:fixed xl:inset-0 xl:overflow-hidden bg-[var(--background)]">

      {/* ── Topbar ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-4 py-3 xl:h-[52px] xl:py-0">
        {/* Mobile menu */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full xl:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Brand */}
        <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">GeoSight</span>

        {/* Active profile pill */}
        <span className="hidden shrink-0 cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)] pointer-events-none xl:inline">
          {state.activeProfile.name}
        </span>

        {/* Lens badge (explorer mode) */}
        {inExplorer && state.activeLensId && (() => {
          const lens = getExplorerLensById(state.activeLensId);
          return lens ? (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] pl-3 pr-1.5 py-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-foreground)] cursor-default select-none xl:inline-flex">
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

        {/* Search bar — centered, flex-1 */}
        <div className="min-w-0 flex-1">
          <SearchBar
            submitLabel={state.locationReady ? "Update" : "Analyze"}
            syncValue={
              state.locationReady
                ? state.selectedLocationDisplayName
                : state.init.locationQuery ?? ""
            }
            onLocate={(result) => {
              state.setInitError(null);
              setCalloutDismissed(false);
              state.selectPoint(
                result.coordinates,
                result.fullName ?? result.name,
                result.shortName,
              );
              data.handleLocationSelection();
            }}
          />
        </div>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-2">
          <ModeSwitcher mode={state.appMode} onSetMode={state.setAppMode} />
          {state.locationReady ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={handleCopyLink}
              title="Copy a shareable link to this location and profile"
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share"}</span>
            </Button>
          ) : null}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:overflow-hidden">

        {/* Left panel — desktop only */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-r border-[color:var(--border-soft)] xl:flex">

          {/* Init status */}
          {state.initStatus === "resolving" ? (
            <div className="shrink-0 border-b border-[color:var(--border-soft)] px-3 py-2">
              <p className="text-xs text-[var(--muted-foreground)]">
                Resolving {state.init.locationQuery}…
              </p>
            </div>
          ) : null}
          {state.initError ? (
            <div className="shrink-0 border-b border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-foreground)]">
              {state.initError}
            </div>
          ) : null}

          {/* Sidebar (profiles + quick regions) */}
          <div className="min-h-0 flex-1 overflow-y-auto">{sidebarElement}</div>

          {/* AddViewTray — guided mode */}
          {data.shellMode !== "board" ? (
            <div className="shrink-0 border-t border-[color:var(--border-soft)]">
              <AddViewTray
                cards={data.suggestedCards}
                pinnedCardIds={data.pinnedCardIds}
                onOpenCard={data.openCardFromTray}
                onTogglePinned={data.togglePinnedCard}
                onOpenBoard={data.openAdvancedBoard}
              />
            </div>
          ) : null}

          {/* Mode buttons */}
          <div className="shrink-0 space-y-1 border-t border-[color:var(--border-soft)] p-3">
            <Button
              type="button"
              size="sm"
              variant={data.shellMode !== "board" ? "default" : "ghost"}
              className="w-full justify-start rounded-full"
              onClick={handleOpenGuidedMode}
              title="Focused mode keeps the workspace focused and reveals supporting views on demand."
            >
              Focused
            </Button>
            <Button
              type="button"
              size="sm"
              variant={data.shellMode === "board" && data.viewMode === "board" ? "default" : "ghost"}
              className="w-full justify-start rounded-full"
              onClick={handleOpenBoardMode}
              title="Workspace mode opens the full advanced card board."
            >
              Workspace
            </Button>
            <Button
              type="button"
              size="sm"
              variant={data.shellMode === "board" && data.viewMode === "library" ? "default" : "ghost"}
              className="w-full justify-start rounded-full"
              onClick={handleOpenLibraryMode}
              title="Browse every available GeoSight card."
            >
              Cards
            </Button>
            <Button
              type="button"
              size="sm"
              variant={data.openCardIds.includes("compare") ? "default" : "ghost"}
              className="w-full justify-start rounded-full"
              onClick={() => openCard("compare")}
              title={
                data.sites.length >= 2
                  ? "Compare saved locations side by side."
                  : "Save at least two locations to unlock comparison."
              }
            >
              Compare
            </Button>
          </div>
        </aside>

        {/* Globe area */}
        <div className="relative min-h-[55vw] max-h-[55vh] flex-1 xl:max-h-none xl:min-h-0">
          <ClientErrorBoundary
            title="The globe view needs a quick reset"
            message="GeoSight kept the rest of the workspace alive. Retry the globe, switch regions, or keep working from the cards while the globe re-initializes."
          >
            <div className="absolute inset-0">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[var(--surface-overlay)] to-transparent" />
              <CesiumGlobe
                selectedPoint={state.selectedPoint}
                selectedRegion={state.selectedRegion}
                globeViewMode={state.globeViewMode}
                globeRotateMode={state.globeRotateMode}
                subsurfaceRenderMode={state.subsurfaceRenderMode}
                onPointSelect={(coords) => {
                  setCalloutDismissed(false);
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
                drawingTool={state.drawingTool}
                drawnShapes={state.drawnShapes}
                onShapeComplete={handleShapeComplete}
                onVertexDrag={state.updateDrawnShapeVertex}
                snapToGrid={state.snapToGrid}
              />
            </div>
          </ClientErrorBoundary>

          {/* Globe controls */}
          <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
            <Button
              type="button"
              variant={state.globeRotateMode ? "default" : "secondary"}
              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
              aria-pressed={state.globeRotateMode}
              aria-label={state.globeRotateMode ? "Disable 3D explore rotate mode" : "Enable 3D explore rotate mode"}
              onClick={() => state.setGlobeRotateMode((current) => !current)}
            >
              <Globe className="mr-2 h-4 w-4" />
              {state.globeRotateMode ? "3D explore" : "Rotate"}
            </Button>
            <Button
              type="button"
              variant={state.driveMode ? "default" : "secondary"}
              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
              aria-pressed={state.driveMode}
              aria-label={state.driveMode ? "Exit drive mode" : "Enter drive mode"}
              onClick={() => state.setDriveMode((current) => !current)}
            >
              <Car className="mr-2 h-4 w-4" />
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
          <DrawingToolbar
            drawingTool={state.drawingTool}
            onSelectTool={state.setDrawingTool}
            drawnShapes={state.drawnShapes}
            onClearAll={() => state.setDrawnShapes([])}
            onDeleteShape={state.removeDrawnShape}
            canUndo={state.canUndo}
            canRedo={state.canRedo}
            onUndo={state.undoDrawing}
            onRedo={state.redoDrawing}
            onRenameShape={state.renameShape}
            onExportGeoJSON={handleExportGeoJSON}
            snapToGrid={state.snapToGrid}
            onToggleSnapToGrid={() => state.setSnapToGrid((v) => !v)}
          />

          {/* Map callout — appears on point select, hides when right panel opens */}
          {(state.locationReady || data.loading) && !rightPanelOpen && !calloutDismissed ? (
            <MapCallout
              geodata={data.geodata}
              score={data.siteScore}
              profile={state.activeProfile}
              locationName={state.selectedLocationName}
              loading={data.loading}
              onOpenAnalysis={() => {
                const firstCard = data.primaryCards[0];
                if (firstCard) data.setActivePrimaryCardId(firstCard.id);
              }}
              onDismiss={() => setCalloutDismissed(true)}
            />
          ) : null}

          {/* Coord readout */}
          {state.selectedPoint ? (
            <div className="absolute bottom-4 left-4 z-10 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--muted-foreground)] backdrop-blur-sm">
              {state.selectedPoint.lat.toFixed(5)}, {state.selectedPoint.lng.toFixed(5)}
            </div>
          ) : null}
        </div>

        {/* Right panel (desktop) / inline content (mobile) */}
        {rightPanelOpen ? (
          <aside className={cn(
            "flex flex-col border-t border-[color:var(--border-soft)]",
            "xl:w-[380px] xl:shrink-0 xl:border-t-0 xl:border-l xl:overflow-y-auto",
          )}>
            <CardDisplayProvider value={{ defaultCollapsed: true }}>
              {rightPanelContent}
            </CardDisplayProvider>
          </aside>
        ) : null}
      </div>

      {/* ── Bottom bar ── */}
      <footer className="flex shrink-0 items-center gap-3 border-t border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-4 py-3 xl:h-[64px] xl:py-0">
        <div className="min-w-0 flex-1">
          {(state.locationReady || data.loading || data.error) ? (
            <AnalysisOverviewBanner
              compact
              geodata={data.geodata}
              score={data.siteScore}
              profile={state.activeProfile}
              locationName={state.selectedLocationName}
              loading={data.loading}
              error={data.error}
              onOpenFactorBreakdown={() => openCard("factor-breakdown")}
              onOpenSources={() => openCard("source-awareness")}
            />
          ) : (
            <span className="text-sm text-[var(--muted-foreground)]">
              Search a location to begin analysis
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="hidden shrink-0 rounded-full xl:inline-flex"
          onClick={() => openCard("compare")}
          title={
            data.sites.length >= 2
              ? "Compare saved locations side by side."
              : "Save at least two locations to unlock comparison."
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Compare
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          className="shrink-0 rounded-full"
          disabled={data.reportLoading}
          onClick={handleGenerateReport}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {data.reportLoading ? "Generating…" : "Generate report"}
          </span>
          <span className="sm:hidden">Report</span>
        </Button>
      </footer>

      {/* Workspace notice — floating toast */}
      {workspaceNotice ? (
        <div
          className={cn(
            "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm",
            workspaceNotice.tone === "warning"
              ? "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]"
              : "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
          )}
        >
          {workspaceNotice.message}
        </div>
      ) : null}

      {/* Mobile sidebar overlay */}
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
            {/* Mode buttons in mobile sidebar */}
            <div className="mb-3 flex shrink-0 flex-wrap gap-1.5">
              <Button type="button" size="sm" variant={data.shellMode !== "board" ? "default" : "ghost"} className="rounded-full" onClick={() => { handleOpenGuidedMode(); setSidebarOpen(false); }}>
                Focused
              </Button>
              <Button type="button" size="sm" variant={data.shellMode === "board" && data.viewMode === "board" ? "default" : "ghost"} className="rounded-full" onClick={() => { handleOpenBoardMode(); setSidebarOpen(false); }}>
                Workspace
              </Button>
              <Button type="button" size="sm" variant={data.shellMode === "board" && data.viewMode === "library" ? "default" : "ghost"} className="rounded-full" onClick={() => { handleOpenLibraryMode(); setSidebarOpen(false); }}>
                Cards
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
    </div>
  );
}
