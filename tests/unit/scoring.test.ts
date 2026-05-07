import { DEFAULT_PROFILE, getProfileById } from "@/lib/profiles";
import {
  buildFactorScores,
  buildHazardResilienceSummary,
  calculateProfileScore,
  scoreAirQualityContext,
  scoreBroadbandAvailability,
  scoreClimate,
  scoreContaminationRisk,
  scoreCountSignal,
  scoreFireRisk,
  scoreFloodRisk,
  scoreFromDistance,
  scoreLandCover,
  scoreSeismicRisk,
  scoreTerrain,
  scoreWaterAccess,
  scoreWeatherRisk,
} from "@/lib/scoring";
import type {
  DataSourceMeta,
  GeodataResult,
  LandCoverBucket,
  MissionProfile,
} from "@/types";

function buildSource(overrides: Partial<DataSourceMeta> = {}): DataSourceMeta {
  return {
    id: overrides.id ?? "source",
    label: overrides.label ?? "Source",
    provider: overrides.provider ?? "GeoSight Test",
    status: overrides.status ?? "live",
    lastUpdated: overrides.lastUpdated ?? "2026-04-15T00:00:00.000Z",
    freshness: overrides.freshness ?? "Live",
    coverage: overrides.coverage ?? "Global",
    confidence: overrides.confidence ?? "High",
    note: overrides.note,
    domain: overrides.domain,
    accessType: overrides.accessType,
    regionScopes: overrides.regionScopes,
    fallbackProviders: overrides.fallbackProviders,
  };
}

type GeodataOverrides = {
  elevationMeters?: number | null;
  nearestWaterBody?: Partial<GeodataResult["nearestWaterBody"]>;
  nearestRoad?: Partial<GeodataResult["nearestRoad"]>;
  nearestPower?: Partial<GeodataResult["nearestPower"]>;
  climate?: Partial<GeodataResult["climate"]>;
  hazards?: Partial<GeodataResult["hazards"]>;
  demographics?: Partial<GeodataResult["demographics"]>;
  amenities?: Partial<GeodataResult["amenities"]>;
  broadband?: GeodataResult["broadband"] | null;
  floodZone?: GeodataResult["floodZone"] | null;
  streamGauges?: GeodataResult["streamGauges"];
  groundwater?: Partial<GeodataResult["groundwater"]>;
  soilProfile?: GeodataResult["soilProfile"] | null;
  seismicDesign?: GeodataResult["seismicDesign"] | null;
  climateHistory?: GeodataResult["climateHistory"] | null;
  solarResource?: GeodataResult["solarResource"] | null;
  airQuality?: GeodataResult["airQuality"] | null;
  epaHazards?: GeodataResult["epaHazards"] | null;
  hazardAlerts?: GeodataResult["hazardAlerts"] | null;
  weatherAlerts?: GeodataResult["weatherAlerts"] | null;
  weatherForecast?: GeodataResult["weatherForecast"];
  schoolContext?: GeodataResult["schoolContext"] | null;
  landClassification?: GeodataResult["landClassification"];
  populationDensity?: GeodataResult["populationDensity"];
  landCoverGlobal?: GeodataResult["landCoverGlobal"];
  floodHazard?: GeodataResult["floodHazard"];
  droughtIndices?: GeodataResult["droughtIndices"];
  seismicHazard?: GeodataResult["seismicHazard"];
  soilProfileExtended?: GeodataResult["soilProfileExtended"];
  terrainDerivatives?: GeodataResult["terrainDerivatives"];
  sources?: Partial<{
    [K in keyof GeodataResult["sources"]]: Partial<GeodataResult["sources"][K]>;
  }>;
  sourceNotes?: string[];
};

