import { DEFAULT_PROFILE } from "@/lib/profiles";
import { formatDistanceKm, getNearestStreamGauge } from "@/lib/stream-gauges";
import { clamp } from "@/lib/utils";
import {
  GdacsAlertSummary,
  GeodataResult,
  HazardDomainScore,
  HazardResilienceSummary,
  HazardRiskTier,
  LandCoverBucket,
  MissionProfile,
  ScoringFactor,
  SiteFactorScore,
  SiteScore,
} from "@/types";

type DistanceSource = "water" | "power" | "road";

export function scoreCountSignal(
  count: number | null,
  idealCount: number,
  maxUsefulCount: number = idealCount * 2,
) {
  if (count === null) {
    return 50;
  }

  if (count <= 0) {
    return 15;
  }

  if (count >= idealCount) {
    return 100;
  }

  const effectiveIdeal = Math.max(idealCount, 1);
  const effectiveMax = Math.max(maxUsefulCount, effectiveIdeal);
  const ratio = Math.min(count, effectiveIdeal) / effectiveIdeal;
  const scaled = 15 + ratio * 85;

  return clamp(
    Math.round(count >= effectiveMax ? 100 : scaled),
    15,
    100,
  );
}

export function scoreFromDistance(
  distanceKm: number | null,
  idealKm: number,
  cutoffKm: number,
  direction: "near" | "far" = "near",
) {
  if (distanceKm === null) {
    return 50;
  }

  if (direction === "far") {
    if (distanceKm >= idealKm) {
      return 100;
    }

    if (distanceKm <= cutoffKm) {
      return 15;
    }

    const ratio = (distanceKm - cutoffKm) / (idealKm - cutoffKm);
    return clamp(Math.round(ratio * 100), 15, 100);
  }

  if (distanceKm <= idealKm) {
    return 100;
  }

  if (distanceKm >= cutoffKm) {
    return 15;
  }

  const ratio = 1 - (distanceKm - idealKm) / (cutoffKm - idealKm);
  return clamp(Math.round(ratio * 100), 15, 100);
}

export function scoreTerrain(elevation: number | null, mode: string = "cooling") {
  if (elevation === null) {
    return 55;
  }

  if (mode === "buildability") {
    if (elevation < 140) {
      return 88;
    }
    if (elevation < 320) {
      return 72;
    }
    if (elevation < 550) {
      return 50;
    }
    return 30;
  }

  if (mode === "terrainVariety") {
    if (elevation < 80) {
      return 42;
    }
    if (elevation < 220) {
      return 70;
    }
    if (elevation < 550) {
      return 88;
    }
    if (elevation < 900) {
      return 76;
    }
    return 55;
  }

  if (elevation < 120) {
    return 90;
  }

  if (elevation < 260) {
    return 74;
  }

  if (elevation < 500) {
    return 48;
  }

  return 30;
}

function scoreDischargeVolume(dischargeCfs: number | null) {
  if (dischargeCfs === null) {
    return 60;
  }

  if (dischargeCfs >= 10_000) {
    return 100;
  }
  if (dischargeCfs >= 3_000) {
    return 90;
  }
  if (dischargeCfs >= 1_000) {
    return 78;
  }
  if (dischargeCfs >= 250) {
    return 64;
  }
  if (dischargeCfs >= 50) {
    return 48;
  }

  return 28;
}

export function scoreClimate(
  tempC: number | null,
  coolingDegreeDays: number | null,
  precipitationMm: number | null,
  mode: string = "cooling",
) {
  if (tempC === null || coolingDegreeDays === null) {
    return 60;
  }

  if (mode === "outdoor") {
    const tempScore = clamp(100 - Math.abs(tempC - 15) * 7, 30, 100);
    const precipitationScore =
      precipitationMm === null ? 65 : clamp(100 - precipitationMm / 12, 25, 100);
    return Math.round(tempScore * 0.6 + precipitationScore * 0.4);
  }

  const tempScore = clamp(100 - Math.abs(tempC - 12) * 8, 25, 100);
  const cddScore = clamp(100 - coolingDegreeDays / 4, 20, 100);
  return Math.round(tempScore * 0.55 + cddScore * 0.45);
}

function landCoverLookup(classification: LandCoverBucket[]) {
  return Object.fromEntries(
    classification.map((bucket) => [bucket.label.toLowerCase(), bucket.value]),
  );
}

