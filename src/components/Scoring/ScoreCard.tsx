"use client";

import { useEffect, useState } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteScore } from "@/types";

interface ScoreCardProps {
  score: SiteScore | null;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!score) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cooling demo score</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="h-44">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ value: score.total, fill: score.total > 80 ? "#5be49b" : "#ffab00" }]}
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
          <p className="text-sm leading-6 text-slate-300">{score.recommendation}</p>
          <p className="text-xs leading-5 text-slate-400">
            This fixed scorecard is the featured data center cooling workflow. Use the chat panel for other GeoSight use cases like hiking, housing, retail, or logistics.
          </p>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-50">
            Deterministic weighted model: water 30%, power 20%, terrain 15%, climate 15%, roads 10%, land cover 10%.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
