"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { SourceInlineSummary } from "@/components/Source/SourceInlineSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coordinates,
  DataTrend,
  GeodataResult,
  LandCoverBucket,
  MissionProfile,
  MissionRunPreset,
  MissionRunResult,
  NearbyPlace,
  SiteScore,
  WorkspaceCardId,
} from "@/types";

interface MissionRunCardProps {
  preset: MissionRunPreset;
  profile: MissionProfile;
  location: Coordinates;
  locationName: string;
  geodata: GeodataResult | null;
  dataTrends: DataTrend[];
  nearbyPlaces: NearbyPlace[];
  imageSummary: string;
  classification: LandCoverBucket[];
  score: SiteScore | null;
  onOpenCard: (cardId: WorkspaceCardId) => void;
  autoRun?: boolean;
}

const EVIDENCE_TONE: Record<string, string> = {
  direct_live: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
  derived_live: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
  proxy: "border-amber-300/20 bg-amber-400/10 text-amber-50",
};

export function MissionRunCard({
  preset,
  profile,
  location,
  locationName,
  geodata,
  dataTrends,
  nearbyPlaces,
  imageSummary,
  classification,
  score,
  onOpenCard,
  autoRun = false,
}: MissionRunCardProps) {
  const [result, setResult] = useState<MissionRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunKey, setLastRunKey] = useState<string | null>(null);

  const runKey = `${preset.id}:${location.lat.toFixed(4)}:${location.lng.toFixed(4)}`;
  const evidenceCounts = useMemo(
    () =>
      score?.factors.reduce(
        (acc, factor) => {
          const key = factor.evidenceKind ?? "derived_live";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) ?? {},
    [score],
  );

  const highlightedSources = useMemo(() => {
    if (!geodata) {
      return [];
    }

    return [
      geodata.sources.elevation,
      geodata.sources.infrastructure,
      geodata.sources.climate,
      geodata.sources.school,
    ].filter(Boolean);
  }, [geodata]);

  const runMission = useCallback(async () => {
    if (!geodata) {
      setError("Mission runs require live geodata for the active location.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mission-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: preset.id,
          profileId: profile.id,
          location,
          locationName,
          geodata,
          nearbyPlaces,
          dataTrends,
          imageSummary,
          classification,
        }),
      });

      const payload = (await response.json()) as MissionRunResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Mission run failed.");
      }

      setResult(payload);
      setLastRunKey(runKey);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Mission run failed.");
    } finally {
      setLoading(false);
    }
  }, [
    classification,
    dataTrends,
    geodata,
    imageSummary,
    location,
    locationName,
    nearbyPlaces,
    preset.id,
    profile.id,
    runKey,
  ]);

  useEffect(() => {
    if (!autoRun || !geodata || loading || lastRunKey === runKey) {
      return;
    }

    void runMission();
  }, [autoRun, geodata, lastRunKey, loading, runKey, runMission]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="eyebrow">Competition mission run</div>
            <CardTitle>{preset.title}</CardTitle>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              {preset.missionObjective}
            </p>
          </div>
          <Button type="button" className="rounded-full" onClick={runMission} disabled={loading || !geodata}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {result ? "Run again" : "Run mission"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)]">
            {profile.name}
          </Badge>
          <Badge className="border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)]">
            {locationName}
          </Badge>
          {result?.modelTrail.length ? (
            <Badge className="border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)]">
              Models: {result.modelTrail.join(", ")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            Why GeoSight believes this
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Live sources
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
                {result?.sourceSummary.liveSources.length
                  ? result.sourceSummary.liveSources.slice(0, 4).join(", ")
                  : "Waiting for mission output."}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Derived signals
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
                {result?.sourceSummary.derivedSignals.length
                  ? result.sourceSummary.derivedSignals.slice(0, 3).join(", ")
                  : "Derived analysis will appear here after the run."}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Missing coverage
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
                {result?.sourceSummary.missingCoverage.length
                  ? result.sourceSummary.missingCoverage.slice(0, 2).join(" ")
                  : "No major source gap is currently highlighted."}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">Final verdict</div>
            <div className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              {result?.headline ?? "Run the mission to generate the judge-facing verdict."}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              {result?.summary ?? preset.summary}
            </p>
            {error ? (
              <div className="mt-3 rounded-[1rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-foreground)]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">Evidence mix</div>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <div className="mt-4 grid gap-3">
              {highlightedSources.map((source) => (
                <SourceInlineSummary key={source.id} source={source} compact />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow">Step timeline</div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              {preset.steps.length} fixed steps
            </div>
          </div>
          {(() => {
            const steps =
              result?.stepResults ??
              preset.steps.map((step) => ({
                id: step.id,
                title: step.title,
                objective: step.objective,
                answer: "Run the mission to generate this step.",
                model: "pending",
              }));

            return (
          <div className="grid gap-3">
                {steps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 text-base font-semibold text-[var(--foreground)]">
                      {step.title}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {step.objective}
                    </div>
                  </div>
                  <Badge className="border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--foreground-soft)]">
                    {step.model}
                  </Badge>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--foreground-soft)]">
                  {step.answer}
                </p>
              </div>
                ))}
          </div>
            );
          })()}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Recommended next cards</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {preset.recommendedCards.map((cardId) => (
              <Button
                key={cardId}
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => onOpenCard(cardId)}
              >
                Open {cardId.replaceAll("-", " ")}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