export function scoreLandCover(
  classification: LandCoverBucket[],
  mode: string = "developed",
) {
  if (!classification.length) {
    return 50;
  }

  const lookup = landCoverLookup(classification);

  if (mode === "vegetation") {
    const vegetation =
      (lookup["vegetation"] ?? 0) +
      (lookup["forest"] ?? 0) +
      (lookup["agricultural"] ?? 0) * 0.3;
    const constrained =
      (lookup["urban"] ?? 0) * 0.8 +
      (lookup["barren"] ?? 0) * 0.4 +
      (lookup["barren/industrial"] ?? 0) * 0.5;
    return clamp(Math.round(38 + vegetation * 0.9 - constrained * 0.35), 15, 100);
  }

  if (mode === "residential") {
    const favorable =
      (lookup["urban"] ?? 0) * 0.65 +
      (lookup["vegetation"] ?? 0) * 0.4 +
      (lookup["barren"] ?? 0) * 0.3;
    const constrained =
      (lookup["water"] ?? 0) +
      (lookup["forest"] ?? 0) * 0.55 +
      (lookup["barren/industrial"] ?? 0) * 0.35;
    return clamp(Math.round(52 + favorable * 0.6 - constrained * 0.45), 15, 100);
  }

  if (mode === "commercial") {
    const favorable =
      (lookup["urban"] ?? 0) +
      (lookup["barren/industrial"] ?? 0) * 0.9 +
      (lookup["barren"] ?? 0) * 0.5;
    const constrained =
      (lookup["water"] ?? 0) +
      (lookup["forest"] ?? 0) * 0.6 +
      (lookup["agricultural"] ?? 0) * 0.4;
    return clamp(Math.round(50 + favorable * 0.7 - constrained * 0.5), 15, 100);
  }

  const preferred =
    (lookup["barren"] ?? 0) +
    (lookup["barren/industrial"] ?? 0) +
    (lookup["urban"] ?? 0) * 0.8;
  const constrained =
    (lookup["vegetation"] ?? 0) * 0.8 +
    (lookup["forest"] ?? 0) +
    (lookup["agricultural"] ?? 0) * 0.9 +
    (lookup["water"] ?? 0) * 0.7;

  return clamp(Math.round(60 + preferred * 0.8 - constrained * 0.45), 10, 100);
}

function getDistanceReading(geodata: GeodataResult, source: DistanceSource) {
  if (source === "water") {
    return geodata.nearestWaterBody;
  }
  if (source === "power") {
    return geodata.nearestPower;
  }
  return geodata.nearestRoad;
}

function dominantLandCover(classification: LandCoverBucket[]) {
  if (!classification.length) {
    return null;
  }

  return [...classification].sort((a, b) => b.value - a.value)[0];
}

export function scoreBroadbandAvailability(
  geodata: GeodataResult,
  mode: "data_center" | "residential" = "residential",
) {
  if (geodata.sources.broadband.status === "unavailable") {
    return 60;
  }

  const broadband = geodata.broadband;
  if (!broadband) {
    return 58;
  }

  if (broadband.kind === "regional_household_baseline") {
    const fixedCoverage = broadband.fixedBroadbandCoveragePercent ?? 0;
    const mobileCoverage = broadband.mobileBroadbandCoveragePercent ?? 0;
    const fixedScore = clamp(Math.round((fixedCoverage / 100) * 100), 20, 100);
    const mobileScore = clamp(Math.round((mobileCoverage / 100) * 100), 20, 100);

    return mode === "data_center"
      ? clamp(Math.round(fixedScore * 0.8 + mobileScore * 0.2), 20, 100)
      : clamp(Math.round(fixedScore * 0.65 + mobileScore * 0.35), 20, 100);
  }

  const downloadMbps = broadband.maxDownloadSpeed;
  const uploadMbps = broadband.maxUploadSpeed;
  const providerCount = broadband.providerCount;
  const technologyBonus = broadband.hasFiber
    ? 8
    : broadband.technologies.includes("cable")
      ? 4
      : broadband.technologies.includes("fixed_wireless")
        ? -2
        : 0;

  if (mode === "data_center") {
    const downloadScore =
      downloadMbps > 0 ? clamp(Math.round((downloadMbps / 1_000) * 100), 25, 100) : 60;
    const uploadScore =
      uploadMbps > 0 ? clamp(Math.round((uploadMbps / 500) * 100), 20, 100) : 55;
    const providerScore = scoreCountSignal(providerCount, 3, 5);

    return clamp(
      Math.round(downloadScore * 0.45 + uploadScore * 0.25 + providerScore * 0.3 + technologyBonus),
      15,
      100,
    );
  }

  const downloadScore =
    downloadMbps > 0 ? clamp(Math.round((downloadMbps / 300) * 100), 25, 100) : 60;
  const uploadScore =
    uploadMbps > 0 ? clamp(Math.round((uploadMbps / 40) * 100), 25, 100) : 58;
  const providerScore = scoreCountSignal(providerCount, 2, 4);

  return clamp(
    Math.round(downloadScore * 0.45 + uploadScore * 0.2 + providerScore * 0.35 + technologyBonus),
    15,
    100,
  );
}

export function scoreFloodRisk(geodata: GeodataResult) {
  if (geodata.sources.floodZone.status === "unavailable") {
    return 60;
  }

  const floodZone = geodata.floodZone;
  if (!floodZone?.floodZone) {
    return 58;
  }

  if (floodZone.floodZone === "X") {
    return 100;
  }

  if (floodZone.isSpecialFloodHazard) {
    return 0;
  }

  if (
    floodZone.floodZone === "D" ||
    floodZone.floodZone === "B" ||
    floodZone.floodZone === "C"
  ) {
    return 65;
  }

  return 75;
}

export function scoreAirQualityContext(geodata: GeodataResult) {
  if (geodata.airQuality) {
    switch (geodata.airQuality.aqiCategory) {
      case "Good":
        return 94;
      case "Moderate":
        return 78;
      case "Unhealthy for Sensitive Groups":
        return 58;
      case "Unhealthy":
        return 34;
      case "Very Unhealthy":
        return 18;
      case "Hazardous":
        return 10;
      default:
        return 60;
    }
  }

  const openMeteoAqi = geodata.climate.airQualityIndex;
  if (openMeteoAqi === null) {
    return 60;
  }

  if (openMeteoAqi <= 50) {
    return 88;
  }
  if (openMeteoAqi <= 100) {
    return 72;
  }
  if (openMeteoAqi <= 150) {
    return 52;
  }
  if (openMeteoAqi <= 200) {
    return 32;
  }

  return 18;
}

