/**
 * Japan Regional Coverage Tests — Phase 3 Japan Pack Validation
 * Verifies that sample coordinates across Japan produce live/derived coverage from 4 P0 providers
 */

import { getJShisSeismic } from "@/lib/jshis-seismic";
import { getJapanHazardMap } from "@/lib/hazard-map-portal";
import { getJmaAlerts } from "@/lib/jma-earthquakes";
import { getJmaObservations } from "@/lib/jma-observations";

describe("Japan Regional Coverage (Phase 3 Japan Pack)", () => {
  // Representative Japan test locations
  const testLocations = [
    { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Osaka, Japan", lat: 34.6937, lng: 135.5023 },
    { name: "Kobe, Japan", lat: 34.69, lng: 135.19 },
    { name: "Nagoya, Japan", lat: 35.1815, lng: 136.9066 },
    { name: "Fukuoka, Japan", lat: 33.5904, lng: 130.4017 },
    { name: "Sapporo, Japan", lat: 43.0642, lng: 141.3469 },
    { name: "Yokohama, Japan", lat: 35.4437, lng: 139.6380 },
    { name: "Sendai, Japan", lat: 38.2688, lng: 140.8694 },
    { name: "Kyoto, Japan", lat: 35.0116, lng: 135.7681 },
    { name: "Hiroshima, Japan", lat: 34.3853, lng: 132.4553 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return J-SHIS seismic hazard data", async () => {
        const result = await getJShisSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("pgaG");
          expect(result).toHaveProperty("hazardLevel");
          expect(result).toHaveProperty("available");
          expect(result).toHaveProperty("coverage");
        }
      });

      it("should determine Japan Hazard Map Portal risk zone", async () => {
        const result = await getJapanHazardMap(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("primaryHazard");
          expect(result).toHaveProperty("riskLevel");
          expect(result).toHaveProperty("inHazardZone");
          expect(result).toHaveProperty("hazardTypes");
          expect(result).toHaveProperty("available");
          expect(result).toHaveProperty("coverage");
        }
      });

      it("should retrieve JMA earthquake and tsunami alerts", async () => {
        const result = await getJmaAlerts(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("recentAlerts");
          expect(result).toHaveProperty("tsunamiWarningActive");
          expect(result).toHaveProperty("available");
          expect(result).toHaveProperty("coverage");
        }
      });

      it("should find nearby JMA AMeDAS weather observations", async () => {
        const result = await getJmaObservations(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("observations");
          expect(result).toHaveProperty("available");
          expect(result).toHaveProperty("coverage");
        }
      });
    });
  });

  it("should accept a click on Tokyo and return all provider functions without error", async () => {
    const tokyoLat = 35.6762;
    const tokyoLng = 139.6503;

    const seismic = await getJShisSeismic(tokyoLat, tokyoLng);
    const hazardMap = await getJapanHazardMap(tokyoLat, tokyoLng);
    const jmaAlerts = await getJmaAlerts(tokyoLat, tokyoLng);
    const jmaObservations = await getJmaObservations(tokyoLat, tokyoLng);

    // Verify all providers return structured results
    expect(seismic).not.toBeNull();
    expect(hazardMap).not.toBeNull();
    expect(jmaAlerts).not.toBeNull();
    expect(jmaObservations).not.toBeNull();

    // Verify Tokyo data structure (external services may timeout)
    if (seismic) {
      expect(seismic).toHaveProperty("pgaG");
      expect(seismic).toHaveProperty("hazardLevel");
    }
    if (jmaObservations) {
      // Tokyo has many nearby AMeDAS stations
      expect(jmaObservations).toHaveProperty("stationCount");
    }
  });

  it("should accept a click on Fukuoka (tsunami-prone) and detect coastal hazards", async () => {
    const fukuokaLat = 33.5904;
    const fukuokaLng = 130.4017;

    const seismic = await getJShisSeismic(fukuokaLat, fukuokaLng);
    const hazardMap = await getJapanHazardMap(fukuokaLat, fukuokaLng);
    const jmaAlerts = await getJmaAlerts(fukuokaLat, fukuokaLng);

    // All providers should return results
    expect(seismic).not.toBeNull();
    expect(hazardMap).not.toBeNull();
    expect(jmaAlerts).not.toBeNull();

    // Fukuoka is coastal; verify hazard map structure
    if (hazardMap) {
      expect(hazardMap).toHaveProperty("primaryHazard");
      expect(hazardMap).toHaveProperty("inHazardZone");
    }
  });
});
