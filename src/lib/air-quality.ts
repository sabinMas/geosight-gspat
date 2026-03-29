/**
 * Query the nearest OpenAQ station and return the latest PM2.5 and PM10 values
 * plus a US-style AQI category derived from the strongest available particle
 * reading.
 */
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { AirQualityResult } from "@/types";

const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const OPENAQ_SEARCH_RADIUS_METERS = 25_000;

type OpenAqLocation = {
  id: number;
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
};

type OpenAqLatestResponse = {
  results?: OpenAqLatestResult[];
};

function getOpenAqHeaders() {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
}

function asFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toAqiCategory(pm25UgM3: number | null, pm10UgM3: number | null): AirQualityResult["aqiCategory"] {
  if (pm25UgM3 !== null) {
    if (pm25UgM3 <= 12) return "Good";
    if (pm25UgM3 <= 35.4) return "Moderate";
    if (pm25UgM3 <= 55.4) return "Unhealthy for Sensitive Groups";
    if (pm25UgM3 <= 150.4) return "Unhealthy";
    if (pm25UgM3 <= 250.4) return "Very Unhealthy";
    return "Hazardous";
  }

  if (pm10UgM3 !== null) {
    if (pm10UgM3 <= 54) return "Good";
    if (pm10UgM3 <= 154) return "Moderate";
    if (pm10UgM3 <= 254) return "Unhealthy for Sensitive Groups";
    if (pm10UgM3 <= 354) return "Unhealthy";
    if (pm10UgM3 <= 424) return "Very Unhealthy";
    return "Hazardous";
  }

  return "Unavailable";
}

function toAqiColor(
  category: AirQualityResult["aqiCategory"],
): AirQualityResult["aqiColor"] {
  switch (category) {
    case "Good":
      return "green";
    case "Moderate":
      return "yellow";
    case "Unhealthy for Sensitive Groups":
      return "orange";
    case "Unhealthy":
      return "red";
    case "Very Unhealthy":
      return "purple";
    case "Hazardous":
      return "maroon";
    default:
      return "slate";
  }
}

export async function getAirQuality(
  lat: number,
  lng: number,
): Promise<AirQualityResult | null> {
  const headers = getOpenAqHeaders();
  if (!headers) {
    return null;
  }

  try {
    const locationsResponse = await fetchWithTimeout(
      `${OPENAQ_BASE_URL}/locations?coordinates=${lat},${lng}&radius=${OPENAQ_SEARCH_RADIUS_METERS}&limit=5`,
      {
        headers,
        next: { revalidate: 60 * 30 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!locationsResponse.ok) {
      return null;
    }

    const locationsPayload = (await locationsResponse.json()) as OpenAqLocationsResponse;
    const nearestLocation = (locationsPayload.results ?? [])
      .map((location) => {
        const stationLat = asFiniteNumber(location.coordinates?.latitude);
        const stationLng = asFiniteNumber(location.coordinates?.longitude);
        if (stationLat === null || stationLng === null) {
          return null;
        }

        return {
          location,
          distanceKm: Number(
            calculateDistanceKm({ lat, lng }, { lat: stationLat, lng: stationLng }).toFixed(1),
          ),
        };
      })
      .filter(
        (entry): entry is { location: OpenAqLocation; distanceKm: number } => entry !== null,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (!nearestLocation) {
      return null;
    }

    const latestResponse = await fetchWithTimeout(
      `${OPENAQ_BASE_URL}/locations/${nearestLocation.location.id}/latest?limit=100`,
      {
        headers,
        next: { revalidate: 60 * 30 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!latestResponse.ok) {
      return null;
    }

    const latestPayload = (await latestResponse.json()) as OpenAqLatestResponse;
    const sensorParameterMap = new Map<number, string>(
      (nearestLocation.location.sensors ?? [])
        .map((sensor) => {
          const sensorId =
            typeof sensor.id === "number" && Number.isFinite(sensor.id) ? sensor.id : null;
          const parameterName = sensor.parameter?.name?.toLowerCase() ?? null;
          return sensorId !== null && parameterName ? ([sensorId, parameterName] as const) : null;
        })
        .filter((entry): entry is readonly [number, string] => entry !== null),
    );

    let pm25UgM3: number | null = null;
    let pm10UgM3: number | null = null;

    for (const result of latestPayload.results ?? []) {
      const sensorId =
        typeof result.sensorsId === "number" && Number.isFinite(result.sensorsId)
          ? result.sensorsId
          : null;
      const parameterName = sensorId !== null ? sensorParameterMap.get(sensorId) ?? null : null;
      const value = asFiniteNumber(result.value);

      if (value === null || !parameterName) {
        continue;
      }

      if (parameterName === "pm25" || parameterName === "pm2.5") {
        pm25UgM3 = value;
      }

      if (parameterName === "pm10") {
        pm10UgM3 = value;
      }
    }

    if (pm25UgM3 === null && pm10UgM3 === null) {
      return null;
    }

    const aqiCategory = toAqiCategory(pm25UgM3, pm10UgM3);

    return {
      stationName: nearestLocation.location.name?.trim() || "Nearest OpenAQ station",
      distanceKm: nearestLocation.distanceKm,
      pm25UgM3,
      pm10UgM3,
      aqiCategory,
      aqiColor: toAqiColor(aqiCategory),
    };
  } catch {
    return null;
  }
}
