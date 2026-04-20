"use client";

import { ChevronDown, ChevronRight, Crosshair, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IdentifyHit, IdentifyResult } from "@/types";

/* ------------------------------------------------------------------ */
/*  Feature type badge colors                                          */
/* ------------------------------------------------------------------ */

function featureTypeBadge(type: IdentifyHit["featureType"]) {
  switch (type) {
    case "imagery":
      return {
        label: "WMS",
        className: "border-purple-300/30 bg-purple-400/12 text-purple-200",
      };
    case "entity":
      return {
        label: "Feature",
        className: "border-cyan-300/30 bg-cyan-400/12 text-cyan-200",
      };
    case "drawn-shape":
      return {
        label: "AOI",
        className: "border-teal-300/30 bg-teal-400/12 text-teal-200",
      };
    case "saved-site":
      return {
        label: "Site",
        className: "border-amber-300/30 bg-amber-400/12 text-amber-200",
      };
    case "fire":
      return {
        label: "Fire",
        className: "border-orange-300/30 bg-orange-400/12 text-orange-200",
      };
    case "earthquake":
      return {
        label: "Quake",
        className: "border-red-300/30 bg-red-400/12 text-red-200",
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Attribute table                                                    */
/* ------------------------------------------------------------------ */

function AttributeTable({
  attributes,
}: {
  attributes: Record<string, string | number | boolean | null>;
}) {
  const entries = Object.entries(attributes).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  if (entries.length === 0) {
    return (
      <p className="text-xs text-[var(--muted-foreground)]">No attributes</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--border-soft)]">
      <table className="w-full text-xs">
        <tbody>
          {entries.map(([key, value], idx) => (
            <tr
              key={key}
              className={cn(
                idx % 2 === 0
                  ? "bg-[var(--surface-soft)]"
                  : "bg-[var(--surface-panel)]",
              )}
            >
              <td className="px-2.5 py-1.5 font-medium text-[var(--foreground-soft)] whitespace-nowrap align-top">
                {key}
              </td>
              <td className="px-2.5 py-1.5 text-[var(--foreground)] break-all">
                {String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single hit row                                                     */
/* ------------------------------------------------------------------ */

function HitRow({ hit, defaultOpen }: { hit: IdentifyHit; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const badge = featureTypeBadge(hit.featureType);

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
          {hit.layerName}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-[color:var(--border-soft)] px-3 py-2.5">
          {hit.coordinates && (
            <p className="mb-2 text-xs tabular-nums text-[var(--muted-foreground)]">
              {hit.coordinates.lat.toFixed(6)}, {hit.coordinates.lng.toFixed(6)}
            </p>
          )}
          <AttributeTable attributes={hit.attributes} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

interface FeatureInspectorPanelProps {
  result: IdentifyResult | null;
  onClose: () => void;
}

export function FeatureInspectorPanel({
  result,
  onClose,
}: FeatureInspectorPanelProps) {
  if (!result) return null;
  return (
    <div className="absolute bottom-14 left-4 z-20 flex w-80 max-h-[60vh] flex-col rounded-2xl border border-[color:var(--border-soft)] bg-[var(--background)] shadow-[var(--shadow-panel)] backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Identify
          </span>
          <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
            {result.hits.length} hit{result.hits.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-full"
          onClick={onClose}
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Clicked coordinates */}
      <div className="border-b border-[color:var(--border-soft)] px-4 py-2">
        <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
          Click: {result.clickCoordinates.lat.toFixed(6)},{" "}
          {result.clickCoordinates.lng.toFixed(6)}
        </p>
      </div>

      {/* Hit list */}
      <div className="overflow-y-auto px-3 py-3">
        {result.hits.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">
            No features found at this location.
          </p>
        ) : (
          <div className="space-y-2">
            {result.hits.map((hit, idx) => (
              <HitRow key={`${hit.layerName}-${idx}`} hit={hit} defaultOpen={idx === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
