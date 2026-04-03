import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimit,
  clampNumber,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  parseCoordinate,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { fetchFireHistory } from "@/lib/fire-history";

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "fire-history", {
    windowMs: 60_000,
    maxRequests: 12,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const years = Math.round(
    clampNumber(parseCoordinate(request.nextUrl.searchParams.get("years")), 1, 10, 5),
  );

  try {
    const summary = await fetchFireHistory(coordinates, years);
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fire history unavailable." }, { status: 502 });
  }
}
