import { GeoSightAgentAdapter, GeoSightAgentResult } from "@/lib/agents/types";
import { getProfileById } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

function buildGeoGuideResponse(payload: AnalyzeRequestBody, profile: MissionProfile) {
  const normalized = payload.question.toLowerCase();
  const locationLabel = payload.locationName ?? "the current place";

  if (
    normalized.includes("score") ||
    normalized.includes("factor") ||
    normalized.includes("breakdown")
  ) {
    return `Use Mission score for the overall fit and Factor breakdown for the weighted reasoning behind it. Stay on ${locationLabel} and open those cards one at a time when you want more depth without turning the whole workspace into a dense board.`;
  }

  if (
    normalized.includes("source") ||
    normalized.includes("trust") ||
    normalized.includes("ground") ||
    normalized.includes("provenance")
  ) {
    return "Open the Source awareness card to inspect provider freshness, coverage, confidence, and fallback notes for the current analysis. That is the fastest way to tell what is grounded in live data versus limited or derived.";
  }

  if (normalized.includes("report")) {
    return `Generate report becomes useful once ${locationLabel} has active geodata loaded for the ${profile.name} lens. If it is disabled, focus a place first and wait for the main analysis cards to populate before asking GeoScribe for a write-up.`;
  }

  if (normalized.includes("compare")) {
    return "Save at least two sites, then open the Compare view to evaluate them side by side. GeoSight keeps comparison hidden until you actually have competing candidates so the default workspace stays calmer.";
  }

  return `GeoSight is currently using the ${profile.name} lens for ${locationLabel}. Start with the active location or chat panel, then reveal supporting cards like score, source awareness, or comparison only when the question calls for them.`;
}

export const geoGuideAgent: GeoSightAgentAdapter = {
  agentId: "geo-guide",
  label: "GeoGuide",
  description: "Interface help and onboarding agent for GeoSight workflows.",

  async run(
    payload: AnalyzeRequestBody,
    profile: MissionProfile,
  ): Promise<GeoSightAgentResult> {
    const resolvedProfile = profile ?? getProfileById(payload.profileId);

    return {
      agentId: "geo-guide",
      model: "deterministic-guide",
      response: buildGeoGuideResponse(payload, resolvedProfile),
    };
  },
};
