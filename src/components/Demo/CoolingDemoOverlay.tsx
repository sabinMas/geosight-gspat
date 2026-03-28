"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { DemoOverlay, SavedSite, SiteScore } from "@/types";

interface CoolingDemoOverlayProps {
  demo: DemoOverlay;
  open: boolean;
  score: SiteScore | null;
  sites: SavedSite[];
  onClose: () => void;
  onLoadShowcase: () => void;
  onSaveCurrentSite: () => void;
  onFocusSite: (siteId: string) => void;
}

export function CoolingDemoOverlay({
  demo,
  open,
  score,
  sites,
  onClose,
  onLoadShowcase,
  onSaveCurrentSite,
  onFocusSite,
}: CoolingDemoOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-screen max-w-6xl items-start justify-center p-4 md:p-6">
        <div className="glass-panel relative w-full rounded-[2rem] border border-cyan-300/15 p-4 md:p-6">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4"
            onClick={onClose}
            aria-label="Close cooling demo"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{demo.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
                <p>{demo.description}</p>
                <p>
                  This guided overlay keeps the comparison table, score summary, and benchmark
                  candidate sites together without making infrastructure siting the default product
                  story.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={onLoadShowcase}>
                    Load showcase
                  </Button>
                  <Button type="button" variant="secondary" onClick={onSaveCurrentSite}>
                    Save current site to demo compare
                  </Button>
                </div>

                <div className="grid gap-3">
                  {(demo.preloadedSites ?? []).map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => onFocusSite(site.id)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{site.name}</div>
                          <div className="mt-1 text-xs text-slate-400">{site.regionName}</div>
                        </div>
                        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-100">
                          {site.score.total}/100
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <ScoreCard score={score} />
              <FactorBreakdown score={score} />
            </div>
          </div>

          <div className="mt-4">
            <CompareTable sites={sites} />
          </div>
        </div>
      </div>
    </div>
  );
}
