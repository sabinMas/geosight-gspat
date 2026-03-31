import { NextResponse } from "next/server";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";

function hasConfiguredEnv(envName: string) {
  return Boolean(process.env[envName]?.trim());
}

export async function GET() {
  const groqAnalysisKeys = [
    "GROQ_API_KEY",
    "GROQ_API_KEY_2",
    "GROQ_API_KEY_3",
  ].filter(hasConfiguredEnv);
  const geminiConfigured = hasConfiguredEnv("GEMINI_API_KEY");
  const agentStatuses = Object.fromEntries(
    Object.entries(AGENT_CONFIGS).map(([agentId, config]) => [
      agentId,
      {
        configured: hasConfiguredEnv(config.apiKeyEnv),
        provider: "groq",
        envKey: config.apiKeyEnv,
      },
    ]),
  );
  const liveAnalysisAvailable = groqAnalysisKeys.length > 0 || geminiConfigured;

  return NextResponse.json(
    {
      status: liveAnalysisAvailable ? "ok" : "degraded",
      liveAnalysisAvailable,
      analysisProviders: {
        groq: {
          configured: groqAnalysisKeys.length > 0,
          configuredKeyCount: groqAnalysisKeys.length,
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
