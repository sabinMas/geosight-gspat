"use client";

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
import { ClimateYearSummary } from "@/lib/climate-history";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface ClimateHistoryCardProps {
  geodata: GeodataResult | null;
}

type TrendDirection = "warming" | "cooling" | "stable" | "drying" | "wetting" | null;

function trendBadge(trend: TrendDirection, kind: "temp" | "precip") {
  if (kind === "temp") {
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

  // Precipitation
  switch (trend) {
    case "drying":
      return {
        label: "Drying trend",
        tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
      };
    case "wetting":
      return {
        label: "Wetting trend",
        tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]",
      };
    case "stable":
      return {
        label: "Stable precip",
        tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
      };
    default:
      return {
        label: "Precip trend unavailable",
        tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
      };
  }
}

function precipTrendDirection(summaries: ClimateYearSummary[]): TrendDirection {
  const baseline = summaries.filter((s) => s.year >= 2015 && s.year <= 2019);
  const recent = summaries.filter((s) => s.year >= 2020 && s.year <= 2024);
  if (baseline.length < 2 || recent.length < 2) return null;

  const avgBaseline = baseline.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / baseline.length;
  const avgRecent = recent.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / recent.length;
  if (avgBaseline === 0) return null;

  const delta = (avgRecent - avgBaseline) / avgBaseline;
  if (delta < -0.13) return "drying";
  if (delta > 0.13) return "wetting";
  return "stable";
}

function formatTemp(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)} C`;
}

function formatPrecip(value: number | null) {
  return value === null ? "--" : `${Math.round(value)} mm`;
}

export function ClimateHistoryCard({ geodata }: ClimateHistoryCardProps) {
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

  const tempBadge = trendBadge(climateHistory.trendDirection as TrendDirection, "temp");
  const precipDir = precipTrendDirection(climateHistory.summaries);
  const precipBadge = trendBadge(precipDir, "precip");

  // Baseline / recent precip averages for the summary line
  const baselineSummaries = climateHistory.summaries.filter((s) => s.year >= 2015 && s.year <= 2019);
  const recentSummaries = climateHistory.summaries.filter((s) => s.year >= 2020 && s.year <= 2024);
  const baselinePrecipMm = baselineSummaries.length
    ? Math.round(baselineSummaries.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / baselineSummaries.length)
    : null;
  const recentPrecipMm = recentSummaries.length
    ? Math.round(recentSummaries.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / recentSummaries.length)
    : null;

  const tooltipStyle = {
    background: "#081221",
    border: "1px solid rgba(0,229,255,0.18)",
    borderRadius: 16,
  };

  return (
    <WorkspaceCardShell eyebrow="Historical weather" title="Climate trends (10-year)">
      {/* Temperature trend */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Temperature
          </div>
          <span
            className={`cursor-default select-none rounded-full border px-3 py-1 text-xs pointer-events-none ${tempBadge.tone}`}
          >
            10-year: {tempBadge.label}
          </span>
        </div>
        <SafeResponsiveContainer className="h-52">
          <LineChart data={climateHistory.summaries}>
            <XAxis dataKey="year" stroke="#6b7d93" />
            <YAxis stroke="#6b7d93" />
            <Tooltip cursor={{ stroke: "rgba(255,255,255,0.08)" }} contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="avgTempC"
              stroke="#ff8a65"
              strokeWidth={3}
              dot={{ r: 3 }}
              name="Avg temp (°C)"
            />
          </LineChart>
        </SafeResponsiveContainer>
        <div className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          2015–2019 avg:{" "}
          <span className="text-[var(--foreground)]">{formatTemp(climateHistory.baselineAvgTempC)}</span>
          {" · "}
          2020–2024 avg:{" "}
          <span className="text-[var(--foreground)]">{formatTemp(climateHistory.recentAvgTempC)}</span>
        </div>
      </div>

      {/* Precipitation trend */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Precipitation
          </div>
          <span
            className={`cursor-default select-none rounded-full border px-3 py-1 text-xs pointer-events-none ${precipBadge.tone}`}
          >
            10-year: {precipBadge.label}
          </span>
        </div>
        <SafeResponsiveContainer className="h-36">
          <BarChart data={climateHistory.summaries}>
            <XAxis dataKey="year" stroke="#6b7d93" />
            <YAxis stroke="#6b7d93" />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="totalPrecipitationMm" fill="#38bdf8" name="Annual precip (mm)" />
          </BarChart>
        </SafeResponsiveContainer>
        {baselinePrecipMm !== null && recentPrecipMm !== null ? (
          <div className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            2015–2019 avg:{" "}
            <span className="text-[var(--foreground)]">{formatPrecip(baselinePrecipMm)}</span>
            {" · "}
            2020–2024 avg:{" "}
            <span className="text-[var(--foreground)]">{formatPrecip(recentPrecipMm)}</span>
          </div>
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
