"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface ThermalLoadCardProps {
  geodata: GeodataResult | null;
}

export type CoolingTier = "Excellent" | "Favorable" | "Moderate" | "Challenging";

interface DriverScore {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
  available: boolean;
}

interface ThermalAssessment {
  tier: CoolingTier;
  totalScore: number;
  drivers: DriverScore[];
  explanation: string;
  avgTempC: number | null;
  coolingDegreeDays: number | null;
  windSpeedKph: number | null;
  trendDirection: string | null;
  baselineAvgTempC: number | null;
  recentAvgTempC: number | null;
}

// --- Scoring helpers ---

function scoreThermalBase(avgTempC: number | null): DriverScore {
  const max = 40;
  if (avgTempC === null) {
    return {
      label: "Ambient temperature",
      points: 15,
      maxPoints: max,
      detail: "Current temperature unavailable",
      available: false,
    };
  }
  // Cooler = better: max pts at ≤5°C, zero pts at ≥35°C
  const pts = Math.round(Math.max(0, Math.min(max, ((35 - avgTempC) / 30) * max)));
  const label =
    avgTempC <= 10
      ? `${avgTempC.toFixed(1)}°C — cold ambient, minimal cooling demand`
      : avgTempC <= 20
        ? `${avgTempC.toFixed(1)}°C — mild ambient, moderate cooling load`
        : avgTempC <= 28
          ? `${avgTempC.toFixed(1)}°C — warm ambient, elevated cooling load`
          : `${avgTempC.toFixed(1)}°C — hot ambient, high cooling demand`;
  return { label: "Ambient temperature", points: pts, maxPoints: max, detail: label, available: true };
}

function scoreWindCooling(windKph: number | null): DriverScore {
  const max = 25;
  if (windKph === null) {
    return {
      label: "Natural wind cooling",
      points: 10,
      maxPoints: max,
      detail: "Wind speed unavailable",
      available: false,
    };
  }
  const pts = Math.round(Math.min(max, (windKph / 40) * max));
  const label =
    windKph >= 25
      ? `${windKph.toFixed(0)} kph — strong wind-assist for free cooling`
      : windKph >= 15
        ? `${windKph.toFixed(0)} kph — moderate wind-assist available`
        : windKph >= 8
          ? `${windKph.toFixed(0)} kph — light wind, limited free cooling`
          : `${windKph.toFixed(0)} kph — still air, minimal convective cooling`;
  return { label: "Natural wind cooling", points: pts, maxPoints: max, detail: label, available: true };
}

function scoreClimateTrend(trendDirection: string | null): DriverScore {
  const max = 20;
  if (trendDirection === "cooling") {
    return { label: "Long-run temperature trend", points: 20, maxPoints: max, detail: "Cooling trend — thermal load decreasing over time", available: true };
  }
  if (trendDirection === "stable") {
    return { label: "Long-run temperature trend", points: 10, maxPoints: max, detail: "Stable trend — no significant warming observed since 2015", available: true };
  }
  if (trendDirection === "warming") {
    return { label: "Long-run temperature trend", points: 0, maxPoints: max, detail: "Warming trend — thermal load increasing, impacts long-run cooling costs", available: true };
  }
  return {
    label: "Long-run temperature trend",
    points: 8,
    maxPoints: max,
    detail: "Climate trend data unavailable",
    available: false,
  };
}

function scoreCoolingDegreeDays(cdd: number | null): DriverScore {
  const max = 15;
  if (cdd === null) {
    return {
      label: "Cooling degree days",
      points: 6,
      maxPoints: max,
      detail: "CDD estimate unavailable",
      available: false,
    };
  }
  // Lower CDD = better (less annual cooling energy needed). 0 pts at CDD ≥ 600.
  const pts = Math.round(Math.max(0, Math.min(max, ((600 - cdd) / 600) * max)));
  const label =
    cdd <= 100
      ? `~${cdd} CDD/yr — very low cooling energy requirement`
      : cdd <= 300
        ? `~${cdd} CDD/yr — moderate cooling energy requirement`
        : cdd <= 540
          ? `~${cdd} CDD/yr — significant cooling energy requirement`
          : `~${cdd} CDD/yr — high annual cooling energy demand`;
  return { label: "Cooling degree days", points: pts, maxPoints: max, detail: label, available: true };
}

