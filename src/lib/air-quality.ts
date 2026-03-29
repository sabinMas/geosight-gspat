import * as turf from "@turf/turf";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { AirQualityResult } from "@/types";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const OPENAQ_SEARCH_RADIUS_METERS = 50_000;

type OpenAqLocation = {
  id?: number;
  name?: string | null;
  coordinates?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  sensors?: Array<{
    id?: number | null;
    parameter?: {
      name?: string | null;
    };
  }>;
};

type OpenAqLocationsResponse = {
  results?: OpenAqLocation[];
};

type OpenAqLatestResult = {
  value?: number | null;
  sensorsId?: number | null;
  sensor?: {
    id?: number | null;
    parameter?: {
      name?: string | null;
    };
  };
  parameter?: {
    name?: string | null;
  };
};

type OpenAqLatestResponse = {
  results?: OpenAqLatestResult[];
};

function getHeaders() {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  return headers;
}

function asFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toAqiCategory(pm25: number | null, pm10: number | null): AirQualityResult["aqiCategory"] {
  if (pm25 !== null) {
    if (pm25 <= 12) return "Good";
    if (pm25 <= 35.4) return "Moderate";
    if (pm25 <= 55.4) return "Unhealthy for Sensitive Groups";
    if (pm25 <= 150.4) return "Unhealthy";
    if (pm25 <= 250.4) return "Very Unhealthy";
    return "Hazardous";
  }

  if (pm10 !== null) {
    if (pm10 <= 54) return "Good";
    if (pm10 <= 154) return "Moderate";
    if (pm10 <= 254) return "Unhealthy for Sensitive Groups";
    if (pm10 <= 354) return "Unhealthy";
    if (pm10 <= 424) return "Very Unhealthy";
    return "Hazardous";
  }

  return "Good";
}

function calculateDistanceKm(lat: number, lng: number, targetLat: number, targetLng: number) {
  return turf.distance(
    turf.point([lng, lat]),
    turf.point([targetLng, targetLat]),
    { units: "kilometers" },
  );
}

async function fetchLocations(lat: number, lng: number) {
  try {
    const response = await fetchWithTimeout(
      `${OPENAQ_BASE_URL}/locations?coordinates=${lat},${lng}&radius=${OPENAQ_SEARCH_RADIUS_METERS}&limit=5`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 * 30 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OpenAqLocationsResponse;
  } catch {
    return null;
  }
}

async function fetchLatest(locationId: number) {
  try {
    const response = await fetchWithTimeout(
      `${OPENAQ_BASE_URL}/locations/${locationId}/latest?limit=100`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 * 30 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OpenAqLatestResponse;
  } catch {
    return null;
  }
}

export async function getAirQuality(
  lat: number,
  lng: number,
): Promise<AirQualityResult | null> {
  try {
    const locationsPayload = await fetchLocations(lat, lng);
    const nearestLocation = (locationsPayload?.results ?? [])
      .map((location) => {
        const locationId =
          typeof location.id === "number" && Number.isFinite(location.id) ? location.id : null;
        const stationLat = asFiniteNumber(location.coordinates?.latitude);
        const stationLng = asFiniteNumber(location.coordinates?.longitude);

        if (locationId === null || stationLat === null || stationLng === null) {
          return null;
        }

        return {
          id: locationId,
          name: location.name?.trim() || "Nearest OpenAQ station",
          distanceKm: Number(calculateDistanceKm(lat, lng, stationLat, stationLng).toFixed(1)),
          sensors: location.sensors ?? [],
        };
      })
      .filter(
        (
          location,
        ): location is {
          id: number;
          name: string;
          distanceKm: number;
          sensors: NonNullable<OpenAqLocation["sensors"]>;
        } => location !== null,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (!nearestLocation) {
      return null;
    }

    const latestPayload = await fetchLatest(nearestLocation.id);
    if (!latestPayload?.results?.length) {
      return null;
    }

    const sensorParameterMap = new Map<number, string>(
      nearestLocation.sensors
        .map((sensor) => {
          const sensorId =
            typeof sensor.id === "number" && Number.isFinite(sensor.id) ? sensor.id : null;
          const parameterName = sensor.parameter?.name?.trim().toLowerCase() ?? null;
          return sensorId !== null && parameterName ? ([sensorId, parameterName] as const) : null;
        })
        .filter((entry): entry is readonly [number, string] => entry !== null),
    );

    let pm25: number | null = null;
    let pm10: number | null = null;

    for (const result of latestPayload.results) {
      const sensorId =
        typeof result.sensorsId === "number" && Number.isFinite(result.sensorsId)
          ? result.sensorsId
          : null;
      const parameterName =
        result.parameter?.name?.trim().toLowerCase() ??
        result.sensor?.parameter?.name?.trim().toLowerCase() ??
        (sensorId !== null ? sensorParameterMap.get(sensorId) ?? null : null);
      const value = asFiniteNumber(result.value);

      if (value === null || !parameterName) {
        continue;
      }

      if (parameterName === "pm25" || parameterName === "pm2.5") {
        pm25 = value;
      }

      if (parameterName === "pm10") {
        pm10 = value;
      }
    }

    if (pm25 === null && pm10 === null) {
      return null;
    }

    return {
      stationName: nearestLocation.name,
      pm25,
      pm10,
      aqiCategory: toAqiCategory(pm25, pm10),
      distanceKm: nearestLocation.distanceKm,
    };
  } catch {
    return null;
  }
}
