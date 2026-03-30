import { GeoSightAgentAdapter, GeoSightAgentResult } from "@/lib/agents/types";
import { formatUiAuditResult, runDeterministicUiAudit } from "@/lib/ux-audit";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

export const geoUsabilityAgent: GeoSightAgentAdapter = {
  agentId: "geo-usability",
  label: "GeoUsability",
  description: "Front-end UX audit agent backed by deterministic UI heuristics.",

  async run(payload: AnalyzeRequestBody, profile: MissionProfile): Promise<GeoSightAgentResult> {
    void payload;
    void profile;

    return {
      agentId: "geo-usability",
      model: "deterministic-ui-audit",
      response: formatUiAuditResult(runDeterministicUiAudit(undefined)),
    };
  },
};
