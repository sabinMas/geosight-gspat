"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { rankFactorInsights } from "@/lib/analysis-summary";
import { getMethodologyForFactor } from "@/lib/scoring-methodology";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { SiteScore } from "@/types";

interface FactorBreakdownProps {
  score: SiteScore | null;
  title?: string;
  initialExpandedKey?: string;
}

const EVIDENCE_TONE: Record<string, string> = {
  direct_live: "border-[color:var(--evidence-direct-border)] bg-[var(--evidence-direct-bg)] text-[var(--evidence-direct-fg)]",
  derived_live: "border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] text-[var(--evidence-derived-fg)]",
  proxy: "border-[color:var(--evidence-proxy-border)] bg-[var(--evidence-proxy-bg)] text-[var(--evidence-proxy-fg)]",
};

function getGaugeTone(score: number) {
  if (score >= 80) return "bg-[var(--success-soft)] border-[color:var(--success-border)]";
  if (score >= 60) return "bg-[var(--accent-soft)] border-[color:var(--accent-strong)]";
  return "bg-[var(--warning-soft)] border-[color:var(--warning-border)]";
}

function getImprovementPath(gap: number): string {
  if (gap < 2) return "This factor is near its ceiling — no significant gain available.";
  if (gap < 10) return `Closing this gap would add up to ${gap.toFixed(1)} pts to the overall score.`;
  return `This is the biggest improvement opportunity — closing it adds up to ${gap.toFixed(1)} pts.`;
}

export function FactorBreakdown({ score, title = "Factor breakdown", initialExpandedKey }: FactorBreakdownProps) {
  const [mounted, setMounted] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(initialExpandedKey ?? null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!score || !score.factors || score.factors.length === 0) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Evidence breakdown</div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-[var(--foreground-soft)]">
            Score details are not available for this lens. Switch to a scored lens such as Home Buying, Site Development, or Data Center Cooling to see weighted factor breakdowns.
          </p>
        </CardContent>
      </Card>
    );
  }

  const evidenceCounts = score.factors.reduce<Record<string, number>>((acc, factor) => {
    const key = factor.evidenceKind ?? "derived_live";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const rankedFactors = rankFactorInsights(score);
  const strongestFactors = [...rankedFactors].sort((a, b) => b.impact - a.impact).slice(0, 3);
  const mainConstraints = [...rankedFactors].sort((a, b) => b.gap - a.gap).slice(0, 3);
  const orderedFactors = [...rankedFactors].sort((a, b) => b.maxImpact - a.maxImpact);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Evidence breakdown</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.25rem] border border-[color:var(--success-border)] bg-[var(--success-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Strongest contributors
            </div>
            <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
              {strongestFactors.map((factor) => (
                <div key={factor.key}>
                  {factor.label} — {factor.impact.toFixed(1)} / {factor.maxImpact.toFixed(1)} pts
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Biggest improvement areas
            </div>
            <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--foreground)]">
              {mainConstraints.map((factor) => (
                <div key={factor.key}>
                  {factor.label} — {factor.gap.toFixed(1)} pts uncaptured
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="h-72">
          {mounted ? (
            <SafeResponsiveContainer className="h-full">
              <BarChart data={orderedFactors}>
                <XAxis dataKey="label" hide />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "var(--background-elevated)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {orderedFactors.map((factor) => (
                    <Cell key={factor.key} fill={factor.score > 80 ? "var(--color-success)" : factor.score > 60 ? "var(--accent)" : "var(--color-warning)"} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          ) : null}
        </div>
        <div className="space-y-2">
          {orderedFactors.map((factor) => {
            const isExpanded = expandedKey === factor.key;
            const methodNote = getMethodologyForFactor(factor.key);
            return (
              <div
                key={factor.key}
                className={`rounded-[1.5rem] border border-[color:var(--border-soft)] p-3 ${isExpanded ? "bg-[var(--surface-raised)]" : "bg-[var(--surface-soft)]"} cursor-pointer`}
                onClick={() => setExpandedKey(isExpanded ? null : factor.key)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedKey(isExpanded ? null : factor.key);
                  }
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--foreground)]">
                  <span className="font-medium">{factor.label}</span>
                  <div className="flex items-center gap-2">
                    {factor.evidenceLabel ? (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${
                          EVIDENCE_TONE[factor.evidenceKind ?? "derived_live"]
                        }`}
                      >
                        {factor.evidenceLabel}
                      </span>
                    ) : null}
                    <span className="font-semibold">{factor.score}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1">
                    Weight {factor.weightPercent}%
                  </span>
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1">
                    Adds {factor.impact.toFixed(1)} / {factor.maxImpact.toFixed(1)} pts
                  </span>
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1">
                    Misses {factor.gap.toFixed(1)} pts
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{factor.detail}</p>
                {isExpanded ? (
                  <div className="mt-3 space-y-3 border-t border-[color:var(--border-soft)] pt-3">
                    <div>
                      <div className="mb-1.5 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        Score
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-[100px] overflow-hidden rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)]">
                          <div
                            className={`h-full rounded-full ${getGaugeTone(factor.score)}`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[var(--foreground)]">{factor.score} / 100</span>
                      </div>
                    </div>
                    {methodNote ? (
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                          How this is scored
                        </div>
                        <p className="text-xs leading-5 text-[var(--foreground-soft)]">{methodNote}</p>
                      </div>
                    ) : null}
                    {(factor.sourceIds && factor.sourceIds.length > 0) || factor.sourceLastUpdated ? (
                      <div>
                        <div className="mb-1.5 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                          Sources
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {factor.sourceIds && factor.sourceIds.length > 0
                            ? factor.sourceIds.map((id) => (
                                <span
                                  key={id}
                                  className="cursor-default pointer-events-none select-none rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]"
                                >
                                  {id}
                                </span>
                              ))
                            : null}
                          {factor.sourceLastUpdated ? (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              Updated: {factor.sourceLastUpdated}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {factor.proxyReason ? (
                      <div className="rounded-lg border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning-foreground)]">
                        <span className="font-medium">Proxy method:</span> {factor.proxyReason}
                      </div>
                    ) : null}
                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        To improve
                      </div>
                      <p className="text-xs leading-5 text-[var(--foreground-soft)]">
                        {getImprovementPath(factor.gap)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
