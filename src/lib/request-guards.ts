import { NextRequest, NextResponse } from "next/server";
import { Coordinates } from "@/types";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __geosightRateLimitStore: Map<string, RateLimitState> | undefined;
}

const rateLimitStore = globalThis.__geosightRateLimitStore ?? new Map<string, RateLimitState>();

if (!globalThis.__geosightRateLimitStore) {
  globalThis.__geosightRateLimitStore = rateLimitStore;
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "anonymous";
  }

  return request.headers.get("x-real-ip") ?? "anonymous";
}

export function applyRateLimit(
  request: NextRequest,
  bucket: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${getClientIdentifier(request)}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextState = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, nextState);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(config.maxRequests - 1, 0),
      resetAt: nextState.resetAt,
      retryAfter: Math.ceil(config.windowMs / 1000),
    };
  }

  const nextCount = existing.count + 1;
  const remaining = Math.max(config.maxRequests - nextCount, 0);
  rateLimitStore.set(key, {
    count: nextCount,
    resetAt: existing.resetAt,
  });

  return {
    allowed: nextCount <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    resetAt: existing.resetAt,
    retryAfter: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function createRateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Please wait before making more requests.",
    },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(result.retryAfter),
      },
    },
  );
}

export function parseCoordinate(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidCoordinatePair(lat: number | null, lng: number | null): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function getCoordinatesFromSearchParams(searchParams: URLSearchParams): Coordinates | null {
  const lat = parseCoordinate(searchParams.get("lat"));
  const lng = parseCoordinate(searchParams.get("lng"));

  if (lat === null || lng === null || !isValidCoordinatePair(lat, lng)) {
    return null;
  }

  return { lat, lng };
}

export function clampNumber(value: number | null, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

export function normalizeTextInput(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}
