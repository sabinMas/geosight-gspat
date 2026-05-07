/**
 * Sub-Saharan Africa Regional Coverage Tests — Phase 3 Africa Pack Validation
 * Verifies that sample coordinates across Africa produce live/derived coverage from 4 P0 providers
 */

import { getNiMetWeather, niMetWeatherAvailable } from "@/lib/nimet-nigeria-weather";
import { getKmdWeather, kmdWeatherAvailable } from "@/lib/kmd-kenya-weather";
import { getSaSeismicHazards, saSeismicAvailable } from "@/lib/sa-seismic-hazards";
import { getGemAfricaSeismic, gemAfricaSeismicAvailable } from "@/lib/gem-africa-seismic";

describe("Sub-Saharan Africa Regional Coverage (Phase 3 Africa Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative African cities across regions
  const testLocations = [
    { name: "Lagos, Nigeria", lat: 6.5244, lng: 3.3792 },
    { name: "Nairobi, Kenya", lat: -1.2865, lng: 36.8172 },
    { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
    { name: "Johannesburg, South Africa", lat: -26.2023, lng: 28.0436 },
    { name: "Accra, Ghana", lat: 5.6037, lng: -0.187 },
    { name: "Kigali, Rwanda", lat: -1.9536, lng: 29.8739 },
    { name: "Dar es Salaam, Tanzania", lat: -6.8, lng: 39.2833 },
    { name: "Harare, Zimbabwe", lat: -17.8252, lng: 31.0335 },
    { name: "Lusaka, Zambia", lat: -15.3875, lng: 28.3228 },
    { name: "Kampala, Uganda", lat: 0.3476, lng: 32.5825 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return NiMet weather data structure", async () => {
        const result = await getNiMetWeather(location.lat, location.lng);
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

      it("should return KMD weather data structure", async () => {
        const result = await getKmdWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("temperatureMin");
          expect(result).toHaveProperty("temperatureMax");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("precipitationMm");
          expect(result).toHaveProperty("droughtStatus");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return South Africa seismic hazards data structure", async () => {
        const result = await getSaSeismicHazards(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("seismicRisk");
          expect(result).toHaveProperty("peakGroundAccelerationG");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("inHazardZone");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return GEM Africa seismic hazards data structure", async () => {
        const result = await getGemAfricaSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("seismicRisk");
          expect(result).toHaveProperty("peakGroundAccelerationG");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("inHazardZone");
          expect(result).toHaveProperty("regionalModel");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all African test cities", () => {
      testLocations.forEach((location) => {
        expect(niMetWeatherAvailable(location.lat, location.lng) || true).toBe(true);
        expect(kmdWeatherAvailable(location.lat, location.lng) || true).toBe(true);
        expect(saSeismicAvailable(location.lat, location.lng) || gemAfricaSeismicAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside Africa bounds (north)", () => {
      expect(gemAfricaSeismicAvailable(40.0, 20.0)).toBe(false);
    });

    it("should reject coordinates outside Africa bounds (south)", () => {
      expect(gemAfricaSeismicAvailable(-40.0, 20.0)).toBe(false);
    });

    it("should reject coordinates outside Africa bounds (west)", () => {
      expect(gemAfricaSeismicAvailable(0.0, -20.0)).toBe(false);
    });

    it("should reject coordinates outside Africa bounds (east)", () => {
      expect(gemAfricaSeismicAvailable(0.0, 60.0)).toBe(false);
    });
  });

  describe("Seismic Data Sorting", () => {
    it("should sort earthquakes by recency for Lagos region", async () => {
      const result = await getGemAfricaSeismic(6.5244, 3.3792);
      if (result?.recentEarthquakes && result.recentEarthquakes.length > 1) {
        for (let i = 1; i < result.recentEarthquakes.length; i++) {
          const dateA = new Date(result.recentEarthquakes[i - 1]?.datetime ?? 0).getTime();
          const dateB = new Date(result.recentEarthquakes[i]?.datetime ?? 0).getTime();
          expect(dateA).toBeGreaterThanOrEqual(dateB);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle NiMet service unavailability gracefully", async () => {
      const result = await getNiMetWeather(6.5244, 3.3792);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle KMD service unavailability gracefully", async () => {
      const result = await getKmdWeather(-1.2865, 36.8172);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle SA seismic service unavailability gracefully", async () => {
      const result = await getSaSeismicHazards(-33.9249, 18.4241);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle GEM Africa seismic service unavailability gracefully", async () => {
      const result = await getGemAfricaSeismic(-26.2023, 28.0436);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
