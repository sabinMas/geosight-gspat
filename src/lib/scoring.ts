import { DEFAULT_PROFILE } from "@/lib/profiles";
import { clamp } from "@/lib/utils";
import {
  GeodataResult,
  LandCoverBucket,
  MissionProfile,
  ScoringFactor,
  SiteFactorScore,
  SiteScore,
} from "@/types";

type DistanceSource = "water" | "power" | "road";

function scoreCountSignal(
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

  const effectiveMax = Math.max(maxUsefulCount, idealCount);
  const ratio = Math.min(count, effectiveMax) / effectiveMax;
  return clamp(Math.round(20 + ratio * 80), 15, 100);
}

function scoreFromDistance(
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

function scoreTerrain(elevation: number | null, mode: string = "cooling") {
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

function scoreClimate(
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

function scoreLandCover(classification: LandCoverBucket[], mode: string = "developed") {
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

function scoreBroadbandAvailability(
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

function scoreFloodRisk(geodata: GeodataResult) {
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

function scoreAirQualityContext(geodata: GeodataResult) {
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

function scoreContaminationRisk(geodata: GeodataResult) {
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

  return clamp(Math.round(92 - superfundPenalty - triPenalty - proximityPenalty), 15, 100);
}

function scoreWaterAccess(geodata: GeodataResult) {
  const waterDistance = geodata.nearestWaterBody.distanceKm;
  const nearestGauge = [...geodata.streamGauges].sort((a, b) => a.distanceKm - b.distanceKm)[0];

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
    case "schoolAccess":
      return geodata.schoolContext?.score ?? 50;
    case "floodRisk":
      return scoreFloodRisk(geodata);
    case "broadbandConnectivity":
      return scoreBroadbandAvailability(
        geodata,
        String(params.mode ?? "residential") === "data_center" ? "data_center" : "residential",
      );
    case "airQuality":
      return scoreAirQualityContext(geodata);
    case "contaminationRisk":
      return scoreContaminationRisk(geodata);
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
        const nearestGauge = [...geodata.streamGauges].sort((a, b) => a.distanceKm - b.distanceKm)[0];
        if (!nearestGauge) {
          return `Nearest mapped water feature ${geodata.nearestWaterBody.name} at ${
            geodata.nearestWaterBody.distanceKm === null
              ? "unknown distance"
              : `${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`
          }; no nearby USGS discharge gauge in range.`;
        }

        return `${geodata.nearestWaterBody.name} at ${
          geodata.nearestWaterBody.distanceKm === null
            ? "unknown distance"
            : `${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`
        }; nearest USGS gauge ${nearestGauge.siteName} (${nearestGauge.distanceKm.toFixed(1)} km) reporting ${
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
      case "broadbandConnectivity":
        if (!geodata.broadband) {
          return "FCC broadband availability unavailable for this point.";
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
                : `${geodata.epaHazards.nearestSuperfundDistanceKm.toFixed(1)} km`
            }.`
          : "EPA contamination screening unavailable.";
      case "amenities":
        return `${geodata.amenities.foodAndDrinkCount ?? "?"} food/drink venues, ${geodata.amenities.transitStopCount ?? "?"} transit stops, ${geodata.amenities.parkCount ?? "?"} parks.`;
      case "commercialDemand":
      case "commercialDensity":
        return `${geodata.amenities.commercialCount ?? "?"} mapped commercial venues and ${geodata.amenities.foodAndDrinkCount ?? "?"} food/drink venues nearby.`;
      case "remoteness":
        return `${geodata.amenities.trailheadCount ?? "?"} mapped trailheads or recreation access points in the area.`;
      default:
        return factor.description;
    }
  }

  return factor.description;
}

function buildFactorEvidence(factor: ScoringFactor): Pick<
  SiteFactorScore,
  "evidenceKind" | "evidenceLabel" | "evidenceExplanation"
> {
  if (factor.scoreFn === "distance" || factor.scoreFn === "elevation" || factor.scoreFn === "climate") {
    return {
      evidenceKind: "direct_live",
      evidenceLabel: "Direct live signal",
      evidenceExplanation:
        "This factor is scored from a live measurement or nearest-feature reading returned directly by the current geodata pipeline.",
    };
  }

  if (factor.scoreFn === "landcover") {
    return {
      evidenceKind: "derived_live",
      evidenceLabel: "Derived live analysis",
      evidenceExplanation:
        "This factor is scored from land-cover analysis derived from live or recently fetched map context rather than a single raw measurement.",
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
        };
      case "waterAccess":
      case "floodRisk":
      case "broadbandConnectivity":
      case "airQuality":
      case "contaminationRisk":
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation:
            "This factor translates one or more live source measurements into a normalized mission score while preserving the underlying source context in the detail text.",
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
        };
      default:
        return {
          evidenceKind: "derived_live",
          evidenceLabel: "Derived live analysis",
          evidenceExplanation:
            "This factor is computed from multiple live inputs rather than a single direct reading.",
        };
    }
  }

  return {
    evidenceKind: "derived_live",
    evidenceLabel: "Derived live analysis",
    evidenceExplanation: "This factor is computed from the currently available geospatial inputs.",
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
          maxDownloadSpeed: geodata.broadband.maxDownloadSpeed,
          maxUploadSpeed: geodata.broadband.maxUploadSpeed,
          providerCount: geodata.broadband.providerCount,
          technologies: geodata.broadband.technologies,
          score:
            factors.find((factor) => factor.key === "broadbandConnectivity")?.score ?? null,
        }
      : null,
  };
}

export function calculateSiteScore(geodata: GeodataResult): SiteScore {
  return calculateProfileScore(geodata, DEFAULT_PROFILE);
}
