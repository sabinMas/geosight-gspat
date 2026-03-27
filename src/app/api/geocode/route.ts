import { NextRequest, NextResponse } from "next/server";
import { LocationSearchResult } from "@/types";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: {
    country_code?: string;
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoSight geospatial search demo",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error("Geocoding lookup failed.");
    }

    const results = (await response.json()) as NominatimResult[];
    const match = results[0];

    if (!match) {
      return NextResponse.json({ error: "No matching place found." }, { status: 404 });
    }

    const payload: LocationSearchResult = {
      name: match.display_name,
      coordinates: {
        lat: Number(match.lat),
        lng: Number(match.lon),
      },
      kind: match.addresstype ?? match.type,
      countryCode: match.address?.country_code?.toUpperCase(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Geocoding is temporarily unavailable." },
      { status: 502 },
    );
  }
}