export function scoreContaminationRisk(geodata: GeodataResult) {
  if (geodata.sources.epaHazards.status === "unavailable") {
    return 60;
  }

  const hazards = geodata.epaHazards;
  if (!hazards) {
    return 58;
  }

  const superfundPenalty = Math.min(hazards.superfundCount * 10, 35);
  const triPenalty = Math.min(hazards.triCount * 3, 15);
  const proximityPenalty =
    hazards.nearestSuperfundDistanceKm !== null && hazards.nearestSuperfundDistanceKm <= 10
      ? 28
      : 0;

  return clamp(Math.round(95 - superfundPenalty - triPenalty - proximityPenalty), 15, 100);
}

export function scoreWaterAccess(geodata: GeodataResult) {
  const waterDistance = geodata.nearestWaterBody.distanceKm;
  const nearestGauge = getNearestStreamGauge(geodata);

  const mappedWaterScore = scoreFromDistance(waterDistance, 1, 15);
  const gaugeDistanceScore = nearestGauge
    ? scoreFromDistance(nearestGauge.distanceKm, 4, 35)
    : 60;
  const dischargeScore = scoreDischargeVolume(nearestGauge?.dischargeCfs ?? null);

  return clamp(
    Math.round(mappedWaterScore * 0.45 + gaugeDistanceScore * 0.25 + dischargeScore * 0.3),
    15,
    100,
  );
}

function scoreGroundwaterDepth(
  geodata: GeodataResult,
  mode: "data_center" | "residential" = "data_center",
) {
  const currentLevelFt = geodata.groundwater.nearestWell?.currentLevelFt;
  if (currentLevelFt === null || currentLevelFt === undefined) {
    return 55;
  }

  if (mode === "residential") {
    if (currentLevelFt >= 10 && currentLevelFt <= 40) {
      return 90;
    }
    if (currentLevelFt > 40 && currentLevelFt <= 80) {
      return 70;
    }
    return 50;
  }

  if (currentLevelFt > 50) {
    return 100;
  }
  if (currentLevelFt >= 30) {
    return 80;
  }
  if (currentLevelFt >= 15) {
    return 60;
  }
  return 40;
}

function getHydrologicGroupCode(group: string | null) {
  if (!group) {
    return null;
  }

  return group.toUpperCase().match(/[ABCD]/)?.[0] ?? null;
}

function scoreSoilBuildability(geodata: GeodataResult) {
  const soil = geodata.soilProfile;
  if (!soil) {
    return 50;
  }

  const hydrologicGroup = getHydrologicGroupCode(soil.hydrologicGroup);
  const drainageClass = soil.drainageClass?.toLowerCase() ?? "";

  if (hydrologicGroup === "A" && drainageClass.includes("well drained")) {
    return 95;
  }
  if (hydrologicGroup === "B" && drainageClass.includes("moderately well")) {
    return 80;
  }
  if (hydrologicGroup === "C") {
    return 55;
  }
  if (
    hydrologicGroup === "D" &&
    (drainageClass.includes("poorly drained") || drainageClass.includes("very poorly"))
  ) {
    return 30;
  }
  if (hydrologicGroup === "A") {
    return 88;
  }
  if (hydrologicGroup === "B") {
    return 72;
  }
  if (hydrologicGroup === "D") {
    return 35;
  }
  if (drainageClass.includes("poorly drained")) {
    return 40;
  }

  return 60;
}

function scoreHazardAlerts(hazardAlerts: GdacsAlertSummary | null): number {
  if (hazardAlerts === null) {
    return 70;
  }

  if (hazardAlerts.redCurrentAlerts > 0) {
    return 25;
  }

  if (hazardAlerts.elevatedCurrentAlerts > 0) {
    return 50;
  }

  if (hazardAlerts.totalCurrentAlerts > 10) {
    return 65;
  }

  return 85;
}

export function scoreSeismicRisk(geodata: GeodataResult) {
  const pga = geodata.seismicDesign?.pga;
  if (pga === null || pga === undefined) {
    return 60;
  }

  if (pga < 0.05) {
    return 95;
  }
  if (pga < 0.15) {
    return 80;
  }
  if (pga <= 0.4) {
    return 55;
  }
  return 30;
}

