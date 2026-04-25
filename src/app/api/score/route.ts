import { NextRequest, NextResponse } from "next/server";
import { calculateSiteScore } from "@/lib/scoring";
import {
  applyRateLimit,
  createRateLimitResponse,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { GeodataResult } from "@/types";

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "score", {
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  let geodata: GeodataResult;
  try {
    geodata = (await request.json()) as GeodataResult;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const score = calculateSiteScore(geodata);
  return NextResponse.json(score, {
    headers: { ...rateLimitHeaders(rateLimit), "Cache-Control": "no-store" },
  });
}
