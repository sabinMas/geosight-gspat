import { NextRequest, NextResponse } from "next/server";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGroqAnalysis } from "@/lib/groq";
import { getProfileById } from "@/lib/profiles";
import { AnalyzeRequestBody } from "@/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AnalyzeRequestBody;
  const profile = getProfileById(body.profileId);

  try {
    const result = await runGroqAnalysis(body, profile);
    return NextResponse.json({ answer: result.response, model: result.model });
  } catch {
    return NextResponse.json({
      answer: buildFallbackAssessment(body, profile),
      model: "fallback",
    });
  }
}