function scoreCustomMetric(
  geodata: GeodataResult,
  metric: string,
  params: ScoringFactor["params"] = {},
) {
  const roadDistance = geodata.nearestRoad.distanceKm;
  const powerDistance = geodata.nearestPower.distanceKm;
  const topLandCover = dominantLandCover(geodata.landClassification);
  const urbanScore = scoreLandCover(geodata.landClassification, "commercial");
  const vegetationScore = scoreLandCover(geodata.landClassification, "vegetation");
  const amenitySignals = geodata.amenities;

  switch (metric) {
    case "waterAccess":
      return scoreWaterAccess(geodata);
    case "terrainVariety":
      return scoreTerrain(geodata.elevationMeters, "terrainVariety");
    case "remoteness":
      return Math.round(
        scoreFromDistance(roadDistance, 6, 0.7, "far") * 0.75 +
          scoreCountSignal(amenitySignals.trailheadCount, 4, 10) * 0.25,
      );
    case "trailAccess":
      // Primary signal: OSM-mapped trailheads and named hiking paths in the area.
      // Secondary: road proximity, since vehicular access is still needed to reach most trailheads.
      return Math.round(
        scoreCountSignal(amenitySignals.trailheadCount, 3, 12) * 0.65 +
          scoreFromDistance(roadDistance, 2, 16) * 0.35,
      );
    case "schoolAccess":
      return geodata.schoolContext?.score ?? 50;
    case "floodRisk":
      return scoreFloodRisk(geodata);
    case "groundwaterDepth":
      return scoreGroundwaterDepth(
        geodata,
        String(params.mode ?? "data_center") === "residential"
          ? "residential"
          : "data_center",
      );
    case "soilBuildability":
      return scoreSoilBuildability(geodata);
    case "seismicRisk":
      return scoreSeismicRisk(geodata);
    case "broadbandConnectivity":
      return scoreBroadbandAvailability(
        geodata,
        String(params.mode ?? "residential") === "data_center" ? "data_center" : "residential",
      );
    case "airQuality":
      return scoreAirQualityContext(geodata);
    case "contaminationRisk":
      return scoreContaminationRisk(geodata);
    case "hazardAlerts":
      return scoreHazardAlerts(geodata.hazardAlerts);
    case "amenities":
      return Math.round(
        scoreCountSignal(
          (amenitySignals.foodAndDrinkCount ?? 0) +
            (amenitySignals.transitStopCount ?? 0) +
            (amenitySignals.parkCount ?? 0),
          12,
          28,
        ) * 0.65 +
          scoreFromDistance(roadDistance, 1.5, 12) * 0.2 +
          urbanScore * 0.15,
      );
    case "commercialDemand":
      return Math.round(
        scoreCountSignal(
          (amenitySignals.commercialCount ?? 0) + (amenitySignals.foodAndDrinkCount ?? 0),
          18,
          40,
        ) * 0.55 +
          scoreFromDistance(roadDistance, 1.2, 12) * 0.2 +
          urbanScore * 0.25,
      );
    case "commercialDensity":
      return Math.round(
        scoreCountSignal(amenitySignals.commercialCount, 12, 28) * 0.55 +
          urbanScore * 0.2 +
          scoreFromDistance(powerDistance, 2, 18) * 0.25,
      );
    case "landCost":
      return Math.round(
        scoreFromDistance(roadDistance, 2.5, 16) * 0.45 +
          scoreLandCover(geodata.landClassification, "commercial") * 0.25 +
          scoreFromDistance(powerDistance, 3.5, 20) * 0.3,
      );
    default:
      return topLandCover?.label.toLowerCase().includes("water") ? 40 : vegetationScore;
  }
}

