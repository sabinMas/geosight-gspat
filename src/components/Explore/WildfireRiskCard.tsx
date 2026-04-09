"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, LandCoverBucket } from "@/types";

interface WildfireRiskCardProps {
  geodata: GeodataResult | null;
}

export type WildfireTier = "Low" | "Moderate" | "High" | "Severe";

interface DriverScore {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
  available: boolean;
}

interface WildfireAssessment {
  tier: WildfireTier;
  totalScore: number;
  drivers: DriverScore[];
  explanation: string;
  firmsAvailable: boolean;
}

// --- Scoring helpers ---

function scoreFireActivity(
  activeCount: number | null,
  nearestKm: number | null,
): DriverScore {
  const max = 40;
  if (activeCount === null) {
    return {
      label: "Current fire activity",
      points: 15,
      maxPoints: max,
      detail: "NASA FIRMS not configured — unknown activity",
      available: false,
    };
  }
  if (activeCount > 0 && nearestKm !== null && nearestKm < 25) {
    return {
      label: "Current fire activity",
      points: 40,
      maxPoints: max,
      detail: `Active fire within ${nearestKm.toFixed(0)} km`,
      available: true,
    };
  }
  if (activeCount > 0) {
    return {
      label: "Current fire activity",
      points: 25,
      maxPoints: max,
      detail: "Active fires detected in region (>25 km)",
      available: true,
    };
  }
  return {
    label: "Current fire activity",
    points: 0,
    maxPoints: max,
    detail: "No active fires in 7-day NASA FIRMS window",
    available: true,
  };
}

function scoreClimateDryness(summaries: GeodataResult["climateHistory"] | null): DriverScore {
  const max = 35;
  if (!summaries || summaries.summaries.length === 0) {
    return {
      label: "Climate dryness",
      points: 15,
      maxPoints: max,
      detail: "Climate history unavailable — unknown aridity",
      available: false,
    };
  }

  const all = summaries.summaries;
  const avgPrecip = all.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / all.length;

  if (avgPrecip < 250) {
    return { label: "Climate dryness", points: 35, maxPoints: max, detail: `Arid — ${Math.round(avgPrecip)} mm/yr avg`, available: true };
  }
  if (avgPrecip < 500) {
    return { label: "Climate dryness", points: 22, maxPoints: max, detail: `Semi-arid — ${Math.round(avgPrecip)} mm/yr avg`, available: true };
  }
  if (avgPrecip < 750) {
    return { label: "Climate dryness", points: 10, maxPoints: max, detail: `Sub-humid — ${Math.round(avgPrecip)} mm/yr avg`, available: true };
  }
  return { label: "Climate dryness", points: 0, maxPoints: max, detail: `Humid — ${Math.round(avgPrecip)} mm/yr avg`, available: true };
}

function scoreVegetation(buckets: LandCoverBucket[]): DriverScore {
  const max = 15;
  const vegBucket = buckets.find((b) => b.label === "Vegetation");
  if (!vegBucket) {
    return {
      label: "Vegetation fuel load",
      points: 5,
      maxPoints: max,
      detail: "Land cover data unavailable",
      available: false,
    };
  }
  const pct = vegBucket.value;
  if (pct >= 60) {
    return { label: "Vegetation fuel load", points: 15, maxPoints: max, detail: `${pct}% vegetation cover — high fuel load`, available: true };
  }
  if (pct >= 40) {
    return { label: "Vegetation fuel load", points: 10, maxPoints: max, detail: `${pct}% vegetation cover — moderate fuel load`, available: true };
  }
  if (pct >= 20) {
    return { label: "Vegetation fuel load", points: 5, maxPoints: max, detail: `${pct}% vegetation cover — low fuel load`, available: true };
  }
  return { label: "Vegetation fuel load", points: 0, maxPoints: max, detail: `${pct}% vegetation cover — minimal fuel load`, available: true };
}

function scoreHeatTrend(trendDirection: string | null): DriverScore {
  const max = 10;
  if (trendDirection === "warming") {
    return { label: "Temperature trend", points: 10, maxPoints: max, detail: "Warming trend detected — increasing fire weather", available: true };
  }
  if (trendDirection === null) {
    return { label: "Temperature trend", points: 3, maxPoints: max, detail: "Temperature trend unknown", available: false };
  }
  return { label: "Temperature trend", points: 0, maxPoints: max, detail: `${trendDirection === "cooling" ? "Cooling" : "Stable"} temperature trend`, available: true };
}

