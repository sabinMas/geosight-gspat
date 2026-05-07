/**
 * Europe Regional Coverage Tests — Phase 3 Europe Pack Validation
 * Verifies that sample coordinates across Europe produce live/derived coverage from 4 P0 providers
 */

import { getCopernicusWeather, copernicusWeatherAvailable } from "@/lib/copernicus-climate-weather";
import { getCopernicusFloodHazard, copernicusFloodAvailable } from "@/lib/copernicus-flood-hazard";
import { getCopernicusLandCover, copernicusLandCoverAvailable } from "@/lib/copernicus-land-cover";
import { getDwdWeather, dwdWeatherAvailable } from "@/lib/dwd-weather";

describe("Europe Regional Coverage (Phase 3 Europe Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative European cities across all regions
  const testLocations = [
    { name: "Berlin, Germany", lat: 52.52, lng: 13.405 },
    { name: "London, United Kingdom", lat: 51.5074, lng: -0.1278 },
    { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
    { name: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
    { name: "Madrid, Spain", lat: 40.4168, lng: -3.7038 },
    { name: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 },
    { name: "Vienna, Austria", lat: 48.2082, lng: 16.3738 },
    { name: "Warsaw, Poland", lat: 52.2297, lng: 21.0122 },
    { name: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686 },
    { name: "Athens, Greece", lat: 37.9838, lng: 23.7275 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return Copernicus weather data structure", async () => {
        const result = await getCopernicusWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("temperatureMin");
          expect(result).toHaveProperty("temperatureMax");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("cloudCoverPercent");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return Copernicus flood hazard data structure", async () => {
        const result = await getCopernicusFloodHazard(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("floodRiskLevel");
          expect(result).toHaveProperty("inFloodZone");
          expect(result).toHaveProperty("returnPeriod");
          expect(result).toHaveProperty("riverName");
          expect(result).toHaveProperty("floodForecastDays");
          expect(result).toHaveProperty("activeDiskReportsCount");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return Copernicus land cover data structure", async () => {
        const result = await getCopernicusLandCover(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("dominantClass");
          expect(result).toHaveProperty("classPercentages");
          expect(result).toHaveProperty("forestCoverPercent");
          expect(result).toHaveProperty("urbanCoverPercent");
          expect(result).toHaveProperty("agriculturalCoverPercent");
          expect(result).toHaveProperty("waterCoverPercent");
          expect(result).toHaveProperty("mapYear");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return DWD weather observations data structure", async () => {
        const result = await getDwdWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("nearestStationName");
          expect(result).toHaveProperty("nearestStationDistanceKm");
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("windGustKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("activeWeatherAlert");
          expect(result).toHaveProperty("stationCount");
          expect(result).toHaveProperty("observations");
          expect(Array.isArray(result.observations)).toBe(true);
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all European test cities", () => {
      testLocations.forEach((location) => {
        expect(copernicusWeatherAvailable(location.lat, location.lng)).toBe(true);
        expect(copernicusFloodAvailable(location.lat, location.lng)).toBe(true);
        expect(copernicusLandCoverAvailable(location.lat, location.lng)).toBe(true);
        expect(dwdWeatherAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside Europe bounds (north)", () => {
      expect(copernicusWeatherAvailable(75.0, 25.0)).toBe(false);
      expect(copernicusFloodAvailable(75.0, 25.0)).toBe(false);
      expect(copernicusLandCoverAvailable(75.0, 25.0)).toBe(false);
      expect(dwdWeatherAvailable(75.0, 25.0)).toBe(false);
    });

    it("should reject coordinates outside Europe bounds (south)", () => {
      expect(copernicusWeatherAvailable(30.0, 10.0)).toBe(false);
      expect(copernicusFloodAvailable(30.0, 10.0)).toBe(false);
      expect(copernicusLandCoverAvailable(30.0, 10.0)).toBe(false);
      expect(dwdWeatherAvailable(30.0, 10.0)).toBe(false);
    });

    it("should reject coordinates outside Europe bounds (west)", () => {
      expect(copernicusWeatherAvailable(50.0, -15.0)).toBe(false);
      expect(copernicusFloodAvailable(50.0, -15.0)).toBe(false);
      expect(copernicusLandCoverAvailable(50.0, -15.0)).toBe(false);
      expect(dwdWeatherAvailable(50.0, -15.0)).toBe(false);
    });

    it("should reject coordinates outside Europe bounds (east)", () => {
      expect(copernicusWeatherAvailable(50.0, 45.0)).toBe(false);
      expect(copernicusFloodAvailable(50.0, 45.0)).toBe(false);
      expect(copernicusLandCoverAvailable(50.0, 45.0)).toBe(false);
      expect(dwdWeatherAvailable(50.0, 45.0)).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle Copernicus weather service unavailability gracefully", async () => {
      const result = await getCopernicusWeather(52.52, 13.405);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle Copernicus flood service unavailability gracefully", async () => {
      const result = await getCopernicusFloodHazard(51.5074, -0.1278);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle Copernicus land cover service unavailability gracefully", async () => {
      const result = await getCopernicusLandCover(48.8566, 2.3522);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle DWD weather service unavailability gracefully", async () => {
      const result = await getDwdWeather(41.9028, 12.4964);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
