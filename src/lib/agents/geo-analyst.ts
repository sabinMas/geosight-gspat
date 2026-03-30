import { runAnalysisWithFallback } from "@/lib/analysis-runner";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { GeoSightAgentAdapter, GeoSightAgentResult } from "@/lib/agents/types";
import { getProfileById } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

export const geoAnalystAgent: GeoSightAgentAdapter = {
  agentId: "geo-analyst",
  label: "GeoAnalyst",
  description: "Site intelligence and scoring agent powered by Groq with Gemini fallback.",

  async run(payload: AnalyzeRequestBody, profile: MissionProfile): Promise<GeoSightAgentResult> {
    const resolvedProfile = profile ?? getProfileById(payload.profileId);
    const result = await runAnalysisWithFallback(payload, resolvedProfile, {
      fallbackAnswer: buildFallbackAssessment(payload, resolvedProfile),
    });

    return {
      ...result,
      agentId: "geo-analyst",
    };
  },
};
