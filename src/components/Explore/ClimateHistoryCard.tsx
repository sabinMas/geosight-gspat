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
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
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
  if (!climateHistory || !climateHistory.summaries.length) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Historical weather</div>
          <CardTitle>Climate trends (10-year)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            Historical climate data unavailable.
          </div>
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
          {badge.label}
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
          <div className="eyebrow">Annual precipitation context</div>
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
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>Open-Meteo archive</span>
            <SourceStatusBadge source={geodata.sources.climateHistory} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
