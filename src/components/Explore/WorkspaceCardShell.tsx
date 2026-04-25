"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatePanel } from "@/components/Status/StatePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCardDisplay } from "@/context/CardDisplayContext";
import { cn } from "@/lib/utils";

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
  children?: React.ReactNode;
  /** Extra content always rendered in CardHeader below the title */
  headerExtra?: React.ReactNode;
  /** Override the context defaultCollapsed for this card */
  defaultCollapsed?: boolean;
  /** Optional retry / action button rendered in error and empty states */
  errorAction?: {
    label: string;
    onClick: () => void;
  };
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
  defaultCollapsed: defaultCollapsedProp,
  errorAction,
}: WorkspaceCardShellProps) {
  const { defaultCollapsed: contextCollapsed } = useCardDisplay();
  const startCollapsed = defaultCollapsedProp ?? contextCollapsed;
  const [collapsed, setCollapsed] = useState(startCollapsed);

  const collapsible = startCollapsed; // only collapsible if it started collapsed

  return (
    <Card>
      <CardHeader
        className={cn(
          "space-y-3",
          collapsible && "cursor-pointer select-none",
        )}
        onClick={collapsible ? () => setCollapsed((v) => !v) : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="eyebrow">{eyebrow}</div>
          {collapsible ? (
            <button
              type="button"
              aria-label={collapsed ? "Expand card" : "Collapse card"}
              className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((v) => !v);
              }}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
        <CardTitle>{title}</CardTitle>
        {!collapsed && subtitle ? (
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{subtitle}</p>
        ) : null}
        {!collapsed && headerExtra ? headerExtra : null}
      </CardHeader>

      {!collapsed ? (
        <CardContent className="min-w-0 space-y-4">
          {loading ? (
            <div className="space-y-3 py-1">
              {loadingTitle || loadingDescription ? (
                <div className="space-y-1">
                  {loadingTitle ? (
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {loadingTitle}
                    </div>
                  ) : null}
                  {loadingDescription ? (
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                      {loadingDescription}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          ) : error ? (
            <>
              <StatePanel
                tone="error"
                eyebrow={eyebrow}
                title={`${title} could not load`}
                description={error}
                compact
              />
              {errorAction && (
                <Button
                  variant="secondary"
                  className="rounded-full mt-2"
                  onClick={errorAction.onClick}
                >
                  {errorAction.label}
                </Button>
              )}
            </>
          ) : empty ? (
            <>
              <StatePanel
                tone="unavailable"
                eyebrow={eyebrow}
                title={emptyTitle ?? `${title} is not available here`}
                description={emptyDescription ?? "No data was returned for this location."}
                compact
              />
              {errorAction && (
                <Button
                  variant="secondary"
                  className="rounded-full mt-2"
                  onClick={errorAction.onClick}
                >
                  {errorAction.label}
                </Button>
              )}
            </>
          ) : (
            children
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
