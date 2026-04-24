import { NextResponse } from "next/server";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";

function hasConfiguredEnv(envName: string) {
  return Boolean(process.env[envName]?.trim());
}

export async function GET() {
  const openRouterConfigured = hasConfiguredEnv("CEREBRAS_API_KEY");
  const geminiConfigured = hasConfiguredEnv("GEMINI_API_KEY");
  const agentStatuses = Object.fromEntries(
    Object.entries(AGENT_CONFIGS).map(([agentId, config]) => [
      agentId,
      {
        configured: hasConfiguredEnv(config.apiKeyEnv),
        provider: "cerebras",
        envKey: config.apiKeyEnv,
      },
    ]),
  );
  const liveAnalysisAvailable = openRouterConfigured || geminiConfigured;

  return NextResponse.json(
    {
      status: liveAnalysisAvailable ? "ok" : "degraded",
      liveAnalysisAvailable,
      analysisProviders: {
        cerebras: {
          configured: openRouterConfigured,
        },
        gemini: {
          configured: geminiConfigured,
        },
      },
      agents: agentStatuses,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
