"use client";

import { ReactNode, useMemo, useState } from "react";
import { SourceInfoButton } from "@/components/Source/SourceInfoButton";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTrend } from "@/types";

interface AnalysisTrendsPanelProps {
  trends: DataTrend[];
  headerContent?: ReactNode;
}

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
        <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
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
      <div className="mt-2 text-[11px] text-[var(--muted-foreground)] opacity-70">
        {trend.source.provider}
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
