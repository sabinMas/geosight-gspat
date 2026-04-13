"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toPng } from "html-to-image";
import {
  Car,
  Check,
  Command,
  Copy,
  Download,
  FileText,
  Globe,
  Grid2x2,
  Layers3,
  Library,
  Link2,
  Map,
  MapPinned,
  Menu,
  PenTool,
  Plus,
  Route,
  Ruler,
  Sparkles,
  X,
} from "lucide-react";
import { AnalysisOverviewBanner } from "@/components/Explore/AnalysisOverviewBanner";
import { PersistentAiBar } from "@/components/Explore/PersistentAiBar";
import { TopographicCaptureOverlay } from "@/components/Explore/TopographicCaptureOverlay";
import {
  WorkspaceCommandItem,
  WorkspaceCommandPalette,
} from "@/components/Explore/WorkspaceCommandPalette";
import { WorkspaceToolRail } from "@/components/Explore/WorkspaceToolRail";
import { MapCallout } from "@/components/Globe/MapCallout";
import { AoiDrawingToolbar } from "@/components/Globe/AoiDrawingToolbar";
import { LocationTrackingControls } from "@/components/Globe/LocationTrackingControls";
import { CardDisplayProvider } from "@/context/CardDisplayContext";
import { GeoScribeReportPanel } from "@/components/Explore/GeoScribeReportPanel";
import {
  ExplorePrimaryPanel,
  ExploreWorkspacePanel,
} from "@/components/Explore/ExploreWorkspacePanels";
import { WorkspaceBoard } from "@/components/Explore/WorkspaceBoard";
import { WorkspaceLibrary } from "@/components/Explore/WorkspaceLibrary";
import { DataLayers } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { AnalysisPanel } from "@/components/Results/AnalysisPanel";
import { ModeSwitcher } from "@/components/Shell/ModeSwitcher";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { isExplorerMode } from "@/lib/app-mode";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { AnalysisProvider } from "@/context/AnalysisContext";
import { useExploreData } from "@/hooks/useExploreData";
import { useLensAnalysis } from "@/hooks/useLensAnalysis";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useExploreState } from "@/hooks/useExploreState";
import {
  buildAnalysisTablesBundle,
  buildAnalystExportBundle,
  buildDrawnShapesGeoJson,
  buildDrawnShapesCsv,
  buildExportManifest,
  buildExportBasename,
  buildQuickRegionsCsv,
  buildSiteSummaryCsv,
  downloadBlob,
  downloadText,
} from "@/lib/analysis-export";
import { getActiveLayerLabels } from "@/lib/map-layers";
import { PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { CaptureFigureOptions, DrawnShape, GlobeViewSnapshot, WorkspaceCardId } from "@/types";
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
  const { setGeoContext, setUiContext, primeAgent, submitAgentPrompt } = useAgentPanel();
  const state = useExploreState(init);
  const data = useExploreData({ state, setGeoContext });
  const locationTracking = useLocationTracking();
  useLensAnalysis(state);
  const inExplorer = isExplorerMode(state.appMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [captureOverlayArmed, setCaptureOverlayArmed] = useState(false);
  const [captureViewSnapshot, setCaptureViewSnapshot] = useState<GlobeViewSnapshot | null>(null);
  const [overlayMetersPerPixel, setOverlayMetersPerPixel] = useState<number | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [captureFigure, setCaptureFigure] = useState<CaptureFigureOptions>({
    title: "",
    subtitle: "",
    notes: "",
    showScaleBar: true,
    showLegend: true,
    showNorthArrow: true,
    emphasizeAoi: true,
  });
  const globeAreaRef = useRef<HTMLElement | null>(null);
  const globeApiRef = useRef<{
    getViewSnapshot: () => GlobeViewSnapshot | null;
    requestRender: () => void;
  } | null>(null);

  const captureOverlayVisible = captureMode || captureOverlayArmed;
  const drawingTool = state.drawingTool;
  const isAoiLayerVisible = state.layers.aoi;
  const setLayerState = state.setLayers;
  const addSavedSite = data.addSite;
  const currentGeodata = data.geodata;
  const currentSiteScore = data.siteScore;
  const savedSites = data.sites;
  const setShellMode = data.setShellMode;
  const setViewMode = data.setViewMode;
  const openAdvancedBoard = data.openAdvancedBoard;
  const cardVisibility = data.visibility;
  const setVisibleCard = data.setCardVisible;
  const openBoardCard = data.openCard;
  const openCardFromTray = data.openCardFromTray;
  const openLibrary = data.openLibrary;
  const handleDataLocationSelection = data.handleLocationSelection;
  const generateGeoReport = data.generateReport;
  const geodataLoading = data.loading;
  const handleDataQuestionIntent = data.handleQuestionIntent;

  // ESC closes mobile sidebar
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!captureOverlayVisible) {
      setCaptureViewSnapshot(null);
      return;
    }

    const syncSnapshot = () => {
      setCaptureViewSnapshot(globeApiRef.current?.getViewSnapshot() ?? null);
    };

    syncSnapshot();
    const interval = window.setInterval(syncSnapshot, 400);
    return () => window.clearInterval(interval);
  }, [captureOverlayVisible]);

  useEffect(() => {
    if (drawingTool === "none" || isAoiLayerVisible) {
      return;
    }

    setLayerState((current) => ({
      ...current,
      aoi: true,
    }));
  }, [drawingTool, isAoiLayerVisible, setLayerState]);

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

  const handleSaveCurrentSite = useCallback(() => {
    if (!currentGeodata || !currentSiteScore) {
      return;
    }

    addSavedSite({
      id: crypto.randomUUID(),
      name: `${state.activeProfile.name} Site ${savedSites.length + 1}`,
      regionName: state.selectedLocationName,
      profileId: state.activeProfile.id,
      coordinates: state.selectedPoint,
      geodata: currentGeodata,
      score: currentSiteScore,
    });

    setWorkspaceNotice({
      tone: "info",
      message: `${state.selectedLocationName} saved.`,
    });
  }, [
    addSavedSite,
    currentGeodata,
    currentSiteScore,
    savedSites.length,
    state.activeProfile.id,
    state.activeProfile.name,
    state.selectedLocationName,
    state.selectedPoint,
  ]);

  const handleOpenGuidedMode = useCallback(() => {
    if (!state.locationReady) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Select a location first.",
      });
      return;
    }

    setShellMode("guided");
    setViewMode("board");
    setWorkspaceNotice({
      tone: "info",
      message: "Focused mode active.",
    });
  }, [setShellMode, setViewMode, state.locationReady]);

  const handleOpenBoardMode = useCallback(() => {
    openAdvancedBoard();

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
  }, [openAdvancedBoard]);

  const openCard = useCallback((cardId: WorkspaceCardId) => {
    if (data.shellMode === "board") {
      if (!cardVisibility[cardId]) {
        setVisibleCard(cardId, true);
      }
      openBoardCard(cardId);
      setViewMode("board");
      return;
    }

    openCardFromTray(cardId);
  }, [
    cardVisibility,
    openBoardCard,
    openCardFromTray,
    setVisibleCard,
    setViewMode,
    data.shellMode,
  ]);

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

  const handleOpenLibraryMode = useCallback(() => {
    openLibrary();
  }, [openLibrary]);

  const handleSelectRegion = useCallback(
    (region: typeof state.selectedRegion) => {
      const regionLabel =
        state.activeProfile.id === "home-buying"
          ? region.secondaryLabel?.split(" · ")[0] ?? region.name
          : region.name;
      state.setSelectedRegion(region);
      state.selectPoint(region.center, regionLabel, regionLabel);
      handleDataLocationSelection();
    },
    [handleDataLocationSelection, state],
  );

  const handleGenerateReport = useCallback(() => {
    if (!currentGeodata) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Select a location first to generate a report.",
      });
      return;
    }

    if (geodataLoading) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Analysis still loading — try again shortly.",
      });
      return;
    }

    primeAgent("geo-scribe", reportPrompt);
    void generateGeoReport();
  }, [currentGeodata, generateGeoReport, geodataLoading, primeAgent, reportPrompt]);

  const handlePersistentQuestionSubmit = useCallback(
    (question: string) => {
      if (!state.locationReady) {
        setWorkspaceNotice({
          tone: "warning",
          message: "Select a location first to ask GeoSight about it.",
        });
        return;
      }

      handleDataQuestionIntent(question);
      submitAgentPrompt("geo-analyst", question);
    },
    [handleDataQuestionIntent, state.locationReady, submitAgentPrompt],
  );

  const handleGlobeApiChange = useCallback((api: {
    getViewSnapshot: () => GlobeViewSnapshot | null;
    requestRender: () => void;
  } | null) => {
    globeApiRef.current = api;
    if (!api) {
      setOverlayMetersPerPixel(null);
    }
  }, []);

  const focusLiveFix = useCallback(
    (
      fix: { coordinates: { lat: number; lng: number } },
      label = "Live location",
      displayLabel = "Live location",
    ) => {
      state.setInitError(null);
      setCalloutDismissed(false);
      state.selectPoint(fix.coordinates, label, displayLabel);
      handleDataLocationSelection();
    },
    [handleDataLocationSelection, state],
  );

  const handleShapeComplete = useCallback((shape: DrawnShape) => {
    state.addDrawnShape(shape);
    if (shape.type !== "point") {
      state.setDrawingTool("none");
    }
  }, [state]);

  const handleLocateOnce = useCallback(() => {
    void locationTracking.locateOnce().then((fix) => {
      if (!fix) {
        return;
      }

      focusLiveFix(fix, "Current location", "Current location");
    });
  }, [focusLiveFix, locationTracking]);

  const handleStartFollowing = useCallback(() => {
    void locationTracking.startFollowing().then((fix) => {
      if (!fix) {
        return;
      }

      focusLiveFix(fix, "Live location", "Live location");
      setWorkspaceNotice({
        tone: "info",
        message: "Follow mode active.",
      });
    });
  }, [focusLiveFix, locationTracking]);

  const handleStartRecording = useCallback(() => {
    void locationTracking.startRecording().then((fix) => {
      if (!fix) {
        return;
      }

      focusLiveFix(fix, "Live route start", "Live route");
      setWorkspaceNotice({
        tone: "info",
        message: "Route recording started.",
      });
    });
  }, [focusLiveFix, locationTracking]);

  const handleStopRecording = useCallback(() => {
    const recordedRouteShape = locationTracking.stopRecording();
    if (!recordedRouteShape) {
      return;
    }

    state.addDrawnShape(recordedRouteShape);
    state.setDrawingTool("none");
    setWorkspaceNotice({
      tone: "info",
      message: "Recorded route ready for analysis.",
    });
  }, [locationTracking, state]);

  const visibleUiCardIds = useMemo(
    () =>
      data.shellMode === "board"
        ? data.boardCards.map((card) => card.id)
        : data.openBoardCards.map((card) => card.id),
    [data.openBoardCards, data.boardCards, data.shellMode],
  );

  const activeLayerLabels = useMemo(() => {
    return getActiveLayerLabels(state.layers, state.globeViewMode);
  }, [state.globeViewMode, state.layers]);

  const siteSummaryCsv = useMemo(
    () =>
      buildSiteSummaryCsv({
        locationName: state.selectedLocationName,
        selectedPoint: state.selectedPoint,
        geodata: data.geodata,
        siteScore: data.siteScore,
        savedSites: data.sites,
        profile: state.activeProfile,
      }),
    [
      data.geodata,
      data.siteScore,
      data.sites,
      state.activeProfile,
      state.selectedLocationName,
      state.selectedPoint,
    ],
  );

  const quickRegionsCsv = useMemo(
    () => buildQuickRegionsCsv(state.quickRegions),
    [state.quickRegions],
  );

  const drawnShapesGeoJson = useMemo(
    () => buildDrawnShapesGeoJson(state.drawnShapes),
    [state.drawnShapes],
  );

  const drawnShapesCsv = useMemo(
    () => buildDrawnShapesCsv(state.drawnShapes),
    [state.drawnShapes],
  );

  const captureGlobeArea = useCallback(async () => {
    const node = globeAreaRef.current;
    if (!node) {
      throw new Error("Map capture is not ready yet.");
    }

    setCaptureOverlayArmed(true);

    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
      globeApiRef.current?.requestRender();
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

      return await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#08141d",
      });
    } finally {
      if (!captureMode) {
        setCaptureOverlayArmed(false);
      }
    }
  }, [captureMode]);

  const handleExportGeoJson = useCallback(() => {
    const basename = buildExportBasename(
      state.selectedLocationName,
      new Date().toISOString(),
    );
    downloadText(
      `${basename}-drawn-shapes.geojson`,
      JSON.stringify(drawnShapesGeoJson, null, 2),
      "application/geo+json",
    );
  }, [drawnShapesGeoJson, state.selectedLocationName]);

  const handleExportCsv = useCallback(async () => {
    setExportBusy(true);
    try {
      const basename = buildExportBasename(
        state.selectedLocationName,
        new Date().toISOString(),
      );
      const bundle = await buildAnalysisTablesBundle({
        siteSummaryCsv,
        quickRegionsCsv,
        drawnShapesCsv,
      });
      downloadBlob(`${basename}-analysis-tables.zip`, bundle);
      setWorkspaceNotice({
        tone: "info",
        message: "Analysis tables exported.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "warning",
        message: error instanceof Error ? error.message : "Analysis tables export failed.",
      });
    } finally {
      setExportBusy(false);
    }
  }, [drawnShapesCsv, quickRegionsCsv, siteSummaryCsv, state.selectedLocationName]);

  const handleCapturePng = useCallback(async () => {
    setExportBusy(true);
    try {
      const basename = buildExportBasename(
        state.selectedLocationName,
        new Date().toISOString(),
      );
      const screenshotDataUrl = await captureGlobeArea();
      const response = await fetch(screenshotDataUrl);
      const blob = await response.blob();
      downloadBlob(`${basename}-topographic-capture.png`, blob);
      setWorkspaceNotice({
        tone: "info",
        message: "Topographic capture exported.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "warning",
        message:
          error instanceof Error ? error.message : "Topographic capture failed.",
      });
    } finally {
      setExportBusy(false);
    }
  }, [captureGlobeArea, state.selectedLocationName]);

  const handleExportBundle = useCallback(async () => {
    setExportBusy(true);
    try {
      const exportedAt = new Date().toISOString();
      const basename = buildExportBasename(state.selectedLocationName, exportedAt);
      const screenshotDataUrl = await captureGlobeArea();
      const manifest = buildExportManifest({
        exportedAt,
        locationName: state.selectedLocationName,
        selectedPoint: state.selectedPoint,
        selectedRegion: state.selectedRegion,
        profile: state.activeProfile,
        geodata: data.geodata,
        siteScore: data.siteScore,
        savedSites: data.sites,
        quickRegions: state.quickRegions,
        drawnShapes: state.drawnShapes,
        globeView: globeApiRef.current?.getViewSnapshot() ?? null,
        terrainExaggeration: state.terrainExaggeration,
        activeLayers: {
          globeViewMode: state.globeViewMode,
          roads: state.layers.roads,
          fires: state.layers.fires,
          floodZones: state.layers.floodZones,
          contours: state.layers.contours,
          aoi: state.layers.aoi,
          roadsOpacity: state.layers.opacity.roads,
          firesOpacity: state.layers.opacity.fires,
          floodZonesOpacity: state.layers.opacity.floodZones,
          contoursOpacity: state.layers.opacity.contours,
          aoiOpacity: state.layers.opacity.aoi,
        },
        activeLayerLabels,
        captureModeEnabled: captureMode,
        figure: captureFigure,
      });

      const bundle = await buildAnalystExportBundle({
        manifest,
        geoJson: drawnShapesGeoJson,
        siteSummaryCsv,
        quickRegionsCsv,
        drawnShapesCsv,
        screenshotDataUrl,
      });

      downloadBlob(`${basename}-analyst-bundle.zip`, bundle);
      setWorkspaceNotice({
        tone: "info",
        message: "Analyst bundle exported.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "warning",
        message:
          error instanceof Error ? error.message : "Analyst bundle export failed.",
      });
    } finally {
      setExportBusy(false);
    }
  }, [
    captureGlobeArea,
    captureMode,
    captureFigure,
    data.geodata,
    data.siteScore,
    data.sites,
    drawnShapesCsv,
    drawnShapesGeoJson,
    activeLayerLabels,
    quickRegionsCsv,
    siteSummaryCsv,
    state.activeProfile,
    state.drawnShapes,
    state.globeViewMode,
    state.layers,
    state.quickRegions,
    state.selectedLocationName,
    state.selectedPoint,
    state.selectedRegion,
    state.terrainExaggeration,
  ]);

  const commandPaletteItems = useMemo<WorkspaceCommandItem[]>(() => {
    const actionItems: WorkspaceCommandItem[] = [
      {
        id: "action-focused-mode",
        label: "Open focused workspace",
        description: "Keep the workspace streamlined and reveal supporting evidence on demand.",
        section: "Actions",
        Icon: Sparkles,
        keywords: "focused guided mode minimal workspace",
      },
      {
        id: "action-workspace-mode",
        label: "Open analyst workbench",
        description: "Jump into the multi-panel evidence workspace.",
        section: "Actions",
        Icon: Layers3,
        keywords: "workbench workspace advanced evidence panels",
      },
      {
        id: "action-card-library",
        label: "Browse evidence library",
        description: "Search the full set of GeoSight analysis panels for the current mission.",
        section: "Actions",
        Icon: Library,
        keywords: "evidence library browse registry panels",
      },
      {
        id: "action-compare",
        label: "Open comparison",
        description:
          data.sites.length >= 2
            ? "Compare saved sites side by side."
            : "Open the comparison surface and save more sites to unlock it fully.",
        section: "Actions",
        Icon: Plus,
        keywords: "compare saved sites shortlist",
      },
      {
        id: "action-generate-report",
        label: data.reportLoading ? "Report is generating" : "Generate GeoScribe report",
        description: data.geodata
          ? "Create a structured written assessment for the active location."
          : "Choose a location first, then generate a report.",
        section: "Actions",
        Icon: FileText,
        keywords: "report export geoscribe assessment",
      },
      {
        id: "action-copy-link",
        label: "Copy shareable link",
        description: state.locationReady
          ? "Copy the current location and mission to the clipboard."
          : "Select a location first to create a shareable link.",
        section: "Actions",
        Icon: Link2,
        keywords: "share link url copy",
      },
      {
        id: "action-save-site",
        label: "Save current site",
        description: data.geodata && data.siteScore
          ? "Save this location for comparison later."
          : "GeoSight needs the current analysis bundle before it can save the site.",
        section: "Actions",
        Icon: MapPinned,
        keywords: "save site shortlist compare",
      },
      {
        id: "action-toggle-rotate",
        label: state.globeRotateMode ? "Disable globe rotation" : "Enable globe rotation",
        description: "Switch between fixed and freely rotatable 3D globe exploration.",
        section: "Actions",
        Icon: Globe,
        keywords: "rotate globe 3d explore",
      },
      {
        id: "action-toggle-drive",
        label: state.driveMode ? "Exit drive mode" : "Enter drive mode",
        description: "Move through the landscape in first-person with the terrain-aware vehicle view.",
        section: "Actions",
        Icon: Car,
        keywords: "drive mode wasd vehicle terrain",
      },
      {
        id: "action-draw-area",
        label: "Start draw area tool",
        description: "Sketch a polygon study area on the globe.",
        section: "Actions",
        Icon: PenTool,
        keywords: "drawing polygon area tool",
      },
      {
        id: "action-drop-pin",
        label: "Start drop pin tool",
        description: "Place a labeled marker anywhere on the globe.",
        section: "Actions",
        Icon: MapPinned,
        keywords: "drawing marker pin tool",
      },
      {
        id: "action-measure-distance",
        label: "Start measure distance tool",
        description: "Measure a straight-line distance between two points.",
        section: "Actions",
        Icon: Ruler,
        keywords: "drawing measure ruler tool",
      },
      {
        id: "action-draw-radius",
        label: "Start radius tool",
        description: "Draw a radius circle from a center point.",
        section: "Actions",
        Icon: Route,
        keywords: "drawing circle radius buffer tool",
      },
      {
        id: "action-toggle-snap-grid",
        label: state.snapToGrid ? "Disable snap grid" : "Enable snap grid",
        description: "Snap the drawing cursor to the approximate 100 meter grid.",
        section: "Actions",
        Icon: Grid2x2,
        keywords: "snap grid drawing precision",
      },
      {
        id: "action-clear-drawings",
        label: "Clear drawn shapes",
        description:
          state.drawnShapes.length > 0
            ? `Remove all ${state.drawnShapes.length} drawn shapes from the globe.`
            : "No drawn shapes yet.",
        section: "Actions",
        Icon: X,
        keywords: "clear drawings shapes annotations",
      },
      {
        id: "action-toggle-capture-mode",
        label: captureMode ? "Exit topographic capture mode" : "Enter topographic capture mode",
        description: "Overlay analyst metadata for figure export and screenshot-ready map captures.",
        section: "Actions",
        Icon: FileText,
        keywords: "capture export screenshot topographic",
      },
      {
        id: "action-export-geojson",
        label: "Export GeoJSON",
        description: "Download drawn geometry for GIS handoff.",
        section: "Actions",
        Icon: Download,
        keywords: "geojson export shapes",
      },
      {
        id: "action-export-csv",
        label: "Export analysis tables",
        description: "Download site summary, quick-region, and drawing tables in one package.",
        section: "Actions",
        Icon: FileText,
        keywords: "csv export site summary tables quick regions drawings",
      },
      {
        id: "action-capture-png",
        label: "Capture PNG",
        description: "Export the active map frame as an analyst figure.",
        section: "Actions",
        Icon: FileText,
        keywords: "png screenshot capture map",
      },
      {
        id: "action-export-bundle",
        label: "Export analyst bundle",
        description: "Bundle GeoJSON, CSV, manifest, and the current figure into one handoff package.",
        section: "Actions",
        Icon: FileText,
        keywords: "zip bundle export manifest",
      },
    ];

    const quickRegionItems: WorkspaceCommandItem[] = state.quickRegions.map((region, index) => ({
      id: `quick-region-${index}-${region.name}`,
      label: region.name,
      description: region.secondaryLabel ?? "Jump to a nearby quick region.",
      section: "Quick regions",
      Icon: Map,
      keywords: `quick region nearby ${region.name} ${region.secondaryLabel ?? ""}`,
    }));

    const cardItems: WorkspaceCommandItem[] = data.cards.map((card) => ({
      id: `card-${card.id}`,
      label: card.title,
      description: card.summary,
      section: "Panels",
      Icon: Command,
      keywords: `${card.id} ${card.questionAnswered} ${card.category} ${card.summary}`,
    }));

    return [...actionItems, ...quickRegionItems, ...cardItems];
  }, [
    data.cards,
    data.geodata,
    data.reportLoading,
    data.siteScore,
    data.sites.length,
    state.driveMode,
    state.drawnShapes.length,
    state.globeRotateMode,
    state.locationReady,
    state.quickRegions,
    state.snapToGrid,
    captureMode,
  ]);

  const handleCommandPaletteSelect = useCallback(
    (item: WorkspaceCommandItem) => {
      if (item.id.startsWith("quick-region-")) {
        const region = state.quickRegions.find(
          (candidate, index) => `quick-region-${index}-${candidate.name}` === item.id,
        );

        if (region) {
          handleSelectRegion(region);
        }
        return;
      }

      if (item.id.startsWith("card-")) {
        const cardId = item.id.replace("card-", "") as WorkspaceCardId;
        const card = data.cards.find((candidate) => candidate.id === cardId);
        if (!card) {
          return;
        }

        if (card.zone === "primary") {
          data.setActivePrimaryCardId(card.id);
          if (data.shellMode === "minimal") {
            data.setShellMode("guided");
          }
          return;
        }

        openCard(card.id);
        return;
      }

      switch (item.id) {
        case "action-focused-mode":
          handleOpenGuidedMode();
          return;
        case "action-workspace-mode":
          handleOpenBoardMode();
          return;
        case "action-card-library":
          handleOpenLibraryMode();
          return;
        case "action-compare":
          openCard("compare");
          return;
        case "action-generate-report":
          handleGenerateReport();
          return;
        case "action-copy-link":
          if (state.locationReady) {
            handleCopyLink();
          }
          return;
        case "action-save-site":
          handleSaveCurrentSite();
          return;
        case "action-toggle-rotate":
          state.setGlobeRotateMode((current) => !current);
          return;
        case "action-toggle-drive":
          state.setDriveMode((current) => !current);
          return;
        case "action-draw-area":
          state.setDrawingTool("polygon");
          return;
        case "action-drop-pin":
          state.setDrawingTool("point");
          return;
        case "action-measure-distance":
          state.setDrawingTool("polyline");
          return;
        case "action-draw-radius":
          state.setDrawingTool("circle");
          return;
        case "action-toggle-snap-grid":
          state.setSnapToGrid((current) => !current);
          return;
        case "action-clear-drawings":
          state.setDrawnShapes([]);
          return;
        case "action-toggle-capture-mode":
          setCaptureMode((current) => !current);
          return;
        case "action-export-geojson":
          handleExportGeoJson();
          return;
        case "action-export-csv":
          void handleExportCsv();
          return;
        case "action-capture-png":
          void handleCapturePng();
          return;
        case "action-export-bundle":
          void handleExportBundle();
          return;
        default:
          return;
      }
    },
    [
      data,
      handleCopyLink,
      handleCapturePng,
      handleExportBundle,
      handleExportCsv,
      handleExportGeoJson,
      handleGenerateReport,
      handleOpenBoardMode,
      handleOpenGuidedMode,
      handleOpenLibraryMode,
      handleSaveCurrentSite,
      handleSelectRegion,
      openCard,
      state,
    ],
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
  const activeExplorerLens = state.activeLensId
    ? getExplorerLensById(state.activeLensId) ?? null
    : null;

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
    data.shellMode === "board" ||
    (activeExplorerLens && (state.locationReady || state.drawnGeometry.features.length > 0))
  );

  // Latch panel open during refetch — once shown, keep rendered until explicit reset
  const panelEverOpenedRef = useRef(false);
  useEffect(() => {
    if (rightPanelOpen) {
      panelEverOpenedRef.current = true;
    }
  }, [rightPanelOpen]);
  const showRightPanel = rightPanelOpen || panelEverOpenedRef.current;

  const analysisContextValue = useMemo(
    () => ({
      activeLens: state.activeLensId,
      location: {
        name: state.selectedLocationName,
        displayName: state.selectedLocationDisplayName,
        coordinates: state.locationReady ? state.selectedPoint : null,
      },
      geometry: state.drawnGeometry,
      selectedGeometryId: state.selectedShapeId,
      layers: state.layers,
      analysisResult: state.analysisResult,
      analysisInputMode: state.analysisInputMode,
      isLoading: state.analysisLoading,
      error: state.analysisError,
      drawingDraft: state.drawingDraft,
      setAnalysisInputMode: state.setAnalysisInputMode,
      setSelectedGeometryId: state.setSelectedShapeId,
    }),
    [
      state.activeLensId,
      state.analysisError,
      state.analysisInputMode,
      state.analysisLoading,
      state.analysisResult,
      state.drawnGeometry,
      state.drawingDraft,
      state.layers,
      state.locationReady,
      state.selectedLocationDisplayName,
      state.selectedLocationName,
      state.selectedPoint,
      state.selectedShapeId,
      state.setAnalysisInputMode,
      state.setSelectedShapeId,
    ],
  );

  // Card content rendered in right panel (desktop) or inline below globe (mobile)
  const rightPanelContent = (
    <div className="space-y-4 p-4">
      {activeExplorerLens ? (
        <AnalysisPanel
          lens={activeExplorerLens}
          location={{
            name: state.selectedLocationName,
            displayName: state.selectedLocationDisplayName,
          }}
          hasLocation={state.locationReady}
          geometry={state.drawnGeometry}
          analysisInputMode={state.analysisInputMode}
          onUseDrawnArea={() => {
            if (!state.selectedShapeId && state.drawnShapes.at(-1)?.id) {
              state.setSelectedShapeId(state.drawnShapes.at(-1)?.id ?? null);
            }
            state.setAnalysisInputMode("geometry");
          }}
          onUseLocation={() => state.setAnalysisInputMode("location")}
          analysisResult={state.analysisResult}
          isLoading={state.analysisLoading}
          error={state.analysisError}
        />
      ) : null}

      <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Evidence tray
        </div>
        <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
          Analysis panels support the active area of interest
        </div>
      </div>

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
            Supporting panel
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
                  Open evidence library
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
    <AnalysisProvider value={analysisContextValue}>
    <div className="flex flex-col xl:fixed xl:inset-0 xl:overflow-hidden bg-[var(--background)]">

      {/* ── Topbar ── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-3 py-2 xl:h-[52px] xl:py-0 xl:px-4" aria-label="GeoSight workspace header">
        {/* Mobile menu */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full xl:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Brand — compact wordmark */}
        <Link
          href="/"
          className="relative z-10 shrink-0 text-xs font-semibold text-[var(--muted-foreground)] transition-opacity hover:text-[var(--foreground)] hover:opacity-100 xl:text-sm"
          onClick={(e) => {
            if (state.drawnShapes.length > 0 && !window.confirm("Leave GeoSight? Your drawn shapes will not be saved.")) {
              e.preventDefault();
            }
          }}
        >
          GeoSight
        </Link>

        {/* Active profile / lens pill */}
        {inExplorer && state.activeLensId ? (() => {
          const lens = getExplorerLensById(state.activeLensId);
          return lens ? (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] pl-3 pr-1.5 py-1 text-xs text-[var(--accent-foreground)] cursor-default select-none xl:inline-flex">
              {lens.label}
              <button
                type="button"
                onClick={() => state.setActiveLensId(null)}
                className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-[color:var(--accent-strong)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                aria-label="Clear lens filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ) : null;
        })() : (
          <span className="hidden shrink-0 cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)] pointer-events-none xl:inline">
            {state.activeProfile.name}
          </span>
        )}

        {/* Search bar — flex-1 center */}
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
              if (result.kind === "current_location") {
                locationTracking.seedCurrentFix(result.coordinates);
              }
              state.selectPoint(
                result.coordinates,
                result.fullName ?? result.name,
                result.shortName,
              );
              data.handleLocationSelection();
            }}
          />
        </div>

        {/* Right cluster — reduced to 3 actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="hidden rounded-full lg:inline-flex"
            onClick={() => setCommandPaletteOpen(true)}
            title="Open workspace command palette (Ctrl+K)"
            aria-label="Open command palette"
          >
            <Command className="h-3.5 w-3.5" />
          </Button>
          <ModeSwitcher mode={state.appMode} onSetMode={state.setAppMode} />
          {state.locationReady ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={handleCopyLink}
              title="Copy shareable link"
              aria-label={copiedLink ? "Link copied" : "Copy shareable link"}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
            </Button>
          ) : null}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:overflow-hidden">

        {/* Left icon rail — desktop only */}
        <aside className="hidden w-14 shrink-0 flex-col items-center overflow-hidden border-r border-[color:var(--border-soft)] xl:flex" aria-label="Workspace tools">

          {/* Init error strip */}
          {state.initError ? (
            <div className="w-full shrink-0 border-b border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-2 py-1 text-[10px] text-[var(--danger-foreground)] text-center leading-4">
              !
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible py-3 scrollbar-thin">
            <WorkspaceToolRail
              shellMode={data.shellMode}
              viewMode={data.viewMode}
              drawingTool={state.drawingTool}
              snapToGrid={state.snapToGrid}
              drawCount={state.drawnShapes.length}
              exportBusy={exportBusy}
              captureMode={captureMode}
              figureTitle={captureFigure.title}
              figureSubtitle={captureFigure.subtitle}
              onOpenFocused={handleOpenGuidedMode}
              onOpenWorkspace={handleOpenBoardMode}
              onOpenLibrary={handleOpenLibraryMode}
              onOpenCompare={() => openCard("compare")}
              onSelectDrawingTool={state.setDrawingTool}
              onToggleSnapGrid={() => state.setSnapToGrid((value) => !value)}
              onClearDrawings={() => state.setDrawnShapes([])}
              onToggleCaptureMode={() => setCaptureMode((value) => !value)}
              onFigureTitleChange={(value) =>
                setCaptureFigure((current) => ({ ...current, title: value }))
              }
              onFigureSubtitleChange={(value) =>
                setCaptureFigure((current) => ({ ...current, subtitle: value }))
              }
              onExportGeoJson={handleExportGeoJson}
              onExportCsv={() => {
                void handleExportCsv();
              }}
              onCapturePng={() => {
                void handleCapturePng();
              }}
              onExportBundle={() => {
                void handleExportBundle();
              }}
            />
          </div>

        </aside>

        {/* Globe area */}
        <main ref={globeAreaRef} className="relative min-h-[55vw] max-h-[55vh] flex-1 xl:max-h-none xl:min-h-0" aria-label="3D globe and map tools">
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
                selectedShapeId={state.selectedShapeId}
                onSelectShape={state.setSelectedShapeId}
                onDraftStateChange={state.setDrawingDraft}
                undoDraftNonce={state.undoDraftNonce}
                completeDrawingNonce={state.completeDrawingNonce}
                snapToGrid={state.snapToGrid}
                captureMode={captureOverlayVisible}
                userLocationFix={locationTracking.currentFix}
                followUser={locationTracking.isFollowing}
                recordedRoute={locationTracking.recordedRoute}
                onGlobeApiChange={handleGlobeApiChange}
                onOverlayMetersPerPixelChange={setOverlayMetersPerPixel}
              />
            </div>
          </ClientErrorBoundary>

          {/* Globe controls — unified bottom-right pill cluster */}
          <div className="absolute bottom-12 right-4 z-20 flex flex-col overflow-hidden rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] shadow-[var(--shadow-panel)] backdrop-blur-xl">
            <button
              type="button"
              aria-pressed={state.globeRotateMode}
              aria-label={state.globeRotateMode ? "Disable 3D rotate" : "Enable 3D rotate"}
              title={state.globeRotateMode ? "Disable 3D rotate" : "Enable 3D rotate"}
              onClick={() => state.setGlobeRotateMode((current) => !current)}
              className={cn(
                "flex h-11 w-11 items-center justify-center transition duration-150",
                state.globeRotateMode
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
              )}
            >
              <Globe className="h-4 w-4" />
            </button>
            <div className="h-px bg-[color:var(--border-soft)]" />
            <button
              type="button"
              aria-pressed={state.driveMode}
              aria-label={state.driveMode ? "Exit drive mode" : "Enter drive mode"}
              title={state.driveMode ? "Exit drive mode" : "Enter drive mode (WASD)"}
              onClick={() => state.setDriveMode((current) => !current)}
              className={cn(
                "flex h-11 w-11 items-center justify-center transition duration-150",
                state.driveMode
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
              )}
            >
              <Car className="h-4 w-4" />
            </button>
            <div className="h-px bg-[color:var(--border-soft)]" />
            <button
              type="button"
              aria-pressed={locationPanelOpen}
              aria-label={locationPanelOpen ? "Hide location tracking" : "Show location tracking"}
              title="Live location tracking"
              onClick={() => setLocationPanelOpen((v) => !v)}
              className={cn(
                "flex h-11 w-11 items-center justify-center transition duration-150",
                locationPanelOpen
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
              )}
            >
              <MapPinned className="h-4 w-4" />
            </button>
          </div>

          {locationPanelOpen ? (
            <LocationTrackingControls
              currentFix={locationTracking.currentFix}
              locateError={locationTracking.locateError}
              isLocating={locationTracking.isLocating}
              isFollowing={locationTracking.isFollowing}
              isRecording={locationTracking.isRecording}
              recordingSnapshot={locationTracking.recordingSnapshot}
              onLocateOnce={handleLocateOnce}
              onStartFollowing={handleStartFollowing}
              onStopFollowing={locationTracking.stopFollowing}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onDismissError={locationTracking.clearLocateError}
              onClose={() => setLocationPanelOpen(false)}
            />
          ) : null}

          <DataLayers
            layers={state.layers}
            onChange={state.setLayers}
            globeViewMode={state.globeViewMode}
            onChangeGlobeViewMode={state.setGlobeViewMode}
            overlayMetersPerPixel={overlayMetersPerPixel}
          />
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
          {captureOverlayVisible ? (
            <TopographicCaptureOverlay
              locationName={state.selectedLocationName}
              selectedPoint={state.selectedPoint}
              selectedRegionName={state.selectedRegion.name}
              profile={state.activeProfile}
              globeView={captureViewSnapshot}
              terrainExaggeration={state.terrainExaggeration}
              activeLayerLabels={activeLayerLabels}
              figure={captureFigure}
              drawnShapeCount={state.drawnShapes.length}
              savedSiteCount={data.sites.length}
            />
          ) : null}

          <AoiDrawingToolbar
            drawingTool={state.drawingTool}
            onSelectTool={state.setDrawingTool}
            drawnShapes={state.drawnShapes}
            selectedShapeId={state.selectedShapeId}
            onSelectShape={state.setSelectedShapeId}
            onClearAll={() => state.setDrawnShapes([])}
            onDeleteShape={state.removeDrawnShape}
            canUndoHistory={state.canUndo}
            canRedo={state.canRedo}
            onUndoHistory={state.undoDrawing}
            onRedo={state.redoDrawing}
            onRenameShape={state.renameShape}
            onExportGeoJSON={handleExportGeoJson}
            snapToGrid={state.snapToGrid}
            onToggleSnapToGrid={() => state.setSnapToGrid((v) => !v)}
            draftState={state.drawingDraft}
            onUndoDraft={state.requestUndoDraftVertex}
            onCompleteDraft={state.requestCompleteDrawing}
          />

          {/* Map callout — appears on point select, hides when right panel opens */}
          {(state.locationReady || data.loading) && !showRightPanel && !calloutDismissed ? (
            <MapCallout
              geodata={data.geodata}
              score={data.siteScore}
              profile={state.activeProfile}
              locationName={state.selectedLocationName}
              loading={data.loading}
              pendingCoords={state.selectedPoint}
              onOpenAnalysis={() => {
                const firstCard = data.primaryCards[0];
                if (firstCard) data.setActivePrimaryCardId(firstCard.id);
              }}
              onDismiss={() => setCalloutDismissed(true)}
            />
          ) : null}

          {/* Coord readout — click to copy */}
          {state.selectedPoint ? (
            <button
              type="button"
              title="Copy coordinates to clipboard"
              className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              onClick={() => {
                const text = `${state.selectedPoint!.lat.toFixed(5)}, ${state.selectedPoint!.lng.toFixed(5)}`;
                void navigator.clipboard.writeText(text).then(() => {
                  setCopiedCoords(true);
                  setTimeout(() => setCopiedCoords(false), 1500);
                });
              }}
            >
              {state.selectedPoint.lat.toFixed(5)}, {state.selectedPoint.lng.toFixed(5)}
              {copiedCoords ? <Check className="h-3 w-3 text-[var(--accent)]" /> : <Copy className="h-3 w-3" />}
            </button>
          ) : null}
        </main>

        {/* Right panel — slide-in overlay on desktop, inline on mobile */}
        {/* Mobile: renders below globe */}
        {showRightPanel ? (
          <aside className="flex flex-col border-t border-[color:var(--border-soft)] xl:hidden" aria-label="Analysis cards and workspace panels">
            <CardDisplayProvider value={{ defaultCollapsed: true }}>
              {rightPanelContent}
            </CardDisplayProvider>
          </aside>
        ) : null}

        {/* Desktop: fixed right slide-in panel */}
        <aside
          className={cn(
            "hidden xl:flex xl:flex-col xl:fixed xl:inset-y-[52px] xl:right-0 xl:w-[380px] xl:overflow-y-auto xl:border-l xl:border-[color:var(--border-soft)] xl:bg-[var(--surface-overlay)] xl:backdrop-blur-xl xl:shadow-[var(--shadow-panel)] xl:z-30",
            "xl:transition-transform xl:duration-300 xl:ease-out",
            showRightPanel ? "xl:translate-x-0" : "xl:translate-x-full",
          )}
          aria-label="Analysis cards and workspace panels"
          aria-hidden={!showRightPanel}
        >
          <CardDisplayProvider value={{ defaultCollapsed: true }}>
            {rightPanelContent}
          </CardDisplayProvider>
        </aside>

        {/* Pull handle — appears when panel is closed and there is content to show */}
        {!showRightPanel && (
          <button
            type="button"
            className="hidden xl:flex fixed right-0 top-1/2 z-30 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-l-xl border border-r-0 border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-1.5 py-4 backdrop-blur-xl shadow-[var(--shadow-soft)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
            title="Open analysis panels"
            aria-label="Open analysis panels"
            onClick={() => {
              const firstCard = data.primaryCards[0];
              if (firstCard) data.setActivePrimaryCardId(firstCard.id);
            }}
          >
            <div className="h-4 w-0.5 rounded-full bg-current opacity-40" />
            <div className="h-4 w-0.5 rounded-full bg-current opacity-40" />
          </button>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <footer
        className="flex shrink-0 flex-col gap-2 border-t border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-3 py-2 xl:h-[56px] xl:flex-row xl:items-center xl:gap-3 xl:px-4 xl:py-0"
        aria-label="Workspace actions and persistent AI input"
      >
        {/* Analysis banner — compact */}
        <div className="min-w-0 flex-1 xl:max-w-[26rem]">
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
            <span className="text-xs text-[var(--muted-foreground)]">
              Search a place to begin
            </span>
          )}
        </div>

        {/* AI pill — collapsed by default, expands on click */}
        <div className="flex shrink-0 items-center justify-center">
          <PersistentAiBar
            disabled={!state.locationReady}
            onSubmit={handlePersistentQuestionSubmit}
          />
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2 self-end xl:self-auto">
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
              {data.reportLoading ? "Generating…" : "Report"}
            </span>
            <span className="sm:hidden">Report</span>
          </Button>
        </div>
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

      <WorkspaceCommandPalette
        open={commandPaletteOpen}
        items={commandPaletteItems}
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={handleCommandPaletteSelect}
      />

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
                Focus
              </Button>
              <Button type="button" size="sm" variant={data.shellMode === "board" && data.viewMode === "board" ? "default" : "ghost"} className="rounded-full" onClick={() => { handleOpenBoardMode(); setSidebarOpen(false); }}>
                Evidence
              </Button>
              <Button type="button" size="sm" variant={data.shellMode === "board" && data.viewMode === "library" ? "default" : "ghost"} className="rounded-full" onClick={() => { handleOpenLibraryMode(); setSidebarOpen(false); }}>
                Panels
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
    </AnalysisProvider>
  );
}
