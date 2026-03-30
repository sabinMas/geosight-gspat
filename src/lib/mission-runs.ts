import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { getProfileById } from "@/lib/profiles";
import { buildFactorScores } from "@/lib/scoring";
import {
  AnalyzeRequestBody,
  DataSourceMeta,
  GeodataResult,
  MissionRunPreset,
  MissionRunRequestBody,
  MissionRunResult,
  MissionRunSourceSummary,
  MissionRunStepPreset,
  MissionRunStepResult,
  MissionProfile,
  SiteFactorScore,
} from "@/types";

function formatCoverageGap(source: DataSourceMeta) {
  return `${source.label}: ${source.coverage}. ${source.confidence}`;
}

export function buildMissionRunSourceSummary(
  geodata?: GeodataResult | null,
): MissionRunSourceSummary {
  if (!geodata) {
    return {
      liveSources: [],
      derivedSignals: [],
      missingCoverage: ["Geodata has not been loaded yet for this mission run."],
      regionalProviders: [],
    };
  }

  const sources = Object.values(geodata.sources);

  return {
    liveSources: sources
      .filter((source) => source.status === "live")
      .map((source) => `${source.label} (${source.provider})`),
    derivedSignals: sources
      .filter((source) => source.status === "derived" || source.accessType === "derived")
      .map((source) => `${source.label} (${source.provider})`),
    missingCoverage: sources
      .filter((source) => source.status === "limited" || source.status === "unavailable")
      .map(formatCoverageGap),
    regionalProviders: [
      geodata.sources.elevation,
      geodata.sources.demographics,
      geodata.sources.climate,
      geodata.sources.school,
      geodata.sources.hazardFire,
    ].map((source) => `${source.label}: ${source.provider}`),
  };
}

function formatEvidenceMix(factors: SiteFactorScore[]) {
  const counts = factors.reduce(
    (acc, factor) => {
      const key = factor.evidenceKind ?? "derived_live";
      acc[key] += 1;
      return acc;
    },
    { direct_live: 0, derived_live: 0, proxy: 0 },
  );

  return `${counts.direct_live} direct live, ${counts.derived_live} derived live, ${counts.proxy} proxy heuristics`;
}

function pickTopFactor(factors: SiteFactorScore[]) {
  return [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0] ?? null;
}

function buildHeadline(
  locationName: string,
  profile: MissionProfile,
  geodata?: GeodataResult | null,
) {
  if (!geodata) {
    return `${locationName} needs live data before GeoSight can run a grounded ${profile.name.toLowerCase()} verdict.`;
  }

  const score = buildFactorScores(geodata, profile);
  const weightedTotal = Math.round(score.reduce((acc, factor) => acc + factor.score * factor.weight, 0));
  const bandText =
    profile.recommendationBands.find((band) => weightedTotal >= band.min)?.text ??
    profile.recommendationBands.at(-1)?.text ??
    "needs more diligence";

  return `${locationName} scores ${weightedTotal}/100 for ${profile.name.toLowerCase()} and currently reads as: ${bandText}`;
}

function buildMissionFallbackStepAnswer(input: {
  preset: MissionRunPreset;
  step: MissionRunStepPreset;
  profile: MissionProfile;
  payload: MissionRunRequestBody;
}) {
  const { preset, step, profile, payload } = input;
  const baseAssessment = buildFallbackAssessment(
    {
      ...payload,
      question: step.question,
      profileId: profile.id,
    },
    profile,
  );
  const sourceSummary = buildMissionRunSourceSummary(payload.geodata);
  const scoreFactors = payload.geodata ? buildFactorScores(payload.geodata, profile) : [];
  const topFactor = pickTopFactor(scoreFactors);

  return [
    `Mission step: ${step.title}`,
    `Objective: ${step.objective}`,
    topFactor
      ? `Best supporting factor right now: ${topFactor.label} (${topFactor.score}/100, ${topFactor.evidenceLabel?.toLowerCase() ?? "derived signal"}).`
      : "Best supporting factor is still unavailable because live geodata is missing.",
    `Evidence mix: ${formatEvidenceMix(scoreFactors)}`,
    sourceSummary.missingCoverage.length
      ? `Known gaps: ${sourceSummary.missingCoverage.slice(0, 2).join(" | ")}`
      : "Known gaps: No major source gaps are currently flagged in the active geodata payload.",
    `Competition fallback narrative: ${preset.fallbackNarrative}`,
    "",
    baseAssessment,
  ].join("\n");
}

export function buildMissionRunSummary(input: {
  preset: MissionRunPreset;
  profile: MissionProfile;
  payload: MissionRunRequestBody;
  stepResults: MissionRunStepResult[];
}): MissionRunResult {
  const { preset, profile, payload, stepResults } = input;
  const geodata = payload.geodata;
  const scoreFactors = geodata ? buildFactorScores(geodata, profile) : [];
  const sourceSummary = buildMissionRunSourceSummary(geodata);
  const modelTrail = Array.from(new Set(stepResults.map((step) => step.model)));
  const topFactor = pickTopFactor(scoreFactors);
  const evidenceMix = formatEvidenceMix(scoreFactors);
  const locationName = payload.locationName ?? "the active location";

  return {
    presetId: preset.id,
    title: preset.title,
    missionObjective: preset.missionObjective,
    headline: buildHeadline(locationName, profile, geodata),
    summary: topFactor
      ? `${locationName} is being judged through the ${profile.name} lens. GeoSight's strongest current supporting factor is ${topFactor.label}, and the mission run is built from ${evidenceMix}.`
      : `${locationName} is being judged through the ${profile.name} lens, but the mission run is still waiting on enough live geodata to form a stronger score-backed summary.`,
    stepResults,
    recommendedCards: preset.recommendedCards,
    sourceSummary,
    modelTrail,
  };
}

export function buildMissionStepPayload(
  payload: MissionRunRequestBody,
  profile: MissionProfile,
  step: MissionRunStepPreset,
): AnalyzeRequestBody {
  return {
    ...payload,
    profileId: profile.id,
    question: step.question.replaceAll("{locationName}", payload.locationName ?? "the active location"),
  };
}

export function buildMissionFallbackAnswer(
  payload: MissionRunRequestBody,
  preset: MissionRunPreset,
  step: MissionRunStepPreset,
) {
  return buildMissionFallbackStepAnswer({
    preset,
    step,
    profile: getProfileById(preset.profileId),
    payload,
  });
}
