"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandCoverBucket } from "@/types";

interface LandClassifierProps {
  results: LandCoverBucket[];
}

export function LandClassifier({ results }: LandClassifierProps) {
  const dominant = useMemo(
    () => results.slice().sort((a, b) => b.value - a.value)[0],
    [results],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Land classification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dominant ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-3 text-sm text-cyan-50">
            Dominant cover: <span className="font-semibold">{dominant.label}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          {results.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-900/70">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
