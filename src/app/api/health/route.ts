import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

interface ProviderStatus {
  status: "ok" | "slow" | "down";
  latency_ms: number;
  last_check: string;
  error?: string;
}

interface HealthResponse {
  overall_status: "healthy" | "degraded" | "down";
  providers: Record<string, ProviderStatus>;
  timestamp: string;
  cache_age_seconds: number;
}

// In-memory cache with timestamp
let cachedHealth: { data: HealthResponse; timestamp: number } | null = null;
const CACHE_DURATION_MS = 30_000; // 30 second cache

async function checkProviderHealth(
  name: string,
  checkFn: () => Promise<number>,
): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    const latency = await Promise.race([
      checkFn(),
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000),
      ),
    ]);

    const duration = Date.now() - start;

    return {
      status: duration > 2000 ? "slow" : "ok",
      latency_ms: duration,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: "down",
      latency_ms: duration,
      last_check: new Date().toISOString(),
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function buildHealthStatus(): Promise<HealthResponse> {
  const providers: Record<string, ProviderStatus> = {};

  // Check critical data providers asynchronously
  const checks: Array<[string, () => Promise<number>]> = [
    // Terrain
    ["usgs-elevation", () => checkUSGSElevation()],
    ["open-topo-data", () => checkOpenTopoData()],

    // Weather
    ["open-meteo", () => checkOpenMeteo()],

    // Hazards
    ["usgs-earthquakes", () => checkUSGSEarthquakes()],
    ["gdacs-alerts", () => checkGDACSAlerts()],

    // Land/Coverage
    ["osm", () => checkOpenStreetMap()],

    // Seismic
    ["usgs-seismic", () => checkUSGSSeismic()],
  ];

  await Promise.all(
    checks.map(async ([name, checkFn]) => {
      providers[name] = await checkProviderHealth(name, checkFn);
    }),
  );

  // Determine overall status
  const statuses = Object.values(providers).map((p) => p.status);
  const downCount = statuses.filter((s) => s === "down").length;
  const slowCount = statuses.filter((s) => s === "slow").length;

  let overall_status: "healthy" | "degraded" | "down";
  if (downCount > statuses.length / 2) {
    overall_status = "down";
  } else if (downCount > 0 || slowCount > 2) {
    overall_status = "degraded";
  } else {
    overall_status = "healthy";
  }

  return {
    overall_status,
    providers,
    timestamp: new Date().toISOString(),
    cache_age_seconds: 0,
  };
}

// Simple health check functions for major data providers
async function checkUSGSElevation(): Promise<number> {
  const start = Date.now();
  await fetch("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "geometry=%7B%22x%22:-120,%22y%22:38%7D&geometryType=esriGeometryPoint&f=json",
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("USGS elevation unreachable");
  });
  return Date.now() - start;
}

async function checkOpenTopoData(): Promise<number> {
  const start = Date.now();
  await fetch("https://api.opentopodata.org/v1/srtm30m?locations=-120,38", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("OpenTopoData unreachable");
  });
  return Date.now() - start;
}

async function checkOpenMeteo(): Promise<number> {
  const start = Date.now();
  await fetch("https://api.open-meteo.com/v1/forecast?latitude=38&longitude=-120&current=temperature", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("Open-Meteo unreachable");
  });
  return Date.now() - start;
}

async function checkUSGSEarthquakes(): Promise<number> {
  const start = Date.now();
  await fetch("https://earthquake.usgs.gov/fdsnws/event/1/query?format=json&limit=1&starttime=2024-01-01", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("USGS earthquakes unreachable");
  });
  return Date.now() - start;
}

async function checkGDACSAlerts(): Promise<number> {
  const start = Date.now();
  await fetch("https://www.gdacs.org/api/rss", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("GDACS unreachable");
  });
  return Date.now() - start;
}

async function checkOpenStreetMap(): Promise<number> {
  const start = Date.now();
  await fetch('https://api.openstreetmap.org/api/0.6/capabilities', {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("OpenStreetMap unreachable");
  });
  return Date.now() - start;
}

async function checkUSGSSeismic(): Promise<number> {
  const start = Date.now();
  await fetch("https://earthquake.usgs.gov/earthquakes/search/geojson?starttime=2024-01-01&limit=1", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error("USGS seismic unreachable");
  });
  return Date.now() - start;
}

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedHealth && now - cachedHealth.timestamp < CACHE_DURATION_MS) {
      const cached = cachedHealth.data;
      return NextResponse.json(
        {
          ...cached,
          cache_age_seconds: Math.floor((now - cachedHealth.timestamp) / 1000),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=30",
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Build fresh status
    const health = await buildHealthStatus();
    cachedHealth = { data: health, timestamp: now };

    return NextResponse.json(health, {
      headers: {
        "Cache-Control": "public, max-age=30",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        route: "health",
      },
    });

    return NextResponse.json(
      {
        overall_status: "down",
        providers: {},
        timestamp: new Date().toISOString(),
        cache_age_seconds: 0,
        error: "Health check failed",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
      },
    );
  }
}
