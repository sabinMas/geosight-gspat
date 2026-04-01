import { NextRequest, NextResponse } from "next/server";
import { logAnalysisProviderFailure, runAnalysisWithFallback } from "@/lib/analysis-runner";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { getProfileById } from "@/lib/profiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { AnalyzeRequestBody } from "@/types";

function normalizeConversationMessages(messages: AnalyzeRequestBody["messages"]) {
  if (!Array.isArray(messages)) {
    return undefined;
  }

  const normalized = messages
    .map((message) => ({
      role: message?.role,
      content: normalizeTextInput(message?.content, 4000),
    }))
    .filter(
      (message): message is NonNullable<AnalyzeRequestBody["messages"]>[number] =>
        Boolean(
          message.content &&
            (message.role === "system" || message.role === "user" || message.role === "assistant"),
        ),
    )
    .slice(-12);

  return normalized.length ? normalized : undefined;
}

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "analyze", {
    windowMs: 60_000,
    maxRequests: 15,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
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
  const result = await runAnalysisWithFallback(payload, profile, {
    fallbackAnswer: buildFallbackAssessment(payload, profile),
    onProviderFailure(provider, error) {
      logAnalysisProviderFailure("analyze", provider, error);
    },
  });

  return NextResponse.json(
    {
      answer: result.response,
      model: result.model,
      fallbackMode: result.model === "fallback",
    },
    {
      headers,
    },
  );
}
