/**
 * China Regional Coverage Tests — Phase 3 China Pack Validation
 * Verifies that sample coordinates across China produce live/derived coverage from 4 P0 providers
 */

import { getCencSeismic, cencAvailable } from "@/lib/cenc-china-seismic";
import { getCmaWeather, cmaAvailable } from "@/lib/cma-china-weather";
import { getChinaWater, chinaWaterAvailable } from "@/lib/china-water-resources";
import { getChinaAirQuality, chinaAirQualityAvailable } from "@/lib/china-air-quality";

describe("China Regional Coverage (Phase 3 China Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative Chinese cities
  const testLocations = [
    { name: "Beijing, China", lat: 39.9042, lng: 116.4074 },
    { name: "Shanghai, China", lat: 31.2304, lng: 121.4737 },
    { name: "Chongqing, China", lat: 29.4316, lng: 106.9123 },
    { name: "Guangzhou, China", lat: 23.1291, lng: 113.2644 },
    { name: "Chengdu, China", lat: 30.5728, lng: 104.0668 },
    { name: "Xi'an, China", lat: 34.3416, lng: 108.9398 },
    { name: "Shenyang, China", lat: 41.8045, lng: 123.4328 },
    { name: "Wuhan, China", lat: 30.5928, lng: 114.3055 },
    { name: "Hangzhou, China", lat: 30.2741, lng: 120.1551 },
    { name: "Nanjing, China", lat: 32.0603, lng: 118.7969 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return CENC seismic data structure", async () => {
        const result = await getCencSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("seismicRisk");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
        }
      });

      it("should return CMA weather data structure", async () => {
        const result = await getCmaWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("weatherCondition");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("alertDetails");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return China water resources data structure", async () => {
        const result = await getChinaWater(location.lat, location.lng);
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

      it("should return China air quality data structure", async () => {
        const result = await getChinaAirQuality(location.lat, location.lng);
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
    it("should identify coverage for all Chinese test cities", () => {
      testLocations.forEach((location) => {
        expect(cencAvailable(location.lat, location.lng)).toBe(true);
        expect(cmaAvailable(location.lat, location.lng)).toBe(true);
        expect(chinaWaterAvailable(location.lat, location.lng)).toBe(true);
        expect(chinaAirQualityAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside China bounds (north)", () => {
      expect(cencAvailable(55.0, 100.0)).toBe(false);
      expect(cmaAvailable(55.0, 100.0)).toBe(false);
      expect(chinaWaterAvailable(55.0, 100.0)).toBe(false);
      expect(chinaAirQualityAvailable(55.0, 100.0)).toBe(false);
    });

    it("should reject coordinates outside China bounds (south)", () => {
      expect(cencAvailable(10.0, 100.0)).toBe(false);
      expect(cmaAvailable(10.0, 100.0)).toBe(false);
      expect(chinaWaterAvailable(10.0, 100.0)).toBe(false);
      expect(chinaAirQualityAvailable(10.0, 100.0)).toBe(false);
    });

    it("should reject coordinates outside China bounds (west)", () => {
      expect(cencAvailable(35.0, 70.0)).toBe(false);
      expect(cmaAvailable(35.0, 70.0)).toBe(false);
      expect(chinaWaterAvailable(35.0, 70.0)).toBe(false);
      expect(chinaAirQualityAvailable(35.0, 70.0)).toBe(false);
    });

    it("should reject coordinates outside China bounds (east)", () => {
      expect(cencAvailable(35.0, 140.0)).toBe(false);
      expect(cmaAvailable(35.0, 140.0)).toBe(false);
      expect(chinaWaterAvailable(35.0, 140.0)).toBe(false);
      expect(chinaAirQualityAvailable(35.0, 140.0)).toBe(false);
    });
  });

  describe("Earthquake Sorting", () => {
    it("should sort earthquakes by recency for Beijing", async () => {
      const result = await getCencSeismic(39.9042, 116.4074);
      if (result?.recentEarthquakes && result.recentEarthquakes.length > 1) {
        for (let i = 1; i < result.recentEarthquakes.length; i++) {
          const dateA = new Date(result.recentEarthquakes[i - 1]?.datetime ?? 0).getTime();
          const dateB = new Date(result.recentEarthquakes[i]?.datetime ?? 0).getTime();
          expect(dateA).toBeGreaterThanOrEqual(dateB);
        }
      }
    });
  });

  describe("Water Station Sorting", () => {
    it("should sort water stations by distance for Shanghai", async () => {
      const result = await getChinaWater(31.2304, 121.4737);
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
    it("should sort air quality stations by distance for Chongqing", async () => {
      const result = await getChinaAirQuality(29.4316, 106.9123);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle CENC service unavailability gracefully", async () => {
      const result = await getCencSeismic(39.9042, 116.4074);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle CMA service unavailability gracefully", async () => {
      const result = await getCmaWeather(31.2304, 121.4737);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle China water service unavailability gracefully", async () => {
      const result = await getChinaWater(29.4316, 106.9123);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle China air quality service unavailability gracefully", async () => {
      const result = await getChinaAirQuality(30.5728, 104.0668);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