function buildGeodata(overrides: GeodataOverrides = {}): GeodataResult {
  const baseSources: GeodataResult["sources"] = {
    elevation: buildSource({ id: "elevation", label: "Elevation" }),
    infrastructure: buildSource({ id: "infrastructure", label: "Infrastructure" }),
    climate: buildSource({ id: "climate", label: "Climate" }),
    hazards: buildSource({ id: "hazards", label: "Hazards" }),
    hazardFire: buildSource({ id: "hazard-fire", label: "Fire hazards" }),
    demographics: buildSource({ id: "demographics", label: "Demographics" }),
    amenities: buildSource({ id: "amenities", label: "Amenities" }),
    school: buildSource({ id: "school", label: "Schools" }),
    landClassification: buildSource({ id: "land", label: "Land classification" }),
    broadband: buildSource({ id: "broadband", label: "Broadband" }),
    floodZone: buildSource({ id: "flood", label: "Flood zone" }),
    water: buildSource({ id: "water", label: "Water" }),
    groundwater: buildSource({ id: "groundwater", label: "Groundwater" }),
    soilProfile: buildSource({ id: "soil", label: "Soil profile" }),
    seismicDesign: buildSource({ id: "seismic", label: "Seismic design" }),
    climateHistory: buildSource({ id: "climate-history", label: "Climate history" }),
    solarResource: buildSource({ id: "solar", label: "Solar resource" }),
    airQuality: buildSource({ id: "air", label: "Air quality" }),
    epaHazards: buildSource({ id: "epa", label: "EPA hazards" }),
    hazardAlerts: buildSource({ id: "alerts", label: "Hazard alerts" }),
    weatherAlerts: buildSource({ id: "weather-alerts", label: "US weather alerts" }),
  };

  return {
    elevationMeters: overrides.elevationMeters ?? 180,
    nearestWaterBody: {
      name: "Test River",
      distanceKm: 1.2,
      ...overrides.nearestWaterBody,
    },
    nearestRoad: {
      name: "Test Road",
      distanceKm: 2.5,
      ...overrides.nearestRoad,
    },
    nearestPower: {
      name: "Test Substation",
      distanceKm: 3.2,
      ...overrides.nearestPower,
    },
    climate: {
      currentTempC: 14,
      averageTempC: 12,
      dailyHighTempC: 18,
      dailyLowTempC: 7,
      coolingDegreeDays: 40,
      precipitationMm: 70,
      windSpeedKph: 18,
      airQualityIndex: 42,
      weatherRiskSummary: "No elevated weather risk detected",
      ...overrides.climate,
    },
    hazards: {
      earthquakeCount30d: 1,
      strongestEarthquakeMagnitude30d: 3.4,
      nearestEarthquakeKm: 42,
      activeFireCount7d: 1,
      nearestFireKm: 16,
      ...overrides.hazards,
    },
    demographics: {
      countyName: "Test County",
      stateCode: "WA",
      population: 100000,
      medianHouseholdIncome: 85000,
      medianHomeValue: 550000,
      geographicGranularity: "county",
      populationReferenceYear: 2024,
      incomeReferenceYear: 2024,
      incomeDefinition: "Median household income",
      ...overrides.demographics,
    },
    amenities: {
      schoolCount: 4,
      healthcareCount: 2,
      foodAndDrinkCount: 6,
      transitStopCount: 4,
      parkCount: 3,
      trailheadCount: 2,
      commercialCount: 5,
      ...overrides.amenities,
    },
    broadband:
      overrides.broadband === undefined
        ? {
            kind: "address_availability",
            granularity: "address",
            regionLabel: null,
            referenceYear: null,
            technologies: ["fiber", "cable"],
            maxDownloadSpeed: 900,
            maxUploadSpeed: 300,
            providerCount: 3,
            hasFiber: true,
            fixedBroadbandCoveragePercent: null,
            mobileBroadbandCoveragePercent: null,
          }
        : overrides.broadband,
    floodZone:
      overrides.floodZone === undefined
        ? {
            floodZone: "X",
            isSpecialFloodHazard: false,
            label: "Area of minimal flood hazard",
            source: "fema",
          }
        : overrides.floodZone,
    streamGauges:
      overrides.streamGauges ??
      [
        {
          siteNumber: "123456",
          siteName: "Test Gauge",
          dischargeCfs: 2200,
          drainageAreaSqMi: 180,
          distanceKm: 5,
        },
      ],
    groundwater: {
      wells: [],
      wellCount: 0,
      nearestWell: null,
      ...overrides.groundwater,
    },
    soilProfile: overrides.soilProfile ?? null,
    seismicDesign:
      overrides.seismicDesign === undefined
        ? {
            pga: 0.08,
            ss: 0.62,
            s1: 0.18,
            siteClass: null,
            riskCategory: null,
            dataSource: "ASCE 7-22 via USGS",
          }
        : overrides.seismicDesign,
    climateHistory: overrides.climateHistory ?? null,
    solarResource: overrides.solarResource ?? null,
    airQuality:
      overrides.airQuality === undefined
        ? {
            stationName: "Test Station",
            pm25: 8,
            pm10: 18,
            aqiCategory: "Good",
            distanceKm: 6,
          }
        : overrides.airQuality,
    epaHazards:
      overrides.epaHazards === undefined
        ? {
            superfundCount: 0,
            triCount: 0,
            nearestSuperfundName: null,
            nearestSuperfundDistanceKm: null,
          }
        : overrides.epaHazards,
    hazardAlerts: overrides.hazardAlerts ?? null,
    weatherAlerts: overrides.weatherAlerts ?? null,
    weatherForecast: overrides.weatherForecast ?? [],
    schoolContext: overrides.schoolContext ?? null,
    landClassification:
      overrides.landClassification ??
      ([
        { label: "Urban", value: 45, confidence: 0.9, color: "#888" },
        { label: "Vegetation", value: 35, confidence: 0.9, color: "#0a0" },
        { label: "Water", value: 20, confidence: 0.9, color: "#00f" },
      ] satisfies LandCoverBucket[]),
    populationDensity: overrides.populationDensity ?? null,
    landCoverGlobal: overrides.landCoverGlobal ?? null,
    floodHazard: overrides.floodHazard ?? null,
    droughtIndices: overrides.droughtIndices ?? null,
    seismicHazard: overrides.seismicHazard ?? null,
    soilProfileExtended: overrides.soilProfileExtended ?? null,
    terrainDerivatives: overrides.terrainDerivatives ?? null,
    sources: {
      elevation: { ...baseSources.elevation, ...(overrides.sources?.elevation ?? {}) },
      infrastructure: {
        ...baseSources.infrastructure,
        ...(overrides.sources?.infrastructure ?? {}),
      },
      climate: { ...baseSources.climate, ...(overrides.sources?.climate ?? {}) },
      hazards: { ...baseSources.hazards, ...(overrides.sources?.hazards ?? {}) },
      hazardFire: { ...baseSources.hazardFire, ...(overrides.sources?.hazardFire ?? {}) },
      demographics: {
        ...baseSources.demographics,
        ...(overrides.sources?.demographics ?? {}),
      },
      amenities: { ...baseSources.amenities, ...(overrides.sources?.amenities ?? {}) },
      school: { ...baseSources.school, ...(overrides.sources?.school ?? {}) },
      landClassification: {
        ...baseSources.landClassification,
        ...(overrides.sources?.landClassification ?? {}),
      },
      broadband: { ...baseSources.broadband, ...(overrides.sources?.broadband ?? {}) },
      floodZone: { ...baseSources.floodZone, ...(overrides.sources?.floodZone ?? {}) },
      water: { ...baseSources.water, ...(overrides.sources?.water ?? {}) },
      groundwater: {
        ...baseSources.groundwater,
        ...(overrides.sources?.groundwater ?? {}),
      },
      soilProfile: { ...baseSources.soilProfile, ...(overrides.sources?.soilProfile ?? {}) },
      seismicDesign: {
        ...baseSources.seismicDesign,
        ...(overrides.sources?.seismicDesign ?? {}),
      },
      climateHistory: {
        ...baseSources.climateHistory,
        ...(overrides.sources?.climateHistory ?? {}),
      },
      solarResource: {
        ...baseSources.solarResource,
        ...(overrides.sources?.solarResource ?? {}),
      },
      airQuality: { ...baseSources.airQuality, ...(overrides.sources?.airQuality ?? {}) },
      epaHazards: { ...baseSources.epaHazards, ...(overrides.sources?.epaHazards ?? {}) },
      hazardAlerts: {
        ...baseSources.hazardAlerts,
        ...(overrides.sources?.hazardAlerts ?? {}),
      },
      weatherAlerts: {
        ...baseSources.weatherAlerts,
        ...(overrides.sources?.weatherAlerts ?? {}),
      },
      populationDensity: buildSource({ id: "population", label: "Population density" }),
      landCoverGlobal: buildSource({ id: "land-cover", label: "Land cover" }),
      floodHazard: buildSource({ id: "flood", label: "Flood hazard" }),
      droughtIndices: buildSource({ id: "drought", label: "Drought indices" }),
      seismicHazard: buildSource({ id: "seismic", label: "Seismic hazard" }),
      terrainDerivatives: buildSource({ id: "terrain-derivs", label: "Terrain derivatives" }),
    },
    coordinates: { lat: 47.6062, lng: -122.3321 },
    sourceNotes: overrides.sourceNotes ?? [],
  };
}

