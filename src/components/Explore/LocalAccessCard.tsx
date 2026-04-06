"use client";

import { Bus, HeartPulse, ShoppingBag, Utensils } from "lucide-react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface AccessSignal {
  label: string;
  count: number | null;
  score: number;
  maxScore: number;
  Icon: React.ComponentType<{ className?: string }>;
  emptyNote: string;
}

function computeAccessScore(geodata: GeodataResult): {
  total: number;
  label: string;
  signals: AccessSignal[];
} {
  const { amenities } = geodata;

  const signals: AccessSignal[] = [
    {
      label: "Transit stops",
      count: amenities.transitStopCount,
      score: Math.min(35, (amenities.transitStopCount ?? 0) * 3),
      maxScore: 35,
      Icon: Bus,
      emptyNote: "No mapped transit stops found nearby.",
    },
    {
      label: "Food & drink",
      count: amenities.foodAndDrinkCount,
      score: Math.min(30, Math.round((amenities.foodAndDrinkCount ?? 0) * 1.5)),
      maxScore: 30,
      Icon: Utensils,
      emptyNote: "No mapped food or drink venues found nearby.",
    },
    {
      label: "Commercial services",
      count: amenities.commercialCount,
      score: Math.min(20, Math.round((amenities.commercialCount ?? 0) * 0.7)),
      maxScore: 20,
      Icon: ShoppingBag,
      emptyNote: "No mapped commercial services found nearby.",
    },
    {
      label: "Healthcare",
      count: amenities.healthcareCount,
      score: Math.min(15, (amenities.healthcareCount ?? 0) > 0 ? 15 : 0),
      maxScore: 15,
      Icon: HeartPulse,
      emptyNote: "No mapped healthcare facilities found nearby.",
    },
  ];

  const total = signals.reduce((sum, s) => sum + s.score, 0);

  const label =
    total >= 75
      ? "Very walkable"
      : total >= 50
        ? "Walkable"
        : total >= 25
          ? "Limited walkability"
          : "Car-dependent";

  return { total, label, signals };
}

function scoreBarColor(score: number, max: number) {
  const frac = score / max;
  if (frac >= 0.7) return "bg-[var(--accent)]";
  if (frac >= 0.35) return "bg-[var(--foreground-soft)]";
  return "bg-[var(--border-strong)]";
}

function scoreLabelClasses(total: number) {
  if (total >= 75) return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
  if (total >= 50) return "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]";
  if (total >= 25) return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]";
  return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
}

export function LocalAccessCard({ geodata }: { geodata: GeodataResult | null }) {
  if (!geodata) return null;

  const { total, label, signals } = computeAccessScore(geodata);
  const trustSummary = summarizeSourceTrust([geodata.sources.amenities], "Local access");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Access profile</div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Local access</CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-semibold text-[var(--foreground)]">{total}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">out of 100</div>
            </div>
            <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold cursor-default pointer-events-none select-none ${scoreLabelClasses(total)}`}>
              {label}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <signal.Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {signal.label}
                </span>
              </div>
              <span className="text-xs text-[var(--foreground-soft)]">
                {signal.count !== null && signal.count > 0
                  ? `${signal.count} mapped`
                  : "none mapped"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor(signal.score, signal.maxScore)}`}
                style={{ width: `${(signal.score / signal.maxScore) * 100}%` }}
              />
            </div>
            {(signal.count === null || signal.count === 0) ? (
              <p className="text-xs text-[var(--muted-foreground)]">{signal.emptyNote}</p>
            ) : null}
          </div>
        ))}

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--muted-foreground)]">
          This score is a proxy heuristic based on OSM-mapped amenity counts within the analysis area. It reflects mapped density, not measured walkability. Coverage quality varies by region.
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.amenities]}
          note="Amenity counts are sourced from OpenStreetMap via Overpass API. Coverage varies significantly by country and urban vs. rural context."
        />
      </CardContent>
    </Card>
  );
}
