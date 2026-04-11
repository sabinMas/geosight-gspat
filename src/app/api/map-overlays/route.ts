import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimit,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  parseCoordinate,
  rateLimitHeaders,
} from "@/lib/request-guards";
import {
  fetchFireDetections,
  fetchFireDetectionsForBoundingBox,
  isFireHazardConfigured,
} from "@/lib/nasa-firms";

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "map-overlays", {
    windowMs: 60_000,
    maxRequests: 24,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const center = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  if (!center) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const west = parseCoordinate(request.nextUrl.searchParams.get("west"));
  const south = parseCoordinate(request.nextUrl.searchParams.get("south"));
  const east = parseCoordinate(request.nextUrl.searchParams.get("east"));
  const north = parseCoordinate(request.nextUrl.searchParams.get("north"));
  const hasBoundingBox =
    west !== null &&
    south !== null &&
    east !== null &&
    north !== null &&
    west < east &&
    south < north;

  const detections = isFireHazardConfigured()
    ? hasBoundingBox
      ? await fetchFireDetectionsForBoundingBox(
          { west, south, east, north },
          center,
        )
      : await fetchFireDetections(center)
    : [];

  return NextResponse.json(
    {
      configured: isFireHazardConfigured(),
      detections,
    },
    {
      headers: rateLimitHeaders(rateLimit),
    },
  );
}
