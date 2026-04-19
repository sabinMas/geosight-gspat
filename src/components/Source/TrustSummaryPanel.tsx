"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TrustPanelSummary } from "@/lib/source-trust";
import { cn } from "@/lib/utils";
import { DataSourceMeta, SiteFactorScore } from "@/types";
import { StateBadge } from "@/components/Status/StatePanel";
import { SourceInlineSummary } from "@/components/Source/SourceInlineSummary";

interface TrustSummaryPanelProps {
  summary: TrustPanelSummary;
  sources?: Array<DataSourceMeta | null | undefined>;
  eyebrow?: string;
  note?: string;
  className?: string;
  initialVisibleCount?: number;
  /** Optional scoring factors for factor→source reverse lookup in each SourceInlineSummary. */
  factors?: SiteFactorScore[];
}

export function TrustSummaryPanel({
  summary,
  sources = [],
  eyebrow = "Data status",
  note,
  className,
  initialVisibleCount = 3,
  factors,
}: TrustSummaryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const normalizedSources = useMemo(
    () => sources.filter((source): source is DataSourceMeta => Boolean(source)),
    [sources],
  );
  const visibleSources =
    expanded || normalizedSources.length <= initialVisibleCount
      ? normalizedSources
      : normalizedSources.slice(0, initialVisibleCount);

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">{eyebrow}</div>
          <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {summary.title}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            {summary.description}
          </p>
        </div>
        <StateBadge tone={summary.tone} label={summary.badgeLabel} className="shrink-0" />
      </div>

      {visibleSources.length ? (
        <div className="mt-4 flex flex-col divide-y divide-[color:var(--border-soft)]">
          {visibleSources.map((source) => (
            <SourceInlineSummary key={source.id} source={source} compact className="rounded-none border-0 first:rounded-t-[1rem] last:rounded-b-[1rem] py-3" factors={factors} />
          ))}
        </div>
      ) : null}

      {normalizedSources.length > initialVisibleCount ? (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground-soft)] transition hover:bg-[var(--surface-panel)]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show fewer sources" : `Show all ${normalizedSources.length} sources`}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      ) : null}

      {note ? (
        <div className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">{note}</div>
      ) : null}
    </div>
  );
}
