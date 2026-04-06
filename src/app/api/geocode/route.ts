import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import {
  applyRateLimit,
  createRateLimitResponse,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { LocationSearchResult } from "@/types";

interface NominatimAddress {
  country_code?: string;
  country?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  suburb?: string;
  neighbourhood?: string;
  hamlet?: string;
  borough?: string;
  quarter?: string;
  city_district?: string;
  state_district?: string;
  region?: string;
  province?: string;
  national_park?: string;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: NominatimAddress;
}

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: NominatimAddress;
}

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function clampLocationLabel(value: string, maxLength = 30) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function abbreviateUsState(state: string | undefined) {
  if (!state) {
    return undefined;
  }

  const trimmed = state.trim();
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }

  return US_STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed;
}

function buildShortLocationLabel(result: NominatimSearchResult | NominatimReverseResult) {
  const locality =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality;
  const countryCode = result.address?.country_code?.toUpperCase();

  if (!locality) {
    return undefined;
  }

  if (countryCode === "US") {
    const stateAbbreviation = abbreviateUsState(result.address?.state);
    return clampLocationLabel(
      stateAbbreviation ? `${locality}, ${stateAbbreviation}` : locality,
    );
  }

  const countryName = result.address?.country;
  return clampLocationLabel(countryName ? `${locality}, ${countryName}` : locality);
}

function buildPayload(result: NominatimSearchResult | NominatimReverseResult): LocationSearchResult {
  const locality =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    undefined;
  const district =
    result.address?.neighbourhood ??
    result.address?.suburb ??
    result.address?.borough ??
    result.address?.quarter ??
    result.address?.city_district ??
    result.address?.hamlet ??
    result.address?.national_park ??
    result.address?.state_district ??
    result.address?.county ??
    undefined;

  return {
    name: result.display_name,
    shortName: buildShortLocationLabel(result),
    fullName: result.display_name,
    coordinates: {
      lat: Number(result.lat),
      lng: Number(result.lon),
    },
    kind: result.addresstype ?? result.type,
    countryCode: result.address?.country_code?.toUpperCase(),
    countryName: result.address?.country ?? undefined,
    locality,
    district,
  };
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "geocode", {
    windowMs: 60_000,
    maxRequests: 40,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "1");
  const requestedZoom = Number(request.nextUrl.searchParams.get("zoom") ?? "10");
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 5)
      : 1;
  const zoom =
    Number.isFinite(requestedZoom) && requestedZoom >= 3 && requestedZoom <= 18
      ? Math.floor(requestedZoom)
      : 10;

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
      url.searchParams.set("zoom", String(zoom));
      url.searchParams.set("addressdetails", "1");
    }

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "GeoSight geospatial search",
        },
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

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

      const cacheHeaders = {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
        ...rateLimitHeaders(rateLimit),
      };

      if (limit > 1) {
        return NextResponse.json(matches, { headers: cacheHeaders });
      }

      return NextResponse.json(matches[0], { headers: cacheHeaders });
    }

    const result = (await response.json()) as NominatimReverseResult;
    return NextResponse.json(buildPayload(result), {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Geocoding is temporarily unavailable." },
      { status: 502 },
    );
  }
}