function buildFactorDetail(geodata: GeodataResult, factor: ScoringFactor) {
  if (factor.scoreFn === "distance") {
    const reading = getDistanceReading(geodata, factor.params.source as DistanceSource);
    return `${reading.name} at ${
      reading.distanceKm === null ? "unknown distance" : `${reading.distanceKm.toFixed(1)} km`
    }.`;
  }

  if (factor.scoreFn === "elevation") {
    return geodata.elevationMeters === null
      ? "Elevation unavailable."
      : `Elevation ${geodata.elevationMeters} m.`;
  }

  if (factor.scoreFn === "climate") {
    return `Avg ${geodata.climate.averageTempC ?? "?"} C, CDD ${geodata.climate.coolingDegreeDays ?? "?"}, precipitation ${geodata.climate.precipitationMm ?? "?"} mm.`;
  }

  if (factor.scoreFn === "landcover") {
    const dominant = dominantLandCover(geodata.landClassification);
    return dominant
      ? `Dominant cover: ${dominant.label} (${dominant.value}%).`
      : "Land cover unavailable.";
  }

  if (factor.scoreFn === "custom") {
    switch (String(factor.params.metric ?? "")) {
      case "waterAccess": {
        const nearestGauge = getNearestStreamGauge(geodata);
        if (!nearestGauge) {
          return `Nearest mapped water feature ${geodata.nearestWaterBody.name} at ${
            geodata.nearestWaterBody.distanceKm === null
              ? "unknown distance"
              : formatDistanceKm(geodata.nearestWaterBody.distanceKm)
          }; no nearby USGS discharge gauge in range.`;
        }

        return `${geodata.nearestWaterBody.name} at ${
          geodata.nearestWaterBody.distanceKm === null
            ? "unknown distance"
            : formatDistanceKm(geodata.nearestWaterBody.distanceKm)
        }; nearest USGS gauge ${nearestGauge.siteName} (${formatDistanceKm(nearestGauge.distanceKm)}) reporting ${
          nearestGauge.dischargeCfs === null
            ? "unknown discharge"
            : `${nearestGauge.dischargeCfs.toLocaleString()} cfs`
        }.`;
      }
      case "schoolAccess":
        if (!geodata.schoolContext) {
          return "School context unavailable.";
        }
        if (geodata.schoolContext.coverageStatus === "outside_us") {
          return "School intelligence is currently US-first and unsupported for this location.";
        }
        return geodata.schoolContext.explanation;
      case "floodRisk":
        return geodata.floodZone
          ? geodata.floodZone.label
          : "FEMA flood-zone context unavailable.";
      case "groundwaterDepth":
        return geodata.groundwater.nearestWell
          ? `${geodata.groundwater.nearestWell.siteName} at ${formatDistanceKm(geodata.groundwater.nearestWell.distanceKm)} reports water ${geodata.groundwater.nearestWell.currentLevelFt === null ? "level unavailable" : `${geodata.groundwater.nearestWell.currentLevelFt.toFixed(1)} ft below land surface`}.`
          : "Groundwater monitoring well data unavailable.";
      case "soilBuildability":
        return geodata.soilProfile
          ? `${geodata.soilProfile.mapUnitName ?? "Mapped soil unit"}; drainage ${geodata.soilProfile.drainageClass ?? "not reported"}, hydrologic group ${geodata.soilProfile.hydrologicGroup ?? "not reported"}, bedrock ${geodata.soilProfile.depthToBedrockCm === null ? "not reported" : `${(geodata.soilProfile.depthToBedrockCm / 30.48).toFixed(1)} ft below surface`}.`
          : "Soil profile unavailable.";
      case "seismicRisk":
        return geodata.seismicDesign?.pga !== null && geodata.seismicDesign?.pga !== undefined
          ? `USGS design values: PGA ${geodata.seismicDesign.pga.toFixed(2)} g, Ss ${geodata.seismicDesign.ss === null ? "--" : geodata.seismicDesign.ss.toFixed(2)} g, S1 ${geodata.seismicDesign.s1 === null ? "--" : geodata.seismicDesign.s1.toFixed(2)} g.`
          : "USGS seismic design parameters unavailable.";
      case "broadbandConnectivity":
        if (!geodata.broadband) {
          return "Broadband availability unavailable for this point.";
        }
        if (geodata.broadband.kind === "regional_household_baseline") {
          return `${geodata.broadband.regionLabel} country-level Eurostat baseline: ${
            geodata.broadband.fixedBroadbandCoveragePercent === null
              ? "fixed broadband share unavailable"
              : `${geodata.broadband.fixedBroadbandCoveragePercent.toFixed(1)}% of households report fixed broadband`
          } and ${
            geodata.broadband.mobileBroadbandCoveragePercent === null
              ? "mobile broadband share unavailable"
              : `${geodata.broadband.mobileBroadbandCoveragePercent.toFixed(1)}% report mobile broadband`
          } (${geodata.broadband.referenceYear ?? "latest available year"}). This is national baseline context, not point-specific service availability.`;
        }
        return `${geodata.broadband.providerCount} providers, up to ${
          geodata.broadband.maxDownloadSpeed > 0
            ? `${geodata.broadband.maxDownloadSpeed.toLocaleString()} Mbps down`
            : "unknown download"
        } / ${
          geodata.broadband.maxUploadSpeed > 0
            ? `${geodata.broadband.maxUploadSpeed.toLocaleString()} Mbps up`
            : "unknown upload"
        }; technologies ${geodata.broadband.technologies.join(", ") || "unclassified"}.`;
      case "airQuality":
        return geodata.airQuality
          ? `${geodata.airQuality.stationName} reports PM2.5 ${
              geodata.airQuality.pm25 === null ? "--" : `${geodata.airQuality.pm25} ug/m3`
            } and PM10 ${
              geodata.airQuality.pm10 === null ? "--" : `${geodata.airQuality.pm10} ug/m3`
            } (${geodata.airQuality.aqiCategory}).`
          : geodata.climate.airQualityIndex === null
            ? "Air-quality station coverage unavailable."
            : `OpenAQ station unavailable; Open-Meteo current AQI ${geodata.climate.airQualityIndex}.`;
      case "contaminationRisk":
        if (geodata.sources.epaHazards.status === "unavailable") {
          return "EPA contamination screening unavailable for this location.";
        }
        return geodata.epaHazards
          ? `${geodata.epaHazards.superfundCount} Superfund sites and ${geodata.epaHazards.triCount} TRI facilities within ~50 km; nearest Superfund site ${
              geodata.epaHazards.nearestSuperfundName ?? "unknown"
            } at ${
              geodata.epaHazards.nearestSuperfundDistanceKm === null
                ? "unknown distance"
                : formatDistanceKm(geodata.epaHazards.nearestSuperfundDistanceKm)
            }.`
          : "EPA contamination screening unavailable.";
      case "hazardAlerts": {
        const alerts = geodata.hazardAlerts;
        if (!alerts) {
          return "GDACS global disaster alert data unavailable for this point.";
        }
        const nearest = alerts.nearestAlert;
        const nearestDesc = nearest
          ? ` Nearest: ${nearest.eventLabel} (${nearest.alertLevel}) at ${nearest.distanceKm === null ? "unknown distance" : `${nearest.distanceKm.toFixed(0)} km`}.`
          : "";
        return `${alerts.totalCurrentAlerts} current global alerts (${alerts.redCurrentAlerts} red, ${alerts.orangeCurrentAlerts} orange).${nearestDesc}`;
      }
      case "amenities":
        return `${geodata.amenities.foodAndDrinkCount ?? "?"} food/drink venues, ${geodata.amenities.transitStopCount ?? "?"} transit stops, ${geodata.amenities.parkCount ?? "?"} parks.`;
      case "commercialDemand":
      case "commercialDensity":
        return `${geodata.amenities.commercialCount ?? "?"} mapped commercial venues and ${geodata.amenities.foodAndDrinkCount ?? "?"} food/drink venues nearby.`;
      case "remoteness":
        return `${geodata.amenities.trailheadCount ?? "?"} mapped trailheads or recreation access points in the area.`;
      case "trailAccess": {
        const trailheadCount = geodata.amenities.trailheadCount;
        const roadDist = geodata.nearestRoad.distanceKm;
        const trailPart =
          trailheadCount === null
            ? "No mapped trailheads or named hiking paths found in the OSM query area"
            : trailheadCount === 0
              ? "0 mapped trailheads or named hiking paths in the OSM query area"
              : `${trailheadCount} mapped trailhead${trailheadCount !== 1 ? "s" : ""} or named hiking path${trailheadCount !== 1 ? "s" : ""} in the OSM query area`;
        const roadPart =
          roadDist === null ? "road access unknown" : `nearest road ${roadDist.toFixed(1)} km`;
        return `${trailPart}; ${roadPart}.`;
      }
      default:
        return factor.description;
    }
  }

  return factor.description;
}

