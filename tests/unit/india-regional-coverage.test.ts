/**
 * India Regional Coverage Tests — Phase 3 India Pack Validation
 * Verifies that sample coordinates across India produce live/derived coverage from 4 P0 providers
 */

import { getBhuvanHazards, bhuvanHazardsAvailable } from "@/lib/bhuvan-hazards";
import { getImdWeather, imdAvailable } from "@/lib/imd-india";
import { getIndiaWris, indiaWrisAvailable } from "@/lib/india-wris";
import { getCpcbAirQuality, cpcbAvailable } from "@/lib/cpcb-air-quality";

describe("India Regional Coverage (Phase 3 India Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative Indian cities
  const testLocations = [
    { name: "Mumbai, India", lat: 19.076, lng: 72.8479 },
    { name: "Delhi, India", lat: 28.7041, lng: 77.1025 },
    { name: "Bangalore, India", lat: 12.9716, lng: 77.5946 },
    { name: "Chennai, India", lat: 13.0827, lng: 80.2707 },
    { name: "Kolkata, India", lat: 22.5726, lng: 88.3639 },
    { name: "Hyderabad, India", lat: 17.3865, lng: 78.4734 },
    { name: "Pune, India", lat: 18.5204, lng: 73.8567 },
    { name: "Ahmedabad, India", lat: 23.0225, lng: 72.5714 },
    { name: "Jaipur, India", lat: 26.9124, lng: 75.7873 },
    { name: "Lucknow, India", lat: 26.8467, lng: 80.9462 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return Bhuvan hazard data structure", async () => {
        const result = await getBhuvanHazards(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("primaryHazard");
          expect(result).toHaveProperty("susceptibility");
          expect(result).toHaveProperty("inHazardZone");
          expect(result).toHaveProperty("hazardTypes");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return IMD weather data structure", async () => {
        const result = await getImdWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("rainfallMm");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("weatherCondition");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("subdivisionName");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return India-WRIS hydrology data structure", async () => {
        const result = await getIndiaWris(location.lat, location.lng);
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

      it("should return CPCB air quality data structure", async () => {
        const result = await getCpcbAirQuality(location.lat, location.lng);
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
    it("should identify coverage for all Indian test cities", () => {
      testLocations.forEach((location) => {
        expect(bhuvanHazardsAvailable(location.lat, location.lng)).toBe(true);
        expect(imdAvailable(location.lat, location.lng)).toBe(true);
        expect(indiaWrisAvailable(location.lat, location.lng)).toBe(true);
        expect(cpcbAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside India bounds (south)", () => {
      expect(bhuvanHazardsAvailable(5.0, 75.0)).toBe(false);
      expect(imdAvailable(5.0, 75.0)).toBe(false);
      expect(indiaWrisAvailable(5.0, 75.0)).toBe(false);
      expect(cpcbAvailable(5.0, 75.0)).toBe(false);
    });

    it("should reject coordinates outside India bounds (north)", () => {
      expect(bhuvanHazardsAvailable(36.0, 75.0)).toBe(false);
      expect(imdAvailable(36.0, 75.0)).toBe(false);
      expect(indiaWrisAvailable(36.0, 75.0)).toBe(false);
      expect(cpcbAvailable(36.0, 75.0)).toBe(false);
    });

    it("should reject coordinates outside India bounds (west)", () => {
      expect(bhuvanHazardsAvailable(20.0, 67.0)).toBe(false);
      expect(imdAvailable(20.0, 67.0)).toBe(false);
      expect(indiaWrisAvailable(20.0, 67.0)).toBe(false);
      expect(cpcbAvailable(20.0, 67.0)).toBe(false);
    });

    it("should reject coordinates outside India bounds (east)", () => {
      expect(bhuvanHazardsAvailable(20.0, 98.0)).toBe(false);
      expect(imdAvailable(20.0, 98.0)).toBe(false);
      expect(indiaWrisAvailable(20.0, 98.0)).toBe(false);
      expect(cpcbAvailable(20.0, 98.0)).toBe(false);
    });
  });

  describe("WRIS Station Sorting", () => {
    it("should sort WRIS stations by distance for Mumbai", async () => {
      const result = await getIndiaWris(19.076, 72.8479);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should sort WRIS stations by distance for Delhi", async () => {
      const result = await getIndiaWris(28.7041, 77.1025);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });
  });

  describe("CPCB Station Sorting", () => {
    it("should sort CPCB stations by distance for Mumbai", async () => {
      const result = await getCpcbAirQuality(19.076, 72.8479);
      if (result?.stations && result.stations.length > 1) {
        for (let i = 1; i < result.stations.length; i++) {
          const prevDist = result.stations[i - 1]?.distanceKm ?? 999;
          const currDist = result.stations[i]?.distanceKm ?? 999;
          expect(prevDist).toBeLessThanOrEqual(currDist);
        }
      }
    });

    it("should return pollutant data structure for each station", async () => {
      const result = await getCpcbAirQuality(28.7041, 77.1025);
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

  describe("Error Handling", () => {
    it("should handle Bhuvan service unavailability gracefully", async () => {
      const result = await getBhuvanHazards(19.076, 72.8479);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle WRIS service unavailability gracefully", async () => {
      const result = await getIndiaWris(28.7041, 77.1025);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle CPCB service unavailability gracefully", async () => {
      const result = await getCpcbAirQuality(12.9716, 77.5946);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle IMD service returning no subdivision gracefully", async () => {
      const result = await getImdWeather(19.076, 72.8479);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
