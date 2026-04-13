"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { buildHazardResilienceSummary } from "@/lib/scoring";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, HazardDomainScore, HazardRiskTier } from "@/types";

const TIER_STYLES: Record<HazardRiskTier, { bg: string; border: string; text: string; label: string }> = {
  low:      { bg: "bg-[var(--success-soft)]",  border: "border-[color:var(--success-border)]",  text: "text-[var(--foreground)]",         label: "Low risk" },
  moderate: { bg: "bg-[var(--surface-soft)]",   border: "border-[color:var(--border-soft)]",     text: "text-[var(--foreground)]",         label: "Moderate" },
  elevated: { bg: "bg-[var(--warning-soft)]",   border: "border-[color:var(--warning-border)]",  text: "text-[var(--warning-foreground)]", label: "Elevated" },
  critical: { bg: "bg-[var(--danger-soft)]",    border: "border-[color:var(--danger-border)]",   text: "text-[var(--danger-foreground)]",  label: "Critical" },
};

function DomainRow({ domain }: { domain: HazardDomainScore }) {
  const style = TIER_STYLES[domain.tier];
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start sm:justify-between ${style.border} ${style.bg}`}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {domain.label}
          </span>
          {!domain.available ? (
            <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
              {domain.coverage === "us_only" ? "US only" : "unavailable"}
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">{domain.detail}</p>
      </div>
      <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold cursor-default pointer-events-none select-none ${style.border} ${style.text}`}>
        {style.label}
      </div>
    </div>
  );
}

export function MultiHazardResilienceCard({ geodata }: { geodata: GeodataResult | null }) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Hazard resilience" title="Multi-hazard resilience" loading={true} />
    );
  }

  const summary = buildHazardResilienceSummary(geodata);
  const overallStyle = TIER_STYLES[summary.tier];
  const allSources = [
    geodata.sources.hazards,
    geodata.sources.hazardFire,
    geodata.sources.hazardAlerts,
    geodata.sources.floodZone,
    geodata.sources.seismicDesign,
    geodata.sources.airQuality ?? geodata.sources.climate,
    geodata.sources.epaHazards,
  ];
  const trustSummary = summarizeSourceTrust(allSources, "Multi-hazard resilience");

  return (
    <WorkspaceCardShell
      eyebrow="Hazard resilience"
      title="Multi-hazard resilience"
      headerExtra={
        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <div className="text-3xl font-semibold text-[var(--foreground)]">{summary.compoundScore}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">out of 100</div>
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${overallStyle.border} ${overallStyle.bg}`}>
              {summary.tier === "low" ? (
                <ShieldCheck className={`h-5 w-5 ${overallStyle.text}`} />
              ) : (
                <ShieldAlert className={`h-5 w-5 ${overallStyle.text}`} />
              )}
            </div>
          </div>
          {summary.worstDomain && summary.worstDomain.tier !== "low" ? (
            <div className="flex items-center gap-2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs text-[var(--warning-foreground)]">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" />
              Highest concern: {summary.worstDomain.label} ({TIER_STYLES[summary.worstDomain.tier].label.toLowerCase()})
            </div>
          ) : null}
        </div>
      }
    >
        {summary.domains.map((domain) => (
          <DomainRow key={domain.domain} domain={domain} />
        ))}

        <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-xs leading-5 text-[var(--warning-foreground)]">
          This compound score is a first-pass screening tool. It combines live hazard feeds using fixed weights and is not a substitute for a site-specific risk assessment from a certified hazard analyst.
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={allSources}
          note="Seismic, flood, and contamination domains are US-only. Fire and disaster alerts are globally sourced. Non-US locations receive neutral fallback scores for unavailable domains."
        />
    </WorkspaceCardShell>
  );
}
