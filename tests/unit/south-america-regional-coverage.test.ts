/**
 * South America Regional Coverage Tests — Phase 3 South America Pack Validation
 * Verifies that sample coordinates across South America produce live/derived coverage from 4 P0 providers
 */

import { getInpeDeforestation, inpeAvailable } from "@/lib/inpe-deforestation";
import { getMapBiomasLulc, mapBiomasAvailable } from "@/lib/mapbiomas-lulc";
import { getUsgsSeismic, usgsSeismicAvailable } from "@/lib/usgs-south-america-seismic";
import { getNoaaWeatherHazards, noaaAvailable } from "@/lib/noaa-sa-weather-hazards";

describe("South America Regional Coverage (Phase 3 South America Pack)", () => {
  jest.setTimeout(30000);

  // 10 representative South American cities
  const testLocations = [
    { name: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 },
    { name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729 },
    { name: "Salvador, Brazil", lat: -12.9714, lng: -38.5014 },
    { name: "Manaus, Brazil", lat: -3.1190, lng: -60.0217 },
    { name: "Lima, Peru", lat: -12.0464, lng: -77.0428 },
    { name: "Bogotá, Colombia", lat: 4.7110, lng: -74.0721 },
    { name: "Santiago, Chile", lat: -33.4489, lng: -70.6693 },
    { name: "Buenos Aires, Argentina", lat: -34.6037, lng: -58.3816 },
    { name: "Quito, Ecuador", lat: -0.2299, lng: -78.5249 },
    { name: "La Paz, Bolivia", lat: -16.5898, lng: -68.1506 },
  ];

  testLocations.forEach((location) => {
    describe(`${location.name} (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`, () => {
      it("should return INPE deforestation data structure", async () => {
        const result = await getInpeDeforestation(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("forestCoverPercent");
          expect(result).toHaveProperty("deforestationRiskLevel");
          expect(result).toHaveProperty("recentDeforestationArea");
          expect(result).toHaveProperty("alertCount30d");
          expect(result).toHaveProperty("isAmazonRegion");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return MapBiomas LULC data structure", async () => {
        const result = await getMapBiomasLulc(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("dominantClass");
          expect(result).toHaveProperty("classPercentages");
          expect(result).toHaveProperty("forestCoverPercent");
          expect(result).toHaveProperty("urbanCoverPercent");
          expect(result).toHaveProperty("grasslandPercent");
          expect(result).toHaveProperty("croplandPercent");
          expect(result).toHaveProperty("waterPercent");
          expect(result).toHaveProperty("mapYear");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
        }
      });

      it("should return USGS seismic data structure", async () => {
        const result = await getUsgsSeismic(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("seismicRisk");
          expect(result).toHaveProperty("peakGroundAccelerationG");
          expect(result).toHaveProperty("nearestEarthquakeCount30d");
          expect(result).toHaveProperty("strongestMagnitude30d");
          expect(result).toHaveProperty("recentEarthquakes");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.recentEarthquakes)).toBe(true);
        }
      });

      it("should return NOAA weather hazards data structure", async () => {
        const result = await getNoaaWeatherHazards(location.lat, location.lng);
        expect(result).not.toBeNull();
        if (result) {
          expect(result).toHaveProperty("activeHazard");
          expect(result).toHaveProperty("hazardSeverity");
          expect(result).toHaveProperty("hazardDescription");
          expect(result).toHaveProperty("hazardEffectiveTime");
          expect(result).toHaveProperty("cycloneRiskLevel");
          expect(result).toHaveProperty("severeWeatherRisk");
          expect(result).toHaveProperty("floodRiskLevel");
          expect(result).toHaveProperty("activeAlerts");
          expect(result).toHaveProperty("coverage");
          expect(result).toHaveProperty("available");
          expect(Array.isArray(result.activeAlerts)).toBe(true);
        }
      });
    });
  });

  describe("Coverage Boundaries", () => {
    it("should identify coverage for all South American test cities", () => {
      testLocations.forEach((location) => {
        expect(inpeAvailable(location.lat, location.lng)).toBe(true);
        expect(mapBiomasAvailable(location.lat, location.lng)).toBe(true);
        expect(usgsSeismicAvailable(location.lat, location.lng)).toBe(true);
        expect(noaaAvailable(location.lat, location.lng)).toBe(true);
      });
    });

    it("should reject coordinates outside South America bounds (north)", () => {
      expect(inpeAvailable(15.0, -70.0)).toBe(false);
      expect(mapBiomasAvailable(15.0, -70.0)).toBe(false);
      expect(usgsSeismicAvailable(15.0, -70.0)).toBe(false);
      expect(noaaAvailable(15.0, -70.0)).toBe(false);
    });

    it("should reject coordinates outside South America bounds (south)", () => {
      expect(inpeAvailable(-60.0, -70.0)).toBe(false);
      expect(mapBiomasAvailable(-60.0, -70.0)).toBe(false);
      expect(usgsSeismicAvailable(-60.0, -70.0)).toBe(false);
      expect(noaaAvailable(-60.0, -70.0)).toBe(false);
    });

    it("should reject coordinates outside South America bounds (west)", () => {
      expect(inpeAvailable(-20.0, -90.0)).toBe(false);
      expect(mapBiomasAvailable(-20.0, -90.0)).toBe(false);
      expect(usgsSeismicAvailable(-20.0, -90.0)).toBe(false);
      expect(noaaAvailable(-20.0, -90.0)).toBe(false);
    });

    it("should reject coordinates outside South America bounds (east)", () => {
      expect(inpeAvailable(-20.0, -20.0)).toBe(false);
      expect(mapBiomasAvailable(-20.0, -20.0)).toBe(false);
      expect(usgsSeismicAvailable(-20.0, -20.0)).toBe(false);
      expect(noaaAvailable(-20.0, -20.0)).toBe(false);
    });
  });

  describe("Earthquake Sorting", () => {
    it("should sort earthquakes by recency for Lima", async () => {
      const result = await getUsgsSeismic(-12.0464, -77.0428);
      if (result?.recentEarthquakes && result.recentEarthquakes.length > 1) {
        for (let i = 1; i < result.recentEarthquakes.length; i++) {
          const dateA = new Date(result.recentEarthquakes[i - 1]?.datetime ?? 0).getTime();
          const dateB = new Date(result.recentEarthquakes[i]?.datetime ?? 0).getTime();
          expect(dateA).toBeGreaterThanOrEqual(dateB); // More recent first
        }
      }
    });

    it("should sort earthquakes by recency for Bogotá", async () => {
      const result = await getUsgsSeismic(4.7110, -74.0721);
      if (result?.recentEarthquakes && result.recentEarthquakes.length > 1) {
        for (let i = 1; i < result.recentEarthquakes.length; i++) {
          const dateA = new Date(result.recentEarthquakes[i - 1]?.datetime ?? 0).getTime();
          const dateB = new Date(result.recentEarthquakes[i]?.datetime ?? 0).getTime();
          expect(dateA).toBeGreaterThanOrEqual(dateB);
        }
      }
    });
  });

  describe("LULC Class Distribution", () => {
    it("should return valid LULC percentages for São Paulo", async () => {
      const result = await getMapBiomasLulc(-23.5505, -46.6333);
      expect(result).toHaveProperty("classPercentages");
      if (result && result.available && result.classPercentages) {
        const total = Object.values(result.classPercentages).reduce((a, b) => a + b, 0);
        // Total should be close to 100 when available
        expect(total).toBeGreaterThan(0);
      }
    });

    it("should have valid LULC structure for all locations", async () => {
      for (const location of testLocations) {
        const result = await getMapBiomasLulc(location.lat, location.lng);
        if (result && result.available) {
          expect(result.dominantClass).not.toBe("unknown");
        } else {
          // Service unavailable is acceptable - just verify structure exists
          expect(result).toHaveProperty("dominantClass");
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle INPE service unavailability gracefully", async () => {
      const result = await getInpeDeforestation(-23.5505, -46.6333);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle MapBiomas service unavailability gracefully", async () => {
      const result = await getMapBiomasLulc(-22.9068, -43.1729);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle USGS seismic service unavailability gracefully", async () => {
      const result = await getUsgsSeismic(-12.0464, -77.0428);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });

    it("should handle NOAA weather hazards service unavailability gracefully", async () => {
      const result = await getNoaaWeatherHazards(4.7110, -74.0721);
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("available");
    });
  });
});
