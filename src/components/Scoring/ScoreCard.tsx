"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { rankFactorInsights } from "@/lib/analysis-summary";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { MissionProfile, SiteScore } from "@/types";

interface ScoreCardProps {
  score: SiteScore | null;
  title?: string;
  profile?: MissionProfile;
  onOpenDetails?: () => void;
}

function getBandLabel(score: number, profile?: MissionProfile) {
  if (!profile) {
    return null;
  }

  return profile.recommendationBands.find((band) => score >= band.min)?.text ?? null;
}

const EVIDENCE_TONE: Record<string, string> = {
  direct_live: "border-[color:var(--evidence-direct-border)] bg-[var(--evidence-direct-bg)] text-[var(--evidence-direct-fg)]",
  derived_live: "border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] text-[var(--evidence-derived-fg)]",
  proxy: "border-[color:var(--evidence-proxy-border)] bg-[var(--evidence-proxy-bg)] text-[var(--evidence-proxy-fg)]",
};

export function ScoreCard({ score, title = "Site score", profile, onOpenDetails }: ScoreCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!score) {
    return null;
  }

  const accent = profile?.accentColor ?? "#00e5ff";
  const barColor = score.total > 80 ? "#5be49b" : score.total > 60 ? accent : "#ffab00";
  const bandLabel = getBandLabel(score.total, profile);
  const evidenceCounts = score.factors.reduce<Record<string, number>>((acc, factor) => {
    const key = factor.evidenceKind ?? "derived_live";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const rankedFactors = rankFactorInsights(score);
  const strongestFactors = [...rankedFactors].sort((a, b) => b.impact - a.impact).slice(0, 2);
  const mainConstraints = [...rankedFactors].sort((a, b) => b.gap - a.gap).slice(0, 2);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="eyebrow">Mission score</div>
          <CardTitle>{title}</CardTitle>
        </div>
        {onOpenDetails ? (
          <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenDetails}>
            Open breakdown
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Score row: circle + recommendation side by side */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            {mounted ? (
              <SafeResponsiveContainer className="h-full w-full">
                <RadialBarChart
                  width={120}
                  height={120}
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ value: score.total, fill: barColor }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" background cornerRadius={18} />
                </RadialBarChart>
              </SafeResponsiveContainer>
            ) : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-semibold text-[var(--foreground)]">{score.total}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">/ 100</div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 pt-1">
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{score.recommendation}</p>
            {bandLabel ? (
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {bandLabel}
              </div>
            ) : null}
          </div>
        </div>

        {/* Lifts + drags stacked vertically */}
        <div className="flex flex-col gap-2">
          <div className="rounded-[1.25rem] border border-[color:var(--success-border)] bg-[var(--success-soft)] p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Biggest lifts</div>
            <div className="mt-2 space-y-2">
              {strongestFactors.map((factor) => (
                <div key={factor.key} className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-[var(--foreground)]">{factor.label}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{factor.impact.toFixed(1)} / {factor.maxImpact.toFixed(1)} pts</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Biggest drags</div>
            <div className="mt-2 space-y-2">
              {mainConstraints.map((factor) => (
                <div key={factor.key} className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-[var(--foreground)]">{factor.label}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{factor.gap.toFixed(1)} pts uncaptured</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence badges */}
        <div className="flex flex-wrap gap-2">
          {evidenceCounts.direct_live ? (
            <span className={`rounded-full border px-3 py-1 text-xs ${EVIDENCE_TONE.direct_live}`}>
              {evidenceCounts.direct_live} direct live
            </span>
          ) : null}
          {evidenceCounts.derived_live ? (
            <span className={`rounded-full border px-3 py-1 text-xs ${EVIDENCE_TONE.derived_live}`}>
              {evidenceCounts.derived_live} derived live
            </span>
          ) : null}
          {evidenceCounts.proxy ? (
            <span className={`rounded-full border px-3 py-1 text-xs ${EVIDENCE_TONE.proxy}`}>
              {evidenceCounts.proxy} proxy heuristics
            </span>
          ) : null}
        </div>

        {/* Broadband summary */}
        {score.broadband ? (
          <div className="rounded-[1.5rem] border border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
              Broadband summary
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">
              {score.broadband.kind === "regional_household_baseline"
                ? `${score.broadband.regionLabel} baseline: ${
                    score.broadband.fixedBroadbandCoveragePercent === null
                      ? "fixed broadband share unavailable"
                      : `${score.broadband.fixedBroadbandCoveragePercent.toFixed(1)}% fixed-broadband households`
                  } and ${
                    score.broadband.mobileBroadbandCoveragePercent === null
                      ? "mobile broadband share unavailable"
                      : `${score.broadband.mobileBroadbandCoveragePercent.toFixed(1)}% mobile-broadband households`
                  } (${score.broadband.referenceYear ?? "latest available year"}).`
                : `${score.broadband.providerCount} providers, up to ${
                    score.broadband.maxDownloadSpeed <= 0
                      ? "unknown download"
                      : `${score.broadband.maxDownloadSpeed.toLocaleString()} Mbps down`
                  } / ${
                    score.broadband.maxUploadSpeed <= 0
                      ? "unknown upload"
                      : `${score.broadband.maxUploadSpeed.toLocaleString()} Mbps up`
                  }.`}
            </div>
            {score.broadband.score !== null ? (
              <div className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                Broadband factor score: {score.broadband.score} / 100
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
