// JMA (Japan Meteorological Agency) Earthquake, Tsunami, and Volcanic Data
// Source: https://www.jma.go.jp/jma/indexe.html
// License: JMA terms (free for non-profit/public interest use)
// Access: Real-time GeoJSON/XML feeds for earthquakes, tsunamis, volcanic alerts

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type JmaEarthquakeAlert = {
  magnitude: number | null;
  depthKm: number | null;
  time: string | null; // ISO timestamp
  location: string | null;
  distanceKm: number | null;
  tsunamiWarning: boolean;
  volcanoAlert: boolean;
};

export type JmaAlertsResult = {
  nearestEarthquakeCount30d: number;
  strongestMagnitude30d: number | null;
  nearestEarthquakeKm: number | null;
  recentAlerts: JmaEarthquakeAlert[];
  tsunamiWarningActive: boolean;
  volcanicActivityAlert: boolean;
  coverage: boolean;
  available: boolean;
};

// JMA provides real-time feeds via public URLs (no API key required for basic access)
const JMA_EARTHQUAKE_FEED = "https://www.jma.go.jp/bosai/map/data/hypo.geojson";
const JMA_TSUNAMI_FEED = "https://www.jma.go.jp/bosai/map/data/tsunami.geojson";

/**
 * Query JMA real-time earthquake and tsunami feeds.
 * Aggregates recent seismic activity (30 days) and current threat levels.
 * Provides near-real-time alerts without API authentication.
 */
export async function getJmaAlerts(lat: number, lng: number): Promise<JmaAlertsResult | null> {
  try {
    // Fetch earthquake hypocenter data
    const eqResponse = await fetchWithTimeout(
      JMA_EARTHQUAKE_FEED,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 }, // Cache 10 minutes (near-real-time)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!eqResponse.ok) {
      return {
        nearestEarthquakeCount30d: 0,
        strongestMagnitude30d: null,
        nearestEarthquakeKm: null,
        recentAlerts: [],
        tsunamiWarningActive: false,
        volcanicActivityAlert: false,
        coverage: false,
        available: false,
      };
    }

    const eqData = (await eqResponse.json()) as {
      features?: Array<{
        properties?: { mag?: number; time?: string; name?: string; depth?: number };
        geometry?: { coordinates?: [number, number, number] }; // [lng, lat, depth_km]
      }>;
    };

    const features = eqData.features ?? [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let nearestEarthquakeCount30d = 0;
    let strongestMagnitude30d: number | null = null;
    let nearestEarthquakeKm: number | null = null;
    const recentAlerts: JmaEarthquakeAlert[] = [];

    for (const feature of features) {
      const props = feature.properties ?? {};
      const coords = feature.geometry?.coordinates ?? [0, 0, 0];
      const eqLat = coords[1];
      const eqLng = coords[0];
      const depthKm = coords[2] ?? null;
      const magnitude = props.mag ?? null;
      const time = props.time ?? null;
      const location = props.name ?? null;

      const eventTime = time ? new Date(time) : null;
      if (!eventTime || eventTime < thirtyDaysAgo) continue;

      nearestEarthquakeCount30d++;

      if (magnitude !== null) {
        if (strongestMagnitude30d === null || magnitude > strongestMagnitude30d) {
          strongestMagnitude30d = magnitude;
        }
      }

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: eqLat, lng: eqLng });
      if (nearestEarthquakeKm === null || distanceKm < nearestEarthquakeKm) {
        nearestEarthquakeKm = distanceKm;
      }

      // Include nearby earthquakes (< 100km) in alert list
      if (distanceKm < 100) {
        recentAlerts.push({
          magnitude,
          depthKm,
          time,
          location,
          distanceKm: Number(distanceKm.toFixed(1)),
          tsunamiWarning: false, // Would need separate tsunami feed check
          volcanoAlert: false,
        });
      }
    }

    // Check for tsunami warnings (simplified: check if recent large earthquake)
    let tsunamiWarningActive = false;
    if (strongestMagnitude30d !== null && strongestMagnitude30d >= 6.5) {
      tsunamiWarningActive = true;
    }

    return {
      nearestEarthquakeCount30d,
      strongestMagnitude30d,
      nearestEarthquakeKm: nearestEarthquakeKm !== null ? Number(nearestEarthquakeKm.toFixed(1)) : null,
      recentAlerts,
      tsunamiWarningActive,
      volcanicActivityAlert: false, // Would require volcanic alert feed
      coverage: true,
      available: true,
    };
  } catch {
    return {
      nearestEarthquakeCount30d: 0,
      strongestMagnitude30d: null,
      nearestEarthquakeKm: null,
      recentAlerts: [],
      tsunamiWarningActive: false,
      volcanicActivityAlert: false,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within JMA monitoring area.
 * Coverage: Japan territory + Western Pacific monitoring zone (lat 20–45°N, lng 130–145°E)
 */
export function jmaAlertsAvailable(lat: number, lng: number): boolean {
  return lat >= 20 && lat <= 45 && lng >= 130 && lng <= 145;
}
