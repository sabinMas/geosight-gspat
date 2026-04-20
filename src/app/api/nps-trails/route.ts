import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyHikingParks } from "@/lib/nps";
import {
  applyRateLimit,
  clampNumber,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  rateLimitHeaders,
} from "@/lib/request-guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "nps-trails", {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const radiusKm = clampNumber(
    Number(request.nextUrl.searchParams.get("radiusKm") ?? "200"),
    50,
    400,
    200,
  );

  if (!process.env.NPS_API_KEY) {
    return NextResponse.json(
      { parks: [], source: "unavailable", error: "NPS_API_KEY not configured" },
      {
        status: 200,
        headers: { ...rateLimitHeaders(rateLimit), "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const parks = await fetchNearbyHikingParks(coordinates.lat, coordinates.lng, radiusKm);
    return NextResponse.json(
      { parks, source: "live" },
      {
        headers: {
          ...rateLimitHeaders(rateLimit),
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    console.error("[nps-trails] fetch error", err);
    return NextResponse.json(
      { parks: [], source: "unavailable", error: "NPS API request failed" },
      {
        status: 200,
        headers: { ...rateLimitHeaders(rateLimit), "Cache-Control": "no-store" },
      },
    );
  }
}
