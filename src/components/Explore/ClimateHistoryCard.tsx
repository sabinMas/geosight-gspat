"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface ClimateHistoryCardProps {
  geodata: GeodataResult | null;
}

function trendBadge(trend: NonNullable<GeodataResult["climateHistory"]>["trendDirection"]) {
  switch (trend) {
    case "warming":
      return {
        label: "Warming trend",
        tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
      };
    case "cooling":
      return {
        label: "Cooling trend",
        tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]",
      };
    case "stable":
      return {
        label: "Stable",
        tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
      };
    default:
      return {
        label: "Trend unavailable",
        tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
      };
  }
}

function formatTemp(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)} C`;
}

export function ClimateHistoryCard({ geodata }: ClimateHistoryCardProps) {
  const [precipOpen, setPrecipOpen] = useState(false);

  if (!geodata) {
    return null;
  }

  const climateHistory = geodata.climateHistory;
  const trustSummary = summarizeSourceTrust(
    [geodata.sources.climateHistory],
    "Climate history",
  );
  if (!climateHistory || !climateHistory.summaries.length) {
    return (
      <WorkspaceCardShell eyebrow="Historical weather" title="Climate trends (10-year)">
        <StatePanel
          tone={geodata.sources.climateHistory.status === "unavailable" ? "unavailable" : "partial"}
          eyebrow="Trend coverage"
          title="Historical climate history is not fully available here"
          description={geodata.sources.climateHistory.note ?? "GeoSight could not assemble the 10-year climate archive for this point, so trend claims should stay conservative."}
          compact
        />
        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.climateHistory]}
          note="This card uses the Open-Meteo archive when long-range weather history is available for the selected point."
        />
      </WorkspaceCardShell>
    );
  }

  const badge = trendBadge(climateHistory.trendDirection);

  return (
    <WorkspaceCardShell eyebrow="Historical weather" title="Climate trends (10-year)">
        <div
          className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${badge.tone}`}
        >
          10-year trend: {badge.label}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <SafeResponsiveContainer className="h-64">
            <LineChart data={climateHistory.summaries}>
              <XAxis dataKey="year" stroke="#6b7d93" />
              <YAxis stroke="#6b7d93" />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                contentStyle={{
                  background: "#081221",
                  border: "1px solid rgba(0,229,255,0.18)",
                  borderRadius: 16,
                }}
              />
              <Line
                type="monotone"
                dataKey="avgTempC"
                stroke="#ff8a65"
                strokeWidth={3}
                dot={{ r: 3 }}
                name="Avg temp (C)"
              />
            </LineChart>
          </SafeResponsiveContainer>
          <div className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
            2015-2019 avg:{" "}
            <span className="text-[var(--foreground)]">
              {formatTemp(climateHistory.baselineAvgTempC)}
            </span>{" "}
            to 2020-2024 avg:{" "}
            <span className="text-[var(--foreground)]">
              {formatTemp(climateHistory.recentAvgTempC)}
            </span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
          <button
            type="button"
            onClick={() => setPrecipOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
          >
            {precipOpen ? "Hide precipitation history" : "Show precipitation history"}
          </button>
          {precipOpen ? (
            <>
              <div className="eyebrow mt-3">Annual precipitation context</div>
              <SafeResponsiveContainer className="mt-3 h-32">
                <BarChart data={climateHistory.summaries}>
                  <XAxis dataKey="year" hide />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#081221",
                      border: "1px solid rgba(0,229,255,0.18)",
                      borderRadius: 16,
                    }}
                  />
                  <Bar dataKey="totalPrecipitationMm" fill="#38bdf8" name="Precipitation (mm)" />
                </BarChart>
              </SafeResponsiveContainer>
            </>
          ) : null}
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.climateHistory]}
          note="GeoSight compares the more recent five-year average against the earlier five-year baseline so the user can tell whether conditions are warming, cooling, or staying roughly stable."
        />
    </WorkspaceCardShell>
  );
}