describe("scoreCountSignal", () => {
  test("returns 50 for null input", () => {
    expect(scoreCountSignal(null, 3)).toBe(50);
  });

  test("returns 15 for zero count", () => {
    expect(scoreCountSignal(0, 3)).toBe(15);
  });

  test("returns 100 when the count reaches the ideal", () => {
    expect(scoreCountSignal(3, 3)).toBe(100);
  });

  test("returns 100 when the count exceeds max useful", () => {
    expect(scoreCountSignal(8, 3, 6)).toBe(100);
  });
});

describe("scoreFromDistance", () => {
  test.each([
    [0, 100],
    [5, 100],
    [20, 15],
  ])("scores %skm as %s for near-distance factors", (distance, expected) => {
    expect(scoreFromDistance(distance, 5, 20, "near")).toBe(expected);
  });

  test.each([
    [0, 15],
    [5, 15],
    [20, 100],
  ])("scores %skm as %s for far-distance factors", (distance, expected) => {
    expect(scoreFromDistance(distance, 20, 5, "far")).toBe(expected);
  });
});

describe("scoreTerrain", () => {
  test.each([
    [null, "cooling", 55],
    [-25, "cooling", 90],
    [119, "cooling", 90],
    [120, "cooling", 74],
    [260, "cooling", 48],
    [500, "cooling", 30],
    [139, "buildability", 88],
    [140, "buildability", 72],
    [320, "buildability", 50],
    [550, "buildability", 30],
    [79, "terrainVariety", 42],
    [80, "terrainVariety", 70],
    [220, "terrainVariety", 88],
    [550, "terrainVariety", 76],
    [900, "terrainVariety", 55],
  ])("returns %s for elevation %s in %s mode", (elevation, mode, expected) => {
    expect(scoreTerrain(elevation as number | null, mode as string)).toBe(expected);
  });
});

