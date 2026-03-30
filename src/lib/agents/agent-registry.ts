import {
  AGENT_CONFIGS,
  AGENT_IDS,
  GEO_ANALYST_SYSTEM_PROMPT,
  GEO_USABILITY_SYSTEM_PROMPT,
  getAgentConfig,
  isAgentId,
  type AgentConfig,
  type AgentId,
  type GeoSightContext,
} from "@/lib/agents/agent-config";
import { geoAnalystAgent } from "@/lib/agents/geo-analyst";
import { geoGuideAgent } from "@/lib/agents/geo-guide";
import { geoScribeAgent } from "@/lib/agents/geo-scribe";
import { geoUsabilityAgent } from "@/lib/agents/geo-usability";
import { GeoSightAgentAdapter, GeoSightAgentId } from "@/lib/agents/types";

export {
  AGENT_CONFIGS,
  AGENT_IDS,
  GEO_ANALYST_SYSTEM_PROMPT,
  GEO_USABILITY_SYSTEM_PROMPT,
  getAgentConfig,
  isAgentId,
  type AgentConfig,
  type AgentId,
  type GeoSightContext,
};

export const AGENT_REGISTRY: Record<GeoSightAgentId, GeoSightAgentAdapter> = {
  "geo-analyst": geoAnalystAgent,
  "geo-guide": geoGuideAgent,
  "geo-scribe": geoScribeAgent,
  "geo-usability": geoUsabilityAgent,
};

export function getAgentAdapter(agentId: GeoSightAgentId) {
  return AGENT_REGISTRY[agentId];
}

export function listAgentAdapters() {
  return Object.values(AGENT_REGISTRY);
}
