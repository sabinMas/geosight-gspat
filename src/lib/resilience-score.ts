import { GeodataResult } from "@/types";

export interface ResilienceDomain {
  key: string;
  label: string;
  score: number;
  weight: number;
  status: "good" | "caution" | "risk" | "unknown";
  detail: string;
}

export interface ResilienceScoreResult {
  composite: number;
  domains: ResilienceDomain[];
}

function scoreFlood(geodata: GeodataResult): ResilienceDomain {
  const weight = 0.25;
  const floodZone = geodata.floodZone;

  if (!floodZone) {
    return {
      key: "flood",
      label: "Flood",
      score: 50,
      weight,
      status: "unknown",
      detail: "Flood zone data unavailable",
    };
  }

  if (floodZone.isSpecialFloodHazard === true) {
    return {
      key: "flood",
      label: "Flood",
      score: 10,
      weight,
      status: "risk",
      detail: "Special Flood Hazard Area",
    };
  }

  if (floodZone.floodZone === "X") {
    return {
      key: "flood",
      label: "Flood",
      score: 90,
      weight,
      status: "good",
      detail: "Minimal flood hazard (Zone X)",
    };
  }

  return {
    key: "flood",
    label: "Flood",
    score: 50,
    weight,
    status: "caution",
    detail: "Moderate flood hazard zone",
  };
}

function scoreSeismic(geodata: GeodataResult): ResilienceDomain {
  const weight = 0.20;
  const ss = geodata.seismicDesign?.ss;

  if (ss == null) {
    return {
      key: "seismic",
      label: "Seismic",
      score: 60,
      weight,
      status: "unknown",
      detail: "Seismic design data unavailable",
    };
  }

  if (ss < 0.167) {
    return { key: "seismic", label: "Seismic", score: 90, weight, status: "good", detail: "Low seismic design demand" };
  }
  if (ss < 0.50) {
    return { key: "seismic", label: "Seismic", score: 70, weight, status: "caution", detail: "Moderate seismic design demand" };
  }
  if (ss < 1.0) {
    return { key: "seismic", label: "Seismic", score: 45, weight, status: "caution", detail: "High seismic design demand" };
  }
  return { key: "seismic", label: "Seismic", score: 20, weight, status: "risk", detail: "Very high seismic design demand" };
}

function scoreFire(geodata: GeodataResult): ResilienceDomain {
  const weight = 0.20;
  const activeFireCount7d = geodata.hazards?.activeFireCount7d;
  const nearestFireKm = geodata.hazards?.nearestFireKm;

  if (activeFireCount7d == null) {
    return {
      key: "fire",
      label: "Wildfire",
      score: 60,
      weight,
      status: "unknown",
      detail: "Fire detection data unavailable",
    };
  }

  if (activeFireCount7d > 0 && nearestFireKm != null && nearestFireKm < 25) {
    return {
      key: "fire",
      label: "Wildfire",
      score: 15,
      weight,
      status: "risk",
      detail: `Active fire within ${nearestFireKm.toFixed(0)} km`,
    };
  }

  if (activeFireCount7d > 0) {
    return {
      key: "fire",
      label: "Wildfire",
      score: 45,
      weight,
      status: "caution",
      detail: "Active fires detected in region",
    };
  }

  return {
    key: "fire",
    label: "Wildfire",
    score: 85,
    weight,
    status: "good",
    detail: "No active fires detected in 7-day window",
  };
}

function scoreContamination(geodata: GeodataResult): ResilienceDomain {
  const weight = 0.20;
  const epaSource = geodata.sources.epaHazards;

  if (epaSource.status === "unavailable") {
    return {
      key: "contamination",
      label: "Contamination",
      score: 60,
      weight,
      status: "unknown",
      detail: "EPA screening not available for this region",
    };
  }

  const hazards = geodata.epaHazards;
  if (!hazards) {
    return {
      key: "contamination",
      label: "Contamination",
      score: 70,
      weight,
      status: "unknown",
      detail: "No contamination data returned",
    };
  }

  const { nearestSuperfundDistanceKm, superfundCount, triCount } = hazards;

  if (nearestSuperfundDistanceKm !== null && nearestSuperfundDistanceKm <= 5) {
    return {
      key: "contamination",
      label: "Contamination",
      score: 15,
      weight,
      status: "risk",
      detail: `Superfund site within ${nearestSuperfundDistanceKm.toFixed(1)} km`,
    };
  }

  if (nearestSuperfundDistanceKm !== null && nearestSuperfundDistanceKm <= 25) {
    return {
      key: "contamination",
      label: "Contamination",
      score: 50,
      weight,
      status: "caution",
      detail: `Superfund site ${nearestSuperfundDistanceKm.toFixed(1)} km away`,
    };
  }

  if (superfundCount === 0 && triCount === 0) {
    return {
      key: "contamination",
      label: "Contamination",
      score: 90,
      weight,
      status: "good",
      detail: "No EPA sites in search area",
    };
  }

  return {
    key: "contamination",
    label: "Contamination",
    score: 70,
    weight,
    status: "unknown",
    detail: "No contamination data returned",
  };
}

function scoreAirQuality(geodata: GeodataResult): ResilienceDomain {
  const weight = 0.15;
  const aq = geodata.airQuality;

  if (!aq) {
    return {
      key: "air-quality",
      label: "Air quality",
      score: 60,
      weight,
      status: "unknown",
      detail: "Air quality station data unavailable",
    };
  }

  const categoryMap: Record<
    string,
    { score: number; status: "good" | "caution" | "risk"; detail: string }
  > = {
    Good: { score: 90, status: "good", detail: "Good air quality" },
    Moderate: { score: 70, status: "caution", detail: "Moderate air quality" },
    "Unhealthy for Sensitive Groups": { score: 50, status: "caution", detail: "Unhealthy for sensitive groups" },
    Unhealthy: { score: 25, status: "risk", detail: "Unhealthy air quality" },
    "Very Unhealthy": { score: 25, status: "risk", detail: "Very unhealthy air quality" },
    Hazardous: { score: 5, status: "risk", detail: "Hazardous air quality" },
  };

  const entry = categoryMap[aq.aqiCategory];
  if (!entry) {
    return {
      key: "air-quality",
      label: "Air quality",
      score: 60,
      weight,
      status: "unknown",
      detail: "Air quality station data unavailable",
    };
  }

  return {
    key: "air-quality",
    label: "Air quality",
    score: entry.score,
    weight,
    status: entry.status,
    detail: entry.detail,
  };
}

export function buildResilienceScore(geodata: GeodataResult | null): ResilienceScoreResult | null {
  if (!geodata) return null;

  const domains: ResilienceDomain[] = [
    scoreFlood(geodata),
    scoreSeismic(geodata),
    scoreFire(geodata),
    scoreContamination(geodata),
    scoreAirQuality(geodata),
  ];

  // Sort worst first (ascending score)
  domains.sort((a, b) => a.score - b.score);

  const composite = Math.round(
    domains.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  return { composite, domains };
}
