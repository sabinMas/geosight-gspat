"use client";

import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { cn } from "@/lib/utils";
import {
  formatSourceTimestamp,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import { DataSourceMeta } from "@/types";

interface SourceInlineSummaryProps {
  source: DataSourceMeta;
  title?: string;
  compact?: boolean;
  className?: string;
}

export function SourceInlineSummary({
  source,
  title,
  compact = false,
  className,
}: SourceInlineSummaryProps) {
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
          <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {title ?? source.label}
          </div>
          <div className="mt-1 text-xs text-[var(--foreground-soft)]">
            {summarizeSourceMeta(source)}
          </div>
        </div>
        <SourceStatusBadge source={source} />
      </div>
      <div className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">
        {formatSourceTimestamp(source.lastUpdated)}
      </div>
      <div className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">
        {source.confidence}
      </div>
    </div>
  );
}
