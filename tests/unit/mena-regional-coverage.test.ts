/**
 * MENA Regional Coverage Tests — Phase 3 MENA Pack Validation
 * Verifies that sample coordinates across Middle East & North Africa produce live/derived coverage
 */

import { getUsgsSeismicMena, usgsSeismicMenaAvailable } from "@/lib/usgs-mena-seismic";
import { getMenaAirQuality, menaAirQualityAvailable } from "@/lib/mena-dust-air-quality";
import { getMenaWater, menaWaterAvailable } from "@/lib/mena-water-resources";
import { getMenaWeather, menaWeatherAvailable } from "@/lib/mena-weather";

describe("MENA Regional Coverage (Phase 3 MENA Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative MENA cities
  const testLocations = [
    { name: "Dubai, UAE", lat: 25.2048, lng: 55.2708 },
    { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
    { name: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
    { name: "Tehran, Iran", lat: 35.6892, lng: 51.3890 },
    { name: "Riyadh, Saudi Arabia", lat: 24.7136, lng: 46.6753 },
    { name: "Beirut, Lebanon", lat: 33.3137, lng: 35.3078 },
    { name: "Baghdad, Iraq", lat: 33.3128, lng: 44.3615 },
    { name: "Casablanca, Morocco", lat: 33.5731, lng: -7.5898 },
    { name: "Amman, Jordan", lat: 31.9454, lng: 35.9284 },
    { name: "Tel Aviv, Israel", lat: 32.0853, lng: 34.7818 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return USGS seismic data structure", async () => {
        const result = await getUsgsSeismicMena(location.lat, location.lng);
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

      it("should return MENA air quality & dust data structure", async () => {
        const result = await getMenaAirQuality(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("aqi");
          expect(result).toHaveProperty("aqiCategory");
          expect(result).toHaveProperty("dustLevel");
          expect(result).toHaveProperty("pm25");
          expect(result).toHaveProperty("pm10");
          expect(result).toHaveProperty("dominantPollutant");
          expect(result).toHaveProperty("activeDustStorm");
          expect(result).toHaveProperty("visibility");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return MENA water resources data structure", async () => {
        const result = await getMenaWater(location.lat, location.lng);
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

      it("should return MENA weather data structure", async () => {
        const result = await getMenaWeather(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("temperatureC");
          expect(result).toHaveProperty("temperatureFelt");
          expect(result).toHaveProperty("humidityPercent");
          expect(result).toHaveProperty("windSpeedKph");
          expect(result).toHaveProperty("windGustKph");
          expect(result).toHaveProperty("activeAlert");
          expect(result).toHaveProperty("alertDetails");
          expect(result).toHaveProperty("weatherCondition");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all MENA test cities", () => {
      testLocations.forEach((location) => {
        expect(usgsSeismicMenaAvailable(location.lat, location.lng)).toBe(true);
        expect(menaAirQualityAvailable(location.lat, location.lng)).toBe(true);
        expect(menaWaterAvailable(location.lat, location.lng)).toBe(true);
        expect(menaWeatherAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside MENA bounds (north)", () => {
      expect(usgsSeismicMenaAvailable(55.0, 40.0)).toBe(false);
      expect(menaAirQualityAvailable(55.0, 40.0)).toBe(false);
      expect(menaWaterAvailable(55.0, 40.0)).toBe(false);
      expect(menaWeatherAvailable(55.0, 40.0)).toBe(false);
    });

    it("should reject coordinates outside MENA bounds (south)", () => {
      expect(usgsSeismicMenaAvailable(-15.0, 40.0)).toBe(false);
      expect(menaAirQualityAvailable(-15.0, 40.0)).toBe(false);
      expect(menaWaterAvailable(-15.0, 40.0)).toBe(false);
      expect(menaWeatherAvailable(-15.0, 40.0)).toBe(false);
    });

    it("should reject coordinates outside MENA bounds (west)", () => {
      expect(usgsSeismicMenaAvailable(30.0, -25.0)).toBe(false);
      expect(menaAirQualityAvailable(30.0, -25.0)).toBe(false);
      expect(menaWaterAvailable(30.0, -25.0)).toBe(false);
      expect(menaWeatherAvailable(30.0, -25.0)).toBe(false);
    });

    it("should reject coordinates outside MENA bounds (east)", () => {
      expect(usgsSeismicMenaAvailable(30.0, 75.0)).toBe(false);
      expect(menaAirQualityAvailable(30.0, 75.0)).toBe(false);
      expect(menaWaterAvailable(30.0, 75.0)).toBe(false);
      expect(menaWeatherAvailable(30.0, 75.0)).toBe(false);
    });
  });

  describe("Earthquake Sorting", () => {
    it("should sort earthquakes by recency for Tehran", async () => {
      const result = await getUsgsSeismicMena(35.6892, 51.3890);
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
    it("should sort water stations by distance for Cairo", async () => {
      const result = await getMenaWater(30.0444, 31.2357);
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
    it("should handle USGS seismic service unavailability gracefully", async () => {
      const result = await getUsgsSeismicMena(25.2048, 55.2708);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle MENA air quality service unavailability gracefully", async () => {
      const result = await getMenaAirQuality(30.0444, 31.2357);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle MENA water service unavailability gracefully", async () => {
      const result = await getMenaWater(41.0082, 28.9784);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle MENA weather service unavailability gracefully", async () => {
      const result = await getMenaWeather(35.6892, 51.3890);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
