"use client";

import { Mountain, Orbit, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TerrainViewerProps {
  exaggeration: number;
  onExaggerationChange: (value: number) => void;
}

export function TerrainViewer({
  exaggeration,
  onExaggerationChange,
}: TerrainViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3D terrain controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <Waves className="mb-2 h-4 w-4 text-cyan-300" />
            Water bodies can be highlighted as intake candidates.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <Mountain className="mb-2 h-4 w-4 text-amber-300" />
            Exaggeration reveals slope changes that affect grading risk.
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <Orbit className="mb-2 h-4 w-4 text-slate-300" />
            Orbit mode frames a fly-around narrative for stakeholder demos.
          </div>
        </div>

        <label className="block text-sm text-slate-300">
          Terrain exaggeration: <span className="font-semibold text-white">{exaggeration.toFixed(1)}x</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={exaggeration}
            onChange={(event) => onExaggerationChange(Number(event.target.value))}
            className="mt-3 w-full accent-cyan-300"
          />
        </label>

        <Button variant="amber" className="w-full rounded-2xl">
          Fly Around
        </Button>
      </CardContent>
    </Card>
  );
}
