"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { rankFactorInsights } from "@/lib/analysis-summary";
import { getMethodologyForFactor } from "@/lib/scoring-methodology";
import { cn } from "@/lib/utils";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { SiteScore } from "@/types";

interface FactorBreakdownProps {
  score: SiteScore | null;
  title?: string;
}

const EVIDENCE_TONE: Record<string, string> = {
  direct_live: "border-[color:var(--evidence-direct-border)] bg-[var(--evidence-direct-bg)] text-[var(--evidence-direct-fg)]",
  derived_live: "border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] text-[var(--evidence-derived-fg)]",
  proxy: "border-[color:var(--evidence-proxy-border)] bg-[var(--evidence-proxy-bg)] text-[var(--evidence-proxy-fg)]",
};

export function FactorBreakdown({ score, title = "Factor breakdown" }: FactorBreakdownProps) {
  const [mounted, setMounted] = useState(false);
  const [showMethodNotes, setShowMethodNotes] = useState(false);
  const [openMethodKey, setOpenMethodKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!score) {
    return null;
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
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="eyebrow">Evidence breakdown</div>
            <CardTitle>{title}</CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => setShowMethodNotes((current) => !current)}
          >
            {showMethodNotes ? "Hide methodology" : "Methodology"}
            {showMethodNotes ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
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
          {orderedFactors.map((factor) => (
            <div
              key={factor.key}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--foreground)]">
                <div className="group relative flex items-center gap-2">
                  <span className="font-medium">{factor.label}</span>
                  <button
                    type="button"
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-1 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                    aria-label={`Show scoring methodology for ${factor.label}`}
                    onClick={() =>
                      setOpenMethodKey((current) =>
                        current === factor.key ? null : factor.key,
                      )
                    }
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <div
                    className={cn(
                      "absolute left-0 top-full z-10 mt-2 hidden w-[320px] rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 text-xs leading-5 text-[var(--foreground-soft)] shadow-[var(--shadow-panel)] group-hover:block group-focus-within:block",
                      openMethodKey === factor.key && "block",
                    )}
                  >
                    {getMethodologyForFactor(factor.key)}
                  </div>
                </div>
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
              {showMethodNotes && factor.evidenceExplanation ? (
                <p className="mt-2 text-xs leading-5 text-[var(--foreground-soft)]">
                  {factor.evidenceExplanation}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
