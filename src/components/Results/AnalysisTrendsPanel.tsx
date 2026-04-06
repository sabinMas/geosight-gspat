"use client";

import { ReactNode, useMemo, useState } from "react";
import { SourceInfoButton } from "@/components/Source/SourceInfoButton";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTrend, ScoreEvidenceKind } from "@/types";

interface AnalysisTrendsPanelProps {
  trends: DataTrend[];
  headerContent?: ReactNode;
}

const EVIDENCE_LABEL: Record<ScoreEvidenceKind, string> = {
  direct_live: "direct",
  derived_live: "derived",
  proxy: "proxy",
};

const EVIDENCE_CLS: Record<ScoreEvidenceKind, string> = {
  direct_live: "text-[var(--evidence-direct-fg)]",
  derived_live: "text-[var(--evidence-derived-fg)]",
  proxy: "text-[var(--evidence-proxy-fg)]",
};

function isUnavailableTrend(trend: DataTrend) {
  return (
    trend.source.status === "unavailable" ||
    trend.value === "Unavailable" ||
    trend.value === "Unsupported" ||
    trend.value === "--"
  );
}

function TrendSignalCard({
  trend,
  muted = false,
}: {
  trend: DataTrend;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)] ${muted ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {trend.label}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SourceStatusBadge source={trend.source} />
          <SourceInfoButton source={trend.source} title={`${trend.label} source`} />
        </div>
      </div>
      <div className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
        {trend.value}
      </div>
      <div
        className="mt-2 line-clamp-1 text-sm text-[var(--muted-foreground)]"
        title={trend.detail}
      >
        {trend.detail}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-[var(--muted-foreground)] opacity-70">{trend.source.provider}</span>
        {trend.evidenceKind ? (
          <span className={`font-medium ${EVIDENCE_CLS[trend.evidenceKind]}`}>
            {EVIDENCE_LABEL[trend.evidenceKind]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AnalysisTrendsPanel({ trends, headerContent }: AnalysisTrendsPanelProps) {
  const [showUnavailable, setShowUnavailable] = useState(false);
  const visibleTrends = useMemo(
    () => trends.filter((trend) => !isUnavailableTrend(trend)),
    [trends],
  );
  const unavailableTrends = useMemo(
    () => trends.filter((trend) => isUnavailableTrend(trend)),
    [trends],
  );
  const trendsToRender = visibleTrends.length > 0 ? visibleTrends : unavailableTrends;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="eyebrow">Data signals</div>
        {headerContent}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {trendsToRender.map((trend) => (
            <TrendSignalCard key={trend.id} trend={trend} />
          ))}
        </div>

        {unavailableTrends.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              {unavailableTrends.length} signal{unavailableTrends.length === 1 ? "" : "s"} unavailable
            </p>
            <button
              type="button"
              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
              onClick={() => setShowUnavailable((current) => !current)}
            >
              {showUnavailable ? "Hide missing signals" : "Show missing signals"}
            </button>
            {showUnavailable ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {unavailableTrends.map((trend) => (
                  <TrendSignalCard key={trend.id} trend={trend} muted />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
