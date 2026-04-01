import { GeodataResult, MissionProfile, SiteFactorScore, SiteScore } from "@/types";

export interface RankedFactorInsight extends SiteFactorScore {
  impact: number;
  gap: number;
  maxImpact: number;
  weightPercent: number;
  shortDetail: string;
}

export interface AnalysisOverview {
  tone: "loading" | "ready" | "partial" | "cached" | "estimated" | "unavailable" | "error";
  confidenceLabel: string;
  summary: string;
  statusDetail: string;
  strengths: string[];
  watchouts: string[];
  trustNotes: string[];
  nextSteps: string[];
}

function trimDetail(detail: string, maxLength: number = 110) {
  const sentence = detail.split(". ")[0]?.trim() ?? detail.trim();
  if (sentence.length <= maxLength) {
    return sentence.endsWith(".") ? sentence : `${sentence}.`;
  }

  const shortened = `${sentence.slice(0, maxLength).trimEnd()}...`;
  return shortened.endsWith(".") ? shortened : `${shortened}`;
}

export function rankFactorInsights(score: SiteScore | null): RankedFactorInsight[] {
  if (!score) {
    return [];
  }

  return score.factors.map((factor) => {
    const maxImpact = Number((factor.weight * 100).toFixed(1));
    const impact = Number((factor.score * factor.weight).toFixed(1));
    const gap = Number((maxImpact - impact).toFixed(1));

    return {
      ...factor,
      impact,
      gap,
      maxImpact,
      weightPercent: Math.round(factor.weight * 100),
      shortDetail: trimDetail(factor.detail),
    };
  });
}

function formatFactorPhrase(factor: RankedFactorInsight | undefined) {
  return factor ? factor.label.toLowerCase() : "the available signals";
}

function buildSummaryFromScore(profile: MissionProfile, score: SiteScore, ranked: RankedFactorInsight[]) {
  const strongest = [...ranked].sort((a, b) => b.impact - a.impact)[0];
  const secondStrongest = [...ranked].sort((a, b) => b.impact - a.impact)[1];
  const biggestConstraint = [...ranked].sort((a, b) => b.gap - a.gap)[0];

  if (score.total >= 80) {
    return `This place looks strong for ${profile.name.toLowerCase()} because ${formatFactorPhrase(
      strongest,
    )} and ${formatFactorPhrase(secondStrongest)} are carrying the score. The main remaining caution is ${formatFactorPhrase(
      biggestConstraint,
    )}.`;
  }

  if (score.total >= 65) {
    return `This is a promising but not frictionless fit for ${profile.name.toLowerCase()}. ${formatFactorPhrase(
      strongest,
    )} is helping, while ${formatFactorPhrase(
      biggestConstraint,
    )} still needs a closer look before treating the result as decision-ready.`;
  }

  return `This location reads as a weaker early fit for ${profile.name.toLowerCase()}. GeoSight is seeing more drag from ${formatFactorPhrase(
    biggestConstraint,
  )} than lift from the current strengths, so treat it as a place to question rather than a front-runner.`;
}

function buildTrustNotes(geodata: GeodataResult | null, ranked: RankedFactorInsight[]) {
  if (!geodata) {
    return [];
  }

  const sources = Object.values(geodata.sources);
  const liveCount = sources.filter((source) => source.status === "live").length;
  const derivedCount = sources.filter((source) => source.status === "derived").length;
  const limitedCount = sources.filter((source) => source.status === "limited").length;
  const unavailableCount = sources.filter((source) => source.status === "unavailable").length;

  const proxyWeight = ranked
    .filter((factor) => factor.evidenceKind === "proxy")
    .reduce((total, factor) => total + factor.weight, 0);

  const notes = [
    `${liveCount} live source areas and ${derivedCount} derived source areas are contributing to this readout.`,
  ];

  if (limitedCount > 0 || unavailableCount > 0) {
    notes.push(
      `${limitedCount + unavailableCount} source areas are limited or unavailable, so unsupported signals are shown explicitly instead of being guessed.`,
    );
  }

  if (proxyWeight >= 0.3) {
    notes.push(
      `${Math.round(proxyWeight * 100)}% of the score weight relies on proxy heuristics, which is useful for screening but not the same as direct measurement.`,
    );
  }

  return notes;
}

