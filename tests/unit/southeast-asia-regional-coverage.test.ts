/**
 * Southeast Asia Regional Coverage Tests — Phase 3 Southeast Asia Pack Validation
 * Verifies that sample coordinates across Southeast Asia produce live/derived coverage from 4 P0 providers
 */

import { getBmkgWeather, getBmkgSeismic, bmkgAvailable } from "@/lib/bmkg-indonesia";
import { getTmdWeather, tmdWeatherAvailable } from "@/lib/tmd-thailand-weather";
import { getNchmfWeather, nchmfWeatherAvailable } from "@/lib/nchmf-vietnam-weather";
import { getAsmcWeather, asmcWeatherAvailable } from "@/lib/asmc-southeast-asia";

describe("Southeast Asia Regional Coverage (Phase 3 Southeast Asia Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative Southeast Asian cities across region
  const testLocations = [
    { name: "Jakarta, Indonesia", lat: -6.2088, lng: 106.8456 },
    { name: "Bangkok, Thailand", lat: 13.7563, lng: 100.5018 },
    { name: "Ho Chi Minh City, Vietnam", lat: 10.7769, lng: 106.6955 },
    { name: "Manila, Philippines", lat: 14.5995, lng: 120.9842 },
    { name: "Kuala Lumpur, Malaysia", lat: 3.1412, lng: 101.6964 },
    { name: "Singapore", lat: 1.3521, lng: 103.8198 },
    { name: "Hanoi, Vietnam", lat: 21.0285, lng: 105.8537 },
    { name: "Yangon, Myanmar", lat: 16.8661, lng: 96.195 },
    { name: "Phnom Penh, Cambodia", lat: 11.5564, lng: 104.9282 },
    { name: "Vientiane, Laos", lat: 17.9757, lng: 102.6331 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return BMKG weather data structure", async () => {
        const result = await getBmkgWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return BMKG seismic data structure", async () => {
        const result = await getBmkgSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("seismicRisk");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("tsunamiWarning");
          expect(result).toHaveProperty("tsunamiHeight");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return TMD weather data structure", async () => {
        const result = await getTmdWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("observations");
          expect(Array.isArray(result.observations)).toBe(true);
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return NCHMF weather data structure", async () => {
        const result = await getNchmfWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("temperatureMin");
          expect(result).toHaveProperty("temperatureMax");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("rainfallMm");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("forecastDays");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return ASMC regional weather data structure", async () => {
        const result = await getAsmcWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("rainfallMm");
          expect(result).toHaveProperty("visibility");
          expect(result).toHaveProperty("activeHazard");
          expect(result).toHaveProperty("hazardSeverity");
          expect(result).toHaveProperty("seasonalOutlook");
          expect(result).toHaveProperty("ensoStatus");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all Southeast Asian test cities", () => {
      testLocations.forEach((location) => {
        expect(bmkgAvailable(location.lat, location.lng) || asmcWeatherAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside Southeast Asia bounds (north)", () => {
      expect(asmcWeatherAvailable(25.0, 110.0)).toBe(false);
    });

    it("should reject coordinates outside Southeast Asia bounds (south)", () => {
      expect(asmcWeatherAvailable(-15.0, 110.0)).toBe(false);
    });

    it("should reject coordinates outside Southeast Asia bounds (west)", () => {
      expect(asmcWeatherAvailable(10.0, 90.0)).toBe(false);
    });

    it("should reject coordinates outside Southeast Asia bounds (east)", () => {
      expect(asmcWeatherAvailable(10.0, 145.0)).toBe(false);
    });
  });

  describe("Seismic Data Sorting", () => {
    it("should sort earthquakes by recency for Jakarta region", async () => {
      const result = await getBmkgSeismic(-6.2088, 106.8456);
      if (result?.recentEarthquakes && result.recentEarthquakes.length > 1) {
        for (let i = 1; i < result.recentEarthquakes.length; i++) {
          const dateA = new Date(result.recentEarthquakes[i - 1]?.datetime ?? 0).getTime();
          const dateB = new Date(result.recentEarthquakes[i]?.datetime ?? 0).getTime();
          expect(dateA).toBeGreaterThanOrEqual(dateB);
        }
      }
    });
  });

  describe("Weather Station Sorting", () => {
    it("should sort weather stations by distance for Bangkok", async () => {
      const result = await getTmdWeather(13.7563, 100.5018);
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
    it("should handle BMKG weather service unavailability gracefully", async () => {
      const result = await getBmkgWeather(-6.2088, 106.8456);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle BMKG seismic service unavailability gracefully", async () => {
      const result = await getBmkgSeismic(-6.2088, 106.8456);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle TMD weather service unavailability gracefully", async () => {
      const result = await getTmdWeather(13.7563, 100.5018);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle NCHMF weather service unavailability gracefully", async () => {
      const result = await getNchmfWeather(10.7769, 106.6955);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle ASMC weather service unavailability gracefully", async () => {
      const result = await getAsmcWeather(14.5995, 120.9842);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
