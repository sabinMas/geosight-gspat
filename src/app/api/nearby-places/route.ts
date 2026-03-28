import { NextRequest, NextResponse } from "next/server";
import { buildPlaceholderNearbyPlaces, NEARBY_PLACE_CATEGORY_LABELS } from "@/lib/nearby-places";
import { fetchNearbyPlaces, isValidCoordinatePair } from "@/lib/overpass";
import { NearbyPlaceCategory } from "@/types";

function isNearbyPlaceCategory(value: string): value is NearbyPlaceCategory {
  return value in NEARBY_PLACE_CATEGORY_LABELS;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const category = request.nextUrl.searchParams.get("category");
  const locationName = request.nextUrl.searchParams.get("locationName") ?? "the selected place";

  if (!isValidCoordinatePair(lat, lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (!category || !isNearbyPlaceCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const places = await fetchNearbyPlaces({ lat, lng }, locationName, category);
    return NextResponse.json(
      {
        places,
        source: places[0]?.source === "live" ? "live" : "placeholder",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    const places = buildPlaceholderNearbyPlaces(locationName, { lat, lng }, category);

    return NextResponse.json(
      {
        places,
        source: "placeholder",
        error: "Live nearby places are temporarily unavailable. Showing structured fallback results.",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  }
}