describe("scoreClimate", () => {
  test("rewards cool temperatures in cooling mode", () => {
    expect(scoreClimate(12, 0, 50, "cooling")).toBe(100);
  });

  test("penalizes hot conditions in cooling mode", () => {
    expect(scoreClimate(35, 800, 50, "cooling")).toBe(23);
  });

  test("rewards mild outdoor conditions", () => {
    expect(scoreClimate(15, 200, 0, "outdoor")).toBe(100);
  });

  test("penalizes hot and wet outdoor conditions", () => {
    expect(scoreClimate(35, 200, 600, "outdoor")).toBe(38);
  });
});

describe("scoreLandCover", () => {
  test("rewards developed land in developed mode", () => {
    const classification: LandCoverBucket[] = [
      { label: "Urban", value: 60, confidence: 0.9, color: "#666" },
      { label: "Barren", value: 40, confidence: 0.9, color: "#999" },
    ];

    expect(scoreLandCover(classification, "developed")).toBe(100);
  });

  test("penalizes heavily vegetated land in developed mode", () => {
    const classification: LandCoverBucket[] = [
      { label: "Vegetation", value: 60, confidence: 0.9, color: "#090" },
      { label: "Forest", value: 40, confidence: 0.9, color: "#060" },
    ];

    expect(scoreLandCover(classification, "developed")).toBe(20);
  });

  test("rewards vegetation in vegetation mode", () => {
    const classification: LandCoverBucket[] = [
      { label: "Vegetation", value: 55, confidence: 0.9, color: "#090" },
      { label: "Forest", value: 35, confidence: 0.9, color: "#060" },
      { label: "Urban", value: 10, confidence: 0.9, color: "#666" },
    ];

    expect(scoreLandCover(classification, "vegetation")).toBe(100);
  });
});

