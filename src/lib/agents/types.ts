import { AnalysisResult } from "@/lib/analysis-provider";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

export type GeoSightAgentId = "geo-analyst" | "geo-scribe";
export type GeoSightClawInput = AnalyzeRequestBody;

export type GeoSightAgentResult = AnalysisResult & {
  agentId: GeoSightAgentId;
  fallbackAgentId?: GeoSightAgentId;
};

export type GeoSightAgentOutput = GeoSightAgentResult;

export interface GeoSightAgentAdapter {
  agentId: GeoSightAgentId;
  label: string;
  description: string;
  run(payload: AnalyzeRequestBody, profile: MissionProfile): Promise<GeoSightAgentResult>;
}
