import { buildSourceMeta } from "@/lib/source-metadata";
import { buildFactorScores } from "@/lib/scoring";
import {
  DataSourceMeta,
  GeodataResult,
  MissionProfile,
  MissionRunPreset,
  MissionRunResult,
  MissionRunSourceSummary,
} from "@/types";

function formatDistance(distanceKm: number | null | undefined) {
  return distanceKm === null || distanceKm === undefined
    ? "distance unavailable"
    : `${distanceKm.toFixed(1)} km`;
}

function getGroundingFallbackCatalog(locationName: string) {
  return {
    "pnw-cooling": [
      buildSourceMeta({
        id: "demo-grounding-water",
        label: "Cooling water context",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Columbia River infrastructure story",
        confidence:
          "Shows the cooling-water and stream-gauge story used in the benchmark demo while live hydrology finishes loading.",
        note: `Anchored on ${locationName} and the Columbia River cooling workflow.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-power",
        label: "Power and access",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Columbia River infrastructure story",
        confidence:
          "Keeps the infrastructure, power, and logistics narrative visible when live utility layers are delayed.",
      }),
      buildSourceMeta({
        id: "demo-grounding-trust",
        label: "Trust framing",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Competition demo only",
        confidence:
          "Highlights the direct-live versus derived-live distinction used in the judge walkthrough.",
      }),
    ],
    "tokyo-commercial": [
      buildSourceMeta({
        id: "demo-grounding-tokyo-access",
        label: "Corridor access",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Keeps the rail, logistics, and urban-access narrative visible while global live providers resolve.",
        note: `Framed around ${locationName} and Tokyo commercial district benchmarks.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-tokyo-coverage",
        label: "Global coverage limits",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Makes the non-US trust model explicit instead of leaving the grounding panel stuck in a pending state.",
      }),
      buildSourceMeta({
        id: "demo-grounding-tokyo-activity",
        label: "Mapped activity pattern",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Represents district-scale commercial activity and access framing without inventing unsupported parcel or census detail.",
      }),
    ],
    "wa-residential": [
      buildSourceMeta({
        id: "demo-grounding-wa-neighborhood",
        label: "Neighborhood fit",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Keeps the neighborhood, amenities, and buildability story visible while live context finishes loading.",
        note: `Anchored on ${locationName} and Washington residential due-diligence flow.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-wa-schools",
        label: "School context",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Represents the Washington-first school context trust story when official metrics are still loading.",
      }),
      buildSourceMeta({
        id: "demo-grounding-wa-risk",
        label: "Early risk framing",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Keeps hazard and diligence framing visible without fabricating unsupported risk detail.",
      }),
    ],
  } as const;
}

export function buildDemoGroundingSources(
  demoId: string | null | undefined,
  locationName: string,
): DataSourceMeta[] {
  if (!demoId) {
    return [];
  }

  const catalog = getGroundingFallbackCatalog(locationName);
  return [...(catalog[demoId as keyof typeof catalog] ?? [])];
}

function buildDemoMissionSourceSummary(
  preset: MissionRunPreset,
  fallbackSources: DataSourceMeta[],
  geodata?: GeodataResult | null,
): MissionRunSourceSummary {
  if (geodata) {
    const liveOrDemoSources = Object.values(geodata.sources).filter((source) => source.status !== "unavailable");

    return {
      liveSources: liveOrDemoSources
        .filter((source) => source.status === "live" || source.status === "demo")
        .slice(0, 5)
        .map((source) => `${source.label} (${source.provider})`),
      derivedSignals: liveOrDemoSources
        .filter((source) => source.status === "derived" || source.status === "limited")
        .slice(0, 4)
        .map((source) => `${source.label} (${source.provider})`),
      missingCoverage: Object.values(geodata.sources)
        .filter((source) => source.status === "limited" || source.status === "unavailable")
        .slice(0, 3)
        .map((source) => `${source.label}: ${source.confidence}`),
      regionalProviders: liveOrDemoSources
        .slice(0, 5)
        .map((source) => `${source.label}: ${source.provider}`),
    };
  }

  return {
    liveSources: [],
    derivedSignals: fallbackSources.map((source) => `${source.label} (${source.provider})`),
    missingCoverage: [
      "Live mission execution timed out, so GeoSight is showing the competition-safe fallback narrative.",
      preset.fallbackNarrative,
    ],
    regionalProviders: fallbackSources.map((source) => `${source.label}: ${source.provider}`),
  };
}

export function buildDemoMissionRunResult(input: {
  preset: MissionRunPreset;
  profile: MissionProfile;
  locationName: string;
  geodata?: GeodataResult | null;
}): MissionRunResult {
  const { preset, profile, locationName, geodata } = input;
  const scoreFactors = geodata ? buildFactorScores(geodata, profile) : [];
  const topFactor = [...scoreFactors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0] ?? null;
  const fallbackSources = buildDemoGroundingSources(preset.demoId ?? null, locationName);
  const sourceSummary = buildDemoMissionSourceSummary(preset, fallbackSources, geodata);

  return {
    presetId: preset.id,
    title: preset.title,
    missionObjective: preset.missionObjective,
    headline: geodata
      ? `${locationName} is using GeoSight's demo-safe fallback while live mission execution catches up. The strongest currently loaded factor is ${topFactor?.label ?? "the active mission profile"}`
      : `${locationName} is using GeoSight's demo-safe mission narrative while live data and agents catch up.`,
    summary: geodata
      ? `${preset.fallbackNarrative} GeoSight is still preserving the current ${profile.name.toLowerCase()} read using the loaded map context, but the step answers below are coming from the deterministic demo fallback.`
      : `${preset.fallbackNarrative} This keeps the competition story moving without pretending that live mission execution has completed.`,
    stepResults: preset.steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      objective: step.objective,
      model: "demo-fallback",
      answer: [
        `Demo fallback step ${index + 1}: ${step.title}.`,
        geodata
          ? `Current map context still shows ${locationName} with road access at ${formatDistance(
              geodata.nearestRoad.distanceKm,
            )}, power at ${formatDistance(geodata.nearestPower.distanceKm)}, and water at ${formatDistance(
              geodata.nearestWaterBody.distanceKm,
            )}.`
          : `Live geodata did not finish in time, so GeoSight is replaying the competition-safe storyline for ${locationName}.`,
        topFactor
          ? `Best currently loaded factor: ${topFactor.label} scored ${topFactor.score}/100 and is labeled ${topFactor.evidenceLabel?.toLowerCase() ?? "derived analysis"}.`
          : "The fallback is preserving mission structure, trust framing, and next-step guidance without inventing unsupported measurements.",
        `Judge-safe narrative: ${preset.fallbackNarrative}`,
      ].join(" "),
    })),
    recommendedCards: preset.recommendedCards,
    sourceSummary,
    modelTrail: ["demo-fallback"],
  };
}
