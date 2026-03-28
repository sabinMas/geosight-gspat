"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteScore } from "@/types";

interface FactorBreakdownProps {
  score: SiteScore | null;
  title?: string;
}

export function FactorBreakdown({ score, title = "Factor breakdown" }: FactorBreakdownProps) {
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
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <div key={factor.key} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="flex items-center justify-between text-sm text-white">
                <span>{factor.label}</span>
                <span>{factor.score}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{factor.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
