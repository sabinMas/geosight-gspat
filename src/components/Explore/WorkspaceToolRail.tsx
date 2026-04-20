"use client";

import type { ReactNode } from "react";
import {
  Camera,
  Circle,
  Download,
  FileArchive,
  FileSpreadsheet,
  FolderOpen,
  Grid2x2,
  Layers3,
  MapPinned,
  PenTool,
  Printer,
  Ruler,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DrawingTool } from "@/types";

interface WorkspaceToolRailProps {
  shellMode: "minimal" | "guided" | "board";
  viewMode: "board" | "library";
  drawingTool: DrawingTool;
  snapToGrid: boolean;
  drawCount: number;
  exportBusy: boolean;
  captureMode: boolean;
  figureTitle: string;
  figureSubtitle: string;
  onOpenFocused: () => void;
  onOpenWorkspace: () => void;
  onOpenLibrary: () => void;
  onOpenCompare: () => void;
  onSelectDrawingTool: (tool: DrawingTool) => void;
  onOpenImport: () => void;
  onToggleSnapGrid: () => void;
  onClearDrawings: () => void;
  onToggleCaptureMode: () => void;
  onFigureTitleChange: (value: string) => void;
  onFigureSubtitleChange: (value: string) => void;
  onExportGeoJson: () => void;
  onExportCsv: () => void;
  onCapturePng: () => void;
  onExportBundle: () => void;
  onOpenPrint: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}

export function WorkspaceToolRail({
  shellMode,
  viewMode,
  drawingTool,
  snapToGrid,
  drawCount,
  exportBusy,
  captureMode,
  figureTitle,
  figureSubtitle,
  onOpenFocused,
  onOpenWorkspace,
  onOpenLibrary,
  onOpenCompare,
  onSelectDrawingTool,
  onOpenImport,
  onToggleSnapGrid,
  onClearDrawings,
  onToggleCaptureMode,
  onFigureTitleChange,
  onFigureSubtitleChange,
  onExportGeoJson,
  onExportCsv,
  onCapturePng,
  onExportBundle,
  onOpenPrint,
  onSaveProject,
  onLoadProject,
}: WorkspaceToolRailProps) {
  const toolButtons = [
    { id: "polygon" as const, label: "Area", Icon: PenTool },
    { id: "marker" as const, label: "Pin", Icon: MapPinned },
    { id: "measure" as const, label: "Measure", Icon: Ruler },
    { id: "circle" as const, label: "Radius", Icon: Circle },
  ];

  return (
    <section
      className="space-y-4 rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]"
      role="region"
      aria-label="Analyst workbench tools"
    >
      <div className="space-y-1">
        <SectionTitle>Workbench</SectionTitle>
        <div className="text-sm font-semibold text-[var(--foreground)]">Analyst workbench</div>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          Keep the map central, define the area of interest, and export handoff-ready geospatial outputs.
        </p>
      </div>

      <div className="space-y-2">
        <SectionTitle>Shell</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={shellMode !== "board" ? "default" : "secondary"}
            className="justify-start rounded-2xl"
            aria-label="Open focused workspace mode"
            aria-pressed={shellMode !== "board"}
            onClick={onOpenFocused}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Focus
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shellMode === "board" && viewMode === "board" ? "default" : "secondary"}
            className="justify-start rounded-2xl"
            aria-label="Open evidence workspace mode"
            aria-pressed={shellMode === "board" && viewMode === "board"}
            onClick={onOpenWorkspace}
          >
            <Layers3 className="mr-1.5 h-3.5 w-3.5" />
            Evidence
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shellMode === "board" && viewMode === "library" ? "default" : "secondary"}
            className="justify-start rounded-2xl"
            aria-label="Open panel library"
            aria-pressed={shellMode === "board" && viewMode === "library"}
            data-walkthrough="card-library"
            onClick={onOpenLibrary}
          >
            <Grid2x2 className="mr-1.5 h-3.5 w-3.5" />
            Panels
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="justify-start rounded-2xl"
            aria-label="Open comparison panel"
            onClick={onOpenCompare}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Compare
          </Button>
        </div>
      </div>

      <div className="space-y-2" data-walkthrough="drawing-tools">
        <SectionTitle>Spatial tools</SectionTitle>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full justify-start rounded-2xl"
          aria-label="Import a geospatial file"
          onClick={onOpenImport}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import layer
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {toolButtons.map(({ id, label, Icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={drawingTool === id ? "default" : "secondary"}
              className="justify-start rounded-2xl"
              aria-label={`${drawingTool === id ? "Stop" : "Start"} ${label.toLowerCase()} drawing tool`}
              aria-pressed={drawingTool === id}
              onClick={() => onSelectDrawingTool(drawingTool === id ? "none" : id)}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={snapToGrid ? "default" : "secondary"}
            className="justify-start rounded-2xl"
            aria-label={snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
            aria-pressed={snapToGrid}
            onClick={onToggleSnapGrid}
          >
            <Grid2x2 className="mr-1.5 h-3.5 w-3.5" />
            Snap grid
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="justify-start rounded-2xl"
            aria-label="Clear all drawn shapes"
            onClick={onClearDrawings}
            disabled={drawCount === 0}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear {drawCount > 0 ? `(${drawCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Capture & export</SectionTitle>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
              aria-label="Save the current GeoSight project"
              onClick={onSaveProject}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
              aria-label="Load a saved GeoSight project"
              onClick={onLoadProject}
            >
              <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
              Load
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant={captureMode ? "default" : "secondary"}
            className="w-full justify-start rounded-2xl"
            aria-label={captureMode ? "Exit topographic capture mode" : "Enter topographic capture mode"}
            aria-pressed={captureMode}
            onClick={onToggleCaptureMode}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {captureMode ? "Exit capture mode" : "Topographic capture"}
          </Button>

          {captureMode ? (
            <div className="space-y-2 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
              <Input
                value={figureTitle}
                onChange={(event) => onFigureTitleChange(event.target.value)}
                placeholder="Figure title"
                aria-label="Capture figure title"
                className="h-10 rounded-xl bg-[var(--surface-panel)] px-3"
              />
              <Input
                value={figureSubtitle}
                onChange={(event) => onFigureSubtitleChange(event.target.value)}
                placeholder="Figure subtitle"
                aria-label="Capture figure subtitle"
                className="h-10 rounded-xl bg-[var(--surface-panel)] px-3"
              />
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                Leave these blank to use the active location and mission profile automatically.
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full justify-start rounded-2xl"
            aria-label="Open print layout composer"
            onClick={onOpenPrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print layout
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
              aria-label="Export area of interest as GeoJSON"
              onClick={onExportGeoJson}
              disabled={exportBusy}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              GeoJSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
              aria-label="Export analysis tables"
              onClick={onExportCsv}
              disabled={exportBusy}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Tables
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
              aria-label="Capture map as PNG"
              onClick={onCapturePng}
              disabled={exportBusy}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              PNG
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn("col-span-2 justify-start rounded-2xl", exportBusy && "opacity-80")}
              aria-label="Export analyst ZIP bundle"
              onClick={onExportBundle}
              disabled={exportBusy}
            >
              <FileArchive className="mr-1.5 h-3.5 w-3.5" />
              {exportBusy ? "Bundling..." : "Analyst ZIP"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
