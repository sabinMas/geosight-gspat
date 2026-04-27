import { NextRequest, NextResponse } from "next/server";
import { AGENT_CONFIGS } from "@/lib/agents/agent-config";
import { getAvailableCerebrasKeys } from "@/lib/groq";
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

async function probeCerebrasConnectivity(): Promise<{
  reachable: boolean;
  authValid: boolean;
  lastError?: string;
}> {
  const keys = getAvailableCerebrasKeys();
  if (keys.length === 0) {
    return { reachable: false, authValid: false, lastError: "no_keys_configured" };
  }
  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys[0]}` },
      body: JSON.stringify({
        model: "llama3.1-8b",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { reachable: true, authValid: false, lastError: `auth_failed_${response.status}` };
    }
    if (!response.ok) {
      return { reachable: true, authValid: false, lastError: `api_error_${response.status}` };
    }
    return { reachable: true, authValid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { reachable: false, authValid: false, lastError: msg.slice(0, 120) };
  }
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

  const cerebrasProbe = await probeCerebrasConnectivity();

  return NextResponse.json(
    {
      status: cerebrasProbe.authValid ? "ok" : "degraded",
      liveAnalysisAvailable: cerebrasProbe.authValid,
      analysisProviders: {
        cerebras: {
          configured: cerebrasConfigured,
          keyCount: cerebrasKeyCount,
          reachable: cerebrasProbe.reachable,
          authValid: cerebrasProbe.authValid,
          ...(cerebrasProbe.lastError ? { lastError: cerebrasProbe.lastError } : {}),
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
