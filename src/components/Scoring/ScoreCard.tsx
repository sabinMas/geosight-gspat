"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <div className="eyebrow">Planning board</div>
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
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
          ) : null}
          <div className={`${mounted ? "-mt-26" : "mt-10"} text-center`}>
            <div className="text-5xl font-semibold text-white">{score.total}</div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">out of 100</div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{score.recommendation}</p>
          {bandLabel ? <p className="text-xs leading-5 text-[var(--muted-foreground)]">{bandLabel}</p> : null}
          {profile ? (
            <div
              className="rounded-[1.5rem] border p-4 text-sm text-[var(--foreground)]"
              style={{
                borderColor: `${accent}33`,
                background: `${accent}12`,
              }}
            >
              Deterministic weighted model:{" "}
              {profile.factors
                .map((factor) => `${factor.label} ${Math.round(factor.weight * 100)}%`)
                .join(", ")}
              .
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
