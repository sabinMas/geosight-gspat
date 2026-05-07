// Canadian Wildland Fire Information System (CWFIS) — Active Wildfire Data
// Source: https://cwfis.cfs.nrcan.gc.ca/
// License: Crown Copyright (open data)
// Access: Real-time and forecast fire danger indices across Canada

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type WildfireIncident = {
  fireName: string | null;
  distanceKm: number | null;
  hectaresBurned: number | null;
  startDate: string | null;
};

export type CwfisResult = {
  fireWeatherIndex: number | null;
  buildUpIndex: number | null;
  dangerLevel: "low" | "moderate" | "high" | "very_high" | "extreme" | "unknown";
  activeIncidents: WildfireIncident[];
  nearestIncidentDistanceKm: number | null;
  nearestIncidentName: string | null;
  seasonalRiskLevel: "low" | "moderate" | "high" | "extreme" | "unknown";
  coverage: boolean;
  available: boolean;
};

const CWFIS_API = "https://cwfis.cfs.nrcan.gc.ca/api/";

/**
 * Query CWFIS real-time wildfire danger indices and active incidents.
 * Returns Fire Weather Index (FWI), Build-Up Index (BUI), and nearby active incidents.
 * Updates multiple times daily; covers all of Canada.
 */
export async function getCwfisWildfire(lat: number, lng: number): Promise<CwfisResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${CWFIS_API}incidents/summary`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 3 }, // Cache 3 minutes (frequent updates)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        fireWeatherIndex: null,
        buildUpIndex: null,
        dangerLevel: "unknown",
        activeIncidents: [],
        nearestIncidentDistanceKm: null,
        nearestIncidentName: null,
        seasonalRiskLevel: "unknown",
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      fwi?: number;
      bui?: number;
      danger_level?: string;
      incidents?: Array<{
        name?: string;
        lat?: number;
        lng?: number;
        hectares?: number;
        start_date?: string;
      }>;
      seasonal_risk?: string;
    };

    // Parse danger level
    let dangerLevel: CwfisResult["dangerLevel"] = "unknown";
    if (data.danger_level) {
      const level = data.danger_level.toLowerCase();
      if (level.includes("extreme")) dangerLevel = "extreme";
      else if (level.includes("very high")) dangerLevel = "very_high";
      else if (level.includes("high")) dangerLevel = "high";
      else if (level.includes("moderate")) dangerLevel = "moderate";
      else if (level.includes("low")) dangerLevel = "low";
    }

    let seasonalRiskLevel: CwfisResult["seasonalRiskLevel"] = "unknown";
    if (data.seasonal_risk) {
      const level = data.seasonal_risk.toLowerCase();
      if (level.includes("extreme")) seasonalRiskLevel = "extreme";
      else if (level.includes("high")) seasonalRiskLevel = "high";
      else if (level.includes("moderate")) seasonalRiskLevel = "moderate";
      else if (level.includes("low")) seasonalRiskLevel = "low";
    }

    // Process incidents
    const incidents = data.incidents ?? [];
    let nearestIncidentDistanceKm: number | null = null;
    let nearestIncidentName: string | null = null;
    const activeIncidents: WildfireIncident[] = [];

    for (const incident of incidents) {
      if (incident.lat === undefined || incident.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: incident.lat, lng: incident.lng });

      activeIncidents.push({
        fireName: incident.name ?? null,
        distanceKm: Number(distanceKm.toFixed(1)),
        hectaresBurned: incident.hectares ?? null,
        startDate: incident.start_date ?? null,
      });

      if (nearestIncidentDistanceKm === null || distanceKm < nearestIncidentDistanceKm) {
        nearestIncidentDistanceKm = Number(distanceKm.toFixed(1));
        nearestIncidentName = incident.name ?? null;
      }
    }

    // Sort by distance
    activeIncidents.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      fireWeatherIndex: data.fwi ?? null,
      buildUpIndex: data.bui ?? null,
      dangerLevel,
      activeIncidents,
      nearestIncidentDistanceKm,
      nearestIncidentName,
      seasonalRiskLevel,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      fireWeatherIndex: null,
      buildUpIndex: null,
      dangerLevel: "unknown",
      activeIncidents: [],
      nearestIncidentDistanceKm: null,
      nearestIncidentName: null,
      seasonalRiskLevel: "unknown",
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within CWFIS coverage (all of Canada).
 * Coverage: Canada + border regions (lat 40-85°N, lng -141 to -50°W)
 */
export function cwfisAvailable(lat: number, lng: number): boolean {
  return lat >= 40 && lat <= 85 && lng >= -141 && lng <= -50;
}
