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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface ClimateHistoryCardProps {
  geodata: GeodataResult | null;
}

function trendBadge(trend: NonNullable<GeodataResult["climateHistory"]>["trendDirection"]) {
  switch (trend) {
    case "warming":
      return {
        label: "Warming",
        tone: "border-orange-300/20 bg-orange-400/10 text-[var(--foreground)]",
      };
    case "cooling":
      return {
        label: "Cooling",
        tone: "border-cyan-300/20 bg-cyan-400/10 text-[var(--foreground)]",
      };
    case "stable":
      return {
        label: "Stable",
        tone: "border-slate-300/15 bg-slate-400/10 text-[var(--foreground)]",
      };
    default:
      return {
        label: "Unavailable",
        tone: "border-slate-300/15 bg-slate-400/10 text-[var(--foreground)]",
      };
  }
}

function formatTemp(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)} C`;
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
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Historical weather</div>
          <CardTitle>Climate trends (10-year)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    );
  }

  const badge = trendBadge(climateHistory.trendDirection);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Historical weather</div>
        <CardTitle>Climate trends (10-year)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${badge.tone}`}
        >
          10-year trend: {badge.label}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="text-sm leading-6 text-[var(--muted-foreground)]">
            GeoSight summarizes the long-range trend first, then keeps the decade chart below for a deeper climate read.
          </div>
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

        <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            Technical details
          </summary>
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
        </details>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.climateHistory]}
          note="GeoSight compares the more recent five-year average against the earlier five-year baseline so the user can tell whether conditions are warming, cooling, or staying roughly stable."
        />
      </CardContent>
    </Card>
  );
}
