"use client";

import { Loader2, AlertTriangle, CheckCircle2, Clock3, DatabaseZap, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StateTone =
  | "loading"
  | "ready"
  | "partial"
  | "cached"
  | "estimated"
  | "unavailable"
  | "error";

const STATE_TONE_STYLES: Record<
  StateTone,
  {
    badge: string;
    panel: string;
    icon: typeof Loader2;
    label: string;
    iconClassName?: string;
  }
> = {
  loading: {
    badge: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
    panel: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
    icon: Loader2,
    label: "Loading live data",
    iconClassName: "animate-spin",
  },
  ready: {
    badge: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]",
    panel: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]",
    icon: CheckCircle2,
    label: "Live context ready",
  },
  partial: {
    badge: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
    panel: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
    icon: AlertTriangle,
    label: "Partial coverage",
  },
  cached: {
    badge: "border-[color:var(--border-strong)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    panel: "border-[color:var(--border-strong)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    icon: Clock3,
    label: "Recent cached context",
  },
  estimated: {
    badge: "border-[color:var(--border-strong)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    panel: "border-[color:var(--border-strong)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    icon: Sparkles,
    label: "Estimated synthesis",
  },
  unavailable: {
    badge: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]",
    panel: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]",
    icon: DatabaseZap,
    label: "Data unavailable",
  },
  error: {
    badge: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]",
    panel: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]",
    icon: AlertTriangle,
    label: "Needs attention",
  },
};

interface StateBadgeProps {
  tone: StateTone;
  label?: string;
  className?: string;
}

export function StateBadge({ tone, label, className }: StateBadgeProps) {
  const config = STATE_TONE_STYLES[tone];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
        config.badge,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} />
      {label ?? config.label}
    </span>
  );
}

interface StatePanelProps {
  tone: StateTone;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function StatePanel({
  tone,
  eyebrow,
  title,
  description,
  action,
  className,
  compact = false,
}: StatePanelProps) {
  const config = STATE_TONE_STYLES[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft)]",
        config.panel,
        compact ? "space-y-2" : "space-y-3",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-2 flex min-w-0 items-start gap-3">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClassName)} />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-sm leading-6 opacity-90">{description}</div>
            </div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
