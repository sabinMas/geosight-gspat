"use client";

import { Circle, MapPin, PenTool, Ruler, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawnShape, DrawingTool } from "@/types";

interface DrawingToolbarProps {
  drawingTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawnShapes: DrawnShape[];
  onClearAll: () => void;
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

export function DrawingToolbar({
  drawingTool,
  onSelectTool,
  drawnShapes,
  onClearAll,
}: DrawingToolbarProps) {
  const activeToolMeta = TOOLS.find((t) => t.id === drawingTool);

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
      ) : null}

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
    </div>
  );
}
