import { NextRequest, NextResponse } from "next/server";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGroqAnalysis } from "@/lib/groq";
import { getProfileById } from "@/lib/profiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { AnalyzeRequestBody } from "@/types";

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

  try {
    const result = await runGroqAnalysis(payload, profile);
    return NextResponse.json(
      { answer: result.response, model: result.model },
      {
        headers: rateLimitHeaders(rateLimit),
      },
    );
  } catch {
    return NextResponse.json({
      answer: buildFallbackAssessment(payload, profile),
      model: "fallback",
    }, {
      headers: rateLimitHeaders(rateLimit),
    });
  }
}