describe("scoreBroadbandAvailability", () => {
  test("returns 60 when broadband coverage is unavailable", () => {
    const geodata = buildGeodata({
      sources: {
        broadband: { status: "unavailable" },
      },
    });

    expect(scoreBroadbandAvailability(geodata, "residential")).toBe(60);
  });

  test("scores strong address-level FCC data for data centers", () => {
    const geodata = buildGeodata({
      broadband: {
        kind: "address_availability",
        granularity: "address",
        regionLabel: null,
        referenceYear: null,
        technologies: ["fiber"],
        maxDownloadSpeed: 1000,
        maxUploadSpeed: 500,
        providerCount: 3,
        hasFiber: true,
        fixedBroadbandCoveragePercent: null,
        mobileBroadbandCoveragePercent: null,
      },
    });

    expect(scoreBroadbandAvailability(geodata, "data_center")).toBe(100);
  });

  test("scores strong address-level FCC data for residential use", () => {
    const geodata = buildGeodata({
      broadband: {
        kind: "address_availability",
        granularity: "address",
        regionLabel: null,
        referenceYear: null,
        technologies: ["fiber", "cable"],
        maxDownloadSpeed: 300,
        maxUploadSpeed: 40,
        providerCount: 2,
        hasFiber: true,
        fixedBroadbandCoveragePercent: null,
        mobileBroadbandCoveragePercent: null,
      },
    });

    expect(scoreBroadbandAvailability(geodata, "residential")).toBe(100);
  });

  test("scores Eurostat country baseline for data centers", () => {
    const geodata = buildGeodata({
      broadband: {
        kind: "regional_household_baseline",
        granularity: "country",
        regionLabel: "Testland",
        referenceYear: 2024,
        technologies: [],
        maxDownloadSpeed: 0,
        maxUploadSpeed: 0,
        providerCount: 0,
        hasFiber: false,
        fixedBroadbandCoveragePercent: 80,
        mobileBroadbandCoveragePercent: 90,
      },
    });

    expect(scoreBroadbandAvailability(geodata, "data_center")).toBe(82);
  });

  test("scores Eurostat country baseline for residential use", () => {
    const geodata = buildGeodata({
      broadband: {
        kind: "regional_household_baseline",
        granularity: "country",
        regionLabel: "Testland",
        referenceYear: 2024,
        technologies: [],
        maxDownloadSpeed: 0,
        maxUploadSpeed: 0,
        providerCount: 0,
        hasFiber: false,
        fixedBroadbandCoveragePercent: 80,
        mobileBroadbandCoveragePercent: 90,
      },
    });

    expect(scoreBroadbandAvailability(geodata, "residential")).toBe(84);
  });
});

