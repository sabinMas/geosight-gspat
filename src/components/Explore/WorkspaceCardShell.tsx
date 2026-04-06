"use client";

import { ReactNode } from "react";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceCardShellProps {
  /** Eyebrow label above the card title */
  eyebrow: string;
  /** Card title */
  title: string;
  /** Optional subtitle rendered below the title */
  subtitle?: string;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Error message string if load failed */
  error?: string | null;
  /** Whether there is no data to show (after load completes) */
  empty?: boolean;
  /** Custom loading message */
  loadingTitle?: string;
  loadingDescription?: string;
  /** Custom empty state */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Rendered when not loading/error/empty */
  children: ReactNode;
  /** Extra content always rendered in CardHeader below the title */
  headerExtra?: ReactNode;
}

export function WorkspaceCardShell({
  eyebrow,
  title,
  subtitle,
  loading,
  error,
  empty,
  loadingTitle,
  loadingDescription,
  emptyTitle,
  emptyDescription,
  children,
  headerExtra,
}: WorkspaceCardShellProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">{eyebrow}</div>
        <CardTitle>{title}</CardTitle>
        {subtitle ? (
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{subtitle}</p>
        ) : null}
        {headerExtra}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <StatePanel
            tone="loading"
            eyebrow={eyebrow}
            title={loadingTitle ?? `Loading ${title.toLowerCase()}`}
            description={loadingDescription ?? "Gathering live data for this location."}
            compact
          />
        ) : error ? (
          <StatePanel
            tone="error"
            eyebrow={eyebrow}
            title={`${title} could not load`}
            description={error}
            compact
          />
        ) : empty ? (
          <StatePanel
            tone="unavailable"
            eyebrow={eyebrow}
            title={emptyTitle ?? `${title} is not available here`}
            description={emptyDescription ?? "No data was returned for this location."}
            compact
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
