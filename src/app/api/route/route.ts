import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import {
  applyRateLimit,
  createRateLimitResponse,
  rateLimitHeaders,
} from "@/lib/request-guards";

interface OsrmRoute {
  distance: number; // metres
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][]; // [lng, lat] pairs
    type: "LineString";
  };
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
  waypoints?: { location: [number, number]; name: string }[];
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "route", {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateLimit.allowed) return createRateLimitResponse(rateLimit);

  const sp = request.nextUrl.searchParams;
  const fromLat = Number(sp.get("fromLat"));
  const fromLng = Number(sp.get("fromLng"));
  const toLat = Number(sp.get("toLat"));
  const toLng = Number(sp.get("toLng"));
  const profile = sp.get("profile") === "car" ? "car" : "foot";

  if (
    !Number.isFinite(fromLat) || !Number.isFinite(fromLng) ||
    !Number.isFinite(toLat)   || !Number.isFinite(toLng)
  ) {
    return NextResponse.json(
      { error: "Provide fromLat, fromLng, toLat, toLng as numbers." },
      { status: 400 },
    );
  }

  // OSRM uses lng,lat order
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": "GeoSight geospatial routing" } },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Routing service unavailable." },
        { status: 502 },
      );
    }

    const body = (await res.json()) as OsrmResponse;

    if (body.code !== "Ok" || !body.routes?.length) {
      return NextResponse.json(
        { error: "No route found between these two locations." },
        { status: 404 },
      );
    }

    const route = body.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

    return NextResponse.json(
      {
        coordinates,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        profile,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
          ...rateLimitHeaders(rateLimit),
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Routing is temporarily unavailable." },
      { status: 502 },
    );
  }
}