export function buildAnalysisOverview(args: {
  geodata: GeodataResult | null;
  score: SiteScore | null;
  profile: MissionProfile;
  locationName: string;
  loading: boolean;
  error: string | null;
}): AnalysisOverview {
  const { geodata, score, profile, locationName, loading, error } = args;

  if (!geodata && loading) {
    return {
      tone: "loading",
      confidenceLabel: "Building the first live read",
      summary: `GeoSight is gathering terrain, access, climate, hazard, and source metadata for ${locationName}.`,
      statusDetail:
        "The workspace stays usable while live providers respond. Cards will fill in as soon as the current location bundle is ready.",
      strengths: [],
      watchouts: [],
      trustNotes: [
        "Loading means GeoSight is still waiting on live providers.",
        "Unavailable signals will be labeled instead of silently omitted.",
      ],
      nextSteps: ["Wait for the first analysis to complete.", "Open a different place if this region stalls."],
    };
  }

  if (!geodata) {
    return {
      tone: error ? "error" : "unavailable",
      confidenceLabel: "No dependable location bundle yet",
      summary: error
        ? `GeoSight could not assemble a dependable live read for ${locationName} yet.`
        : `Search or click a place to start the first live analysis for ${profile.name.toLowerCase()}.`,
      statusDetail:
        error ??
        "The workspace is ready, but it needs an active location before scoring, source checks, and result narratives can appear.",
      strengths: [],
      watchouts: [],
      trustNotes: [
        "GeoSight does not invent fallback values when a live location bundle is missing.",
      ],
      nextSteps: [
        "Search a city, address, landmark, or coordinates.",
        "Start from a featured example if you want a guided first run.",
      ],
    };
  }

  const ranked = rankFactorInsights(score);
  const sources = Object.values(geodata.sources);
  const limitedCount = sources.filter((source) => source.status === "limited").length;
  const unavailableCount = sources.filter((source) => source.status === "unavailable").length;
  const proxyWeight = ranked
    .filter((factor) => factor.evidenceKind === "proxy")
    .reduce((total, factor) => total + factor.weight, 0);

  const tone = error?.toLowerCase().includes("cached")
    ? "cached"
    : unavailableCount > 0 || limitedCount > 1
      ? "partial"
      : proxyWeight >= 0.3
        ? "estimated"
        : "ready";

  const strongest = [...ranked]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((factor) => `${factor.label}: ${factor.shortDetail}`);
  const watchouts = [...ranked]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((factor) => `${factor.label}: ${factor.shortDetail}`);

  return {
    tone,
    confidenceLabel:
      tone === "ready"
        ? "Mostly live and derived-live context"
        : tone === "cached"
          ? "Recent cached snapshot with live refresh issue"
          : tone === "estimated"
            ? "Good coverage, but some heuristic weighting"
            : "Useful early read with visible gaps",
    summary: score
      ? buildSummaryFromScore(profile, score, ranked)
      : `GeoSight has a live location bundle for ${locationName}, but it still needs enough scoring inputs to produce a stable ${profile.name.toLowerCase()} recommendation.`,
    statusDetail:
      tone === "cached"
        ? "A live refresh timed out, so GeoSight is showing the most recent cached context rather than leaving the analysis blank."
        : tone === "partial"
          ? `${limitedCount + unavailableCount} source areas are limited or unavailable for this place, so the narrative below only reflects the signals GeoSight could verify.`
          : tone === "estimated"
            ? "Most providers responded, but a meaningful share of the score still comes from proxy heuristics and synthesized factors."
            : "The current narrative is grounded in the available live measurements plus derived analysis from those source feeds.",
    strengths: strongest,
    watchouts,
    trustNotes: buildTrustNotes(geodata, ranked),
    nextSteps: [
      "Open factor breakdown to see which inputs helped or hurt most.",
      "Open source awareness to inspect freshness, coverage, and provider limits.",
      "Save the site if you want to compare it against another candidate.",
    ],
  };
}
