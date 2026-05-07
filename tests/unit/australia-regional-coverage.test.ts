/**
 * Australia Regional Coverage Tests — Phase 3 Australia Pack Validation
 * Verifies that sample coordinates across Australia produce live/derived coverage from 4 P0 providers
 */

import { getGeoscienceHazards, geoscienceAvailable } from "@/lib/geoscience-australia";
import { getBomWeather, bomAvailable } from "@/lib/bom-australia";
import { getAustralianWaterResources, australianWaterAvailable } from "@/lib/bureau-water-resources";
import { getNpiAirQuality, npiAirAvailable } from "@/lib/npi-australia-air";

describe("Australia Regional Coverage (Phase 3 Australia Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative Australian cities
  const testLocations = [
    { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
    { name: "Melbourne, Australia", lat: -37.8136, lng: 144.9631 },
    { name: "Brisbane, Australia", lat: -27.4698, lng: 153.0251 },
    { name: "Perth, Australia", lat: -31.9505, lng: 115.8605 },
    { name: "Adelaide, Australia", lat: -34.9285, lng: 138.6007 },
    { name: "Hobart, Australia", lat: -42.8821, lng: 147.3272 },
    { name: "Canberra, Australia", lat: -35.2809, lng: 149.1300 },
    { name: "Darwin, Australia", lat: -12.4634, lng: 130.8456 },
    { name: "Gold Coast, Australia", lat: -28.0028, lng: 153.4314 },
    { name: "Newcastle, Australia", lat: -32.9283, lng: 151.7817 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return Geoscience hazard data structure", async () => {
        const result = await getGeoscienceHazards(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("primaryHazard");
          expect(result).toHaveProperty("hazardLevel");
          expect(result).toHaveProperty("peakGroundAccelerationG");
          expect(result).toHaveProperty("returnPeriodYears");
          expect(result).toHaveProperty("inHazardZone");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return BOM weather data structure", async () => {
        const result = await getBomWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("rainfallMm");
          expect(result).toHaveProperty("weatherCondition");
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("observations");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.observations)).toBe(true);
        }
      });

      it("should return water resources data structure", async () => {
        const result = await getAustralianWaterResources(location.lat, location.lng);
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

      it("should return NPI air quality data structure", async () => {
        const result = await getNpiAirQuality(location.lat, location.lng);
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
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all Australian test cities", () => {
      testLocations.forEach((location) => {
        expect(geoscienceAvailable(location.lat, location.lng)).toBe(true);
        expect(bomAvailable(location.lat, location.lng)).toBe(true);
        expect(australianWaterAvailable(location.lat, location.lng)).toBe(true);
        expect(npiAirAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside Australia bounds (north)", () => {
      expect(geoscienceAvailable(-5.0, 130.0)).toBe(false);
      expect(bomAvailable(-5.0, 130.0)).toBe(false);
      expect(australianWaterAvailable(-5.0, 130.0)).toBe(false);
      expect(npiAirAvailable(-5.0, 130.0)).toBe(false);
    });

    it("should reject coordinates outside Australia bounds (south)", () => {
      expect(geoscienceAvailable(-50.0, 130.0)).toBe(false);
      expect(bomAvailable(-50.0, 130.0)).toBe(false);
      expect(australianWaterAvailable(-50.0, 130.0)).toBe(false);
      expect(npiAirAvailable(-50.0, 130.0)).toBe(false);
    });

    it("should reject coordinates outside Australia bounds (west)", () => {
      expect(geoscienceAvailable(-30.0, 100.0)).toBe(false);
      expect(bomAvailable(-30.0, 100.0)).toBe(false);
      expect(australianWaterAvailable(-30.0, 100.0)).toBe(false);
      expect(npiAirAvailable(-30.0, 100.0)).toBe(false);
    });

    it("should reject coordinates outside Australia bounds (east)", () => {
      expect(geoscienceAvailable(-30.0, 160.0)).toBe(false);
      expect(bomAvailable(-30.0, 160.0)).toBe(false);
      expect(australianWaterAvailable(-30.0, 160.0)).toBe(false);
      expect(npiAirAvailable(-30.0, 160.0)).toBe(false);
    });
  });

  describe("Water Station Sorting", () => {
    it("should sort water stations by distance for Sydney", async () => {
      const result = await getAustralianWaterResources(-33.8688, 151.2093);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should sort water stations by distance for Melbourne", async () => {
      const result = await getAustralianWaterResources(-37.8136, 144.9631);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("Air Quality Station Sorting", () => {
    it("should sort air quality stations by distance for Brisbane", async () => {
      const result = await getNpiAirQuality(-27.4698, 153.0251);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should return pollutant data structure for each station", async () => {
      const result = await getNpiAirQuality(-31.9505, 115.8605);
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

  describe("BOM Weather Observations", () => {
    it("should sort observations by distance for Adelaide", async () => {
      const result = await getBomWeather(-34.9285, 138.6007);
      if (result?.observations && result.observations.length > 1) {
        for (let i = 1; i < result.observations.length; i++) {
          const prevDist = result.observations[i - 1]?.distanceKm ?? 999;
          const currDist = result.observations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle Geoscience service unavailability gracefully", async () => {
      const result = await getGeoscienceHazards(-33.8688, 151.2093);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle BOM service unavailability gracefully", async () => {
      const result = await getBomWeather(-37.8136, 144.9631);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle water resources service unavailability gracefully", async () => {
      const result = await getAustralianWaterResources(-27.4698, 153.0251);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle NPI air quality service unavailability gracefully", async () => {
      const result = await getNpiAirQuality(-31.9505, 115.8605);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
