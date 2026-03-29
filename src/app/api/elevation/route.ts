import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimit,
  clampNumber,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  parseCoordinate,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { fetchElevation, fetchElevationProfile } from "@/lib/usgs";

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "elevation", {
    windowMs: 60_000,
    maxRequests: 24,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  const lengthKm = parseCoordinate(request.nextUrl.searchParams.get("lengthKm"));
  const samples = parseCoordinate(request.nextUrl.searchParams.get("samples"));

  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const elevation = await fetchElevation(coordinates);
    const profileData = await fetchElevationProfile(
      coordinates,
      {
        lengthKm: clampNumber(lengthKm, 4, 24, 12),
        samples: Math.round(clampNumber(samples, 5, 15, 9)),
      },
    );
    return NextResponse.json(
      { elevation, ...profileData },
      {
        headers: {
          "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  } catch {
    return NextResponse.json({
      elevation: null,
      profile: [],
      summary: {
        lengthKm: 0,
        minElevation: null,
        maxElevation: null,
        elevationGain: null,
        elevationLoss: null,
      },
      note: "Elevation service unavailable.",
    });
  }
}
