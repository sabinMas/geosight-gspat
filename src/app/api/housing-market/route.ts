import { NextRequest, NextResponse } from "next/server";
import { getHousingMarket } from "@/lib/housing-market";
import {
  applyRateLimit,
  createRateLimitResponse,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { resolveSourceRegistryContext } from "@/lib/source-registry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "housing-market", {
    windowMs: 60_000,
    maxRequests: 24,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const county = request.nextUrl.searchParams.get("county");
  const state = request.nextUrl.searchParams.get("state");
  const location = request.nextUrl.searchParams.get("location") ?? "Active location";

  const registryContext = resolveSourceRegistryContext({
    countryCode: state ? "US" : null,
    stateCode: state,
  });

  try {
    const result = await getHousingMarket(county, state, location, registryContext);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=43200, stale-while-revalidate=86400",
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "GeoSight could not load housing market data right now.";

    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }
}
