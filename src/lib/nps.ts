import { fetchWithTimeout } from "@/lib/network";
import type { NpsPark } from "@/types";

const NPS_BASE = "https://developer.nps.gov/api/v1";
const HIKING_ACTIVITY_ID = "A59947B7-3376-49B4-AD02-5AC3A01E3C48";

interface NpsApiPark {
  id: string;
  parkCode: string;
  fullName: string;
  name: string;
  designation: string;
  description: string;
  latitude: string;
  longitude: string;
  states: string;
  url: string;
  directionsInfo: string;
  weatherInfo: string;
  activities: { id: string; name: string }[];
  entranceFees: { cost: string; description: string; title: string }[];
  images: { url: string; title: string; altText: string }[];
  operatingHours: { name: string; description: string; standardHours: Record<string, string> }[];
}

interface NpsApiResponse {
  total: string;
  data: NpsApiPark[];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseEntranceFee(fees: NpsApiPark["entranceFees"]): string | null {
  if (!fees.length) return "Free";
  const vehicle = fees.find((f) => f.title.toLowerCase().includes("vehicle") || f.title.toLowerCase().includes("car"));
  const fee = vehicle ?? fees[0];
  const cost = parseFloat(fee.cost);
  if (isNaN(cost) || cost === 0) return "Free";
  return `$${cost.toFixed(0)} entrance fee`;
}

export async function fetchNearbyHikingParks(
  lat: number,
  lng: number,
  radiusKm = 200,
): Promise<NpsPark[]> {
  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) throw new Error("NPS_API_KEY not configured");

  const url = new URL(`${NPS_BASE}/activities/parks`);
  url.searchParams.set("id", HIKING_ACTIVITY_ID);
  url.searchParams.set("limit", "500");
  url.searchParams.set("api_key", apiKey);

  const res = await fetchWithTimeout(url.toString(), {}, 10_000);
  if (!res.ok) throw new Error(`NPS API error ${res.status}`);

  const json = (await res.json()) as NpsApiResponse;

  const parks: NpsPark[] = [];

  for (const raw of json.data) {
    const parkLat = parseFloat(raw.latitude);
    const parkLng = parseFloat(raw.longitude);
    if (!Number.isFinite(parkLat) || !Number.isFinite(parkLng)) continue;

    const distanceKm = haversineKm(lat, lng, parkLat, parkLng);
    if (distanceKm > radiusKm) continue;

    parks.push({
      id: raw.id,
      parkCode: raw.parkCode,
      name: raw.fullName,
      shortName: raw.name,
      designation: raw.designation,
      description: raw.description,
      lat: parkLat,
      lng: parkLng,
      distanceKm,
      states: raw.states,
      url: raw.url,
      directionsInfo: raw.directionsInfo,
      weatherInfo: raw.weatherInfo,
      activities: raw.activities.map((a) => a.name),
      entranceFee: parseEntranceFee(raw.entranceFees),
      imageUrl: raw.images[0]?.url ?? null,
      imageAlt: raw.images[0]?.altText ?? null,
    });
  }

  return parks.sort((a, b) => a.distanceKm - b.distanceKm);
}
