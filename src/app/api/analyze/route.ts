import { NextRequest, NextResponse } from "next/server";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGroqAnalysis } from "@/lib/groq";
import { AnalyzeRequestBody } from "@/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AnalyzeRequestBody;

  try {
    const result = await runGroqAnalysis(body);
    return NextResponse.json({ answer: result.response, model: result.model });
  } catch {
    return NextResponse.json({
      answer: buildFallbackAssessment(body),
      model: "fallback",
    });
  }
}
