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
  direct_live: "border-emerald-300/20 bg-emerald-400/10 text-[var(--foreground)]",
  derived_live: "border-cyan-300/20 bg-cyan-400/10 text-[var(--foreground)]",
  proxy: "border-amber-300/20 bg-amber-400/10 text-[var(--foreground)]",
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
  const directCount = evidenceCounts.direct_live ?? 0;
  const proxyCount = evidenceCounts.proxy ?? 0;
  const evidenceSummary =
    proxyCount > directCount
      ? "This score leans more heavily on proxy heuristics than direct live measurements."
      : proxyCount > 0
        ? "This score blends direct measurements, derived live analysis, and a smaller proxy layer."
        : "This score is currently grounded in direct and derived live signals without proxy-heavy weighting.";

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
      <CardContent className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="h-44">
          {mounted ? (
            <SafeResponsiveContainer className="h-full">
              <RadialBarChart
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
          <div className={`${mounted ? "-mt-26" : "mt-10"} text-center`}>
            <div className="text-5xl font-semibold text-[var(--foreground)]">{score.total}</div>
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">out of 100</div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{score.recommendation}</p>
          {bandLabel ? (
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {bandLabel}
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[color:var(--success-border)] bg-[var(--success-soft)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Biggest lifts
              </div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                {strongestFactors.map((factor) => (
                  <div key={factor.key}>
                    {factor.label} is contributing {factor.impact.toFixed(1)} of {factor.maxImpact.toFixed(1)} possible points.
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Biggest drags
              </div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                {mainConstraints.map((factor) => (
                  <div key={factor.key}>
                    {factor.label} is leaving roughly {factor.gap.toFixed(1)} points on the table.
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {evidenceCounts.direct_live ? (
              <span className={`rounded-full border px-3 py-1 text-[11px] ${EVIDENCE_TONE.direct_live}`}>
                {evidenceCounts.direct_live} direct live
              </span>
            ) : null}
            {evidenceCounts.derived_live ? (
              <span className={`rounded-full border px-3 py-1 text-[11px] ${EVIDENCE_TONE.derived_live}`}>
                {evidenceCounts.derived_live} derived live
              </span>
            ) : null}
            {evidenceCounts.proxy ? (
              <span className={`rounded-full border px-3 py-1 text-[11px] ${EVIDENCE_TONE.proxy}`}>
                {evidenceCounts.proxy} proxy heuristics
              </span>
            ) : null}
          </div>
          <div className="text-sm leading-6 text-[var(--muted-foreground)]">{evidenceSummary}</div>
          {score.broadband ? (
            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/8 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]">
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
          {profile ? (
            <div
              className="rounded-[1.5rem] border p-4"
              style={{
                borderColor: `${accent}33`,
                background: `${accent}12`,
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                What this score means
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                GeoSight converts each factor into a 0-100 score, applies the lens weights, and
                totals the result into a first-pass fit score for this place.
              </div>
              <div className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--muted-foreground)]">
                Highest weights:{" "}
                {profile.factors
                  .slice()
                  .sort((a, b) => b.weight - a.weight)
                  .slice(0, 4)
                  .map((factor) => `${factor.label} ${Math.round(factor.weight * 100)}%`)
                  .join(", ")}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
