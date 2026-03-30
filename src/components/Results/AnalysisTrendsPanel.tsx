"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSourceTimestamp,
  formatSourceStatusLabel,
  getSourceStatusTone,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import { DataTrend } from "@/types";

interface AnalysisTrendsPanelProps {
  trends: DataTrend[];
  headerContent?: ReactNode;
}

const TONE_CLASSES: Record<DataTrend["direction"], string> = {
  positive: "border-emerald-300/20 bg-emerald-400/8 text-[var(--foreground)]",
  neutral: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
  watch: "border-amber-300/20 bg-amber-400/8 text-[var(--foreground)]",
};

export function AnalysisTrendsPanel({ trends, headerContent }: AnalysisTrendsPanelProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="eyebrow">Analysis board</div>
        <CardTitle>Area analysis</CardTitle>
        {headerContent}
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => setShowEvidence((current) => !current)}
          className="flex w-full items-center justify-between rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-left"
        >
          <div>
            <div className="eyebrow">Evidence detail</div>
            <div className="mt-1 text-sm text-[var(--muted-foreground)]">
              {showEvidence ? "Hide source metadata on each trend card." : "Show source metadata on each trend card."}
            </div>
          </div>
          {showEvidence ? (
            <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
          )}
        </button>

        <div className="grid gap-3">
          {trends.map((trend) => (
            <div
              key={trend.id}
              className={`rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft)] ${TONE_CLASSES[trend.direction]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="eyebrow text-current/70">{trend.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{trend.value}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${getSourceStatusTone(
                      trend.source.status,
                    )}`}
                  >
                    {formatSourceStatusLabel(trend.source.status)}
                  </div>
                  {trend.source.accessType ? (
                    <div className="text-[9px] uppercase tracking-[0.14em] text-current/50">
                      {trend.source.accessType.replace("_", " ")}
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-current/85">{trend.detail}</p>
              {showEvidence ? (
                <div className="mt-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs leading-5 text-[var(--foreground)]/85">
                  <div className="font-medium text-[var(--foreground)]">{trend.source.label}</div>
                  <div className="mt-1">{summarizeSourceMeta(trend.source)}</div>
                  <div className="mt-1 text-[var(--foreground-soft)]/80">
                    {formatSourceTimestamp(trend.source.lastUpdated)}
                  </div>
                  <div className="mt-1 text-[var(--foreground-soft)]/80">{trend.source.confidence}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
