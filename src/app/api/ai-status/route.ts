import { NextRequest, NextResponse } from "next/server";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";
import {
  applyRateLimit,
  createRateLimitResponse,
  rateLimitHeaders,
} from "@/lib/request-guards";

function hasConfiguredEnv(envName: string) {
  return Boolean(process.env[envName]?.trim());
}

const CEREBRAS_KEY_VARS = ["CEREBRAS_API_KEY", "CEREBRAS_API_KEY_2", "CEREBRAS_API_KEY_3"] as const;

function getCerebrasKeyCount() {
  return CEREBRAS_KEY_VARS.filter((v) => Boolean(process.env[v]?.trim())).length;
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "ai-status", {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const cerebrasKeyCount = getCerebrasKeyCount();
  const cerebrasConfigured = cerebrasKeyCount > 0;
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

  return NextResponse.json(
    {
      status: cerebrasConfigured ? "ok" : "degraded",
      liveAnalysisAvailable: cerebrasConfigured,
      analysisProviders: {
        cerebras: {
          configured: cerebrasConfigured,
          keyCount: cerebrasKeyCount,
        },
      },
      agents: agentStatuses,
    },
    {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "no-store",
      },
    },
  );
}
