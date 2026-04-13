"use client";

import { useState } from "react";
import {
  Check,
  Circle,
  Download,
  Grid2x2,
  MapPin,
  Pentagon,
  Redo2,
  Route,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { DrawingDraftState } from "@/context/AnalysisContext";
import { Button } from "@/components/ui/button";
import { DrawnShape, DrawingTool } from "@/types";

interface AoiDrawingToolbarProps {
  drawingTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawnShapes: DrawnShape[];
  selectedShapeId: string | null;
  onSelectShape: (shapeId: string | null) => void;
  onClearAll: () => void;
  onDeleteShape: (id: string) => void;
  canUndoHistory: boolean;
  canRedo: boolean;
  onUndoHistory: () => void;
  onRedo: () => void;
  onRenameShape: (id: string, label: string) => void;
  onExportGeoJSON: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  draftState: DrawingDraftState;
  onUndoDraft: () => void;
  onCompleteDraft: () => void;
}

const TOOL_BUTTONS: Array<{
  id: Exclude<DrawingTool, "none">;
  label: string;
  description: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "point",
    label: "Point",
    description: "Drop a pin",
    hint: "Click anywhere on the map to place a named pin.",
    Icon: MapPin,
  },
  {
    id: "polyline",
    label: "Path",
    description: "Draw a route or line",
    hint: "Click to add points along the path. Click the last point again to finish.",
    Icon: Route,
  },
  {
    id: "polygon",
    label: "Area",
    description: "Draw a free-form polygon",
    hint: "Click to place vertices. Right-click to close the polygon.",
    Icon: Pentagon,
  },
  {
    id: "rectangle",
    label: "Box",
    description: "Quick bounding box",
    hint: "Click a corner point, then click the opposite corner to set the bounding box.",
    Icon: Square,
  },
  {
    id: "circle",
    label: "Radius",
    description: "Draw a circular buffer",
    hint: "Click a center point, then click again to set the radius.",
    Icon: Circle,
  },
];

const SHAPE_LABELS: Record<DrawnShape["type"], string> = {
  point: "Point",
  polyline: "Path",
  polygon: "Area",
  rectangle: "Box",
  circle: "Circle",
};

function PinLabelEditor({
  shape,
  onRename,
}: {
  shape: DrawnShape;
  onRename: (id: string, label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shape.label ?? "Pin");

  const commit = () => {
    const nextLabel = draft.trim() || "Pin";
    onRename(shape.id, nextLabel);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
        className="h-8 w-full rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[color:var(--accent-strong)]"
      />
    );
  }

  return (
    <button
      type="button"
      className="w-full rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1.5 text-left text-sm text-[var(--foreground)]"
      onClick={() => {
        setDraft(shape.label ?? "Pin");
        setEditing(true);
      }}
      title="Rename pin"
    >
      {shape.label ?? "Pin"}
    </button>
  );
}

function ToolButton({
  active,
  title,
  description,
  Icon,
  onClick,
  disabled = false,
}: {
  active: boolean;
  title: string;
  description: string;
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
      title={`${title}: ${description}`}
      className={[
        "group relative flex h-12 w-12 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.28)]"
          : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      <Icon className="h-4.5 w-4.5" />
      <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--foreground)] shadow-[var(--shadow-panel)] backdrop-blur-sm md:group-hover:inline-flex">
        {title}
      </span>
    </button>
  );
}