function buildWildfireAssessment(geodata: GeodataResult): WildfireAssessment {
  const firmsAvailable = geodata.hazards.activeFireCount7d !== null;

  const fireDriver = scoreFireActivity(geodata.hazards.activeFireCount7d, geodata.hazards.nearestFireKm);
  const dryDriver = scoreClimateDryness(geodata.climateHistory);
  const vegDriver = scoreVegetation(geodata.landClassification);
  const heatDriver = scoreHeatTrend(geodata.climateHistory?.trendDirection ?? null);

  const drivers = [fireDriver, dryDriver, vegDriver, heatDriver];
  const totalScore = drivers.reduce((sum, d) => sum + d.points, 0);
  const maxPossible = drivers.reduce((sum, d) => sum + d.maxPoints, 0);

  let tier: WildfireTier;
  // Normalize to 100 for tier thresholds
  const normalized = Math.round((totalScore / maxPossible) * 100);
  if (normalized >= 70) tier = "Severe";
  else if (normalized >= 45) tier = "High";
  else if (normalized >= 20) tier = "Moderate";
  else tier = "Low";

  const dryLabel = dryDriver.available ? dryDriver.detail.split(" — ")[0].toLowerCase() : "unknown aridity";
  const vegLabel = vegDriver.available
    ? `${(geodata.landClassification.find((b) => b.label === "Vegetation")?.value ?? 0)}% vegetation cover`
    : "unknown vegetation";

  const explanation =
    tier === "Severe"
      ? `Severe wildfire risk — active fire proximity combined with ${dryLabel} climate${heatDriver.points > 0 ? " and a warming trend" : ""} creates extreme fire-weather conditions.`
      : tier === "High"
        ? `High structural fire risk — ${dryLabel} climate and ${vegLabel}${fireDriver.points >= 25 ? " with recent fire detections" : ""} indicate elevated ignition and spread potential.`
        : tier === "Moderate"
          ? `Moderate fire risk — ${dryLabel} conditions and ${vegLabel} create seasonal fire potential, particularly during drought periods.`
          : `Low structural fire risk — ${dryLabel} climate and ${vegLabel} limit year-round fire weather.`;

  return { tier, totalScore: normalized, drivers, explanation, firmsAvailable };
}

// --- UI helpers ---

function tierColors(tier: WildfireTier) {
  switch (tier) {
    case "Severe":
      return {
        badge: "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]",
        bar: "bg-[var(--danger-border)]",
      };
    case "High":
      return {
        badge: "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]",
        bar: "bg-[var(--warning-border)]",
      };
    case "Moderate":
      return {
        badge: "bg-[var(--accent-soft)] border-[color:var(--accent-strong)] text-[var(--accent-foreground)]",
        bar: "bg-[var(--accent)]",
      };
    default:
      return {
        badge: "bg-[var(--success-soft)] border-[color:var(--success-border)] text-[var(--foreground)]",
        bar: "bg-[var(--success-border)]",
      };
  }
}

function DriverRow({ driver }: { driver: DriverScore }) {
  const fillPct = Math.round((driver.points / driver.maxPoints) * 100);
  const barColor =
    fillPct >= 75
      ? "bg-[var(--danger-border)]"
      : fillPct >= 50
        ? "bg-[var(--warning-border)]"
        : fillPct >= 25
          ? "bg-[var(--accent)]"
          : "bg-[var(--success-border)]";

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

export function WildfireRiskCard({ geodata }: WildfireRiskCardProps) {
  if (!geodata) return null;

  const assessment = buildWildfireAssessment(geodata);
  const colors = tierColors(assessment.tier);

  const sources = [
    geodata.sources.hazards,
    geodata.sources.hazardFire,
    geodata.sources.climateHistory,
    geodata.sources.landClassification,
  ];
  const trustSummary = summarizeSourceTrust(sources, "Wildfire risk");

  return (
    <WorkspaceCardShell
      eyebrow="Structural fire risk"
      title="Wildfire risk index"
      headerExtra={
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${colors.badge}`}
        >
          {assessment.tier} risk
        </div>
      }
    >
      {/* Explanation */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{assessment.explanation}</p>
      </div>

      {/* Score + driver breakdown */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Risk factor breakdown
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

      {/* FIRMS data gap warning */}
      {!assessment.firmsAvailable && (
        <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
          NASA FIRMS fire detection is not configured for this deployment. Current fire activity
          contributes an estimated risk penalty but cannot be confirmed. The structural risk score
          reflects climate dryness and vegetation load only.
        </div>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="Wildfire risk index combines current NASA FIRMS fire proximity (7-day), Open-Meteo ERA5 climate aridity (2015–2024 avg annual precipitation), OSM-derived vegetation land cover, and detected temperature trend direction. This is a structural risk indicator — it does not replace local fire weather forecasts or official wildfire hazard zone maps."
      />
    </WorkspaceCardShell>
  );
}