type FactorEvidenceResult = Pick<
  SiteFactorScore,
  "evidenceKind" | "evidenceLabel" | "evidenceExplanation" | "sourceIds" | "sourceLastUpdated" | "proxyReason"
>;

const EVIDENCE_DIRECT_LIVE = "This factor is scored from a live measurement or nearest-feature reading returned directly by the current geodata pipeline.";
const EVIDENCE_DERIVED_MULTI = "This factor translates one or more live source measurements into a normalized mission score while preserving the underlying source context in the detail text.";
const EVIDENCE_DERIVED_COMPUTED = "This factor is computed from multiple live inputs rather than a single direct reading.";

function buildFactorEvidence(factor: ScoringFactor): FactorEvidenceResult {
  if (factor.scoreFn === "distance") {
    return {
      evidenceKind: "direct_live",
      evidenceLabel: "Direct live signal",
      evidenceExplanation: EVIDENCE_DIRECT_LIVE,
      sourceIds: ["osm-overpass"],
      sourceLastUpdated: "live",
    };
  }

  if (factor.scoreFn === "elevation") {
    return {
      evidenceKind: "direct_live",
      evidenceLabel: "Direct live signal",
      evidenceExplanation: EVIDENCE_DIRECT_LIVE,
      sourceIds: ["usgs-epqs", "opentopodata"],
      sourceLastUpdated: "2024",
    };
  }

  if (factor.scoreFn === "climate") {
    return {
      evidenceKind: "direct_live",
      evidenceLabel: "Direct live signal",
      evidenceExplanation: EVIDENCE_DIRECT_LIVE,
      sourceIds: ["open-meteo"],
      sourceLastUpdated: "2024-12",
    };
  }

  if (factor.scoreFn === "landcover") {
    return {
      evidenceKind: "derived_live",
      evidenceLabel: "Derived live analysis",
      evidenceExplanation:
        "This factor is scored from land-cover analysis derived from live or recently fetched map context rather than a single raw measurement.",
      sourceIds: [],
    };
  }

  if (factor.scoreFn === "custom") {
    switch (String(factor.params.metric ?? "")) {
      case "schoolAccess":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation:
            "This factor uses GeoSight's normalized school-context analysis built from live school records and official metrics where available.",
          sourceIds: ["nces-edge"],
          sourceLastUpdated: "2024",
        };
      case "floodRisk":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["fema-nfhl"],
          sourceLastUpdated: "2024-Q3",
        };
      case "groundwaterDepth":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["usgs-groundwater"],
          sourceLastUpdated: "2023",
          proxyReason:
            "Groundwater level from nearest USGS monitoring well; well density and aquifer type vary by region",
        };
      case "soilBuildability":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["nrcs-ssurgo"],
          sourceLastUpdated: "2023",
          proxyReason:
            "Soil survey data; site-specific conditions may vary from mapped unit",
        };
      case "seismicRisk":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["usgs-seismic-design"],
          sourceLastUpdated: "2023",
          proxyReason:
            "Based on probabilistic seismic hazard maps; not a real-time earthquake feed",
        };
      case "broadbandConnectivity":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["fcc-broadband", "eurostat"],
          sourceLastUpdated: "2024",
        };
      case "airQuality":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["openaq", "open-meteo"],
          sourceLastUpdated: "2024-12",
        };
      case "contaminationRisk":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["epa-envirofacts"],
          sourceLastUpdated: "2024-12",
        };
      case "waterAccess":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["usgs-streamgauges", "osm-overpass"],
          sourceLastUpdated: "live",
        };
      case "trailAccess":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_MULTI,
          sourceIds: ["osm-overpass"],
          sourceLastUpdated: "live",
        };
      case "hazardAlerts":
        return {
          evidenceKind: "direct_live",
          evidenceLabel: "Direct live signal",
          evidenceExplanation:
            "This factor is scored from the GDACS live global disaster alert feed, using current alert counts and severity levels at the time of the request.",
          sourceIds: ["gdacs"],
          sourceLastUpdated: "live",
        };
      case "terrainVariety":
      case "remoteness":
      case "amenities":
      case "commercialDemand":
      case "commercialDensity":
      case "landCost":
        return {
          evidenceKind: "proxy",
          evidenceLabel: "Proxy heuristic",
          evidenceExplanation:
            "This factor blends live signals into a heuristic score, so it is useful for first-pass comparison but should not be treated as a direct measurement.",
          sourceIds: ["osm-overpass"],
          sourceLastUpdated: "live",
          proxyReason:
            "Score is a weighted blend of OSM amenity counts, distance, and land-cover signals; not a single authoritative measurement.",
        };
      default:
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation: EVIDENCE_DERIVED_COMPUTED,
          sourceIds: [],
        };
    }
  }

  return {
    evidenceKind: "derived_live",
    evidenceLabel: "Derived live analysis",
    evidenceExplanation: "This factor is computed from the currently available geospatial inputs.",
    sourceIds: [],
  };
}

