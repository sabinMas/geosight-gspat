import { buildSourceMeta } from "@/lib/source-metadata";
import { formatDistanceKm, getNearestStreamGauge } from "@/lib/stream-gauges";
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
        detail:
          "GeoSight is still assembling terrain, access, climate, schools, and land-cover context for this place.",
        direction: "neutral",
        source: buildSourceMeta({
          id: "pending",
          label: "Location context",
          provider: "GeoSight",
          status: "derived",
          freshness: "Pending request",
          coverage: "Depends on active source pipelines",
          confidence: "Waiting for live source responses.",
          lastUpdated: null,
        }),
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
  const activeFireCount = geodata.hazards.activeFireCount7d;
  const nearestFireKm = geodata.hazards.nearestFireKm;
  const amenities = geodata.amenities;
  const broadband = geodata.broadband;
  const floodZone = geodata.floodZone;
  const nearestGauge = getNearestStreamGauge(geodata);
  const airStation = geodata.airQuality;
  const epaHazards = geodata.epaHazards;
  const serviceCount =
    (amenities.schoolCount ?? 0) +
    (amenities.healthcareCount ?? 0) +
    (amenities.transitStopCount ?? 0);
  const activityCount =
    (amenities.commercialCount ?? 0) + (amenities.foodAndDrinkCount ?? 0);

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
      source: geodata.sources.elevation,
    },
    {
      id: "trend-water",
      label: "Water access",
      value: formatNumber(waterDistance, " km"),
      detail: `Nearest mapped water feature: ${geodata.nearestWaterBody.name}.`,
      direction: waterDistance !== null && waterDistance < 2 ? "positive" : "neutral",
      source: geodata.sources.infrastructure,
    },
    {
      id: "trend-water-gauge",
      label: "Stream gauge",
      value:
        !nearestGauge
          ? "Unavailable"
          : nearestGauge.dischargeCfs === null
            ? nearestGauge.siteName
            : `${nearestGauge.dischargeCfs.toLocaleString()} cfs`,
      detail:
        !nearestGauge
          ? "No nearby live USGS discharge gauge was returned within the current search radius."
          : `${nearestGauge.siteName} is ${formatDistanceKm(nearestGauge.distanceKm)} away${
              nearestGauge.drainageAreaSqMi === null
                ? "."
                : ` with ${nearestGauge.drainageAreaSqMi.toLocaleString()} sq mi drainage area.`
            }`,
      direction:
        nearestGauge !== null &&
        nearestGauge.dischargeCfs !== null &&
        nearestGauge.dischargeCfs >= 1_000
          ? "positive"
          : "neutral",
      source: geodata.sources.water,
    },
    {
      id: "trend-access",
      label: "Road access",
      value: formatNumber(roadDistance, " km"),
      detail: `Nearest mapped road corridor: ${geodata.nearestRoad.name}.`,
      direction: roadDistance !== null && roadDistance < 3 ? "positive" : "neutral",
      source: geodata.sources.infrastructure,
    },
    {
      id: "trend-climate",
      label: "Weather snapshot",
      value: currentTemp === null ? "Unavailable" : `${currentTemp.toFixed(1)} C now`,
      detail:
        averageTemp === null
          ? "Current and forecast weather details are unavailable."
          : `Daily mean ${averageTemp.toFixed(1)} C, range ${formatSignedNumber(
              lowTemp,
              " C",
            )} to ${formatSignedNumber(highTemp, " C")}, wind ${formatSignedNumber(
              windSpeed,
              " km/h",
            )}, precipitation ${geodata.climate.precipitationMm ?? "unknown"} mm.`,
      direction:
        currentTemp !== null && currentTemp >= 8 && currentTemp <= 24 ? "positive" : "neutral",
      source: geodata.sources.climate,
    },
    ...(geodata.climate.weatherRiskSummary
      ? [
          {
            id: "trend-weather-risk",
            label: "Weather risk",
            value: geodata.climate.weatherRiskSummary,
            detail:
              "Open-Meteo forecast risk summary built from current and short-range WMO weather codes.",
            direction: "watch" as const,
            source: geodata.sources.climate,
          },
        ]
      : []),
    {
      id: "trend-air",
      label: "Air quality",
      value:
        airStation
          ? airStation.aqiCategory
          : airQualityIndex === null
            ? "Unavailable"
            : `AQI ${airQualityIndex}`,
      detail:
        airStation
          ? `${airStation.stationName} reports PM2.5 ${airStation.pm25 ?? "--"} ug/m3 and PM10 ${airStation.pm10 ?? "--"} ug/m3.`
          : airQualityIndex === null
            ? "OpenAQ station and Open-Meteo AQI data are not available for this point."
            : "Current US AQI snapshot from Open-Meteo for the active point.",
      direction:
        airStation
          ? airStation.aqiCategory === "Good"
            ? "positive"
            : airStation.aqiCategory === "Moderate"
              ? "neutral"
              : "watch"
          : airQualityIndex === null
          ? "watch"
          : airQualityIndex <= 50
            ? "positive"
            : airQualityIndex <= 100
              ? "neutral"
              : "watch",
      source: airStation ? geodata.sources.airQuality : geodata.sources.climate,
    },
    {
      id: "trend-broadband",
      label: "Broadband",
      value:
        broadband
          ? broadband.kind === "regional_household_baseline"
            ? `${broadband.fixedBroadbandCoveragePercent === null ? "--" : `${broadband.fixedBroadbandCoveragePercent.toFixed(1)}%`} fixed households`
            : `${broadband.providerCount} providers`
          : geodata.sources.broadband.status === "unavailable"
            ? "Unsupported"
            : "Unavailable",
      detail:
        broadband
          ? broadband.kind === "regional_household_baseline"
            ? `${broadband.regionLabel} country-level Eurostat baseline: ${
                broadband.fixedBroadbandCoveragePercent === null
                  ? "fixed broadband share unavailable"
                  : `${broadband.fixedBroadbandCoveragePercent.toFixed(1)}% fixed broadband`
              } / ${
                broadband.mobileBroadbandCoveragePercent === null
                  ? "mobile broadband share unavailable"
                  : `${broadband.mobileBroadbandCoveragePercent.toFixed(1)}% mobile broadband`
              } (${broadband.referenceYear ?? "latest available year"}).`
            : `Up to ${broadband.maxDownloadSpeed || "--"} Mbps down / ${broadband.maxUploadSpeed || "--"} Mbps up with ${broadband.technologies.join(", ") || "unclassified"} technologies.`
          : "FCC broadband availability was not returned for this point.",
      direction:
        broadband?.kind === "regional_household_baseline"
          ? (broadband.fixedBroadbandCoveragePercent ?? 0) >= 85
            ? "positive"
            : broadband
              ? "neutral"
              : "watch"
          : broadband && broadband.maxDownloadSpeed >= 300
            ? "positive"
            : broadband
              ? "neutral"
              : "watch",
      source: geodata.sources.broadband,
    },
    {
      id: "trend-flood",
      label: "Flood zone",
      value: floodZone?.floodZone ?? "Unavailable",
      detail: floodZone?.label ?? "FEMA flood-zone data is not available for this point.",
      direction:
        floodZone?.isSpecialFloodHazard
          ? "watch"
          : floodZone?.floodZone === "X"
            ? "positive"
            : "neutral",
      source: geodata.sources.floodZone,
    },
    {
      id: "trend-contamination",
      label: "Contamination screening",
      value:
        epaHazards === null
          ? "Unavailable"
          : `${epaHazards.superfundCount} Superfund / ${epaHazards.triCount} TRI`,
      detail:
        epaHazards === null
          ? "EPA contamination screening is not available for this point."
          : epaHazards.nearestSuperfundDistanceKm === null
            ? "No EPA-screened Superfund or TRI site was returned within roughly 50 km."
            : `Nearest Superfund site ${epaHazards.nearestSuperfundName ?? "unknown"} at ${formatDistanceKm(epaHazards.nearestSuperfundDistanceKm)}.`,
      direction:
        epaHazards?.nearestSuperfundDistanceKm !== null &&
        (epaHazards?.nearestSuperfundDistanceKm ?? Number.POSITIVE_INFINITY) <= 10
          ? "watch"
          : epaHazards && epaHazards.superfundCount === 0 && epaHazards.triCount === 0
            ? "positive"
            : "neutral",
      source: geodata.sources.epaHazards,
    },
    {
      id: "trend-school",
      label: "School context",
      value:
        geodata.schoolContext?.score === null || geodata.schoolContext?.score === undefined
          ? geodata.schoolContext?.coverageStatus === "outside_us"
            ? "Limited outside US"
            : "Unavailable"
          : `${geodata.schoolContext.score} / 100`,
      detail: geodata.schoolContext
        ? `${geodata.schoolContext.band}. ${geodata.schoolContext.explanation}`
        : "School context is not available for this point yet.",
      direction:
        geodata.schoolContext?.score !== null && geodata.schoolContext?.score !== undefined
          ? geodata.schoolContext.score >= 70
            ? "positive"
            : geodata.schoolContext.score >= 55
              ? "neutral"
              : "watch"
          : "watch",
      source: geodata.sources.school,
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
      source: geodata.sources.landClassification,
    },
    {
      id: "trend-power",
      label: "Infrastructure",
      value: formatNumber(powerDistance, " km"),
      detail: `Nearest mapped power infrastructure: ${geodata.nearestPower.name}.`,
      direction: powerDistance !== null && powerDistance < 5 ? "positive" : "neutral",
      source: geodata.sources.infrastructure,
    },
    {
      id: "trend-seismic",
      label: "Seismic activity",
      value: earthquakes === null ? "Unavailable" : `${earthquakes} events / 30d`,
      detail:
        earthquakes === null
          ? "Recent earthquake context is unavailable for this point."
          : earthquakes === 0
            ? "No mapped USGS earthquake events were recorded within 250 km over the last 30 days."
            : `Recent earthquakes within 250 km over the last 30 days. Strongest event M${
                strongestEarthquake?.toFixed(1) ?? "?"
              }; nearest event ${nearestEarthquake ?? "unknown"} km away.`,
      direction:
        strongestEarthquake !== null && strongestEarthquake >= 4.5
          ? "watch"
          : earthquakes !== null && earthquakes > 12
            ? "watch"
            : "neutral",
      source: geodata.sources.hazards,
    },
    {
      id: "trend-fire",
      label: "Active fires (7d)",
      value:
        activeFireCount === null
          ? "Unavailable"
          : activeFireCount === 0
            ? "None detected"
            : `${activeFireCount} detections`,
      detail:
        activeFireCount === null
          ? "NASA FIRMS VIIRS fire detections are unavailable for this point."
          : activeFireCount === 0
            ? "No VIIRS fire detections were returned within the active analysis region over the last 7 days."
            : `VIIRS satellite fire detections in the last 7 days. Nearest detection ${
                nearestFireKm === null ? "distance unavailable" : `${nearestFireKm.toFixed(1)} km away`
              }.`,
      direction: activeFireCount !== null && activeFireCount > 10 ? "watch" : "neutral",
      source: geodata.sources.hazardFire,
    },
    {
      id: "trend-population",
      label:
        demographics.geographicGranularity === "country"
          ? "Country population"
          : "County population",
      value:
        demographics.population === null
          ? "Unavailable"
          : demographics.population.toLocaleString(),
      detail:
        demographics.countyName === null
          ? "Demographic coverage is not available for this point yet."
          : demographics.geographicGranularity === "country"
            ? `${demographics.countyName} population from ${
                geodata.sources.demographics.provider
              }${demographics.populationReferenceYear ? ` (${demographics.populationReferenceYear})` : ""}.`
            : `${demographics.countyName} population from ACS 5-year Census data.`,
      direction: demographics.population !== null ? "neutral" : "watch",
      source: geodata.sources.demographics,
    },
    {
      id: "trend-services",
      label: "Community services",
      value:
        amenities.schoolCount === null ? "Unavailable" : `${serviceCount} key services`,
      detail:
        amenities.schoolCount === null
          ? "Mapped school and healthcare coverage is unavailable for this point."
          : `${amenities.schoolCount} schools, ${amenities.healthcareCount} healthcare sites, ${
              amenities.transitStopCount
            } transit stops, and ${amenities.parkCount} parks in the active analysis area.`,
      direction:
        amenities.schoolCount !== null && serviceCount >= 8 ? "positive" : "neutral",
      source: geodata.sources.amenities,
    },
    {
      id: "trend-income",
      label:
        demographics.geographicGranularity === "country"
          ? "Income context"
          : "Median income",
      value:
        demographics.medianHouseholdIncome === null
          ? "Unavailable"
          : `$${demographics.medianHouseholdIncome.toLocaleString()}`,
      detail:
        demographics.geographicGranularity === "country"
          ? `${demographics.incomeDefinition ?? "Country-level income context"}${
              demographics.incomeReferenceYear ? ` (${demographics.incomeReferenceYear})` : ""
            }.`
          : demographics.medianHomeValue === null
            ? "Household income is available, but housing value data is not."
            : `County median home value: $${demographics.medianHomeValue.toLocaleString()}.`,
      direction: demographics.medianHouseholdIncome !== null ? "neutral" : "watch",
      source: geodata.sources.demographics,
    },
    {
      id: "trend-activity",
      label: "Mapped activity",
      value:
        amenities.commercialCount === null ? "Unavailable" : `${activityCount} venues`,
      detail:
        amenities.commercialCount === null
          ? "Mapped commercial and food activity is unavailable for this point."
          : `${amenities.commercialCount} commercial venues, ${
              amenities.foodAndDrinkCount
            } food/drink venues, and ${
              amenities.trailheadCount
            } trailheads or recreation access points in the active area.`,
      direction:
        amenities.commercialCount !== null && activityCount >= 12 ? "positive" : "neutral",
      source: geodata.sources.amenities,
    },
  ];
}
