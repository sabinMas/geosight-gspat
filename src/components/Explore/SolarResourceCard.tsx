"use client";

import { Sun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface SolarResourceCardProps {
  geodata: GeodataResult | null;
}

type SolarTier = "Excellent" | "Good" | "Moderate" | "Poor";

interface TierMeta {
  label: SolarTier;
  tone: "success" | "accent" | "warning" | "danger";
  description: string;
}

function classifySolar(ghiKwhM2Day: number | null): TierMeta {
  if (ghiKwhM2Day === null) {
    return {
      label: "Poor",
      tone: "danger",
      description: "Solar irradiance data unavailable for this location",
    };
  }
  // GHI classification (kWh/m²/day):
  // Excellent ≥ 5.5 — desert sun belt, premium solar
  // Good      ≥ 4.0 — Mediterranean / mid-latitude summer-heavy
  // Moderate  ≥ 2.5 — temperate Europe, Pacific NW, high-latitude
  // Poor      <  2.5 — subarctic, persistent overcast
  if (ghiKwhM2Day >= 5.5) {
    return {
      label: "Excellent",
      tone: "success",
      description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — premium sun belt resource`,
    };
  }
  if (ghiKwhM2Day >= 4.0) {
    return {
      label: "Good",
      tone: "accent",
      description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — solid mid-latitude solar resource`,
    };
  }
  if (ghiKwhM2Day >= 2.5) {
    return {
      label: "Moderate",
      tone: "warning",
      description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — viable but cloud-limited`,
    };
  }
  return {
    label: "Poor",
    tone: "danger",
    description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — low solar resource, likely not cost-effective`,
  };
}

function tierBadgeClasses(tone: TierMeta["tone"]) {
  switch (tone) {
    case "success":
      return "bg-[var(--success-soft)] border-[color:var(--success-border)] text-[var(--foreground)]";
    case "accent":
      return "bg-[var(--accent-soft)] border-[color:var(--accent-strong)] text-[var(--accent-foreground)]";
    case "warning":
      return "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]";
    default:
      return "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]";
  }
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SolarResourceCard({ geodata }: SolarResourceCardProps) {
  if (!geodata) return null;

  const solar = geodata.solarResource;
  const sources = [geodata.sources.solarResource];
  const trustSummary = summarizeSourceTrust(sources, "Solar irradiance");

  if (!solar || solar.annualGhiKwhM2Day === null) {
    return (
      <WorkspaceCardShell eyebrow="Energy" title="Solar resource">
        <StatePanel
          tone="partial"
          eyebrow="Coverage"
          title="Solar data unavailable"
          description="NASA POWER solar irradiance data could not be retrieved for this location. The service is global — this may be a transient fetch failure."
          compact
        />
        <TrustSummaryPanel
          summary={trustSummary}
          sources={sources}
          note="NASA POWER provides satellite-derived surface irradiance climatologies for any global coordinate."
        />
      </WorkspaceCardShell>
    );
  }

  const tier = classifySolar(solar.annualGhiKwhM2Day);
  const clearnessPercent =
    solar.clearnessIndex !== null ? Math.round(solar.clearnessIndex * 100) : null;

  const chartData =
    solar.monthlyGhi.length === 12
      ? MONTH_LABELS.map((month, i) => ({ month, ghi: solar.monthlyGhi[i] }))
      : [];

  return (
    <WorkspaceCardShell
      eyebrow="Energy"
      title="Solar resource"
      headerExtra={
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${tierBadgeClasses(tier.tone)}`}
        >
          <Sun aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {tier.label}
        </div>
      }
    >
      {/* Summary */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{tier.description}</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Annual GHI
          </div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {solar.annualGhiKwhM2Day.toFixed(1)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">kWh/m²/day</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Peak sun hours
          </div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {solar.peakSunHours!.toFixed(1)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">hrs/day avg</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Clearness
          </div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {clearnessPercent !== null ? `${clearnessPercent}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Clear-sky ratio</div>
        </div>
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Monthly GHI — kWh/m²/day
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [`${value.toFixed(2)} kWh/m²/day`, "GHI"]}
                cursor={{ fill: "var(--surface-raised)" }}
              />
              <Bar dataKey="ghi" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {solar.bestMonth && solar.worstMonth && (
            <div className="mt-3 flex gap-4 text-xs text-[var(--muted-foreground)]">
              <span>
                Best: <span className="font-medium text-[var(--foreground)]">{solar.bestMonth}</span>{" "}
                {solar.bestMonthGhi?.toFixed(1)} kWh/m²/day
              </span>
              <span>
                Worst: <span className="font-medium text-[var(--foreground)]">{solar.worstMonth}</span>{" "}
                {solar.worstMonthGhi?.toFixed(1)} kWh/m²/day
              </span>
            </div>
          )}
        </div>
      )}

      {/* Clear-sky context */}
      {solar.clearSkyGhiKwhM2Day !== null && solar.annualGhiKwhM2Day !== null && (
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Cloud impact
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--muted-foreground)]">
              Clear-sky potential: <span className="font-medium text-[var(--foreground)]">{solar.clearSkyGhiKwhM2Day.toFixed(1)} kWh/m²/day</span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Actual / potential: <span className="font-medium text-[var(--foreground)]">
                {Math.round((solar.annualGhiKwhM2Day / solar.clearSkyGhiKwhM2Day) * 100)}%
              </span>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                width: `${Math.min(100, Math.round((solar.annualGhiKwhM2Day / solar.clearSkyGhiKwhM2Day) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {clearnessPercent !== null && clearnessPercent >= 70
              ? "Low cloud impact — good clearness index for solar generation."
              : clearnessPercent !== null && clearnessPercent >= 55
              ? "Moderate cloud cover reduces effective solar generation from theoretical maximum."
              : "High cloud cover significantly reduces actual output relative to clear-sky potential."}
          </p>
        </div>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="GHI (global horizontal irradiance) values are 22-year climatological averages from NASA POWER (2001–2022), derived from satellite observations and meteorological modeling. Peak sun hours equal the average daily GHI — a standard input for solar panel sizing. Values represent the long-term mean, not real-time conditions."
      />
    </WorkspaceCardShell>
  );
}
