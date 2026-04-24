"use client";

import {
  BookOpen,
  Car,
  Circle,
  Crosshair,
  Download,
  Grid2x2,
  Hand,
  Layers,
  MapPin,
  Mountain,
  MousePointer,
  PenTool,
  Ruler,
  ScanSearch,
  ScrollText,
  Undo2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────────────────────────

interface ToolEntry {
  Icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  tip?: string;
  shortcut?: string;
}

interface ToolSection {
  title: string;
  tools: ToolEntry[];
}

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: "Globe Navigation",
    tools: [
      {
        Icon: MousePointer,
        name: "Analyze location",
        description: "Click anywhere on the globe to pull live data for that point — terrain, hazards, nearby places, and a mission score.",
        shortcut: "Left click",
      },
      {
        Icon: Hand,
        name: "Pan & rotate",
        description: "Left-click drag to pan the view. Right-click drag to tilt and orbit around the active point.",
        shortcut: "Drag",
      },
      {
        Icon: ZoomIn,
        name: "Zoom",
        description: "Scroll the mouse wheel or pinch on a trackpad to zoom in and out.",
        shortcut: "Scroll / Pinch",
      },
      {
        Icon: Car,
        name: "Drive mode",
        description: "Move through the terrain at ground level. WASD or arrow keys control movement and look direction.",
        tip: "Press D or use the Drive button in the toolbar to enter/exit.",
        shortcut: "D",
      },
    ],
  },
  {
    title: "Drawing & Markup",
    tools: [
      {
        Icon: PenTool,
        name: "Draw area",
        description: "Click to place polygon corners. Right-click to close and complete the polygon. Useful for marking a study zone.",
        tip: "The completed polygon shows its area on the canvas label.",
      },
      {
        Icon: MapPin,
        name: "Drop pin",
        description: "Single click to place a named marker anywhere on the globe. Click the label to rename it.",
        tip: "Pin labels are saved to your session and exported in GeoJSON.",
      },
      {
        Icon: Ruler,
        name: "Measure",
        description: "Click to add waypoints along a path. Right-click to finish. Each segment shows its length; the total distance appears on the last label.",
        tip: "You can measure curved routes by adding many waypoints.",
      },
      {
        Icon: Circle,
        name: "Radius circle",
        description: "Click the center point, then click a second point to set the radius. The circle shows its radius in the label.",
        tip: "Useful for proximity analysis — e.g. everything within 5 km of a site.",
      },
      {
        Icon: Grid2x2,
        name: "Snap to grid",
        description: "Snaps new drawing vertices to a ~100 m grid for cleaner alignment. Toggle on while any drawing tool is active.",
      },
      {
        Icon: Undo2,
        name: "Undo / Redo",
        description: "Step back or forward through drawing actions. Undo removes the last placed shape; Redo restores it.",
        shortcut: "Ctrl+Z / Ctrl+Y",
      },
      {
        Icon: Download,
        name: "Export GeoJSON",
        description: "Downloads all drawn shapes as a standards-compliant GeoJSON file. Compatible with QGIS, Mapbox, Felt, and most GIS tools.",
        tip: "Appears in the toolbar once you have at least one shape.",
      },
      {
        Icon: Upload,
        name: "Import file",
        description: "Load an existing GeoJSON or KML file to display it on the globe. Shapes appear alongside any you have drawn.",
        tip: "You can also drag and drop a file onto the globe to import it.",
      },
    ],
  },
  {
    title: "Map & Identify Tools",
    tools: [
      {
        Icon: ScanSearch,
        name: "Identify features",
        description: "Enter identify mode, then click any rendered map feature to inspect its attributes — road name, land cover type, building footprint, and more.",
        tip: "Results appear in a popup. Press I or click the Identify button in the header.",
        shortcut: "I",
      },
      {
        Icon: Crosshair,
        name: "Go to coordinates",
        description: "Jump the globe directly to a specific latitude and longitude. Accepts decimal degrees in the format lat, lng.",
        shortcut: "Ctrl+G",
      },
      {
        Icon: Layers,
        name: "Basemap selector",
        description: "Switch between Satellite imagery, Road map, and Hillshade (shaded terrain relief) as the background layer.",
        tip: "Hillshade is best for understanding topography; Satellite for land cover.",
      },
      {
        Icon: ScrollText,
        name: "Data layers",
        description: "Toggle analysis overlays like heatmaps and scored grids on top of the basemap to visualise spatial patterns across a region.",
        tip: "Layers are available via the Layers button (L) in the toolbar.",
        shortcut: "L",
      },
    ],
  },
  {
    title: "Spatial Export",
    tools: [
      {
        Icon: Mountain,
        name: "Heightmap export",
        description: "Generates a 16-bit grayscale PNG elevation map for the visible map region using AWS terrain tiles. Import it into Unreal Engine (Landscape), Unity (Terrain Toolkit), or QGIS as a single-band raster.",
        tip: "Open the Heightmap export card from the card library. The export covers the active region at up to 505×505 resolution.",
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ToolReferenceSheetProps {
  open: boolean;
  onClose: () => void;
}

function ToolCard({ tool }: { tool: ToolEntry }) {
  return (
    <div className="flex gap-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)]">
        <tool.Icon className="h-4 w-4 text-[var(--foreground-soft)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">{tool.name}</span>
          {tool.shortcut && (
            <kbd className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 font-[var(--font-jetbrains-mono)] text-[11px] text-[var(--muted-foreground)]">
              {tool.shortcut}
            </kbd>
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--foreground-soft)]">{tool.description}</p>
        {tool.tip && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--accent)]">Tip:</span> {tool.tip}
          </p>
        )}
      </div>
    </div>
  );
}

export function ToolReferenceSheet({ open, onClose }: ToolReferenceSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(4,10,18,0.72)] p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close tool reference"
        onClick={onClose}
      />

      <section
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]"
        style={{ maxHeight: "min(90vh, 800px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Tool reference"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div>
            <div className="eyebrow">Help</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
              Tool reference
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              A quick guide to every tool in the workspace.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close tool reference"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-5">
          <div className="space-y-8">
            {TOOL_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {section.title}
                </div>
                <div className={cn(
                  "grid gap-3",
                  section.tools.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
                )}>
                  {section.tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