describe("scoreFloodRisk", () => {
  test("returns 100 for Zone X", () => {
    expect(scoreFloodRisk(buildGeodata({ floodZone: { floodZone: "X", isSpecialFloodHazard: false, label: "Minimal", source: "fema" } }))).toBe(100);
  });

  test("returns 0 for Zone A special flood hazard", () => {
    expect(scoreFloodRisk(buildGeodata({ floodZone: { floodZone: "A", isSpecialFloodHazard: true, label: "SFHA", source: "fema" } }))).toBe(0);
  });

  test("returns 65 for Zone D", () => {
    expect(scoreFloodRisk(buildGeodata({ floodZone: { floodZone: "D", isSpecialFloodHazard: false, label: "Undetermined", source: "fema" } }))).toBe(65);
  });

  test("returns 60 when flood data is unavailable", () => {
    expect(
      scoreFloodRisk(
        buildGeodata({
          floodZone: null,
          sources: {
            floodZone: { status: "unavailable" },
          },
        }),
      ),
    ).toBe(60);
  });
});

describe("scoreAirQualityContext", () => {
  test.each([
    ["Good", 94],
    ["Moderate", 78],
    ["Unhealthy for Sensitive Groups", 58],
    ["Unhealthy", 34],
    ["Very Unhealthy", 18],
    ["Hazardous", 10],
  ] as const)("returns %s score %s", (category, expected) => {
    const geodata = buildGeodata({
      airQuality: {
        stationName: "Station",
        pm25: 10,
        pm10: 20,
        aqiCategory: category,
        distanceKm: 5,
      },
    });

    expect(scoreAirQualityContext(geodata)).toBe(expected);
  });
});

describe("scoreContaminationRisk", () => {
  test("returns 95 when no nearby contamination sites are found", () => {
    expect(
      scoreContaminationRisk(
        buildGeodata({
          epaHazards: {
            superfundCount: 0,
            triCount: 0,
            nearestSuperfundName: null,
            nearestSuperfundDistanceKm: null,
          },
        }),
      ),
    ).toBe(95);
  });

  test("drops into the mid-range when several sites are nearby", () => {
    expect(
      scoreContaminationRisk(
        buildGeodata({
          epaHazards: {
            superfundCount: 4,
            triCount: 2,
            nearestSuperfundName: "Test Site",
            nearestSuperfundDistanceKm: 15,
          },
        }),
      ),
    ).toBe(54);
  });

  test("falls near the floor when superfund sites are numerous and close", () => {
    expect(
      scoreContaminationRisk(
        buildGeodata({
          epaHazards: {
            superfundCount: 9,
            triCount: 10,
            nearestSuperfundName: "Critical Site",
            nearestSuperfundDistanceKm: 4,
          },
        }),
      ),
    ).toBe(17);
  });
});

describe("scoreWaterAccess", () => {
  test("returns 100 when water, gauge access, and discharge are all strong", () => {
    expect(
      scoreWaterAccess(
        buildGeodata({
          nearestWaterBody: { distanceKm: 0.5 },
          streamGauges: [
            {
              siteNumber: "g1",
              siteName: "Strong Gauge",
              dischargeCfs: 12000,
              drainageAreaSqMi: 200,
              distanceKm: 4,
            },
          ],
        }),
      ),
    ).toBe(100);
  });

  test("blends mapped water and neutral gauge context when no live gauge exists", () => {
    expect(
      scoreWaterAccess(
        buildGeodata({
          nearestWaterBody: { distanceKm: 1 },
          streamGauges: [],
        }),
      ),
    ).toBe(78);
  });

  test("penalizes distant water access", () => {
    expect(
      scoreWaterAccess(
        buildGeodata({
          nearestWaterBody: { distanceKm: 15 },
          streamGauges: [],
        }),
      ),
    ).toBe(40);
  });
});

