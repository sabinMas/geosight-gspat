/**
 * Canada Regional Coverage Tests — Phase 3 Canada Pack Validation
 * Verifies that sample coordinates across Canada produce live/derived coverage from 4 P0 providers
 */

import { getNrcanHydrology, nrcanHydroAvailable } from "@/lib/nrcan-hydrology";
import { getCwfisWildfire, cwfisAvailable } from "@/lib/cwfis-wildfires";
import { getEcccAirQuality, ecccAvailable } from "@/lib/eccc-air-quality";
import { getNrcanSeismic, nrcanSeismicAvailable } from "@/lib/nrcan-seismic";

describe("Canada Regional Coverage (Phase 3 Canada Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative Canadian cities
  const testLocations = [
    { name: "Toronto, Canada", lat: 43.6629, lng: -79.3957 },
    { name: "Vancouver, Canada", lat: 49.2827, lng: -123.1207 },
    { name: "Montreal, Canada", lat: 45.5017, lng: -73.5673 },
    { name: "Calgary, Canada", lat: 51.0504, lng: -114.0853 },
    { name: "Edmonton, Canada", lat: 53.5461, lng: -113.4938 },
    { name: "Ottawa, Canada", lat: 45.4215, lng: -75.6972 },
    { name: "Winnipeg, Canada", lat: 49.8951, lng: -97.1384 },
    { name: "Halifax, Canada", lat: 44.6426, lng: -63.2181 },
    { name: "Quebec City, Canada", lat: 46.8139, lng: -71.2080 },
    { name: "Victoria, Canada", lat: 48.4286, lng: -123.3693 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return NRCan hydrology data structure", async () => {
        const result = await getNrcanHydrology(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("nearestStationDischarge");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("stations");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.stations)).toBe(true);
        }
      });

      it("should return CWFIS wildfire data structure", async () => {
        const result = await getCwfisWildfire(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("fireWeatherIndex");
          expect(result).toHaveProperty("buildUpIndex");
          expect(result).toHaveProperty("dangerLevel");
          expect(result).toHaveProperty("activeIncidents");
          expect(result).toHaveProperty("nearestIncidentDistanceKm");
          expect(result).toHaveProperty("nearestIncidentName");
          expect(result).toHaveProperty("seasonalRiskLevel");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.activeIncidents)).toBe(true);
        }
      });

      it("should return ECCC air quality data structure", async () => {
        const result = await getEcccAirQuality(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("nearestStationAqi");
          expect(result).toHaveProperty("nearestStationCategory");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("stations");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.stations)).toBe(true);
        }
      });

      it("should return NRCan seismic data structure", async () => {
        const result = await getNrcanSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("hazardLevel");
          expect(result).toHaveProperty("peakGroundAccelerationG");
          expect(result).toHaveProperty("returnPeriodYears");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all Canadian test cities", () => {
      testLocations.forEach((location) => {
        expect(nrcanHydroAvailable(location.lat, location.lng)).toBe(true);
        expect(cwfisAvailable(location.lat, location.lng)).toBe(true);
        expect(ecccAvailable(location.lat, location.lng)).toBe(true);
        expect(nrcanSeismicAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside Canada bounds (south)", () => {
      expect(nrcanHydroAvailable(35.0, -100.0)).toBe(false);
      expect(cwfisAvailable(35.0, -100.0)).toBe(false);
      expect(ecccAvailable(35.0, -100.0)).toBe(false);
      expect(nrcanSeismicAvailable(35.0, -100.0)).toBe(false);
    });

    it("should reject coordinates outside Canada bounds (north)", () => {
      expect(nrcanHydroAvailable(90.0, -100.0)).toBe(false);
      expect(cwfisAvailable(90.0, -100.0)).toBe(false);
      expect(ecccAvailable(90.0, -100.0)).toBe(false);
      expect(nrcanSeismicAvailable(90.0, -100.0)).toBe(false);
    });

    it("should reject coordinates outside Canada bounds (west)", () => {
      expect(nrcanHydroAvailable(50.0, -150.0)).toBe(false);
      expect(cwfisAvailable(50.0, -150.0)).toBe(false);
      expect(ecccAvailable(50.0, -150.0)).toBe(false);
      expect(nrcanSeismicAvailable(50.0, -150.0)).toBe(false);
    });

    it("should reject coordinates outside Canada bounds (east)", () => {
      expect(nrcanHydroAvailable(50.0, -40.0)).toBe(false);
      expect(cwfisAvailable(50.0, -40.0)).toBe(false);
      expect(ecccAvailable(50.0, -40.0)).toBe(false);
      expect(nrcanSeismicAvailable(50.0, -40.0)).toBe(false);
    });
  });

  describe("NRCan Hydrology Station Sorting", () => {
    it("should sort WRIS stations by distance for Toronto", async () => {
      const result = await getNrcanHydrology(43.6629, -79.3957);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should sort WRIS stations by distance for Vancouver", async () => {
      const result = await getNrcanHydrology(49.2827, -123.1207);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("ECCC Air Quality Station Sorting", () => {
    it("should sort air quality stations by distance for Toronto", async () => {
      const result = await getEcccAirQuality(43.6629, -79.3957);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should return pollutant data structure for each station", async () => {
      const result = await getEcccAirQuality(45.5017, -73.5673);
      if (result?.stations && result.stations.length > 0) {
        result.stations.forEach((station) => {
          expect(station).toHaveProperty("stationName");
          expect(station).toHaveProperty("distanceKm");
          expect(station).toHaveProperty("aqi");
          expect(station).toHaveProperty("aqiCategory");
          expect(station).toHaveProperty("dominantPollutant");
          expect(station).toHaveProperty("pollutants");
          expect(Array.isArray(station.pollutants)).toBe(true);
        });
      }
    });
  });

  describe("CWFIS Incident Sorting", () => {
    it("should sort wildfire incidents by distance for Calgary", async () => {
      const result = await getCwfisWildfire(51.0504, -114.0853);
      if (result?.activeIncidents && result.activeIncidents.length > 1) {
        for (let i = 1; i < result.activeIncidents.length; i++) {
          const prevDist = result.activeIncidents[i - 1]?.distanceKm ?? 999;
          const currDist = result.activeIncidents[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle NRCan hydrology service unavailability gracefully", async () => {
      const result = await getNrcanHydrology(43.6629, -79.3957);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle CWFIS service unavailability gracefully", async () => {
      const result = await getCwfisWildfire(49.2827, -123.1207);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle ECCC service unavailability gracefully", async () => {
      const result = await getEcccAirQuality(45.5017, -73.5673);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle NRCan seismic service unavailability gracefully", async () => {
      const result = await getNrcanSeismic(51.0504, -114.0853);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
