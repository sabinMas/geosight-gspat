import type { WorkspaceCardId, WorkspaceShellMode } from "@/types";

export type AgentId = "geo-analyst" | "geo-guide" | "geo-scribe" | "geo-usability";
export type GeoSightViewportClass = "mobile" | "tablet" | "desktop";

export type GeoSightUiContext = {
  currentRoute?: string;
  viewportClass?: GeoSightViewportClass;
  activeProfile?: string;
  reportDraftTemplate?: string | null;
  visiblePrimaryCardId?: WorkspaceCardId | null;
  visibleWorkspaceCardIds?: WorkspaceCardId[];
  visibleControlCount?: number;
  visibleTextBlockCount?: number;
  shellMode?: WorkspaceShellMode;
  locationSelected?: boolean;
  geodataLoading?: boolean;
  geodataLoaded?: boolean;
  reportOpen?: boolean;
};

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
  score?: number;
  dataBundle?: Record<string, unknown>;
  uiContext?: GeoSightUiContext;
};

export const GEO_ANALYST_SYSTEM_PROMPT =
  "You are GeoAnalyst, a precision geospatial intelligence agent embedded in GeoSight. You analyze locations using real environmental, infrastructure, and demographic data. Always ground answers in the data bundle provided in context. Cite your data sources by name. Never speculate beyond the data. If a data source is unavailable, say so explicitly. Write in structured professional analysis prose with this order: headline assessment, data status, supporting evidence, risks and unknowns, then next diligence steps. Explicitly distinguish direct live signals, derived live analysis, limited coverage, and proxy heuristics whenever that distinction matters. Never let a generated explanation sound more certain than the underlying source coverage supports.";

export const GEO_USABILITY_SYSTEM_PROMPT =
  "You are GeoUsability, the internal UX audit agent for GeoSight. You review front-end state for clutter, overflow, discoverability, and hierarchy problems. Always anchor your response in the structured UI findings and UI context already provided. Do not invent visual issues that are not supported by the audit. Format responses as concise audit notes with severity, affected surface, issue type, and a specific recommendation.";

const DEFAULT_AGENT_MODEL = "llama-3.3-70b-versatile";
const LIGHTWEIGHT_AGENT_MODEL = "llama-3.1-8b-instant";

export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  "geo-analyst": {
    id: "geo-analyst",
    name: "GeoAnalyst",
    tagline: "Site intelligence & scoring",
    model: DEFAULT_AGENT_MODEL,
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
    model: LIGHTWEIGHT_AGENT_MODEL,
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
    model: DEFAULT_AGENT_MODEL,
    apiKeyEnv: "GROQ_WRITER_KEY",
    temperature: 0.2,
    maxTokens: 4096,
    accentColor: "var(--color-text-muted)",
    systemPrompt:
      "You are GeoScribe, the report writing agent for GeoSight. You transform geospatial analysis results into polished, decision-ready written reports. Write in formal professional prose. Always include: executive summary, data status and coverage, key findings by factor, risk assessment, limitations and unknowns, next diligence steps, and conclusion. Cite all data sources provided. Distinguish observed data, derived analysis, and unsupported gaps explicitly. Every sentence must carry information and no filler.",
  },
  "geo-usability": {
    id: "geo-usability",
    name: "GeoUsability",
    tagline: "Front-end UX audit",
    model: LIGHTWEIGHT_AGENT_MODEL,
    apiKeyEnv: "GROQ_UX_KEY",
    temperature: 0.1,
    maxTokens: 1024,
    accentColor: "var(--color-success)",
    systemPrompt: GEO_USABILITY_SYSTEM_PROMPT,
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

export function validateAgentEnv() {
  const missing = AGENT_IDS.filter((agentId) => {
    const envKey = AGENT_CONFIGS[agentId].apiKeyEnv;
    return !process.env[envKey]?.trim();
  });

  if (missing.length) {
    console.error(
      `[GeoSight] Missing API keys for agents: ${missing.join(", ")}`,
    );
  }
}