describe("scoreSeismicRisk", () => {
  test("returns 95 below 0.05g PGA", () => {
    expect(scoreSeismicRisk(buildGeodata({ seismicDesign: { pga: 0.04, ss: null, s1: null, siteClass: null, riskCategory: null, dataSource: "ASCE 7-22 via USGS" } }))).toBe(95);
  });

  test("returns 80 for moderate PGA", () => {
    expect(scoreSeismicRisk(buildGeodata({ seismicDesign: { pga: 0.1, ss: null, s1: null, siteClass: null, riskCategory: null, dataSource: "ASCE 7-22 via USGS" } }))).toBe(80);
  });

  test("returns 30 above 0.4g PGA", () => {
    expect(scoreSeismicRisk(buildGeodata({ seismicDesign: { pga: 0.45, ss: null, s1: null, siteClass: null, riskCategory: null, dataSource: "ASCE 7-22 via USGS" } }))).toBe(30);
  });
});

describe("scoreFireRisk", () => {
  test("returns 70 when fire detection data is missing", () => {
    expect(scoreFireRisk(buildGeodata({ hazards: { activeFireCount7d: null, nearestFireKm: null } }))).toBe(70);
  });

  test("returns 95 when there are no active fires", () => {
    expect(scoreFireRisk(buildGeodata({ hazards: { activeFireCount7d: 0, nearestFireKm: null } }))).toBe(95);
  });

  test("returns a low score when active fires are nearby", () => {
    expect(scoreFireRisk(buildGeodata({ hazards: { activeFireCount7d: 5, nearestFireKm: 2 } }))).toBe(25);
  });
});

describe("scoreWeatherRisk", () => {
  test("rewards calm weather", () => {
    expect(scoreWeatherRisk(buildGeodata({ climate: { windSpeedKph: 10, weatherRiskSummary: null } }))).toBe(92);
  });

  test("penalizes warning-level conditions", () => {
    expect(scoreWeatherRisk(buildGeodata({ climate: { windSpeedKph: 45, weatherRiskSummary: "Severe thunderstorm warning" } }))).toBe(40);
  });

  test("clamps extreme wind to a low score", () => {
    expect(scoreWeatherRisk(buildGeodata({ climate: { windSpeedKph: 1000, weatherRiskSummary: null } }))).toBe(30);
  });
});

describe("composite scoring", () => {
  test("buildFactorScores returns one score per profile factor", () => {
    const profile = getProfileById("home-buying");
    const factorScores = buildFactorScores(buildGeodata(), profile);

    expect(factorScores).toHaveLength(profile.factors.length);
  });

  test("calculateProfileScore computes the expected weighted average", () => {
    const profile: MissionProfile = {
      id: "test-profile",
      name: "Test profile",
      icon: "Map",
      tagline: "Test",
      description: "Test profile",
      accentColor: "#53ddff",
      factors: [
        {
          key: "power",
          label: "Power",
          weight: 0.6,
          scoreFn: "distance",
          params: { source: "power", idealKm: 2, cutoffKm: 10, direction: "near" },
          description: "Power access",
        },
        {
          key: "terrain",
          label: "Terrain",
          weight: 0.4,
          scoreFn: "elevation",
          params: { mode: "cooling" },
          description: "Terrain",
        },
      ],
      systemPrompt: "Test prompt",
      defaultLayers: { water: true, power: true, roads: true, heatmap: false, buildings: false },
      exampleQuestions: [],
      recommendationBands: [
        { min: 85, text: "Excellent" },
        { min: 70, text: "Promising" },
        { min: 0, text: "Weak" },
      ],
    };

    const geodata = buildGeodata({
      nearestPower: { distanceKm: 2 },
      elevationMeters: 120,
    });

    const score = calculateProfileScore(geodata, profile);

    expect(score.total).toBe(90);
    expect(score.recommendation).toBe("Excellent");
  });

  test("buildHazardResilienceSummary exposes 7 weighted domains", () => {
    const geodata = buildGeodata({
      floodZone: {
        floodZone: "X",
        isSpecialFloodHazard: false,
        label: "Minimal",
        source: "fema",
      },
      hazards: {
        activeFireCount7d: 0,
        nearestFireKm: null,
      },
      seismicDesign: {
        pga: 0.03,
        ss: 0.2,
        s1: 0.05,
        siteClass: null,
        riskCategory: null,
        dataSource: "ASCE 7-22 via USGS",
      },
      climate: {
        windSpeedKph: 10,
        weatherRiskSummary: null,
        airQualityIndex: 40,
      },
      airQuality: {
        stationName: "Clean Air",
        pm25: 6,
        pm10: 12,
        aqiCategory: "Good",
        distanceKm: 3,
      },
      epaHazards: {
        superfundCount: 0,
        triCount: 0,
        nearestSuperfundName: null,
        nearestSuperfundDistanceKm: null,
      },
    });

    const summary = buildHazardResilienceSummary(geodata);

    expect(summary.domains).toHaveLength(7);
    expect(summary.domains.map((domain) => domain.domain)).toEqual([
      "seismic",
      "flood",
      "fire",
      "alerts",
      "weather",
      "air",
      "contamination",
    ]);
    expect(summary.compoundScore).toBe(92);
    expect(summary.worstDomain?.domain).toBe("alerts");
  });
});

