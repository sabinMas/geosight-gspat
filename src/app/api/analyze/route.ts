import { NextRequest, NextResponse } from "next/server";
import { runGroqAnalysis } from "@/lib/groq";
import { AnalyzeRequestBody } from "@/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AnalyzeRequestBody;

  const fallbackSummary = body.geodata
    ? `Coordinates ${body.location?.lat.toFixed(3)}, ${body.location?.lng.toFixed(3)} with ${
        body.geodata.nearestWaterBody.name
      } at ${body.geodata.nearestWaterBody.distanceKm ?? "unknown"} km and ${
        body.geodata.nearestPower.name
      } at ${body.geodata.nearestPower.distanceKm ?? "unknown"} km.`
    : "Limited analysis context was provided.";

  try {
    const result = await runGroqAnalysis(body);
    return NextResponse.json({ answer: result.response, model: result.model });
  } catch {
    return NextResponse.json({
      answer: `${fallbackSummary} Groq could not be reached, so this is a local fallback response. The site looks most promising when water distance stays below 2 km and terrain remains relatively flat.`,
      model: "fallback",
    });
  }
}
