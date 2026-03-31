import { NextRequest, NextResponse } from "next/server";
import { runDiscoveryQuery } from "@/lib/discovery";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "discover", {
    windowMs: 60_000,
    maxRequests: 12,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const body = typeof rawBody === "object" && rawBody !== null ? rawBody as Record<string, unknown> : {};
  const query = normalizeTextInput(body.query, 240);
  const profileId = normalizeTextInput(body.profileId, 80) ?? undefined;

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  try {
    const result = await runDiscoveryQuery(query, profileId, request.nextUrl.origin);
    return NextResponse.json(result, {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "GeoSight could not turn that prompt into a discovery shortlist.",
      },
      {
        status: 422,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }
}
