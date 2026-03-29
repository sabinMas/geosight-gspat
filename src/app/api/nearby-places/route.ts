import { NextRequest, NextResponse } from "next/server";
import { NEARBY_PLACE_CATEGORY_LABELS } from "@/lib/nearby-places";
import { fetchNearbyPlaces } from "@/lib/overpass";
import {
  applyRateLimit,
  clampNumber,
  createRateLimitResponse,
  getCoordinatesFromSearchParams,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { NearbyPlaceCategory } from "@/types";

function isNearbyPlaceCategory(value: string): value is NearbyPlaceCategory {
  return value in NEARBY_PLACE_CATEGORY_LABELS;
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "nearby-places", {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  const category = request.nextUrl.searchParams.get("category");
  const locationName =
    normalizeTextInput(request.nextUrl.searchParams.get("locationName"), 120) ??
    "the selected place";

  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!category || !isNearbyPlaceCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const places = await fetchNearbyPlaces(
      {
        lat: clampNumber(coordinates.lat, -90, 90, coordinates.lat),
        lng: clampNumber(coordinates.lng, -180, 180, coordinates.lng),
      },
      locationName,
      category,
    );
    return NextResponse.json(
      {
        places,
        source: places.length ? "live" : "unavailable",
        error: places.length
          ? null
          : "No live OpenStreetMap results matched this category near the selected location.",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        places: [],
        source: "unavailable",
        error: "Live nearby places are temporarily unavailable.",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  }
}
