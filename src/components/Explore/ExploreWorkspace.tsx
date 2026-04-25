"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toPng } from "html-to-image";
import {
  BookOpen,
  ChevronLeft,
  Columns2,
  Command,
  Crosshair,
  Settings,
  Download,
  Loader2,
  FileText,
  Globe,
  Grid2x2,
  HelpCircle,
  Keyboard,
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
  ScanSearch,
  Sparkles,
  X,
} from "lucide-react";
import { AddViewTray } from "@/components/Explore/AddViewTray";
import { DemoRunner } from "@/components/Demo/DemoRunner";
import { MobileChrome } from "@/components/Mobile/MobileChrome";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import { AnalysisOverviewBanner } from "@/components/Explore/AnalysisOverviewBanner";
import { AttributeTable } from "@/components/Explore/AttributeTable";
import { PrintLayout } from "@/components/Explore/PrintLayout";
import { TopographicCaptureOverlay } from "@/components/Explore/TopographicCaptureOverlay";
import { WalkthroughOverlay } from "@/components/Explore/WalkthroughOverlay";
import {
  WorkspaceCommandItem,
  WorkspaceCommandPalette,
} from "@/components/Explore/WorkspaceCommandPalette";
import { WorkspaceToolRail } from "@/components/Explore/WorkspaceToolRail";
import { FileDropZone, type FileDropZoneHandle } from "@/components/Globe/FileDropZone";
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
import { FeatureInspectorPanel } from "@/components/Globe/FeatureInspectorPanel";
import { GoToCoordinateDialog } from "@/components/Globe/GoToCoordinateDialog";
import { GlobeViewSelector } from "@/components/Globe/GlobeViewSelector";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { KeyboardShortcuts } from "@/components/Shell/KeyboardShortcuts";
import { ModeSwitcher } from "@/components/Shell/ModeSwitcher";
import { SettingsPanel } from "@/components/Shell/SettingsPanel";
import { ToolReferenceSheet } from "@/components/Shell/ToolReferenceSheet";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { isExplorerMode } from "@/lib/app-mode";
import { WALKTHROUGH_STEPS } from "@/lib/demos/walkthrough";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import { toLensParam } from "@/lib/lenses";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { GlobeErrorBoundary } from "@/components/Globe/GlobeErrorBoundary";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useExploreData } from "@/hooks/useExploreData";
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
import type { ImportedLayer } from "@/lib/file-import";
import {
  deserializeProject,
  downloadProject,
  loadProjectFromFile,
  serializeProject,
  type GeoSightProject,
} from "@/lib/project";
import { PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import {
  CaptureFigureOptions,
  DrawnShape,
  GlobeViewSnapshot,
  RegionSelection,
  WorkspaceCardId,
} from "@/types";
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

const MapLibreMap = dynamic(
  () =>
    import("@/components/Globe/MapLibreMap").then((mod) => mod.MapLibreMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--surface-panel)] text-[var(--muted-foreground)]">
        Loading 2D map...
      </div>
    ),
  },
);

const BOARD_MODE_NOTICE_STORAGE_KEY = "geosight-board-mode-notice-shown";
const WALKTHROUGH_STORAGE_KEY = "geosight-explore-walkthrough-seen";
const AUTOSAVE_STORAGE_KEY = "geosight.autosave.v1";
const AUTOSAVE_DEBOUNCE_MS = 2_000;
const AUTOSAVE_MAX_IMPORTED_LAYER_BYTES = 5 * 1024 * 1024;

