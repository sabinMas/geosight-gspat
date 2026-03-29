"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteScore } from "@/types";

interface FactorBreakdownProps {
  score: SiteScore | null;
  title?: string;
}

const EVIDENCE_TONE: Record<string, string> = {
  direct_live: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
  derived_live: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
  proxy: "border-amber-300/20 bg-amber-400/10 text-amber-50",
};

export function FactorBreakdown({ score, title = "Factor breakdown" }: FactorBreakdownProps) {
  const [mounted, setMounted] = useState(false);
  const [showMethodNotes, setShowMethodNotes] = useState(false);

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
            {showMethodNotes ? "Hide notes" : "Show notes"}
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
        <div className="h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={score.factors}>
                <XAxis dataKey="label" hide />
                <YAxis stroke="#6b7d93" />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#081221",
                    border: "1px solid rgba(0,229,255,0.18)",
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {score.factors.map((factor) => (
                    <Cell key={factor.key} fill={factor.score > 80 ? "#5be49b" : factor.score > 60 ? "#00e5ff" : "#ffab00"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <div className="space-y-2">
          {score.factors.map((factor) => (
            <div
              key={factor.key}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--foreground)]">
                <span className="font-medium">{factor.label}</span>
                <div className="flex items-center gap-2">
                  {factor.evidenceLabel ? (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        EVIDENCE_TONE[factor.evidenceKind ?? "derived_live"]
                      }`}
                    >
                      {factor.evidenceLabel}
                    </span>
                  ) : null}
                  <span className="font-semibold">{factor.score}</span>
                </div>
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
