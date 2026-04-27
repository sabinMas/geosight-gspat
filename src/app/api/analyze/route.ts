import { NextRequest, NextResponse } from "next/server";
import { AnalysisProviderError } from "@/lib/analysis-provider";
import { logAnalysisProviderFailure, runAnalysisWithFallback } from "@/lib/analysis-runner";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { getProfileById } from "@/lib/profiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { runGroqAnalysisStream } from "@/lib/groq";
import { AnalyzeRequestBody } from "@/types";

function formatProviderError(error: unknown): string {
  if (error instanceof AnalysisProviderError) {
    return error.status != null
      ? `${error.category} (HTTP ${error.status})`
      : error.category;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message.slice(0, 200)}`;
  }
  return String(error).slice(0, 200);
}

// Cerebras llama3.1-8b has an 8K-token context window. Conversation history
// alone could easily exceed that with 12 long turns, forcing fallback. Cap
// hard: last 6 turns, 1200 chars each → ~7.2K chars (~1.8K tokens) max.
function normalizeConversationMessages(messages: AnalyzeRequestBody["messages"]) {
  if (!Array.isArray(messages)) {
    return undefined;
  }

  const normalized = messages
    .map((message) => ({
      role: message?.role,
      content: normalizeTextInput(message?.content, 1200),
    }))
    .filter(
      (message): message is NonNullable<AnalyzeRequestBody["messages"]>[number] =>
        Boolean(
          message.content &&
            (message.role === "system" || message.role === "user" || message.role === "assistant"),
        ),
    )
    .slice(-6);

  return normalized.length ? normalized : undefined;
}

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 10) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rateLimit = await applyRateLimit(request, "analyze", {
    windowMs: 60_000,
    maxRequests: 15,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const daily = await applyRateLimit(request, "analyze:daily", {
    windowMs: 86_400_000,
    maxRequests: 200,
  });
  if (!daily.allowed) {
    return createRateLimitResponse(daily);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const body = rawBody as AnalyzeRequestBody;
  const question = normalizeTextInput(body.question, 2000);
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const profile = getProfileById(body.profileId);
  const payload: AnalyzeRequestBody = {
    ...body,
    question,
    messages: normalizeConversationMessages(body.messages),
  };
  const headers = rateLimitHeaders(rateLimit);

  let providerErrorReason: string | undefined;

  // Streaming path — only for Groq, gracefully falls back to JSON on failure
  if (body.stream) {
    try {
      const stream = await runGroqAnalysisStream(payload, profile);
      return new Response(stream, {
        headers: {
          ...headers,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Accel-Buffering": "no",
          "Cache-Control": "no-cache",
        },
      });
    } catch (streamError) {
      providerErrorReason = formatProviderError(streamError);
      console.error(`[analyze] stream fallback reason=${providerErrorReason}`);
      logAnalysisProviderFailure("analyze:stream", "groq", streamError);
    }
  }

  // Standard (non-streaming) path — also used as fallback when streaming fails
  const result = await runAnalysisWithFallback(payload, profile, {
    fallbackAnswer: buildFallbackAssessment(payload, profile),
    onProviderFailure(provider, error) {
      if (!providerErrorReason) providerErrorReason = formatProviderError(error);
      logAnalysisProviderFailure("analyze", provider, error);
    },
  });

  const provider: "groq" | "deterministic" =
    result.model === "fallback" ? "deterministic" : "groq";
  const fellBack = result.model === "fallback";

  return NextResponse.json(
    {
      answer: result.response,
      model: result.model,
      fallbackMode: fellBack,
      provider,
      ...(fellBack && providerErrorReason ? { fallbackReason: providerErrorReason } : {}),
    },
    {
      headers: { ...headers, "Cache-Control": "no-store" },
    },
  );
}
