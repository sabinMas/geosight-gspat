"use client";

import { Droplets } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { formatDistanceKm, sanitizeStreamGauges } from "@/lib/stream-gauges";
import { GeodataResult, StreamGaugeResult } from "@/types";

interface StreamGaugeCardProps {
  geodata: GeodataResult | null;
}

// Flow classification based on normalized runoff index (CFS per sq mi of drainage area)
// When drainage area is unknown, classify by raw CFS.
function classifyFlow(gauge: StreamGaugeResult): {
  label: string;
  tone: "success" | "accent" | "warning" | "danger" | "muted";
  description: string;
} {
  const cfs = gauge.dischargeCfs;
  const sqMi = gauge.drainageAreaSqMi;

  if (cfs === null) {
    return { label: "Unknown", tone: "muted", description: "No current discharge reading" };
  }

  if (cfs === 0) {
    return { label: "No flow", tone: "danger", description: "Zero discharge — gauge may be dry or frozen" };
  }

  // Use normalized runoff index when drainage area is available
  const index = sqMi && sqMi > 0 ? cfs / sqMi : null;

  if (index !== null) {
    if (index > 2.0) return { label: "High flow", tone: "success", description: `${cfs.toFixed(0)} cfs over ${sqMi!.toFixed(0)} sq mi drainage` };
    if (index > 0.5) return { label: "Normal flow", tone: "accent", description: `${cfs.toFixed(0)} cfs over ${sqMi!.toFixed(0)} sq mi drainage` };
    if (index > 0.1) return { label: "Low flow", tone: "warning", description: `${cfs.toFixed(0)} cfs — below-normal for watershed size` };
    return { label: "Very low flow", tone: "danger", description: `${cfs.toFixed(0)} cfs — critically low for watershed size` };
  }

  // Fallback: raw CFS without drainage context
  if (cfs > 5000) return { label: "High flow", tone: "success", description: `${cfs.toFixed(0)} cfs` };
  if (cfs > 500)  return { label: "Normal flow", tone: "accent", description: `${cfs.toFixed(0)} cfs` };
  if (cfs > 50)   return { label: "Low flow", tone: "warning", description: `${cfs.toFixed(0)} cfs` };
  return { label: "Very low flow", tone: "danger", description: `${cfs.toFixed(0)} cfs` };
}

function flowToneClasses(tone: ReturnType<typeof classifyFlow>["tone"]) {
  switch (tone) {
    case "success":
      return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
    case "accent":
      return "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]";
    case "warning":
      return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
    case "danger":
      return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
    default:
      return "border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)]";
  }
}

function buildAvailabilityRating(gauges: StreamGaugeResult[]): {
  label: string;
  description: string;
  tone: "success" | "accent" | "warning" | "danger";
} {
  if (!gauges.length) {
    return { label: "No gauge data", description: "No active USGS stream gauges within 50 km", tone: "danger" };
  }

  const withFlow = gauges.filter((g) => g.dischargeCfs !== null && g.dischargeCfs > 0);
  const nearestKm = gauges[0].distanceKm;
  const highOrNormal = withFlow.filter((g) => {
    const c = classifyFlow(g);
    return c.tone === "success" || c.tone === "accent";
  });

  if (nearestKm <= 5 && highOrNormal.length > 0) {
    return {
      label: "Good availability",
      description: `Nearest active gauge ${nearestKm.toFixed(1)} km away with adequate flow`,
      tone: "success",
    };
  }
  if (nearestKm <= 20 && highOrNormal.length > 0) {
    return {
      label: "Moderate availability",
      description: `Active gauges within ${nearestKm.toFixed(1)} km — review intake feasibility`,
      tone: "accent",
    };
  }
  if (withFlow.length > 0) {
    return {
      label: "Limited availability",
      description: `Nearest flowing gauge is ${nearestKm.toFixed(1)} km — long intake or trucking likely required`,
      tone: "warning",
    };
  }
  return {
    label: "Uncertain availability",
    description: "Gauges present but current flow data unavailable — check seasonally",
    tone: "warning",
  };
}

function ratingBadgeClasses(tone: "success" | "accent" | "warning" | "danger") {
  switch (tone) {
    case "success":  return "bg-[var(--success-soft)] border-[color:var(--success-border)] text-[var(--foreground)]";
    case "accent":   return "bg-[var(--accent-soft)] border-[color:var(--accent-strong)] text-[var(--accent-foreground)]";
    case "warning":  return "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]";
    default:         return "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]";
  }
}

export function StreamGaugeCard({ geodata }: StreamGaugeCardProps) {
  if (!geodata) return null;

  const gauges = sanitizeStreamGauges(geodata.streamGauges);
  const sources = [geodata.sources.water];
  const trustSummary = summarizeSourceTrust(sources, "Stream gauge network");

  if (!gauges.length) {
    return (
      <WorkspaceCardShell eyebrow="Hydrology" title="Stream gauge network">
        <StatePanel
          tone="partial"
          eyebrow="Coverage"
          title="No active gauges within range"
          description="No active USGS stream gauges were found within 50 km of this location. This card covers the contiguous United States only via USGS NWIS."
          compact
        />
        <TrustSummaryPanel
          summary={trustSummary}
          sources={sources}
          note="USGS National Water Information System — stream gauge network covers the contiguous US. International locations are not supported by this card."
        />
      </WorkspaceCardShell>
    );
  }

  const rating = buildAvailabilityRating(gauges);

  return (
    <WorkspaceCardShell
      eyebrow="Hydrology"
      title="Stream gauge network"
      headerExtra={
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${ratingBadgeClasses(rating.tone)}`}>
          {rating.label}
        </div>
      }
    >
      {/* Summary */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{rating.description}</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Active gauges</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">{gauges.length}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Within 50 km</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Nearest</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {formatDistanceKm(gauges[0].distanceKm)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">From point</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Peak flow</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {gauges[0].dischargeCfs !== null ? `${gauges[0].dischargeCfs.toFixed(0)} cfs` : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Nearest gauge</div>
        </div>
      </div>

      {/* Gauge list */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Active gauges — sorted by distance
        </div>
        <div className="space-y-3">
          {gauges.slice(0, 8).map((gauge) => {
            const flow = classifyFlow(gauge);
            return (
              <div key={gauge.siteNumber} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Droplets aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    <span className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                      {gauge.siteName}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatDistanceKm(gauge.distanceKm)} away
                    {gauge.drainageAreaSqMi !== null
                      ? ` · ${gauge.drainageAreaSqMi.toFixed(0)} sq mi drainage`
                      : ""}
                    {" · "}
                    <span className="text-[var(--muted-foreground)]">#{gauge.siteNumber}</span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">{flow.description}</div>
                </div>
                <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${flowToneClasses(flow.tone)}`}>
                  {flow.label}
                </div>
              </div>
            );
          })}
        </div>
        {gauges.length > 8 && (
          <div className="mt-3 text-xs text-[var(--muted-foreground)]">
            +{gauges.length - 8} additional gauge{gauges.length - 8 === 1 ? "" : "s"} within range
          </div>
        )}
      </div>

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="Discharge readings are instantaneous values from the USGS National Water Information System (NWIS) IV service. Flow classification uses normalized runoff index (CFS per square mile of drainage area) when available; falls back to raw CFS thresholds when drainage area is not mapped. This card covers the contiguous United States only."
      />
    </WorkspaceCardShell>
  );
}