function isTypingContext(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function locationsRoughlyMatch(
  project: GeoSightProject,
  point: { lat: number; lng: number },
  locationName: string,
) {
  const latDiff = Math.abs(project.location.lat - point.lat);
  const lngDiff = Math.abs(project.location.lng - point.lng);
  const sameCoordinates = latDiff < 0.0005 && lngDiff < 0.0005;
  const sameName =
    project.location.name.trim().toLowerCase() === locationName.trim().toLowerCase();

  return sameCoordinates || sameName;
}

export function ExploreWorkspace() {
  const init = useExploreInit();
  const { setGeoContext, setUiContext, primeAgent, setPanelOpen: setAgentPanelOpen, registerOpenChat } = useAgentPanel();
  const state = useExploreState(init);
  const data = useExploreData({ state, setGeoContext });
  const inExplorer = isExplorerMode(state.appMode);
  const {
    addSite,
    closeCard,
    generateReport,
    geodata,
    handleLocationSelection,
    loading,
    openAdvancedBoard,
    openCard: openWorkspaceCard,
    openCardFromTray,
    openLibrary,
    setCardVisible,
    setShellMode,
    setViewMode,
    siteScore,
    sites,
    visibility,
  } = data;
  const {
    activeProfile,
    addDrawnShape,
    addImportedLayer,
    addCustomLayer,
    customLayers,
    drawingTool,
    featureInspectMode,
    goToCoordsOpen,
    identifyResult,
    importedLayers,
    locationReady,
    moveCustomLayer,
    removeCustomLayer,
    selectPoint: selectWorkspacePoint,
    selectedLocationName,
    selectedPoint,
    selectedRegion,
    setActiveProfile,
    setActiveImportedLayerId,
    setActiveLensId,
    setCustomLayerOpacity,
    setDrawingTool,
    setFeatureInspectMode,
    setGoToCoordsOpen,
    setIdentifyResult,
    setSelectedImportedFeatureId,
    setSelectedRegion,
    toggleCustomLayer,
  } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [toolReferenceOpen, setToolReferenceOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [printLayoutOpen, setPrintLayoutOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [activeDemoScenario, setActiveDemoScenario] = useState(() =>
    state.init.demoScenarioId
      ? DEMO_SCENARIOS.find((s) => s.id === state.init.demoScenarioId) ?? null
      : null,
  );
  const [captureOverlayArmed, setCaptureOverlayArmed] = useState(false);
  const [captureViewSnapshot, setCaptureViewSnapshot] = useState<GlobeViewSnapshot | null>(null);
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
  const fileDropZoneRef = useRef<FileDropZoneHandle | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const rightPanelContentRef = useRef<HTMLDivElement | null>(null);
  const autosaveBannerCheckedRef = useRef(false);
  const globeApiRef = useRef<{
    getViewSnapshot: () => GlobeViewSnapshot | null;
    requestRender: () => void;
    flyToBounds: (bounds: [number, number, number, number]) => void;
    flyToPoint: (point: { lat: number; lng: number }, region: RegionSelection) => void;
  } | null>(null);

  const captureOverlayVisible = captureMode || captureOverlayArmed;

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
  const [restoreAutosaveProject, setRestoreAutosaveProject] = useState<GeoSightProject | null>(null);

  useEffect(() => {
    if (!workspaceNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setWorkspaceNotice(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [workspaceNotice]);

  const dismissWalkthrough = useCallback(() => {
    setWalkthroughOpen(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === "true") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setWalkthroughOpen(true);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, []);

  const handleSaveCurrentSite = useCallback(() => {
    if (!geodata || !siteScore) {
      return;
    }

    addSite({
      id: crypto.randomUUID(),
      name: `${activeProfile.name} Site ${sites.length + 1}`,
      regionName: selectedLocationName,
      profileId: activeProfile.id,
      coordinates: selectedPoint,
      geodata,
      score: siteScore,
    });

    setWorkspaceNotice({
      tone: "info",
      message: `${selectedLocationName} saved.`,
    });
  }, [
    activeProfile.id,
    activeProfile.name,
    addSite,
    geodata,
    selectedLocationName,
    selectedPoint,
    siteScore,
    sites.length,
  ]);

  const handleOpenGuidedMode = useCallback(() => {
    if (!locationReady) {
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
  }, [locationReady, setShellMode, setViewMode]);

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
      if (!visibility[cardId]) {
        setCardVisible(cardId, true);
      }
      openWorkspaceCard(cardId);
      setViewMode("board");
      return;
    }

    // workspace-zone cards only render inside the board panel — auto-switch so
    // buttons like "Why score" work regardless of the current shell mode
    const card = data.cards.find((c) => c.id === cardId);
    if (card?.zone === "workspace") {
      setShellMode("board");
      setViewMode("board");
      if (!visibility[cardId]) {
        setCardVisible(cardId, true);
      }
      openWorkspaceCard(cardId);
      return;
    }

    openCardFromTray(cardId);
  }, [
    data.cards,
    data.shellMode,
    openCardFromTray,
    openWorkspaceCard,
    setCardVisible,
    setShellMode,
    setViewMode,
    visibility,
  ]);

  // Register so the floating "Ask GeoSight" button in AgentPanel opens the
  // real Cerebras-backed chat card instead of the deterministic geo-analyst agent.
  // "chat" is a primary-zone card so it needs setActivePrimaryCardId, not openCard.
  useEffect(() => {
    registerOpenChat(() => {
      data.setActivePrimaryCardId("chat");
      if (data.shellMode === "minimal") setShellMode("guided");
    });
  }, [registerOpenChat, data.setActivePrimaryCardId, data.shellMode, setShellMode]);

  const resultsHeader = (
    <div data-demo-id="demo-nearby">
      <ResultsModeToggle mode={state.resultsMode} onChange={state.setResultsMode} />
    </div>
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
    (region: RegionSelection) => {
      const regionLabel =
        activeProfile.id === "home-buying"
          ? region.secondaryLabel?.split(" · ")[0] ?? region.name
          : region.name;
      setSelectedRegion(region);
      selectWorkspacePoint(region.center, regionLabel, regionLabel);
      handleLocationSelection();
    },
    [
      activeProfile.id,
      handleLocationSelection,
      selectWorkspacePoint,
      setSelectedRegion,
    ],
  );

  const handleGenerateReport = useCallback(() => {
    if (!geodata) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Select a location first to generate a report.",
      });
      return;
    }

    if (loading) {
      setWorkspaceNotice({
        tone: "warning",
        message: "Analysis still loading — try again shortly.",
      });
      return;
    }

    primeAgent("geo-scribe", reportPrompt);
    void generateReport();
  }, [generateReport, geodata, loading, primeAgent, reportPrompt]);

  const handleGlobeApiChange = useCallback((api: {
    getViewSnapshot: () => GlobeViewSnapshot | null;
    requestRender: () => void;
    flyToBounds: (bounds: [number, number, number, number]) => void;
    flyToPoint: (point: { lat: number; lng: number }, region: RegionSelection) => void;
  } | null) => {
    globeApiRef.current = api;
  }, []);

  const handleShapeComplete = useCallback((shape: DrawnShape) => {
    addDrawnShape(shape);
    if (shape.type !== "marker") {
      setDrawingTool("none");
    }
  }, [addDrawnShape, setDrawingTool]);

  const handleOpenImport = useCallback(() => {
    fileDropZoneRef.current?.openFilePicker();
  }, []);

  const handleImportedLayer = useCallback((layer: ImportedLayer) => {
    addImportedLayer(layer);
    setWorkspaceNotice({
      tone: "info",
      message: `Imported ${layer.name} (${layer.features.features.length} features).`,
    });
  }, [addImportedLayer]);

  const buildSerializableProject = useCallback(
    (importedLayersOverride?: ImportedLayer[]) =>
      serializeProject({
        selectedPoint: state.selectedPoint,
        selectedLocationName: state.selectedLocationName,
        activeProfileId: state.activeProfile.id,
        activeLensId: state.activeLensId,
        appMode: state.appMode,
        drawnShapes: state.drawnShapes,
        openCardIds: data.openCardIds,
        wmsLayers: state.wmsLayers,
        importedLayers: importedLayersOverride ?? state.importedLayers,
        layers: state.layers,
        globeViewMode: state.globeViewMode,
      }),
    [
      data.openCardIds,
      state.activeLensId,
      state.activeProfile.id,
      state.appMode,
      state.drawnShapes,
      state.globeViewMode,
      state.importedLayers,
      state.layers,
      state.selectedLocationName,
      state.selectedPoint,
      state.wmsLayers,
    ],
  );

  const buildAutosaveProject = useCallback(() => {
    const serializedImportedLayers = JSON.stringify(
      state.importedLayers.map((layer) => ({
        name: layer.name,
        format: layer.format,
        features: layer.features,
        style: {
          color: layer.style.color,
          opacity: layer.style.opacity,
          weight: layer.style.weight,
          fillOpacity: layer.style.fillOpacity,
          filled: layer.style.filled,
        },
        visible: layer.visible,
      })),
    );
    const importedLayerBytes = new Blob([serializedImportedLayers]).size;

    return buildSerializableProject(
      importedLayerBytes > AUTOSAVE_MAX_IMPORTED_LAYER_BYTES ? [] : state.importedLayers,
    );
  }, [buildSerializableProject, state.importedLayers]);

  const applyLoadedProject = useCallback(
    (project: GeoSightProject) => {
      const restored = deserializeProject(project);

      state.applyProjectState({
        appMode: restored.appMode,
        activeProfileId: restored.activeProfileId,
        activeLensId: restored.activeLensId,
        selectedPoint: restored.selectedPoint,
        selectedLocationName: restored.selectedLocationName,
        selectedLocationDisplayName: restored.selectedLocationName,
        layers: restored.layers,
        globeViewMode: restored.globeViewMode,
        drawnShapes: restored.drawnShapes,
        importedLayers: restored.importedLayers,
        wmsLayers: restored.wmsLayers,
      });

      for (const cardId of data.openCardIds) {
        closeCard(cardId);
      }

      for (const cardId of restored.openCardIds) {
        if (!visibility[cardId]) {
          setCardVisible(cardId, true);
        }
        openWorkspaceCard(cardId);
      }

      if (restored.openCardIds.length > 0) {
        setShellMode("board");
        setViewMode("board");
      }

      setRestoreAutosaveProject(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(project));
      }
      setWorkspaceNotice({
        tone: "info",
        message: `Loaded project: ${restored.selectedLocationName}.`,
      });
    },
    [
      closeCard,
      data.openCardIds,
      openWorkspaceCard,
      setCardVisible,
      setShellMode,
      setViewMode,
      state,
      visibility,
    ],
  );

  const handleSaveProject = useCallback(() => {
    const project = buildSerializableProject();
    downloadProject(project);
    setWorkspaceNotice({
      tone: "info",
      message: `Saved project for ${project.location.name}.`,
    });
  }, [buildSerializableProject]);

  const handleOpenProjectFile = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleLoadProjectFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const project = await loadProjectFromFile(file);
        applyLoadedProject(project);
      } catch (error) {
        setWorkspaceNotice({
          tone: "warning",
          message:
            error instanceof Error
              ? error.message
              : "The selected project could not be loaded.",
        });
      } finally {
        event.target.value = "";
      }
    },
    [applyLoadedProject],
  );

  const activeImportedLayer = useMemo(
    () =>
      importedLayers.find((layer) => layer.id === state.activeImportedLayerId) ??
      importedLayers[0] ??
      null,
    [importedLayers, state.activeImportedLayerId],
  );

  const attributeTableOpen = data.openCardIds.includes("attribute-table");
  const stackedOpenBoardCards = useMemo(
    () => data.openBoardCards.filter((card) => card.id !== "attribute-table"),
    [data.openBoardCards],
  );

  const handleOpenImportedLayerTable = useCallback(
    (layer: ImportedLayer) => {
      setActiveImportedLayerId(layer.id);
      setSelectedImportedFeatureId(null);
      openCard("attribute-table");
    },
    [openCard, setActiveImportedLayerId, setSelectedImportedFeatureId],
  );

  const handleCloseAttributeTable = useCallback(() => {
    closeCard("attribute-table");
    setSelectedImportedFeatureId(null);
  }, [closeCard, setSelectedImportedFeatureId]);

  useEffect(() => {
    if (typeof window === "undefined" || !state.locationReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          JSON.stringify(buildAutosaveProject()),
        );
      } catch {
        // Ignore quota / serialization failures so the workspace stays responsive.
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [
    buildAutosaveProject,
    data.openCardIds,
    state.drawnShapes,
    state.globeViewMode,
    state.importedLayers,
    state.layers,
    state.locationReady,
    state.selectedPoint,
    state.wmsLayers,
  ]);

  useEffect(() => {
    if (
      autosaveBannerCheckedRef.current ||
      typeof window === "undefined" ||
      !state.locationReady ||
      state.initStatus === "resolving"
    ) {
      return;
    }

    autosaveBannerCheckedRef.current = true;
    const stored = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as GeoSightProject;
      if (locationsRoughlyMatch(parsed, state.selectedPoint, state.selectedLocationName)) {
        setRestoreAutosaveProject(parsed);
      }
    } catch {
      window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    }
  }, [
    state.initStatus,
    state.locationReady,
    state.selectedLocationName,
    state.selectedPoint,
  ]);

  const handleAcceptAutosaveRestore = useCallback(() => {
    if (!restoreAutosaveProject) {
      return;
    }

    applyLoadedProject(restoreAutosaveProject);
  }, [applyLoadedProject, restoreAutosaveProject]);

  const handleDismissAutosaveRestore = useCallback(() => {
    setRestoreAutosaveProject(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setGoToCoordsOpen(true);
        return;
      }

      const tag = (event.target as HTMLElement)?.tagName;
      if (event.key.toLowerCase() === "i" && tag !== "INPUT" && tag !== "TEXTAREA") {
        setFeatureInspectMode((v) => !v);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (activeDemoScenario) {
          setActiveDemoScenario(null);
          return;
        }

        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }

        if (keyboardShortcutsOpen) {
          setKeyboardShortcutsOpen(false);
          return;
        }

        if (toolReferenceOpen) {
          setToolReferenceOpen(false);
          return;
        }

        if (settingsPanelOpen) {
          setSettingsPanelOpen(false);
          return;
        }

        if (walkthroughOpen) {
          dismissWalkthrough();
          return;
        }

        if (printLayoutOpen) {
          setPrintLayoutOpen(false);
          return;
        }

        if (attributeTableOpen) {
          handleCloseAttributeTable();
          return;
        }

        if (layersPanelOpen) {
          setLayersPanelOpen(false);
          return;
        }

        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }

        if (drawingTool !== "none") {
          setDrawingTool("none");
        }
        return;
      }

      if (isTypingContext(event.target)) {
        return;
      }

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setKeyboardShortcutsOpen(true);
        return;
      }

      // Undo / redo drawn shapes — Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          state.redoDrawing();
        } else {
          state.undoDrawing();
        }
        return;
      }

      if (event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      if (/^[1-5]$/.test(event.key)) {
        const profileIndex = Number.parseInt(event.key, 10) - 1;
        const nextProfile = PROFILES[profileIndex];
        if (!nextProfile) {
          return;
        }

        event.preventDefault();
        setActiveProfile(nextProfile);
        setActiveLensId(toLensParam(nextProfile.id) ?? null);
        return;
      }

      switch (event.key.toLowerCase()) {
        case "d":
          event.preventDefault();
          setDrawingTool((current) => (current === "none" ? "polygon" : "none"));
          return;
        case "l":
          event.preventDefault();
          setLayersPanelOpen((current) => !current);
          return;
        case "m":
          event.preventDefault();
          setDrawingTool((current) => (current === "measure" ? "none" : "measure"));
          return;
        case "f":
          event.preventDefault();
          if (locationReady) {
            globeApiRef.current?.flyToPoint(selectedPoint, selectedRegion);
          }
          return;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attributeTableOpen,
    commandPaletteOpen,
    dismissWalkthrough,
    handleCloseAttributeTable,
    keyboardShortcutsOpen,
    layersPanelOpen,
    printLayoutOpen,
    sidebarOpen,
    drawingTool,
    locationReady,
    selectedPoint,
    selectedRegion,
    setActiveProfile,
    setActiveLensId,
    setDrawingTool,
    state.undoDrawing,
    state.redoDrawing,
    walkthroughOpen,
    activeDemoScenario,
  ]);

  // Push a history entry when the demo starts so the browser Back button
  // dismisses the tour instead of navigating away from /explore.
  useEffect(() => {
    if (activeDemoScenario) {
      window.history.pushState({ demoActive: true }, "");
      const onPopState = () => setActiveDemoScenario(null);
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [activeDemoScenario]);

  const visibleUiCardIds = useMemo(
    () =>
      data.shellMode === "board"
        ? data.boardCards.map((card) => card.id)
        : data.openBoardCards.map((card) => card.id),
    [data.openBoardCards, data.boardCards, data.shellMode],
  );

  const activeLayerLabels = useMemo(() => {
    const labels: string[] = [];
    if (state.layers.water) labels.push("Water bodies");
    if (state.layers.power) labels.push("Power");
    if (state.layers.roads) labels.push("Roads");
    if (state.layers.heatmap) labels.push("Elevation heat");
    const visibleWmsLayers = state.wmsLayers.filter((layer) => layer.visible ?? true);
    if (visibleWmsLayers.length > 0) {
      labels.push(`Map services: ${visibleWmsLayers.map((layer) => layer.name).join(", ")}`);
    }
    const visibleImportedLayers = state.importedLayers.filter((layer) => layer.visible);
    if (visibleImportedLayers.length > 0) {
      labels.push(`Imported: ${visibleImportedLayers.map((layer) => layer.name).join(", ")}`);
    }
    labels.push(`Basemap: ${state.globeViewMode}`);
    return labels;
  }, [
    state.globeViewMode,
    state.importedLayers,
    state.layers.heatmap,
    state.layers.power,
    state.layers.roads,
    state.layers.water,
    state.wmsLayers,
  ]);

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
          ...state.layers,
          globeViewMode: state.globeViewMode,
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
        id: "action-keyboard-shortcuts",
        label: "Show keyboard shortcuts",
        description: "Review navigation, lens, and workspace hotkeys.",
        section: "Actions",
        Icon: Keyboard,
        keywords: "keyboard shortcuts hotkeys help",
      },
      {
        id: "action-start-walkthrough",
        label: "Start guided walkthrough",
        description: "Highlight the key workspace controls step by step.",
        section: "Actions",
        Icon: Sparkles,
        keywords: "walkthrough onboarding guided tour",
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
      // Drive mode hidden — not demo-ready
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
        case "action-keyboard-shortcuts":
          setKeyboardShortcutsOpen(true);
          return;
        case "action-start-walkthrough":
          setWalkthroughOpen(true);
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
          state.setDrawingTool("marker");
          return;
        case "action-measure-distance":
          state.setDrawingTool("measure");
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
        setActiveProfile(profile);
        setActiveLensId(toLensParam(profile.id) ?? null);
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
    stackedOpenBoardCards.length > 0 ||
    attributeTableOpen ||
    data.shellMode === "board"
  );

  // Card content rendered in right panel (desktop) or inline below globe (mobile)
  const rightPanelContent = (
    <div ref={rightPanelContentRef} className="space-y-4 p-4">
      <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
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

      {/* First-run loading status */}
      {data.loading && !data.geodata && state.locationReady && (
        <div
          className="flex flex-col gap-3 rounded-2xl border p-5"
          style={{ background: "var(--surface-panel)", borderColor: "var(--border-soft)" }}
        >
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Pulling live data for {state.selectedLocationName}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Fetching terrain, hazard, climate, and infrastructure signals from 40+ sources.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Terrain", "Flood zones", "Air quality", "Climate", "Broadband"].map((label) => (
              <span
                key={label}
                className="animate-pulse rounded-full border px-2.5 py-0.5 text-xs"
                style={{
                  background: "var(--surface-soft)",
                  borderColor: "var(--border-soft)",
                  color: "var(--muted-foreground)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Primary panel */}
      {data.activePrimaryCard ? (
        <div id="primary-card-active-location">
          <ExplorePrimaryPanel
            cardId={data.activePrimaryCard.id}
            state={state}
            data={data}
            headerContent={resultsHeader}
            onSaveCurrentSite={handleSaveCurrentSite}
            onOpenCard={openCard}
          />
        </div>
      ) : null}

      {/* Open workspace cards (guided mode) */}
      {data.shellMode !== "board" && stackedOpenBoardCards.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            Supporting panel
          </div>
          {stackedOpenBoardCards.map((card) => (
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
            {stackedOpenBoardCards.length > 0 ? (
              <div className="space-y-4">
                {stackedOpenBoardCards.map((card) => (
                  <ExploreWorkspacePanel
                    key={card.id}
                    cardId={card.id}
                    state={state}
                    data={data}
                    onOpenCard={openCard}
                  />
                ))}
              </div>
            ) : attributeTableOpen ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--muted-foreground)]">
                Attribute table is docked below the globe.
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--background)]">

      {/* ── Topbar (desktop only) ── */}
      <header className="hidden shrink-0 items-center gap-3 border-b border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-4 py-3 lg:flex xl:h-[52px] xl:py-0" aria-label="GeoSight workspace header">
        {/* Mobile menu */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full xl:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          data-walkthrough="lens-selector"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Back to landing */}
        <Link
          href="/"
          aria-label="Back to landing"
          className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 text-xs text-[var(--foreground-soft)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        {/* Brand */}
        <Link href="/" className="shrink-0 text-sm font-semibold text-[var(--foreground)] transition-opacity hover:opacity-70">GeoSight</Link>

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
                className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-[color:var(--accent-strong)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                aria-label="Clear lens filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ) : null;
        })()}

        {/* Search bar — centered, flex-1 */}
        <div className="min-w-0 flex-1" data-walkthrough="search-bar">
          <SearchBar
            compact
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
          {/* GIS analyst tools */}
          <button
            type="button"
            onClick={() => setFeatureInspectMode((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition cursor-pointer ${featureInspectMode ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"}`}
            aria-label={featureInspectMode ? "Exit identify mode" : "Identify features (I)"}
            title="Identify features (I)"
          >
            <ScanSearch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Identify</span>
          </button>
          <button
            type="button"
            onClick={() => setGoToCoordsOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] cursor-pointer"
            aria-label="Go to coordinates (Ctrl+G)"
            title="Go to coordinates (Ctrl+G)"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Go to</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsPanelOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            aria-label="Open settings"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            aria-label="Start guided tour"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Tour
          </button>
          <button
            type="button"
            onClick={() => setToolReferenceOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            aria-label="Open tool reference"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Reference
          </button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="hidden rounded-full lg:inline-flex"
            onClick={() => setCommandPaletteOpen(true)}
            title="Open the workspace command palette"
          >
            <Command className="mr-1.5 h-3.5 w-3.5" />
            Tools
          </Button>
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

      {restoreAutosaveProject ? (
        <div className="border-b border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Restore previous session?
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                GeoSight found an autosave for {restoreAutosaveProject.location.name}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={handleDismissAutosaveRestore}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={handleAcceptAutosaveRestore}
              >
                Restore
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:overflow-hidden">

        {/* Left panel — desktop only */}
        <aside
          className="hidden w-80 shrink-0 flex-col overflow-hidden border-r border-[color:var(--border-soft)] xl:flex"
          role="region"
          aria-label="Workspace navigation and quick regions"
        >

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

          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3" data-demo-id="demo-drawing">
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
              onSelectDrawingTool={state.setDrawingTool}
              onOpenImport={handleOpenImport}
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
              onOpenPrint={() => setPrintLayoutOpen(true)}
              onSaveProject={handleSaveProject}
              onLoadProject={handleOpenProjectFile}
            />

            {/* Sidebar (profiles + quick regions) */}
            <div className="min-h-0" data-walkthrough="lens-selector">{sidebarElement}</div>
          </div>

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

        </aside>

        {/* Globe area */}
        <main
          id="main-content"
          ref={globeAreaRef}
          className="relative flex-1 min-h-0 lg:min-h-0 xl:min-h-0"
          role="region"
          aria-label="3D globe and map tools"
          data-walkthrough="globe"
          data-demo-id="demo-globe"
        >
          <FileDropZone
            ref={fileDropZoneRef}
            onImportLayer={handleImportedLayer}
            onImportError={(message) =>
              setWorkspaceNotice({
                tone: "warning",
                message,
              })
            }
          >
          <ClientErrorBoundary
            title="The globe view needs a quick reset"
            message="GeoSight kept the rest of the workspace alive. Retry the globe, switch regions, or keep working from the cards while the globe re-initializes."
          >
            <div className="absolute inset-0">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[var(--surface-overlay)] to-transparent" />
              {state.mapEngine === "maplibre" ? (
                <MapLibreMap
                  selectedPoint={state.selectedPoint}
                  selectedRegion={state.selectedRegion}
                  globeViewMode={state.globeViewMode}
                  onPointSelect={(coords) => {
                    setCalloutDismissed(false);
                    state.selectPoint(coords);
                    data.handleLocationSelection();
                  }}
                />
              ) : (
                <GlobeErrorBoundary
                  fallback={
                    <MapLibreMap
                      selectedPoint={state.selectedPoint}
                      selectedRegion={state.selectedRegion}
                      globeViewMode={state.globeViewMode}
                      onPointSelect={(coords) => {
                        setCalloutDismissed(false);
                        state.selectPoint(coords);
                        data.handleLocationSelection();
                      }}
                    />
                  }
                >
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
                  trailMarkers={data.npsParks}
                  driveMode={state.driveMode}
                  onExitDriveMode={() => state.setDriveMode(false)}
                  drawingTool={state.drawingTool}
                  drawnShapes={state.drawnShapes}
                  importedLayers={state.importedLayers}
                  activeImportedLayerId={state.activeImportedLayerId}
                  selectedImportedFeatureId={state.selectedImportedFeatureId}
                  wmsLayers={state.wmsLayers}
                  onShapeComplete={handleShapeComplete}
                  onVertexDrag={state.updateDrawnShapeVertex}
                  snapToGrid={state.snapToGrid}
                  captureMode={captureOverlayVisible}
                  routeCoordinates={state.routeCoordinates}
                  onGlobeApiChange={handleGlobeApiChange}
                  featureInspectMode={state.featureInspectMode}
                  onIdentifyResult={state.setIdentifyResult}
                  customLayers={state.customLayers}
                />
                </GlobeErrorBoundary>
              )}
            </div>
          </ClientErrorBoundary>

          {/* Globe controls — pill cluster bottom-right (desktop only) */}
          <div className="absolute bottom-12 right-4 z-20 hidden flex-col overflow-hidden rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] shadow-[var(--shadow-panel)] backdrop-blur-xl lg:flex">
            <button
              type="button"
              aria-pressed={state.mapEngine === "cesium"}
              aria-label="Switch to 3D globe"
              title="3D globe (Cesium)"
              onClick={() => state.setMapEngine("cesium")}
              className={cn(
                "flex h-11 w-11 items-center justify-center transition duration-150",
                state.mapEngine === "cesium"
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
              )}
            >
              <Globe className="h-4 w-4" />
            </button>
            <div className="h-px bg-[color:var(--border-soft)]" />
            <button
              type="button"
              aria-pressed={state.mapEngine === "maplibre"}
              aria-label="Switch to 2D map"
              title="2D flat map (MapLibre)"
              onClick={() => state.setMapEngine("maplibre")}
              className={cn(
                "flex h-11 w-11 items-center justify-center transition duration-150",
                state.mapEngine === "maplibre"
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
              )}
            >
              <Map className="h-4 w-4" />
            </button>
            {/* Drive mode hidden — not demo-ready */}
          </div>

          <div className="hidden lg:contents">
          <GlobeViewSelector
            globeViewMode={state.globeViewMode}
            onChange={state.setGlobeViewMode}
            subsurfaceRenderMode={state.subsurfaceRenderMode}
          />
          <DataLayers
            layers={state.layers}
            onChange={state.setLayers}
            open={layersPanelOpen}
            onOpenChange={setLayersPanelOpen}
            importedLayers={state.importedLayers}
            activeImportedLayerId={state.activeImportedLayerId}
            onToggleImportedLayerVisibility={state.toggleImportedLayerVisibility}
            onUpdateImportedLayerStyle={state.updateImportedLayerStyle}
            onRemoveImportedLayer={state.removeImportedLayer}
            onMoveImportedLayer={state.moveImportedLayer}
            onFlyToImportedLayer={(layer) => globeApiRef.current?.flyToBounds(layer.bounds)}
            onOpenImportedLayerTable={handleOpenImportedLayerTable}
            drawnShapes={state.drawnShapes}
            wmsLayers={state.wmsLayers}
            onAddWmsLayer={state.addWmsLayer}
            onRemoveWmsLayer={state.removeWmsLayer}
            onToggleWmsLayerVisibility={state.toggleWmsLayerVisibility}
            onSetWmsLayerOpacity={state.setWmsLayerOpacity}
            onMoveWmsLayer={state.moveWmsLayer}
            customLayers={customLayers}
            onAddCustomLayer={addCustomLayer}
            onRemoveCustomLayer={removeCustomLayer}
            onToggleCustomLayer={toggleCustomLayer}
            onSetCustomLayerOpacity={setCustomLayerOpacity}
            onMoveCustomLayer={moveCustomLayer}
          />
          </div>
          {state.selectedRegion.polygon.length > 0 ? (
            <div className="hidden lg:contents">
            <RegionSelector
              region={state.selectedRegion}
              locationTooltip={state.selectedLocationName}
              drawnShapes={state.drawnShapes}
              onReset={() => {
                state.selectPoint(
                  state.selectedPoint,
                  state.selectedLocationName,
                  state.selectedLocationDisplayName,
                );
                data.handleLocationSelection();
              }}
            />
            </div>
          ) : null}
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

          <div className="absolute bottom-14 left-4 right-4 z-20 hidden xl:hidden lg:block">
            <div className="rounded-3xl border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] p-3 shadow-[var(--shadow-panel)] backdrop-blur-md">
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
                onExportGeoJSON={handleExportGeoJson}
                snapToGrid={state.snapToGrid}
                onToggleSnapToGrid={() => state.setSnapToGrid((v) => !v)}
                onOpenImport={handleOpenImport}
              />
            </div>
          </div>

          {/* Map callout — appears on point select, hides when right panel opens */}
          {(state.locationReady || data.loading) && !rightPanelOpen && !calloutDismissed ? (
            <div className="hidden lg:contents">
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
                if (data.shellMode === "minimal") setShellMode("guided");
                if (typeof window !== "undefined") {
                  window.requestAnimationFrame(() => {
                    document
                      .getElementById("primary-card-active-location")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }
              }}
              onDismiss={() => setCalloutDismissed(true)}
            />
            </div>
          ) : null}

          {/* Coord readout — click to copy */}
          </FileDropZone>
        </main>

        {/* Right panel (desktop) / inline content (mobile) */}
        {rightPanelOpen ? (
          <aside
            id="evidence-panel"
            tabIndex={-1}
            className={cn(
              "hidden flex-col border-t border-[color:var(--border-soft)] lg:flex",
              "xl:w-[380px] xl:shrink-0 xl:border-t-0 xl:border-l xl:overflow-y-auto",
            )}
            role="region"
            aria-label="Analysis cards and workspace panels"
            data-demo-id="demo-panel"
          >
            <CardDisplayProvider value={{ defaultCollapsed: true }}>
              {rightPanelContent}
            </CardDisplayProvider>
          </aside>
        ) : null}
      </div>

      {/* ── Bottom bar ── */}
      <footer
        role="toolbar"
        className="hidden shrink-0 flex-col gap-3 border-t border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-4 py-3 lg:flex xl:h-[64px] xl:flex-row xl:items-center xl:py-0"
        aria-label="Workspace actions and persistent AI input"
      >
        <div className="min-w-0 flex-1 xl:max-w-[28rem]" data-walkthrough="score-card" data-demo-id="demo-score">
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

        <div className="ml-auto flex flex-nowrap shrink-0 items-center gap-3 self-end xl:self-auto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="hidden shrink-0 rounded-full xl:inline-flex"
            onClick={() => {
              if (data.sites.length >= 2) {
                openCard("compare");
                return;
              }
              setWorkspaceNotice({
                tone: "info",
                message:
                  data.sites.length === 0
                    ? "Save this location first, then search a second one to compare."
                    : "Search and save one more location to start a comparison.",
              });
              const searchInput = document.querySelector<HTMLInputElement>(
                '[data-walkthrough="search-bar"] input',
              );
              if (searchInput) {
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                window.setTimeout(() => {
                  searchInput.focus();
                  searchInput.select();
                }, 250);
              }
            }}
            title={
              data.sites.length >= 2
                ? `Compare ${data.sites.length} saved locations side by side.`
                : "Save at least 2 locations to unlock comparison."
            }
          >
            <Columns2 className="mr-1.5 h-3.5 w-3.5" />
            Compare
            {data.sites.length > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-soft)] px-1 text-[10px] font-semibold tabular-nums text-[var(--accent)]">
                {data.sites.length}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            className="shrink-0 whitespace-nowrap rounded-full"
            disabled={data.reportLoading}
            onClick={handleGenerateReport}
          >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {data.reportLoading ? "Generating…" : "Generate report"}
          </span>
          <span className="sm:hidden">Report</span>
          </Button>
        </div>
      </footer>

      {/* Workspace notice — floating toast */}
      <PrintLayout
        open={printLayoutOpen}
        locationName={state.selectedLocationName}
        profileName={state.activeProfile.name}
        siteScore={data.siteScore}
        geodata={data.geodata}
        workspaceContentRef={rightPanelContentRef}
        captureMapSnapshot={captureGlobeArea}
        onClose={() => setPrintLayoutOpen(false)}
      />

      <AttributeTable
        open={attributeTableOpen}
        layer={activeImportedLayer}
        selectedFeatureId={state.selectedImportedFeatureId}
        onSelectFeature={state.setSelectedImportedFeatureId}
        onClose={handleCloseAttributeTable}
      />

      {workspaceNotice ? (
        <div
          className={cn(
            "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm",
            workspaceNotice.tone === "warning"
              ? "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]"
              : "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
          )}
          role="status"
          aria-live="polite"
        >
          {workspaceNotice.message}
        </div>
      ) : null}

      {data.rateLimitToast ? (
        <div
          className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-2 text-sm text-[var(--warning-foreground)] backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          {data.rateLimitToast}
        </div>
      ) : null}

      <KeyboardShortcuts
        open={keyboardShortcutsOpen}
        onClose={() => setKeyboardShortcutsOpen(false)}
      />

      <ToolReferenceSheet
        open={toolReferenceOpen}
        onClose={() => setToolReferenceOpen(false)}
      />

      <SettingsPanel
        open={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
      />

      <WalkthroughOverlay
        open={walkthroughOpen}
        steps={WALKTHROUGH_STEPS}
        onClose={dismissWalkthrough}
      />

      <FeatureInspectorPanel
        result={identifyResult}
        onClose={() => { setIdentifyResult(null); setFeatureInspectMode(false); }}
      />

      <GoToCoordinateDialog
        open={goToCoordsOpen}
        onClose={() => setGoToCoordsOpen(false)}
        onGoTo={(coords) => {
          selectWorkspacePoint(coords, `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, undefined);
          setGoToCoordsOpen(false);
        }}
      />

      <WorkspaceCommandPalette
        open={commandPaletteOpen}
        items={commandPaletteItems}
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={handleCommandPaletteSelect}
      />

      <input
        ref={projectFileInputRef}
        type="file"
        accept=".geosight,.json,application/json"
        className="hidden"
        onChange={(event) => {
          void handleLoadProjectFile(event);
        }}
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
            <div className="min-h-0 flex-1 overflow-hidden" data-walkthrough="lens-selector">{sidebarElement}</div>
          </div>
        </div>
      ) : null}

      <MobileChrome
        locationName={state.selectedLocationName}
        locationReady={state.locationReady}
        profile={state.activeProfile}
        score={data.siteScore}
        loading={data.loading}
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
        onOpenChat={() => {
          primeAgent("geo-analyst");
          setAgentPanelOpen(true);
        }}
      />

      {activeDemoScenario && (
        <DemoRunner
          scenario={activeDemoScenario}
          dataReady={!data.loading && !!data.geodata}
          onOpenCard={openCard}
          onStop={() => setActiveDemoScenario(null)}
        />
      )}

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
