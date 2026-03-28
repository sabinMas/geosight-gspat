import { DataTrend, GeodataResult } from "@/types";

function dominantLandCover(geodata: GeodataResult | null) {
  if (!geodata?.landClassification.length) {
    return null;
  }

  return [...geodata.landClassification].sort((a, b) => b.value - a.value)[0];
}

function formatNumber(value: number | null, suffix: string) {
  return value === null ? "Unavailable" : `${value}${suffix}`;
}

function formatSignedNumber(value: number | null, suffix: string) {
  return value === null ? "Unavailable" : `${value.toFixed(1)}${suffix}`;
}

export function buildLocationTrends(geodata: GeodataResult | null): DataTrend[] {
  if (!geodata) {
    return [
      {
        id: "trend-pending",
        label: "Location context",
        value: "Loading geodata",
        detail: "GeoSight is still assembling terrain, access, climate, and land-cover context for this place.",
        direction: "neutral",
        source: "derived",
      },
    ];
  }

  const topLandCover = dominantLandCover(geodata);
  const waterDistance = geodata.nearestWaterBody.distanceKm;
  const roadDistance = geodata.nearestRoad.distanceKm;
  const powerDistance = geodata.nearestPower.distanceKm;
  const averageTemp = geodata.climate.averageTempC;
  const currentTemp = geodata.climate.currentTempC;
  const highTemp = geodata.climate.dailyHighTempC;
  const lowTemp = geodata.climate.dailyLowTempC;
  const windSpeed = geodata.climate.windSpeedKph;
  const airQualityIndex = geodata.climate.airQualityIndex;
  const demographics = geodata.demographics;
  const earthquakes = geodata.hazards.earthquakeCount30d;
  const strongestEarthquake = geodata.hazards.strongestEarthquakeMagnitude30d;
  const nearestEarthquake = geodata.hazards.nearestEarthquakeKm;

  return [
    {
      id: "trend-terrain",
      label: "Terrain profile",
      value: formatNumber(geodata.elevationMeters, " m"),
      detail:
        geodata.elevationMeters === null
          ? "Elevation data is not yet available for this point."
          : "Useful for quick reads on slope complexity, exposure, and broad site character.",
      direction:
        geodata.elevationMeters !== null && geodata.elevationMeters < 400 ? "positive" : "watch",
      source: "live",
    },
    {
      id: "trend-water",
      label: "Water access",
      value: formatNumber(waterDistance, " km"),
      detail: `Nearest mapped water feature: ${geodata.nearestWaterBody.name}.`,
      direction: waterDistance !== null && waterDistance < 2 ? "positive" : "neutral",
      source: "live",
    },
    {
      id: "trend-access",
      label: "Road access",
      value: formatNumber(roadDistance, " km"),
      detail: `Nearest mapped road corridor: ${geodata.nearestRoad.name}.`,
      direction: roadDistance !== null && roadDistance < 3 ? "positive" : "neutral",
      source: "live",
    },
    {
      id: "trend-climate",
      label: "Weather snapshot",
      value:
        currentTemp === null ? "Unavailable" : `${currentTemp.toFixed(1)} C now`,
      detail:
        averageTemp === null
          ? "Current and forecast weather details are unavailable."
          : `Daily mean ${averageTemp.toFixed(1)} C, range ${formatSignedNumber(lowTemp, " C")} to ${formatSignedNumber(highTemp, " C")}, wind ${formatSignedNumber(windSpeed, " km/h")}, precipitation ${geodata.climate.precipitationMm ?? "unknown"} mm.`,
      direction: currentTemp !== null && currentTemp >= 8 && currentTemp <= 24 ? "positive" : "neutral",
      source: "live",
    },
    {
      id: "trend-air",
      label: "Air quality",
      value: airQualityIndex === null ? "Unavailable" : `AQI ${airQualityIndex}`,
      detail:
        airQualityIndex === null
          ? "Open-Meteo air-quality data is not available for this point."
          : "Current US AQI snapshot from Open-Meteo for the active point.",
      direction:
        airQualityIndex === null ? "watch" : airQualityIndex <= 50 ? "positive" : airQualityIndex <= 100 ? "neutral" : "watch",
      source: "live",
    },
    {
      id: "trend-land",
      label: "Dominant land cover",
      value: topLandCover ? topLandCover.label : "Unavailable",
      detail:
        topLandCover
          ? `${topLandCover.value}% of the current land-cover estimate is ${topLandCover.label.toLowerCase()}.`
          : "Land-cover classification has not been derived yet.",
      direction: topLandCover?.label.includes("Water") ? "watch" : "neutral",
      source: "live",
    },
    {
      id: "trend-power",
      label: "Infrastructure",
      value: formatNumber(powerDistance, " km"),
      detail: `Nearest mapped power infrastructure: ${geodata.nearestPower.name}.`,
      direction: powerDistance !== null && powerDistance < 5 ? "positive" : "neutral",
      source: "live",
    },
    {
      id: "trend-seismic",
      label: "Seismic activity",
      value:
        earthquakes === null ? "Unavailable" : `${earthquakes} events / 30d`,
      detail:
        earthquakes === null
          ? "Recent earthquake context is unavailable for this point."
          : earthquakes === 0
            ? "No mapped USGS earthquake events were recorded within 250 km over the last 30 days."
            : `Recent earthquakes within 250 km over the last 30 days. Strongest event M${strongestEarthquake?.toFixed(1) ?? "?"}; nearest event ${nearestEarthquake ?? "unknown"} km away.`,
      direction:
        strongestEarthquake !== null && strongestEarthquake >= 4.5
          ? "watch"
          : earthquakes !== null && earthquakes > 12
            ? "watch"
            : "neutral",
      source: "live",
    },
    {
      id: "trend-population",
      label: "County population",
      value:
        demographics.population === null
          ? "Unavailable"
          : demographics.population.toLocaleString(),
      detail:
        demographics.countyName === null
          ? "County demographics are not available for this point yet."
          : `${demographics.countyName} population from ACS 5-year Census data.`,
      direction: demographics.population !== null ? "neutral" : "watch",
      source: "live",
    },
    {
      id: "trend-income",
      label: "Median income",
      value:
        demographics.medianHouseholdIncome === null
          ? "Unavailable"
          : `$${demographics.medianHouseholdIncome.toLocaleString()}`,
      detail:
        demographics.medianHomeValue === null
          ? "Household income is available, but housing value data is not."
          : `County median home value: $${demographics.medianHomeValue.toLocaleString()}.`,
      direction: demographics.medianHouseholdIncome !== null ? "neutral" : "watch",
      source: "live",
    },
  ];
}
