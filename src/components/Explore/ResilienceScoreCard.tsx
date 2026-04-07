"use client";

import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { buildResilienceScore, ResilienceDomain } from "@/lib/resilience-score";
import { GeodataResult } from "@/types";

const STATUS_STYLES: Record<
  ResilienceDomain["status"],
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  good: {
    bg: "bg-[var(--success-soft)]",
    border: "border-[color:var(--success-border)]",
    text: "text-[var(--foreground)]",
    dot: "bg-[color:var(--success-border)]",
    label: "Good",
  },
  caution: {
    bg: "bg-[var(--warning-soft)]",
    border: "border-[color:var(--warning-border)]",
    text: "text-[var(--warning-foreground)]",
    dot: "bg-[color:var(--warning-border)]",
    label: "Caution",
  },
  risk: {
    bg: "bg-[var(--danger-soft)]",
    border: "border-[color:var(--danger-border)]",
    text: "text-[var(--danger-foreground)]",
    dot: "bg-[color:var(--danger-border)]",
    label: "Risk",
  },
  unknown: {
    bg: "bg-[var(--surface-soft)]",
    border: "border-[color:var(--border-soft)]",
    text: "text-[var(--muted-foreground)]",
    dot: "bg-[color:var(--border-soft)]",
    label: "Unknown",
  },
};

function compositeBand(composite: number): {
  label: string;
  bg: string;
  border: string;
  text: string;
} {
  if (composite >= 75) {
    return {
      label: "Good resilience",
      bg: "bg-[var(--success-soft)]",
      border: "border-[color:var(--success-border)]",
      text: "text-[var(--foreground)]",
    };
  }
  if (composite >= 50) {
    return {
      label: "Mixed resilience",
      bg: "bg-[var(--warning-soft)]",
      border: "border-[color:var(--warning-border)]",
      text: "text-[var(--warning-foreground)]",
    };
  }
  return {
    label: "Elevated risk",
    bg: "bg-[var(--danger-soft)]",
    border: "border-[color:var(--danger-border)]",
    text: "text-[var(--danger-foreground)]",
  };
}

function DomainRow({ domain }: { domain: ResilienceDomain }) {
  const style = STATUS_STYLES[domain.status];

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${style.border} ${style.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {domain.label}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold cursor-default pointer-events-none select-none ${style.border} ${style.text}`}
        >
          {domain.score}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
        <div
          className={`h-full rounded-full ${style.dot}`}
          style={{ width: `${domain.score}%` }}
          aria-label={`Score: ${domain.score} out of 100`}
        />
      </div>

      <p className={`text-xs leading-5 ${style.text}`}>{domain.detail}</p>
    </div>
  );
}

export function ResilienceScoreCard({ geodata }: { geodata: GeodataResult | null }) {
  const result = buildResilienceScore(geodata);

  if (!result) {
    return (
      <WorkspaceCardShell
        eyebrow="Hazard resilience"
        title="Resilience score"
        empty
        emptyTitle="Search a location to see the multi-hazard resilience score."
        emptyDescription="The resilience score is computed from FEMA, EPA, NASA FIRMS, air quality, and seismic data."
      >
        {null}
      </WorkspaceCardShell>
    );
  }

  const band = compositeBand(result.composite);

  return (
    <WorkspaceCardShell eyebrow="Hazard resilience" title="Resilience score">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-5xl font-semibold tabular-nums text-[var(--foreground)]">
            {result.composite}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            out of 100
          </div>
        </div>
        <div
          className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold cursor-default pointer-events-none select-none ${band.border} ${band.bg} ${band.text}`}
        >
          {band.label}
        </div>
      </div>

      <div className="space-y-2">
        {result.domains.map((domain) => (
          <DomainRow key={domain.key} domain={domain} />
        ))}
      </div>

      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          Composite derived from FEMA, EPA, NASA FIRMS, Open-Meteo, and USGS seismic data. Domains with unavailable source data contribute a neutral fallback score.
        </p>
      </div>
    </WorkspaceCardShell>
  );
}
