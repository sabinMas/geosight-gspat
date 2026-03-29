import { NextRequest, NextResponse } from "next/server";
import { AnalysisProviderError } from "@/lib/analysis-provider";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGeminiAnalysis } from "@/lib/gemini";
import { runGroqAnalysis } from "@/lib/groq";
import { getProfileById } from "@/lib/profiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { AnalyzeRequestBody } from "@/types";

function logProviderFailure(provider: "groq" | "gemini", error: unknown) {
  if (error instanceof AnalysisProviderError) {
    const statusSuffix = typeof error.status === "number" ? ` status=${error.status}` : "";
    console.warn(`[analyze] provider=${provider} category=${error.category}${statusSuffix}`);
    return;
  }

  console.warn(`[analyze] provider=${provider} category=unexpected_error`);
}

export async function POST(request: NextRequest) {
  const rateLimit = applyRateLimit(request, "analyze", {
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
  };
  const headers = rateLimitHeaders(rateLimit);

  try {
    const result = await runGroqAnalysis(payload, profile);
    return NextResponse.json(
      { answer: result.response, model: result.model },
      {
        headers,
      },
    );
  } catch (groqError) {
    logProviderFailure("groq", groqError);

    try {
      const result = await runGeminiAnalysis(payload, profile);
      return NextResponse.json(
        { answer: result.response, model: result.model },
        {
          headers,
        },
      );
    } catch (geminiError) {
      logProviderFailure("gemini", geminiError);
    }

    return NextResponse.json({
      answer: buildFallbackAssessment(payload, profile),
      model: "fallback",
    }, {
      headers,
    });
  }
}
