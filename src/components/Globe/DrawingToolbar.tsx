"use client";

import { Circle, Download, MapPin, PenTool, Redo2, Ruler, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawnShape, DrawingTool } from "@/types";

interface DrawingToolbarProps {
  drawingTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawnShapes: DrawnShape[];
  onClearAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRenameShape: (id: string, label: string) => void;
  onExportGeoJSON: () => void;
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
    hint: "Click start then end to measure distance",
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
    >
      <MapPin className="h-3 w-3 shrink-0" />
      {shape.label ?? "Pin"}
    </button>
  );
}

export function DrawingToolbar({
  drawingTool,
  onSelectTool,
  drawnShapes,
  onClearAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRenameShape,
  onExportGeoJSON,
}: DrawingToolbarProps) {
  const activeToolMeta = TOOLS.find((t) => t.id === drawingTool);
  const markers = drawnShapes.filter((s) => s.type === "marker");

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
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            aria-pressed={isActive}
            onClick={() => onSelectTool(isActive ? "none" : id)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Button>
        );
      })}

      {drawnShapes.length > 0 ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last shape"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onExportGeoJSON}
            title="Export shapes as GeoJSON"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onClearAll}
            title="Clear all drawn shapes"
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
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
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

      {markers.length > 0 ? (
        <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Pins
          </span>
          {markers.map((shape) => (
            <PinLabelEditor key={shape.id} shape={shape} onRename={onRenameShape} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
