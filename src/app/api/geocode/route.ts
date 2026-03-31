import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { LocationSearchResult } from "@/types";

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: {
    country_code?: string;
  };
}

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: {
    country_code?: string;
  };
}

function buildPayload(result: NominatimSearchResult | NominatimReverseResult): LocationSearchResult {
  return {
    name: result.display_name,
    coordinates: {
      lat: Number(result.lat),
      lng: Number(result.lon),
    },
    kind: result.addresstype ?? result.type,
    countryCode: result.address?.country_code?.toUpperCase(),
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "1");
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 5)
      : 1;

  if (!query && (!lat || !lng)) {
    return NextResponse.json(
      { error: "Provide either a search query or latitude/longitude." },
      { status: 400 },
    );
  }

  try {
    const url = query
      ? new URL("https://nominatim.openstreetmap.org/search")
      : new URL("https://nominatim.openstreetmap.org/reverse");

    if (query) {
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("addressdetails", "1");
    } else {
      url.searchParams.set("lat", lat!);
      url.searchParams.set("lon", lng!);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("zoom", "10");
      url.searchParams.set("addressdetails", "1");
    }

    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "GeoSight geospatial search",
      },
      next: { revalidate: 60 * 60 * 24 },
    }, EXTERNAL_TIMEOUTS.standard);

    if (!response.ok) {
      throw new Error("Geocoding lookup failed.");
    }

    if (query) {
      const results = (await response.json()) as NominatimSearchResult[];
      const matches = results
        .map(buildPayload)
        .filter(
          (result) =>
            Number.isFinite(result.coordinates.lat) &&
            Number.isFinite(result.coordinates.lng),
        );

      if (!matches.length) {
        return NextResponse.json({ error: "No matching place found." }, { status: 404 });
      }

      if (limit > 1) {
        return NextResponse.json(matches, {
          headers: {
            "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
          },
        });
      }

      return NextResponse.json(matches[0], {
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
        },
      });
    }

    const result = (await response.json()) as NominatimReverseResult;
    return NextResponse.json(buildPayload(result), {
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
