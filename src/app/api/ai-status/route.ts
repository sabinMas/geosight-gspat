import { NextResponse } from "next/server";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";

function hasConfiguredEnv(envName: string) {
  return Boolean(process.env[envName]?.trim());
}

export async function GET() {
  const groqConfigured = hasConfiguredEnv("GROQ_API_KEY");
  const geminiConfigured = hasConfiguredEnv("GEMINI_API_KEY");
  const agentStatuses = Object.fromEntries(
    Object.entries(AGENT_CONFIGS).map(([agentId, config]) => [
      agentId,
      config.apiKeyEnv
        ? {
            configured: hasConfiguredEnv(config.apiKeyEnv),
            provider: "groq",
            envKey: config.apiKeyEnv,
          }
        : {
            configured: true,
            provider: "deterministic",
            envKey: null,
          },
    ]),
  );
  const liveAnalysisAvailable = groqConfigured || geminiConfigured;

  return NextResponse.json(
    {
      status: liveAnalysisAvailable ? "ok" : "degraded",
      liveAnalysisAvailable,
      analysisProviders: {
        groq: {
          configured: groqConfigured,
          configuredKeyCount: groqConfigured ? 1 : 0,
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