function runFactorScore(geodata: GeodataResult, factor: ScoringFactor) {
  switch (factor.scoreFn) {
    case "distance":
      return scoreFromDistance(
        getDistanceReading(geodata, factor.params.source as DistanceSource).distanceKm,
        Number(factor.params.idealKm),
        Number(factor.params.cutoffKm),
        (factor.params.direction as "near" | "far" | undefined) ?? "near",
      );
    case "elevation":
      return scoreTerrain(geodata.elevationMeters, String(factor.params.mode ?? "cooling"));
    case "climate":
      return scoreClimate(
        geodata.climate.averageTempC,
        geodata.climate.coolingDegreeDays,
        geodata.climate.precipitationMm,
        String(factor.params.mode ?? "cooling"),
      );
    case "landcover":
      return scoreLandCover(
        geodata.landClassification,
        String(factor.params.mode ?? "developed"),
      );
    case "custom":
      return scoreCustomMetric(
        geodata,
        String(factor.params.metric ?? ""),
        factor.params,
      );
    default:
      return 50;
  }
}

function buildRecommendation(total: number, profile: MissionProfile) {
  return (
    profile.recommendationBands.find((band) => total >= band.min)?.text ??
    profile.recommendationBands[profile.recommendationBands.length - 1]?.text ??
    "Useful first-pass site candidate with more validation required."
  );
}

export function buildFactorScores(
  geodata: GeodataResult,
  profile: MissionProfile = DEFAULT_PROFILE,
): SiteFactorScore[] {
  return profile.factors.map((factor) => {
    const evidence = buildFactorEvidence(factor);

    return {
      key: factor.key,
      label: factor.label,
      score: runFactorScore(geodata, factor),
      weight: factor.weight,
      detail: buildFactorDetail(geodata, factor),
      ...evidence,
    };
  });
}

export function calculateProfileScore(
  geodata: GeodataResult,
  profile: MissionProfile,
): SiteScore {
  const factors = buildFactorScores(geodata, profile);
  const total = Math.round(
    factors.reduce((acc, factor) => acc + factor.score * factor.weight, 0),
  );

  return {
    total,
    recommendation: buildRecommendation(total, profile),
    factors,
    broadband: geodata.broadband
      ? {
          kind: geodata.broadband.kind,
          granularity: geodata.broadband.granularity,
          regionLabel: geodata.broadband.regionLabel,
          referenceYear: geodata.broadband.referenceYear,
          maxDownloadSpeed: geodata.broadband.maxDownloadSpeed,
          maxUploadSpeed: geodata.broadband.maxUploadSpeed,
          providerCount: geodata.broadband.providerCount,
          technologies: geodata.broadband.technologies,
          fixedBroadbandCoveragePercent: geodata.broadband.fixedBroadbandCoveragePercent,
          mobileBroadbandCoveragePercent: geodata.broadband.mobileBroadbandCoveragePercent,
          score:
            factors.find((factor) => factor.key === "broadbandConnectivity")?.score ?? null,
        }
      : null,
  };
}

export function calculateSiteScore(geodata: GeodataResult): SiteScore {
  return calculateProfileScore(geodata, DEFAULT_PROFILE);
}

export function scoreFireRisk(geodata: GeodataResult): number {
  const count = geodata.hazards.activeFireCount7d;
  const nearestKm = geodata.hazards.nearestFireKm;
  if (count === null) return 70;
  if (count === 0) return 95;
  let score = count >= 20 ? 20 : count >= 10 ? 35 : count >= 5 ? 50 : 65;
  if (nearestKm !== null && nearestKm < 5) score = Math.min(score, 25);
  return score;
}

export function scoreWeatherRisk(geodata: GeodataResult): number {
  const weatherSummary = geodata.climate.weatherRiskSummary?.toLowerCase() ?? "";
  const windSpeedKph = geodata.climate.windSpeedKph;

  if (weatherSummary.includes("extreme") || weatherSummary.includes("major")) {
    return 25;
  }
  if (
    weatherSummary.includes("warning") ||
    weatherSummary.includes("storm") ||
    weatherSummary.includes("red flag") ||
    weatherSummary.includes("severe")
  ) {
    return 40;
  }
  if (weatherSummary.includes("elevated") || weatherSummary.includes("watch")) {
    return 58;
  }

  if (windSpeedKph === null || windSpeedKph === undefined) {
    return 70;
  }
  if (windSpeedKph <= 20) {
    return 92;
  }
  if (windSpeedKph <= 40) {
    return 78;
  }
  if (windSpeedKph <= 70) {
    return 55;
  }
  return 30;
}

