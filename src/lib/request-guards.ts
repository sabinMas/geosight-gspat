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

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

async function runUpstashCommand<T>(command: string[]) {
  const config = getUpstashConfig();
  if (!config) {
    throw new Error("Missing Upstash configuration.");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash command failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { result?: T };
  return payload.result;
}

function applyInMemoryRateLimit(bucket: string, identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${identifier}`;
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

async function applySharedRateLimit(bucket: string, identifier: string, config: RateLimitConfig) {
  const now = Date.now();
  const key = `ratelimit:${bucket}:${identifier}`;

  const count = Number((await runUpstashCommand<number>(["INCR", key])) ?? 0);
  if (count === 1) {
    await runUpstashCommand<number>(["PEXPIRE", key, String(config.windowMs)]);
  }

  const ttlMs = Number((await runUpstashCommand<number>(["PTTL", key])) ?? config.windowMs);
  const effectiveTtlMs = ttlMs > 0 ? ttlMs : config.windowMs;
  const resetAt = now + effectiveTtlMs;

  return {
    allowed: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(config.maxRequests - count, 0),
    resetAt,
    retryAfter: Math.max(Math.ceil(effectiveTtlMs / 1000), 1),
  } satisfies RateLimitResult;
}

export async function applyRateLimit(
  request: NextRequest,
  bucket: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request);

  if (getUpstashConfig()) {
    try {
      return await applySharedRateLimit(bucket, identifier, config);
    } catch {
      return applyInMemoryRateLimit(bucket, identifier, config);
    }
  }

  return applyInMemoryRateLimit(bucket, identifier, config);
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