export function AoiDrawingToolbar({
  drawingTool,
  onSelectTool,
  drawnShapes,
  selectedShapeId,
  onSelectShape,
  onClearAll,
  onDeleteShape,
  canUndoHistory,
  canRedo,
  onUndoHistory,
  onRedo,
  onRenameShape,
  onExportGeoJSON,
  snapToGrid,
  onToggleSnapToGrid,
  draftState,
  onUndoDraft,
  onCompleteDraft,
}: AoiDrawingToolbarProps) {
  const selectedShape =
    drawnShapes.find((shape) => shape.id === selectedShapeId) ?? drawnShapes.at(-1) ?? null;
  const canUndoDraft = draftState.tool !== "none" && draftState.canUndo;
  const canCompleteDraft = draftState.tool !== "none" && draftState.canComplete;
  const canShowDraftCard = draftState.tool !== "none";
  const activeToolHint = TOOL_BUTTONS.find((t) => t.id === drawingTool)?.hint ?? null;

  return (
    <div className="pointer-events-none absolute left-4 top-20 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-none">
      <div className="pointer-events-auto flex w-fit flex-col gap-2 rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] p-2 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        {TOOL_BUTTONS.map(({ id, label, description, Icon }) => (
          <ToolButton
            key={id}
            active={drawingTool === id}
            title={label}
            description={description}
            Icon={Icon}
            onClick={() => onSelectTool(drawingTool === id ? "none" : id)}
          />
        ))}

        <div className="my-1 h-px bg-[color:var(--border-soft)]" />

        <ToolButton
          active={snapToGrid}
          title="Snap"
          description="Snap to a 100m grid"
          Icon={Grid2x2}
          onClick={onToggleSnapToGrid}
        />

        <ToolButton
          active={false}
          title="Undo"
          description={
            canUndoDraft ? "Undo the last vertex" : "Undo the last completed geometry"
          }
          Icon={Undo2}
          onClick={canUndoDraft ? onUndoDraft : onUndoHistory}
          disabled={canUndoDraft ? !draftState.canUndo : !canUndoHistory}
        />

        <ToolButton
          active={false}
          title="Redo"
          description="Restore the last removed geometry"
          Icon={Redo2}
          onClick={onRedo}
          disabled={!canRedo}
        />

        <ToolButton
          active={false}
          title="Export"
          description="Download GeoJSON"
          Icon={Download}
          onClick={onExportGeoJSON}
        />

        <ToolButton
          active={false}
          title="Clear"
          description="Remove every geometry"
          Icon={Trash2}
          onClick={onClearAll}
        />

        {drawingTool !== "none" ? (
          <ToolButton
            active={false}
            title="Close"
            description="Exit drawing mode"
            Icon={X}
            onClick={() => onSelectTool("none")}
          />
        ) : null}
      </div>

      {activeToolHint ? (
        <div className="pointer-events-auto max-w-xs rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--foreground-soft)]">
          {activeToolHint}
        </div>
      ) : null}

      {canShowDraftCard ? (
        <div className="pointer-events-auto max-w-xs rounded-[1.6rem] border border-cyan-400/20 bg-[var(--surface-overlay)] px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
            Drawing
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
            {draftState.vertexCount > 0
              ? `${draftState.vertexCount} vertex${draftState.vertexCount === 1 ? "" : "es"}`
              : "Tap the map to start"}
          </div>
          <div className="mt-1 text-sm text-[var(--muted-foreground)]">
            {draftState.measurementLabel ??
              "Distance updates in miles. Area tools update in acres."}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={onUndoDraft}
              disabled={!draftState.canUndo}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Undo vertex
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={onCompleteDraft}
              disabled={!canCompleteDraft}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Finish
            </Button>
          </div>
        </div>
      ) : null}

      {selectedShape ? (
        <div className="pointer-events-auto max-w-xs rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Selected geometry
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {selectedShape.type === "point"
                  ? selectedShape.label ?? "Pin"
                  : SHAPE_LABELS[selectedShape.type]}
              </div>
              {selectedShape.measurementLabel ? (
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selectedShape.measurementLabel}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => onDeleteShape(selectedShape.id)}
              aria-label="Delete selected geometry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {selectedShape.type === "point" ? (
            <div className="mt-3">
              <PinLabelEditor shape={selectedShape} onRename={onRenameShape} />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {drawnShapes.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => onSelectShape(shape.id)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  shape.id === selectedShape.id
                    ? "border-cyan-300/60 bg-cyan-400/18 text-cyan-50"
                    : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                {shape.type === "point" ? shape.label ?? "Pin" : SHAPE_LABELS[shape.type]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!selectedShape && drawnShapes.length > 0 ? (
        <button
          type="button"
          className="pointer-events-auto max-w-xs rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-3 text-left text-sm text-[var(--muted-foreground)] shadow-[var(--shadow-panel)] backdrop-blur-xl"
          onClick={() => onSelectShape(drawnShapes.at(-1)?.id ?? null)}
        >
          {drawnShapes.length} geometry saved. Tap to select the latest AOI.
        </button>
      ) : null}
    </div>
  );
}