function getHazardTier(score: number): HazardRiskTier {
  if (score >= 75) return "low";
  if (score >= 55) return "moderate";
  if (score >= 35) return "elevated";
  return "critical";
}

export function buildHazardResilienceSummary(geodata: GeodataResult): HazardResilienceSummary {
  const domains: HazardDomainScore[] = [
    {
      domain: "seismic",
      label: "Seismic",
      score: scoreSeismicRisk(geodata),
      tier: getHazardTier(scoreSeismicRisk(geodata)),
      detail: geodata.seismicDesign?.pga != null
        ? `USGS PGA ${geodata.seismicDesign.pga.toFixed(2)}g`
        : "No seismic design data — US-only coverage",
      available: geodata.seismicDesign?.pga != null,
      coverage: "us_only",
    },
    {
      domain: "flood",
      label: "Flood",
      score: scoreFloodRisk(geodata),
      tier: getHazardTier(scoreFloodRisk(geodata)),
      detail: geodata.floodZone?.floodZone
        ? `FEMA zone ${geodata.floodZone.floodZone}${geodata.floodZone.label ? ` — ${geodata.floodZone.label}` : ""}`
        : "No FEMA flood zone data — US-only coverage",
      available: geodata.sources.floodZone.status !== "unavailable",
      coverage: "us_only",
    },
    {
      domain: "fire",
      label: "Fire",
      score: scoreFireRisk(geodata),
      tier: getHazardTier(scoreFireRisk(geodata)),
      detail: geodata.hazards.activeFireCount7d === null
        ? "NASA FIRMS fire detections unavailable"
        : geodata.hazards.activeFireCount7d === 0
          ? "No active fire detections within the analysis region (7d)"
          : `${geodata.hazards.activeFireCount7d} VIIRS detections in the last 7 days${geodata.hazards.nearestFireKm !== null ? `; nearest ${geodata.hazards.nearestFireKm.toFixed(1)} km` : ""}`,
      available: geodata.hazards.activeFireCount7d !== null,
      coverage: "global",
    },
    {
      domain: "alerts",
      label: "Disaster alerts",
      score: scoreHazardAlerts(geodata.hazardAlerts),
      tier: getHazardTier(scoreHazardAlerts(geodata.hazardAlerts)),
      detail: geodata.hazardAlerts === null
        ? "GDACS global disaster alert feed unavailable"
        : geodata.hazardAlerts.totalCurrentAlerts === 0
          ? "No active GDACS alerts in the current feed"
          : `${geodata.hazardAlerts.totalCurrentAlerts} active alerts — ${geodata.hazardAlerts.elevatedCurrentAlerts} elevated (Orange/Red)`,
      available: geodata.hazardAlerts !== null,
      coverage: "global",
    },
    {
      domain: "weather",
      label: "Weather",
      score: scoreWeatherRisk(geodata),
      tier: getHazardTier(scoreWeatherRisk(geodata)),
      detail: geodata.climate.weatherRiskSummary
        ? geodata.climate.weatherRiskSummary
        : geodata.climate.windSpeedKph !== null
          ? `Open-Meteo wind ${geodata.climate.windSpeedKph.toFixed(0)} km/h`
          : "Weather risk context unavailable",
      available:
        geodata.climate.weatherRiskSummary !== null || geodata.climate.windSpeedKph !== null,
      coverage: "global",
    },
    {
      domain: "air",
      label: "Air quality",
      score: scoreAirQualityContext(geodata),
      tier: getHazardTier(scoreAirQualityContext(geodata)),
      detail: geodata.airQuality
        ? `${geodata.airQuality.aqiCategory} — PM2.5 ${geodata.airQuality.pm25 ?? "--"} μg/m³`
        : geodata.climate.airQualityIndex !== null
          ? `Open-Meteo AQI ${geodata.climate.airQualityIndex}`
          : "Air quality data unavailable",
      available: geodata.airQuality !== null || geodata.climate.airQualityIndex !== null,
      coverage: "global",
    },
    {
      domain: "contamination",
      label: "Contamination",
      score: scoreContaminationRisk(geodata),
      tier: getHazardTier(scoreContaminationRisk(geodata)),
      detail: geodata.epaHazards === null
        ? "EPA contamination screening unavailable — US-only coverage"
        : `${geodata.epaHazards.superfundCount} Superfund / ${geodata.epaHazards.triCount} TRI sites${geodata.epaHazards.nearestSuperfundDistanceKm !== null ? `; nearest ${geodata.epaHazards.nearestSuperfundDistanceKm.toFixed(1)} km` : ""}`,
      available: geodata.sources.epaHazards.status !== "unavailable",
      coverage: "us_only",
    },
  ];

  const weights: Record<string, number> = {
    seismic: 0.17,
    flood: 0.18,
    fire: 0.18,
    alerts: 0.12,
    weather: 0.13,
    air: 0.12,
    contamination: 0.10,
  };

  const compoundScore = Math.round(
    domains.reduce((acc, d) => acc + d.score * (weights[d.domain] ?? 0), 0),
  );

  const worstDomain = domains.reduce<HazardDomainScore | null>(
    (worst, d) => (worst === null || d.score < worst.score ? d : worst),
    null,
  );

  return {
    compoundScore,
    tier: getHazardTier(compoundScore),
    domains,
    worstDomain,
  };
}
