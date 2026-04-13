"use client";

import {
  Activity,
  AlertTriangle,
  CloudRain,
  Droplets,
  ExternalLink,
  Flame,
  Wind,
} from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, GdacsAlertSummaryItem } from "@/types";

interface DisasterAlertsCardProps {
  geodata: GeodataResult | null;
}

function eventIcon(eventType: string) {
  const t = eventType.toUpperCase();
  if (t === "TC") return Wind;
  if (t === "EQ") return Activity;
  if (t === "FL") return CloudRain;
  if (t === "DR") return Droplets;
  if (t === "WF" || t === "VO") return Flame;
  return AlertTriangle;
}

function alertLevelClasses(level: string) {
  const l = level.toLowerCase();
  if (l === "red")
    return {
      badge: "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]",
      row: "border-[color:var(--danger-border)] bg-[var(--danger-soft)]",
    };
  if (l === "orange")
    return {
      badge: "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]",
      row: "border-[color:var(--warning-border)] bg-[var(--warning-soft)]",
    };
  return {
    badge: "bg-[var(--surface-soft)] border-[color:var(--border-soft)] text-[var(--foreground)]",
    row: "border-[color:var(--border-soft)] bg-[var(--surface-soft)]",
  };
}

function formatAlertDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function AlertRow({ alert }: { alert: GdacsAlertSummaryItem }) {
  const classes = alertLevelClasses(alert.alertLevel);
  const Icon = eventIcon(alert.eventType);
  const fromDate = formatAlertDate(alert.fromDate);
  const toDate = formatAlertDate(alert.toDate ?? alert.datemodified);

  return (
    <div className={`rounded-[1.25rem] border p-4 ${classes.row}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current bg-[var(--surface-overlay)] opacity-70">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)] leading-snug">
              {alert.eventLabel || alert.eventType}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] cursor-default pointer-events-none select-none ${classes.badge}`}
            >
              {alert.alertLevel}
            </span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {alert.country}
            {alert.distanceKm !== null
              ? ` · ${alert.distanceKm.toFixed(0)} km from search point`
              : ""}
            {fromDate ? ` · ${fromDate}${toDate && toDate !== fromDate ? ` – ${toDate}` : ""}` : ""}
          </div>
          {alert.description ? (
            <p className="text-xs leading-5 text-[var(--foreground)] opacity-75">
              {alert.description}
            </p>
          ) : null}
        </div>
        {alert.reportUrl ? (
          <a
            href={alert.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View GDACS report for ${alert.eventLabel || alert.eventType}`}
            className="mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function headerBadge(totalAlerts: number, redAlerts: number, orangeAlerts: number) {
  if (redAlerts > 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--danger-foreground)]">
        {redAlerts} Red-level alert{redAlerts > 1 ? "s" : ""} active
      </div>
    );
  }
  if (orangeAlerts > 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--warning-foreground)]">
        {orangeAlerts} elevated alert{orangeAlerts > 1 ? "s" : ""} active
      </div>
    );
  }
  if (totalAlerts > 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--foreground)]">
        {totalAlerts} active alert{totalAlerts > 1 ? "s" : ""}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--foreground)]">
      No active alerts
    </div>
  );
}

export function DisasterAlertsCard({ geodata }: DisasterAlertsCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Global disaster feed" title="Live disaster alerts" loading={true} />
    );
  }

  const { hazardAlerts } = geodata;
  const sources = [geodata.sources.hazardAlerts];
  const trustSummary = summarizeSourceTrust(sources, "Disaster alerts");

  return (
    <WorkspaceCardShell
      eyebrow="Global disaster feed"
      title="Live disaster alerts"
      error={!hazardAlerts ? "GDACS alert feed unavailable for this location." : null}
      headerExtra={
        hazardAlerts
          ? headerBadge(
              hazardAlerts.totalCurrentAlerts,
              hazardAlerts.redCurrentAlerts,
              hazardAlerts.orangeCurrentAlerts,
            )
          : null
      }
    >
      {hazardAlerts ? (
        <>
          {/* Summary stat row */}
          {hazardAlerts.totalCurrentAlerts > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
                <div className="text-2xl font-semibold text-[var(--foreground)]">
                  {hazardAlerts.totalCurrentAlerts}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Active alerts</div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-center">
                <div className="text-2xl font-semibold text-[var(--warning-foreground)]">
                  {hazardAlerts.elevatedCurrentAlerts}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Elevated (Orange+)</div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-center">
                <div className="text-2xl font-semibold text-[var(--danger-foreground)]">
                  {hazardAlerts.redCurrentAlerts}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Critical (Red)</div>
              </div>
            </div>
          )}

          {/* Alert list */}
          {hazardAlerts.featuredAlerts.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Active events
              </div>
              {hazardAlerts.featuredAlerts.map((alert) => (
                <AlertRow
                  key={`${alert.eventId}-${alert.episodeId}`}
                  alert={alert}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-[color:var(--success-border)] bg-[var(--success-soft)] p-5">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                No active GDACS alerts are present in the current disaster feed. GeoSight monitors
                GDACS for flood, earthquake, tropical cyclone, drought, and wildfire events at Orange
                and Red alert levels.
              </p>
            </div>
          )}

          {/* Nearest alert callout */}
          {hazardAlerts.nearestAlert &&
            !hazardAlerts.featuredAlerts.some(
              (a) =>
                a.eventId === hazardAlerts.nearestAlert!.eventId &&
                a.episodeId === hazardAlerts.nearestAlert!.episodeId,
            ) && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Nearest alert to search point
                </div>
                <AlertRow alert={hazardAlerts.nearestAlert} />
              </div>
            )}

          <TrustSummaryPanel
            summary={trustSummary}
            sources={sources}
            note="GDACS (Global Disaster Alert and Coordination System) is a UN/EU joint initiative publishing live alert feeds for earthquakes, floods, tropical cyclones, droughts, and wildfires. GeoSight filters to Orange and Red-level events within the feed."
          />
        </>
      ) : null}
    </WorkspaceCardShell>
  );
}