describe("edge cases", () => {
  test("handles all-null direct scoring inputs", () => {
    expect(scoreTerrain(null, "cooling")).toBe(55);
    expect(scoreClimate(null, null, null, "cooling")).toBe(60);
    expect(scoreFromDistance(null, 2, 10, "near")).toBe(50);
    expect(scoreCountSignal(null, 4)).toBe(50);
  });

  test("handles an empty geodata object without throwing", () => {
    const emptyGeodata = buildGeodata({
      elevationMeters: null,
      nearestWaterBody: { distanceKm: null },
      nearestRoad: { distanceKm: null },
      nearestPower: { distanceKm: null },
      climate: {
        currentTempC: null,
        averageTempC: null,
        dailyHighTempC: null,
        dailyLowTempC: null,
        coolingDegreeDays: null,
        precipitationMm: null,
        windSpeedKph: null,
        airQualityIndex: null,
        weatherRiskSummary: null,
      },
      hazards: {
        earthquakeCount30d: null,
        strongestEarthquakeMagnitude30d: null,
        nearestEarthquakeKm: null,
        activeFireCount7d: null,
        nearestFireKm: null,
      },
      demographics: {
        countyName: null,
        stateCode: null,
        population: null,
        medianHouseholdIncome: null,
        medianHomeValue: null,
        geographicGranularity: "county",
        populationReferenceYear: null,
        incomeReferenceYear: null,
        incomeDefinition: null,
      },
      amenities: {
        schoolCount: null,
        healthcareCount: null,
        foodAndDrinkCount: null,
        transitStopCount: null,
        parkCount: null,
        trailheadCount: null,
        commercialCount: null,
      },
      broadband: null,
      floodZone: null,
      streamGauges: [],
      groundwater: { nearestWell: null },
      soilProfile: null,
      seismicDesign: null,
      climateHistory: null,
      solarResource: null,
      airQuality: null,
      epaHazards: null,
      hazardAlerts: null,
      weatherForecast: [],
      schoolContext: null,
      landClassification: [],
    });

    expect(() => buildFactorScores(emptyGeodata, DEFAULT_PROFILE)).not.toThrow();
    expect(() => buildHazardResilienceSummary(emptyGeodata)).not.toThrow();
  });

  test("keeps terrain scoring stable for negative elevation", () => {
    expect(scoreTerrain(-50, "buildability")).toBe(88);
  });

  test("keeps weather scoring bounded for extreme wind", () => {
    expect(scoreWeatherRisk(buildGeodata({ climate: { windSpeedKph: 1000, weatherRiskSummary: null } }))).toBeGreaterThanOrEqual(15);
    expect(scoreWeatherRisk(buildGeodata({ climate: { windSpeedKph: 1000, weatherRiskSummary: null } }))).toBeLessThanOrEqual(100);
  });
});
