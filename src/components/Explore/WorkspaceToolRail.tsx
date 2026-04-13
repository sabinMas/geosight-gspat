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
import { cn } from "@/lib/utils";
import { DrawingTool } from "@/types";
import { Input } from "@/components/ui/input";

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

function RailButton({
  active,
  label,
  Icon,
  onClick,
  disabled = false,
}: {
  active: boolean;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
      className={cn(
        "group relative flex h-10 w-10 items-center justify-center rounded-full border transition duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
          : "border-[color:var(--border-soft)] bg-transparent text-[var(--muted-foreground)] hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
      )}
    >
      <Icon className="h-4 w-4" />
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--foreground)] shadow-[var(--shadow-panel)] backdrop-blur-sm group-hover:inline-flex">
        {label}
      </span>
    </button>
  );
}

function RailDivider() {
  return <div className="mx-auto h-px w-6 bg-[color:var(--border-soft)]" />;
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
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      {/* View mode */}
      <RailButton
        active={shellMode !== "board"}
        label="Focus mode"
        Icon={Sparkles}
        onClick={onOpenFocused}
      />
      <RailButton
        active={shellMode === "board" && viewMode === "board"}
        label="Evidence board"
        Icon={Layers3}
        onClick={onOpenWorkspace}
      />
      <RailButton
        active={shellMode === "board" && viewMode === "library"}
        label="Panel library"
        Icon={Grid2x2}
        onClick={onOpenLibrary}
      />
      <RailButton
        active={false}
        label="Compare sites"
        Icon={FileSpreadsheet}
        onClick={onOpenCompare}
      />

      <RailDivider />

      {/* Spatial tools */}
      <RailButton
        active={drawingTool === "polygon"}
        label="Draw area"
        Icon={PenTool}
        onClick={() => onSelectDrawingTool(drawingTool === "polygon" ? "none" : "polygon")}
      />
      <RailButton
        active={drawingTool === "point"}
        label="Drop pin"
        Icon={MapPinned}
        onClick={() => onSelectDrawingTool(drawingTool === "point" ? "none" : "point")}
      />
      <RailButton
        active={drawingTool === "polyline"}
        label="Measure"
        Icon={Ruler}
        onClick={() => onSelectDrawingTool(drawingTool === "polyline" ? "none" : "polyline")}
      />
      <RailButton
        active={drawingTool === "circle"}
        label="Radius"
        Icon={Circle}
        onClick={() => onSelectDrawingTool(drawingTool === "circle" ? "none" : "circle")}
      />
      <RailButton
        active={snapToGrid}
        label="Snap to grid"
        Icon={Grid2x2}
        onClick={onToggleSnapGrid}
      />
      {drawCount > 0 ? (
        <RailButton
          active={false}
          label={`Clear shapes (${drawCount})`}
          Icon={X}
          onClick={onClearDrawings}
        />
      ) : null}

      <RailDivider />

      {/* Capture & export */}
      <RailButton
        active={captureMode}
        label={captureMode ? "Exit capture" : "Topographic capture"}
        Icon={Camera}
        onClick={onToggleCaptureMode}
      />
      <RailButton
        active={false}
        label="Export GeoJSON"
        Icon={Download}
        onClick={onExportGeoJson}
        disabled={exportBusy}
      />
      <RailButton
        active={false}
        label="Export tables"
        Icon={FileSpreadsheet}
        onClick={onExportCsv}
        disabled={exportBusy}
      />
      <RailButton
        active={false}
        label="Capture PNG"
        Icon={Camera}
        onClick={onCapturePng}
        disabled={exportBusy}
      />
      <RailButton
        active={false}
        label={exportBusy ? "Bundling…" : "Analyst ZIP"}
        Icon={FileArchive}
        onClick={onExportBundle}
        disabled={exportBusy}
      />

      {/* Capture mode figure inputs — shown inline below the rail when active */}
      {captureMode ? (
        <div className="mt-1 w-full space-y-2 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
          <Input
            value={figureTitle}
            onChange={(event) => onFigureTitleChange(event.target.value)}
            placeholder="Figure title"
            className="h-9 rounded-xl bg-[var(--surface-panel)] px-3 text-xs"
          />
          <Input
            value={figureSubtitle}
            onChange={(event) => onFigureSubtitleChange(event.target.value)}
            placeholder="Subtitle"
            className="h-9 rounded-xl bg-[var(--surface-panel)] px-3 text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
