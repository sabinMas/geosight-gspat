"use client";

import { useMemo } from "react";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { cn } from "@/lib/utils";
import {
  formatSourceTimestamp,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import { DataSourceMeta, SiteFactorScore } from "@/types";

/**
 * Builds a map from sourceId → factor label display names.
 * Uses SiteFactorScore.sourceIds (added by WU-3) — gracefully skips factors
 * that don't carry sourceIds yet.
 */
function buildSourceFactorMap(
  factors: SiteFactorScore[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const factor of factors) {
    if (!factor.sourceIds) continue;
    for (const sourceId of factor.sourceIds) {
      if (!map[sourceId]) map[sourceId] = [];
      map[sourceId].push(factor.label);
    }
  }
  return map;
}

interface SourceInlineSummaryProps {
  source: DataSourceMeta;
  title?: string;
  compact?: boolean;
  className?: string;
  /** Optional scoring factors — used to render "Used in: …" pill row via reverse lookup. */
  factors?: SiteFactorScore[];
}

export function SourceInlineSummary({
  source,
  title,
  compact = false,
  className,
  factors,
}: SourceInlineSummaryProps) {
  const factorLabels = useMemo(() => {
    if (!factors) return [];
    const map = buildSourceFactorMap(factors);
    return map[source.id] ?? [];
  }, [factors, source.id]);

  return (
    <div
      className={cn(
        "rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)]",
        compact ? "px-3 py-2" : "p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {title ?? source.label}
          </div>
          <div className="mt-1 text-xs text-[var(--foreground-soft)]">
            {summarizeSourceMeta(source)}
          </div>
        </div>
        <SourceStatusBadge source={source} />
      </div>
      <div className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
        {formatSourceTimestamp(source.lastUpdated)}
      </div>
      <div className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
        {source.confidence}
      </div>
      {source.note ? (
        <div className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
          {source.note}
        </div>
      ) : null}
      {factorLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-[var(--muted-foreground)] cursor-default select-none">
            Used in:
          </span>
          {factorLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-[var(--surface-soft)] border border-[color:var(--border-soft)] px-2 py-0.5 text-xs text-[var(--foreground-soft)] cursor-default pointer-events-none select-none"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
