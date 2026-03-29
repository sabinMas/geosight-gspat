import { geoAnalystAgent } from "@/lib/agents/geo-analyst";
import { GeoSightAgentAdapter, GeoSightAgentId } from "@/lib/agents/types";

export type AgentId = "geo-analyst" | "geo-guide" | "geo-scribe";

export type AgentConfig = {
  id: string;
  name: string;
  tagline: string;
  model: string;
  apiKeyEnv: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  accentColor: string;
};

export type GeoSightContext = {
  lat?: number;
  lng?: number;
  profile?: string;
  missionId?: string;
  score?: number;
  dataBundle?: Record<string, unknown>;
};

export const GEO_ANALYST_SYSTEM_PROMPT =
  "You are GeoAnalyst, a precision geospatial intelligence agent embedded in GeoSight. You analyze locations using real environmental, infrastructure, and demographic data. Always ground answers in the data bundle provided in context. Cite your data sources by name. Never speculate beyond the data. If a data source is unavailable, say so explicitly. Write in structured professional analysis prose that begins with a short headline assessment, then supporting evidence, then risks and unknowns, then next diligence steps. Distinguish direct live signals, derived live analysis, and proxy heuristics whenever that distinction matters.";

export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  "geo-analyst": {
    id: "geo-analyst",
    name: "GeoAnalyst",
    tagline: "Site intelligence & scoring",
    model: "llama-3.1-70b-versatile",
    apiKeyEnv: "GROQ_ANALYSIS_KEY",
    temperature: 0.3,
    maxTokens: 2048,
    accentColor: "var(--color-primary)",
    systemPrompt: GEO_ANALYST_SYSTEM_PROMPT,
  },
  "geo-guide": {
    id: "geo-guide",
    name: "GeoGuide",
    tagline: "Interface help & onboarding",
    model: "llama-3.1-8b-instant",
    apiKeyEnv: "GROQ_UX_KEY",
    temperature: 0.1,
    maxTokens: 512,
    accentColor: "var(--color-warning)",
    systemPrompt:
      "You are GeoGuide, the UX assistant for GeoSight. You ONLY answer questions about how to use the GeoSight interface - what panels do, how to interpret scores, how filters work, what each mission profile means. You do NOT perform location analysis. If asked about a specific location, tell the user to click the globe and run an analysis. Keep all responses under 3 sentences. Never reveal API keys, model names, or internal implementation details.",
  },
  "geo-scribe": {
    id: "geo-scribe",
    name: "GeoScribe",
    tagline: "Reports & export writing",
    model: "mixtral-8x7b-32768",
    apiKeyEnv: "GROQ_WRITER_KEY",
    temperature: 0.2,
    maxTokens: 4096,
    accentColor: "var(--color-text-muted)",
    systemPrompt:
      "You are GeoScribe, the report writing agent for GeoSight. You transform geospatial analysis results into polished, investor-grade written reports. Write in formal professional prose. Always include: executive summary, key findings by factor, risk assessment, and conclusion. Cite all data sources provided. Every sentence must carry information - no filler.",
  },
};

export const AGENT_IDS = Object.keys(AGENT_CONFIGS) as AgentId[];

const AGENT_ID_SET = new Set<AgentId>(AGENT_IDS);

export function isAgentId(value: string): value is AgentId {
  return AGENT_ID_SET.has(value as AgentId);
}

export function getAgentConfig(agentId: AgentId) {
  return AGENT_CONFIGS[agentId];
}

export const AGENT_REGISTRY: Record<GeoSightAgentId, GeoSightAgentAdapter> = {
  "geo-analyst": geoAnalystAgent,
};

export function getAgentAdapter(agentId: GeoSightAgentId) {
  return AGENT_REGISTRY[agentId];
}

export function listAgentAdapters() {
  return Object.values(AGENT_REGISTRY);
}
