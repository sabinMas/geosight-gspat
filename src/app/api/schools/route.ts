import { NextRequest, NextResponse } from "next/server";
import { getCoordinatesFromSearchParams, applyRateLimit, createRateLimitResponse, rateLimitHeaders } from "@/lib/request-guards";
import { fetchSchoolContext } from "@/lib/schools";

export async function GET(request: NextRequest) {
  const rateLimit = applyRateLimit(request, "schools", {
    windowMs: 60_000,
    maxRequests: 18,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const coordinates = getCoordinatesFromSearchParams(request.nextUrl.searchParams);
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const schoolContext = await fetchSchoolContext(coordinates);

    return NextResponse.json(schoolContext, {
      headers: {
        "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to fetch school context.",
      },
      {
        status: 502,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }
}
