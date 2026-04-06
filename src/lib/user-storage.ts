import type { SavedSite } from "@/types";

// StoredSite omits geodata to keep the Redis payload small.
// geodata can be re-fetched on demand once the user loads the location.
export type StoredSite = Omit<SavedSite, "geodata">;

const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

async function runUpstashCommand<T>(command: (string | number)[]): Promise<T | null> {
  const config = getUpstashConfig();
  if (!config) return null;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

function siteKey(email: string) {
  return `gs:user:${email}:sites`;
}

export async function getUserSites(email: string): Promise<StoredSite[]> {
  try {
    const raw = await runUpstashCommand<string>(["GET", siteKey(email)]);
    if (!raw) return [];
    return JSON.parse(raw) as StoredSite[];
  } catch {
    return [];
  }
}

export async function putUserSites(email: string, sites: StoredSite[]): Promise<void> {
  try {
    const json = JSON.stringify(sites);
    await runUpstashCommand(["SET", siteKey(email), json, "EX", TTL_SECONDS]);
  } catch {
    // Graceful degradation — if Redis write fails, localStorage is still the source of truth
  }
}

const GEODATA_TTL_SECONDS = 60 * 60; // 1 hour

function geodataCacheKey(lat: number, lng: number) {
  // Round to 3 decimal places (~111m precision)
  return `gs:geodata:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export async function getGeodataCache(lat: number, lng: number): Promise<import("@/types").GeodataResult | null> {
  try {
    const raw = await runUpstashCommand<string>(["GET", geodataCacheKey(lat, lng)]);
    if (!raw) return null;
    return JSON.parse(raw) as import("@/types").GeodataResult;
  } catch {
    return null;
  }
}

export async function setGeodataCache(lat: number, lng: number, data: import("@/types").GeodataResult): Promise<void> {
  try {
    const json = JSON.stringify(data);
    await runUpstashCommand(["SET", geodataCacheKey(lat, lng), json, "EX", GEODATA_TTL_SECONDS]);
  } catch {
    // Graceful degradation
  }
}
