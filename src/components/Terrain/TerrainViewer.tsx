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
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground-soft)]">
            <Waves className="mb-2 h-4 w-4 text-[var(--accent)]" />
            Water bodies can be highlighted as intake candidates.
          </div>
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground-soft)]">
            <Mountain className="mb-2 h-4 w-4 text-[var(--warning-foreground)]" />
            Exaggeration reveals slope changes that affect grading risk.
          </div>
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground-soft)]">
            <Orbit className="mb-2 h-4 w-4 text-[var(--foreground-soft)]" />
        Orbit mode frames a smooth fly-around for presentations and review.
          </div>
        </div>

        <label className="block text-sm text-[var(--foreground-soft)]">
          Terrain exaggeration: <span className="font-semibold text-[var(--foreground)]">{exaggeration.toFixed(1)}x</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={exaggeration}
            onChange={(event) => onExaggerationChange(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--accent)]"
          />
        </label>

        <Button variant="amber" className="w-full rounded-2xl">
          Fly Around
        </Button>
      </CardContent>
    </Card>
  );
}