function buildThermalAssessment(geodata: GeodataResult): ThermalAssessment {
  const { climate, climateHistory } = geodata;

  const tempDriver = scoreThermalBase(climate.averageTempC);
  const windDriver = scoreWindCooling(climate.windSpeedKph);
  const trendDriver = scoreClimateTrend(climateHistory?.trendDirection ?? null);
  const cddDriver = scoreCoolingDegreeDays(climate.coolingDegreeDays);

  const drivers = [tempDriver, windDriver, trendDriver, cddDriver];
  const totalPts = drivers.reduce((sum, d) => sum + d.points, 0);
  const maxPts = drivers.reduce((sum, d) => sum + d.maxPoints, 0);
  const normalized = Math.round((totalPts / maxPts) * 100);

  const tier: CoolingTier =
    normalized >= 70 ? "Excellent" :
    normalized >= 45 ? "Favorable" :
    normalized >= 25 ? "Moderate" :
    "Challenging";

  const tempLabel =
    climate.averageTempC !== null
      ? `${climate.averageTempC.toFixed(1)}°C ambient`
      : "unknown temperature";
  const windLabel =
    climate.windSpeedKph !== null
      ? `${climate.windSpeedKph.toFixed(0)} kph wind`
      : "unknown wind";
  const trendLabel =
    climateHistory?.trendDirection === "warming"
      ? " with a long-run warming trend adding future thermal pressure"
      : climateHistory?.trendDirection === "cooling"
        ? " with a cooling trend easing long-run thermal demand"
        : "";

  const explanation =
    tier === "Excellent"
      ? `Excellent cooling conditions — ${tempLabel} and ${windLabel} support efficient free-air and mechanical cooling with low annual energy demand${trendLabel}.`
      : tier === "Favorable"
        ? `Favorable cooling environment — ${tempLabel} and ${windLabel} allow reliable cooling operations with manageable seasonal load${trendLabel}.`
        : tier === "Moderate"
          ? `Moderate thermal load — ${tempLabel} requires active cooling infrastructure; ${windLabel} provides limited natural assist${trendLabel}.`
          : `Challenging thermal environment — ${tempLabel} and ${windLabel} create a high sustained cooling burden${trendLabel}. Mechanical cooling systems will be heavily utilised.`;

  return {
    tier,
    totalScore: normalized,
    drivers,
    explanation,
    avgTempC: climate.averageTempC,
    coolingDegreeDays: climate.coolingDegreeDays,
    windSpeedKph: climate.windSpeedKph,
    trendDirection: climateHistory?.trendDirection ?? null,
    baselineAvgTempC: climateHistory?.baselineAvgTempC ?? null,
    recentAvgTempC: climateHistory?.recentAvgTempC ?? null,
  };
}

// --- UI helpers ---

function tierColors(tier: CoolingTier) {
  switch (tier) {
    case "Excellent":
      return {
        badge: "bg-[var(--success-soft)] border-[color:var(--success-border)] text-[var(--foreground)]",
        bar: "bg-[var(--success-border)]",
      };
    case "Favorable":
      return {
        badge: "bg-[var(--accent-soft)] border-[color:var(--accent-strong)] text-[var(--accent-foreground)]",
        bar: "bg-[var(--accent)]",
      };
    case "Moderate":
      return {
        badge: "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]",
        bar: "bg-[var(--warning-border)]",
      };
    default:
      return {
        badge: "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]",
        bar: "bg-[var(--danger-border)]",
      };
  }
}

function DriverRow({ driver }: { driver: DriverScore }) {
  const fillPct = Math.round((driver.points / driver.maxPoints) * 100);
  // For this card higher score = better, so color is inverse of WildfireRiskCard
  const barColor =
    fillPct >= 75
      ? "bg-[var(--success-border)]"
      : fillPct >= 50
        ? "bg-[var(--accent)]"
        : fillPct >= 25
          ? "bg-[var(--warning-border)]"
          : "bg-[var(--danger-border)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--foreground)]">{driver.label}</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {driver.available ? `${driver.points}/${driver.maxPoints} pts` : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)]">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="text-xs text-[var(--muted-foreground)]">{driver.detail}</div>
    </div>
  );
}

export function ThermalLoadCard({ geodata }: ThermalLoadCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Thermal environment" title="Cooling load" loading={true} />
    );
  }

  const assessment = buildThermalAssessment(geodata);
  const colors = tierColors(assessment.tier);

  const sources = [
    geodata.sources.climate,
    geodata.sources.climateHistory,
  ];
  const trustSummary = summarizeSourceTrust(sources, "Thermal load");

  // Temp delta for warming callout
  const tempDelta =
    assessment.recentAvgTempC !== null && assessment.baselineAvgTempC !== null
      ? assessment.recentAvgTempC - assessment.baselineAvgTempC
      : null;

  return (
    <WorkspaceCardShell
      eyebrow="Thermal environment"
      title="Cooling load"
      headerExtra={
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${colors.badge}`}
        >
          {assessment.tier} conditions
        </div>
      }
    >
      {/* Explanation */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{assessment.explanation}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Avg temp</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {assessment.avgTempC !== null ? `${assessment.avgTempC.toFixed(1)}°C` : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Current</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Cooling days</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {assessment.coolingDegreeDays !== null ? assessment.coolingDegreeDays : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">CDD proxy</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Wind speed</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {assessment.windSpeedKph !== null ? `${assessment.windSpeedKph.toFixed(0)} kph` : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Current</div>
        </div>
      </div>

      {/* Driver breakdown */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Efficiency drivers
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-[var(--foreground)]">
              {assessment.totalScore}
            </span>
            <span className="ml-1 text-xs text-[var(--muted-foreground)]">/ 100</span>
          </div>
        </div>
        <div className="space-y-4">
          {assessment.drivers.map((driver) => (
            <DriverRow key={driver.label} driver={driver} />
          ))}
        </div>
      </div>

      {/* Warming trend callout */}
      {assessment.trendDirection === "warming" && tempDelta !== null && tempDelta > 0 && (
        <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--warning-foreground)]">
            Warming trend detected
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--warning-foreground)]">
            Average temperature has risen{" "}
            <span className="font-semibold">+{tempDelta.toFixed(1)}°C</span> between 2015–2019 and
            2020–2024 (ERA5 archive). Mechanical cooling costs and capacity requirements are likely
            to increase over the project lifecycle.
          </p>
        </div>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="Cooling load is derived from the Open-Meteo current forecast (ambient temperature, wind speed) and the ERA5 archive (2015–2024 annual mean temperatures and trend direction). Cooling degree days are a proxy estimate based on today's mean temperature — not an annual accumulation. For mechanical engineering or energy modelling, consult ASHRAE climate data or a full hourly simulation."
      />
    </WorkspaceCardShell>
  );
}
