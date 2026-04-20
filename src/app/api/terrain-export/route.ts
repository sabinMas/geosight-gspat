import { NextRequest, NextResponse } from "next/server";
import { buildElevationGrid } from "@/lib/terrain-tiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  parseCoordinate,
  rateLimitHeaders,
} from "@/lib/request-guards";

const MAX_DIMENSION = 2017;
const MIN_DIMENSION = 64;
const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };

export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request, "terrain-export", RATE_LIMIT);
  if (!rl.allowed) return createRateLimitResponse(rl);

  const sp = request.nextUrl.searchParams;
  const west = parseCoordinate(sp.get("west"));
  const south = parseCoordinate(sp.get("south"));
  const east = parseCoordinate(sp.get("east"));
  const north = parseCoordinate(sp.get("north"));
  const width = Math.round(Number(sp.get("width") ?? "513"));
  const height = Math.round(Number(sp.get("height") ?? "513"));

  if (
    west === null || south === null || east === null || north === null ||
    !Number.isFinite(west) || !Number.isFinite(south) ||
    !Number.isFinite(east) || !Number.isFinite(north)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid bbox params: west, south, east, north required" },
      { status: 400 },
    );
  }

  if (north <= south || east <= west) {
    return NextResponse.json({ error: "Invalid bbox: north > south and east > west required" }, { status: 400 });
  }

  if (
    !Number.isFinite(width) || width < MIN_DIMENSION || width > MAX_DIMENSION ||
    !Number.isFinite(height) || height < MIN_DIMENSION || height > MAX_DIMENSION
  ) {
    return NextResponse.json(
      { error: `Dimensions must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}` },
      { status: 400 },
    );
  }

  try {
    const grid = await buildElevationGrid({ west, south, east, north, targetWidth: width, targetHeight: height });

    return NextResponse.json(
      {
        data: Array.from(grid.data),
        width: grid.width,
        height: grid.height,
        minElevation: grid.minElevation,
        maxElevation: grid.maxElevation,
        bbox: grid.bbox,
        crs: grid.crs,
        resolutionMeters: grid.resolutionMeters,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          ...rateLimitHeaders(rl),
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
