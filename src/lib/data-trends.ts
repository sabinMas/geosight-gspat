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
      source: "derived",
    },
    {
      id: "trend-water",
      label: "Water access",
      value: formatNumber(waterDistance, " km"),
      detail: `Nearest mapped water feature: ${geodata.nearestWaterBody.name}.`,
      direction: waterDistance !== null && waterDistance < 2 ? "positive" : "neutral",
      source: "derived",
    },
    {
      id: "trend-access",
      label: "Road access",
      value: formatNumber(roadDistance, " km"),
      detail: `Nearest mapped road corridor: ${geodata.nearestRoad.name}.`,
      direction: roadDistance !== null && roadDistance < 3 ? "positive" : "neutral",
      source: "derived",
    },
    {
      id: "trend-climate",
      label: "Climate signal",
      value: averageTemp === null ? "Unavailable" : `${averageTemp.toFixed(1)} C avg`,
      detail:
        geodata.climate.coolingDegreeDays === null
          ? "Cooling degree days are unavailable."
          : `${geodata.climate.coolingDegreeDays} cooling degree days with ${geodata.climate.precipitationMm ?? "unknown"} mm precipitation.`,
      direction: averageTemp !== null && averageTemp < 18 ? "positive" : "neutral",
      source: "derived",
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
      source: "derived",
    },
    {
      id: "trend-power",
      label: "Infrastructure",
      value: formatNumber(powerDistance, " km"),
      detail: `Nearest mapped power infrastructure: ${geodata.nearestPower.name}.`,
      direction: powerDistance !== null && powerDistance < 5 ? "positive" : "neutral",
      source: "derived",
    },
  ];
}
