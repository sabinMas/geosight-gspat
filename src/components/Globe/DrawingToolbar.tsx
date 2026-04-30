"use client";

import { Circle, Download, Grid2x2, MapPin, PenTool, Redo2, Ruler, Trash2, Undo2, Upload, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DrawnShape, DrawingTool } from "@/types";

interface DrawingToolbarProps {
  drawingTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawnShapes: DrawnShape[];
  onClearAll: () => void;
  onDeleteShape: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRenameShape: (id: string, label: string) => void;
  onExportGeoJSON: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  onOpenImport?: () => void;
}

const TOOLS: Array<{
  id: Exclude<DrawingTool, "none">;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "polygon",
    label: "Draw area",
    hint: "Click to place corners — right-click to close",
    Icon: PenTool,
  },
  {
    id: "marker",
    label: "Drop pin",
    hint: "Click anywhere to place a marker",
    Icon: MapPin,
  },
  {
    id: "measure",
    label: "Measure",
    hint: "Click to add points · Right-click to finish",
    Icon: Ruler,
  },
  {
    id: "circle",
    label: "Radius",
    hint: "Click center then edge to draw a radius circle",
    Icon: Circle,
  },
];

function PinLabelEditor({
  shape,
  onRename,
}: {
  shape: DrawnShape;
  onRename: (id: string, label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shape.label ?? "");

  const commit = () => {
    const trimmed = draft.trim();
    onRename(shape.id, trimmed || "Pin");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          aria-label={`Rename ${shape.label ?? "pin"}`}
          className="h-7 w-32 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2.5 text-xs text-[var(--foreground)] outline-none focus:border-[color:var(--accent-strong)]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          maxLength={40}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex h-7 items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-text"
      onClick={() => {
        setDraft(shape.label ?? "Pin");
        setEditing(true);
      }}
      title="Click to rename pin"
      aria-label={`Rename pin "${shape.label ?? "Pin"}"`}
    >
      <MapPin className="h-3 w-3 shrink-0" />
      {shape.label ?? "Pin"}
    </button>
  );
}

const SHAPE_TYPE_LABELS: Record<DrawnShape["type"], string> = {
  polygon: "Area",
  marker: "Pin",
  measure: "Distance",
  circle: "Radius",
};

export function DrawingToolbar({
  drawingTool,
  onSelectTool,
  drawnShapes,
  onClearAll,
  onDeleteShape,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRenameShape,
  onExportGeoJSON,
  snapToGrid,
  onToggleSnapToGrid,
  onOpenImport,
}: DrawingToolbarProps) {
  const activeToolMeta = TOOLS.find((t) => t.id === drawingTool);
  const markers = drawnShapes.filter((s) => s.type === "marker");
  const nonMarkers = drawnShapes.filter((s) => s.type !== "marker");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TOOLS.map(({ id, label, Icon }) => {
        const isActive = drawingTool === id;
        return (
          <Button
            key={id}
            type="button"
            variant={isActive ? "default" : "secondary"}
            size="sm"
            className={cn(
              "rounded-full border transition",
              isActive
                ? "border-[color:var(--accent-strong)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)]"
                : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--foreground)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)]"
            )}
            aria-pressed={isActive}
            aria-label={`${isActive ? "Stop" : "Start"} ${label.toLowerCase()} tool`}
            onClick={() => onSelectTool(isActive ? "none" : id)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Button>
        );
      })}

      {onOpenImport ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition"
          onClick={onOpenImport}
          aria-label="Import a geospatial file"
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import
        </Button>
      ) : null}

      {drawingTool !== "none" ? (
        <Button
          type="button"
          variant={snapToGrid ? "default" : "secondary"}
          size="sm"
          className={cn(
            "rounded-full border transition",
            snapToGrid
              ? "border-[color:var(--accent-strong)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)]"
              : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--foreground)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)]"
          )}
          aria-pressed={snapToGrid}
          aria-label={snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
          onClick={onToggleSnapToGrid}
          title="Snap to ~100m grid"
        >
          <Grid2x2 className="mr-1.5 h-3.5 w-3.5" />
          Snap grid
        </Button>
      ) : null}

      {drawnShapes.length > 0 ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition disabled:opacity-50"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last shape"
            aria-label="Undo last drawing action"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition disabled:opacity-50"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo last drawing action"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition"
            onClick={onExportGeoJSON}
            title="Export shapes as GeoJSON"
            aria-label="Export drawn shapes as GeoJSON"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            GeoJSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition"
            onClick={onClearAll}
            title="Clear all drawn shapes"
            aria-label="Clear all drawn shapes"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear ({drawnShapes.length})
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onUndo}
            disabled
            title="Nothing to undo"
            aria-label="Undo last drawing action"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] hover:bg-[var(--surface-raised)] transition disabled:opacity-50"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo last drawing action"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}

      {drawingTool !== "none" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => onSelectTool("none")}
          aria-label="Cancel drawing"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      ) : null}

      {activeToolMeta ? (
        <span className="w-full text-xs text-[var(--muted-foreground)] sm:w-auto">
          {activeToolMeta.hint}
        </span>
      ) : null}

      {(markers.length > 0 || nonMarkers.length > 0) ? (
        <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
          {markers.map((shape) => (
            <div key={shape.id} className="flex items-center gap-0.5">
              <PinLabelEditor shape={shape} onRename={onRenameShape} />
              <button
                type="button"
                onClick={() => onDeleteShape(shape.id)}
                aria-label={`Delete pin "${shape.label ?? "Pin"}"`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {nonMarkers.map((shape) => (
            <div
              key={shape.id}
              className="flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] pl-2.5 pr-1 py-1"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: shape.color }}
              />
              <span className="text-xs text-[var(--foreground-soft)]">
                {SHAPE_TYPE_LABELS[shape.type]}
                {shape.measurementLabel ? ` · ${shape.measurementLabel}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onDeleteShape(shape.id)}
                aria-label={`Delete ${SHAPE_TYPE_LABELS[shape.type].toLowerCase()}`}
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
