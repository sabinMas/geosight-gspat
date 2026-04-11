"use client";

import {
  Camera,
  Circle,
  Download,
  FileArchive,
  FileSpreadsheet,
  Grid2x2,
  Layers3,
  MapPinned,
  PenTool,
  Ruler,
  Sparkles,
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
  onToggleSnapGrid: () => void;
  onClearDrawings: () => void;
  onToggleCaptureMode: () => void;
  onFigureTitleChange: (value: string) => void;
  onFigureSubtitleChange: (value: string) => void;
  onExportGeoJson: () => void;
  onExportCsv: () => void;
  onCapturePng: () => void;
  onExportBundle: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
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
  onToggleSnapGrid,
  onClearDrawings,
  onToggleCaptureMode,
  onFigureTitleChange,
  onFigureSubtitleChange,
  onExportGeoJson,
  onExportCsv,
  onCapturePng,
  onExportBundle,
}: WorkspaceToolRailProps) {
  const toolButtons = [
    { id: "polygon" as const, label: "Area", Icon: PenTool },
    { id: "marker" as const, label: "Pin", Icon: MapPinned },
    { id: "measure" as const, label: "Measure", Icon: Ruler },
    { id: "circle" as const, label: "Radius", Icon: Circle },
  ];

  return (
    <section className="space-y-4 rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
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
            onClick={onOpenCompare}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Compare
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Spatial tools</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {toolButtons.map(({ id, label, Icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={drawingTool === id ? "default" : "secondary"}
              className="justify-start rounded-2xl"
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
          <Button
            type="button"
            size="sm"
            variant={captureMode ? "default" : "secondary"}
            className="w-full justify-start rounded-2xl"
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
                className="h-10 rounded-xl bg-[var(--surface-panel)] px-3"
              />
              <Input
                value={figureSubtitle}
                onChange={(event) => onFigureSubtitleChange(event.target.value)}
                placeholder="Figure subtitle"
                className="h-10 rounded-xl bg-[var(--surface-panel)] px-3"
              />
              <p className="text-[11px] leading-5 text-[var(--muted-foreground)]">
                Leave these blank to use the active location and mission profile automatically.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="justify-start rounded-2xl"
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
              onClick={onCapturePng}
              disabled={exportBusy}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              PNG
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              className={cn("justify-start rounded-2xl", exportBusy && "opacity-80")}
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
