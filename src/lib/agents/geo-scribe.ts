import { runAnalysisWithFallback } from "@/lib/analysis-runner";
import { getProfileById } from "@/lib/profiles";
import { GeoSightAgentAdapter, GeoSightAgentResult } from "@/lib/agents/types";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const SCRIBE_PROMPT_OVERRIDE = `You are GeoScribe. Transform the provided geospatial analysis context into a structured professional report.

Format your output as a clean markdown document with these sections:
# Site Assessment Report
## Executive Summary
(2-3 sentence overview of the site and its primary suitability signal)
## Location Context
(Coordinates, elevation, region, and active mission profile)
## Key Findings
(One paragraph per major scoring factor with the actual data values cited)
## Risk Assessment
(Hazards, flood zone, contamination, seismic context — cite actual source status)
## Infrastructure & Connectivity
(Broadband, power, road, water access — cite distances and readings)
## Subsurface Profile
(Groundwater depth, soil type, bedrock depth — if available)
## Data Provenance
(List every data source used and its status: live, derived, limited, or unavailable)
## Conclusion
(1-2 sentence site recommendation aligned to the active mission profile)

Rules:
- Every sentence must carry information. No filler.
- Cite data values with their units.
- If a data source is unavailable, say so explicitly in the relevant section.
- Never fabricate values.`;

export const geoScribeAgent: GeoSightAgentAdapter = {
  agentId: "geo-scribe",
  label: "GeoScribe",
  description: "Report writing agent that transforms analysis into structured deliverables.",

  async run(
    payload: AnalyzeRequestBody,
    profile: MissionProfile,
  ): Promise<GeoSightAgentResult> {
    const resolvedProfile = profile ?? getProfileById(payload.profileId);
    const reportPayload: AnalyzeRequestBody = {
      ...payload,
      question: `${SCRIBE_PROMPT_OVERRIDE}

Generate a full site assessment report for the location at ${
        payload.location?.lat ?? "unknown"
      }, ${payload.location?.lng ?? "unknown"} using the ${
        resolvedProfile.name
      } mission profile. Include all available data from the context bundle. ${
        payload.question || ""
      }`.trim(),
    };

    const result = await runAnalysisWithFallback(reportPayload, resolvedProfile, {
      fallbackAnswer:
        "Report generation requires an active LLM provider. Please check Groq and Gemini API key configuration.",
    });

    return {
      ...result,
      agentId: "geo-scribe",
    };
  },
};
