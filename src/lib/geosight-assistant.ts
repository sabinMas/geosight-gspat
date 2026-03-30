import { DEFAULT_PROFILE } from "@/lib/profiles";
import { injectRagIntoMessages } from "@/lib/rag/inject";
import { CoreMessage } from "@/lib/rag/types";
import {
  AnalyzeRequestBody,
  DataTrend,
  GeodataResult,
  MissionProfile,
  NearbyPlace,
  ResultsMode,
  ScoreEvidenceKind,
} from "@/types";

function includesAny(question: string, matches: string[]) {
  return matches.some((term) => question.includes(term));
}

export function inferResponseMode(question: string, resultsMode: ResultsMode = "analysis") {
  const normalized = question.toLowerCase();

  if (
    resultsMode === "nearby_places" ||
    includesAny(normalized, [
      "hike",
      "trail",
      "restaurant",
      "food",
      "coffee",
      "nearby",
      "places",
      "things to do",
      "where should i go",
    ])
  ) {
    return "nearby_places" as const;
  }

  return "analysis" as const;
}

export function formatLocationLabel(payload: Pick<AnalyzeRequestBody, "location" | "locationName">) {
  const coordinateText = payload.location
    ? `${payload.location.lat.toFixed(4)}, ${payload.location.lng.toFixed(4)}`
    : "Unknown coordinates";

  return payload.locationName ? `${payload.locationName} (${coordinateText})` : coordinateText;
}

function buildResponseGuidance(mode: ReturnType<typeof inferResponseMode>) {
  if (mode === "nearby_places") {
    return `
Response format guidance:
- Favor a list-first answer with the most relevant nearby places near the top.
- For each item, include name, category, relative distance or direction, and why it is relevant.
- If live nearby-place data is unavailable, say so explicitly instead of inventing places.
- End with a short summary and 1-2 next questions.
`;
  }

  return `
Response format guidance:
- Lead with a concise summary of the area through the active mission profile.
- Use the available structured data trends and map context to support your reasoning.
- Present a few concrete findings, then explain pros, cons, and unknowns.
- End with next questions or next zoom levels the user should explore.
`;
}

function classifyFactorEvidence(profileFactor: MissionProfile["factors"][number]): {
  kind: ScoreEvidenceKind;
  label: string;
} {
  if (
    profileFactor.scoreFn === "distance" ||
    profileFactor.scoreFn === "elevation" ||
    profileFactor.scoreFn === "climate"
  ) {
    return { kind: "direct_live", label: "direct live signal" };
  }

  if (profileFactor.scoreFn === "landcover") {
    return { kind: "derived_live", label: "derived live analysis" };
  }

  if (profileFactor.scoreFn === "custom") {
    if (
      [
        "schoolAccess",
        "waterAccess",
        "floodRisk",
        "broadbandConnectivity",
        "airQuality",
        "contaminationRisk",
      ].includes(String(profileFactor.params.metric ?? ""))
    ) {
      return { kind: "derived_live", label: "derived live analysis" };
    }

    return { kind: "proxy", label: "proxy heuristic" };
  }

  return { kind: "derived_live", label: "derived live analysis" };
}

export function buildGeoSightSystemPrompt(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
) {
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);
  const factorChecklist = profile.factors
    .map((factor) => {
      const evidence = classifyFactorEvidence(factor);
      return `- ${factor.label} (${evidence.label}): ${factor.description}`;
    })
    .join("\n");

  const prompt = `
You are GeoSight, an AI-powered geospatial intelligence assistant.

Mission profile:
- ${profile.name}
- ${profile.tagline}

Profile guidance:
${profile.systemPrompt}

Current response mode:
- ${responseMode === "nearby_places" ? "Nearby places / lists" : "Area analysis / trends"}

Score factors used by this profile:
${factorChecklist}

Behavior rules:
- Treat the selected location as the center of the answer.
- Restate the active location clearly.
- Separate supported observations from approximations or inference.
- When discussing score-style reasoning, explicitly say whether a point comes from a direct live signal, derived live analysis, or a proxy heuristic.
- Use any structured nearby-place results or trend objects included in the input JSON.
- If school context is present, distinguish official government accountability fields from GeoSight-derived normalization.
- If school coverage is outside the current US-first pipeline or unavailable, say that clearly instead of inferring school quality.
- Never present proxy heuristics as if they were direct measurements.
- Be concise, practical, and grounded in the active mission profile.

${buildResponseGuidance(responseMode)}
`;

  return { prompt, responseMode };
}

export async function buildGeoSightMessagesWithRag(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<CoreMessage[]> {
  const { prompt } = buildGeoSightSystemPrompt(payload, profile);
  const serializedPayload = JSON.stringify(
    {
      missionProfile: profile.name,
      missionProfileId: profile.id,
      ...payload,
    },
    null,
    2,
  );

  return injectRagIntoMessages(
    [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: serializedPayload,
      },
    ],
    payload.question,
  );
}

function pickTopLandCover(geodata?: GeodataResult) {
  if (!geodata?.landClassification?.length) {
    return null;
  }

  return [...geodata.landClassification].sort((a, b) => b.value - a.value)[0];
}

function buildProfileAssessmentLine(profileId: string, geodata?: GeodataResult) {
  if (!geodata) {
    return "Only limited map context is available, so this is a qualitative first-pass assessment.";
  }

  const waterKm = geodata.nearestWaterBody.distanceKm;
  const roadKm = geodata.nearestRoad.distanceKm;
  const powerKm = geodata.nearestPower.distanceKm;
  const elevation = geodata.elevationMeters;
  const topLandCover = pickTopLandCover(geodata);

  switch (profileId) {
    case "data-center":
      return waterKm !== null && powerKm !== null
        ? `This location looks strongest when water, power, and connectivity all line up; mapped water is about ${waterKm.toFixed(1)} km away, power is about ${powerKm.toFixed(1)} km away, and broadband tops out at ${
            payloadBroadbandLine(geodata)
          }.`
        : "This location could be workable for cooling infrastructure, but water access, nearby power, and flood exposure are still the key gating signals.";
    case "hiking":
      return elevation !== null && waterKm !== null
        ? `The recreation signal is strongest where terrain variety, water features, and breathable air align; this site sits around ${elevation} m elevation with water roughly ${waterKm.toFixed(1)} km away.`
        : "This area may have hiking potential, but the current map data is still too coarse to judge trail quality or scenic value confidently.";
    case "residential":
      return roadKm !== null && topLandCover
        ? `For neighborhood development, the best early signals are road access at about ${roadKm.toFixed(1)} km, dominant land cover of ${topLandCover.label.toLowerCase()}, and whatever FEMA and broadband context says about risk and readiness.`
        : "For residential use, access, flood exposure, broadband readiness, and community-serving amenities still need closer validation.";
    case "commercial":
      return roadKm !== null && powerKm !== null
        ? `For commercial or warehouse siting, road access around ${roadKm.toFixed(1)} km and utility access around ${powerKm.toFixed(1)} km make this a workable first-pass candidate.`
        : "For commercial or warehouse use, transport access and utility readiness remain the biggest open questions.";
    default:
      return "This is a broad exploratory read using terrain, land cover, water, and access signals from the current map context.";
  }
}

function payloadBroadbandLine(geodata?: GeodataResult) {
  if (!geodata?.broadband) {
    return "unavailable broadband";
  }

  return geodata.broadband.maxDownloadSpeed <= 0
    ? `${geodata.broadband.providerCount} providers`
    : `${geodata.broadband.maxDownloadSpeed.toLocaleString()} Mbps down across ${geodata.broadband.providerCount} providers`;
}

function buildNextQuestions(profileId: string) {
  switch (profileId) {
    case "data-center":
      return [
        "Compare this site to another parcel closer to transmission infrastructure.",
        "Check floodplain or permitting layers before treating the water adjacency as an advantage.",
      ];
    case "hiking":
      return [
        "Switch to nearby places mode to compare trail-style results around this location.",
        "Zoom in on ridgelines, creek corridors, or trailheads for a more detailed recreation read.",
      ];
    case "residential":
      return [
        "Zoom in to parcel scale and compare flatter ground near existing roads and services.",
        "Check flood, wildfire, and school-district layers before treating this as a build-ready neighborhood site.",
      ];
    case "commercial":
      return [
        "Compare this site to another candidate closer to highway or freight access.",
        "Zoom in to inspect frontage, access points, and surrounding commercial pattern.",
      ];
    default:
      return [
        "Zoom in on the most promising sub-area for a more detailed read.",
        "Switch between analysis and nearby places mode depending on whether you need trends or destinations next.",
      ];
  }
}

function formatNearbyPlaceLine(place: NearbyPlace) {
  const distance = place.distanceKm === null ? "distance unavailable" : `${place.distanceKm.toFixed(1)} km`;
  return `- ${place.name} (${place.category}) - ${distance}, ${place.relativeLocation}. ${place.summary}`;
}

function formatTrendLine(trend: DataTrend) {
  return `- ${trend.label}: ${trend.value}. ${trend.detail}`;
}

function buildFactorEvidenceLines(profile: MissionProfile) {
  return profile.factors.map((factor) => {
    const evidence = classifyFactorEvidence(factor);
    return `- ${factor.label}: ${evidence.label}.`;
  });
}

export function buildFallbackAssessment(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
) {
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);
  const locationLabel = formatLocationLabel(payload);
  const topLandCover = pickTopLandCover(payload.geodata);
  const supportedFacts = [
    payload.geodata?.elevationMeters !== null && payload.geodata?.elevationMeters !== undefined
      ? `Elevation is about ${payload.geodata.elevationMeters} m.`
      : "Elevation is currently unavailable.",
    payload.geodata?.climate?.currentTempC !== null &&
    payload.geodata?.climate?.currentTempC !== undefined
      ? `Current weather snapshot: ${payload.geodata.climate.currentTempC.toFixed(1)} C now, wind ${payload.geodata.climate.windSpeedKph ?? "unknown"} km/h, AQI ${payload.geodata.climate.airQualityIndex ?? "unknown"}.`
      : "Current weather snapshot is currently unavailable.",
    payload.geodata?.nearestWaterBody
      ? `Nearest mapped water feature: ${payload.geodata.nearestWaterBody.name} (${payload.geodata.nearestWaterBody.distanceKm ?? "unknown"} km).`
      : "Water proximity is currently unavailable.",
    payload.geodata?.nearestRoad
      ? `Nearest mapped road access: ${payload.geodata.nearestRoad.name} (${payload.geodata.nearestRoad.distanceKm ?? "unknown"} km).`
      : "Road access is currently unavailable.",
    payload.geodata?.nearestPower
      ? `Nearest mapped power infrastructure: ${payload.geodata.nearestPower.name} (${payload.geodata.nearestPower.distanceKm ?? "unknown"} km).`
      : "Power access is currently unavailable.",
    payload.geodata?.broadband
      ? `Broadband context: ${payload.geodata.broadband.providerCount} providers with up to ${payload.geodata.broadband.maxDownloadSpeed || "unknown"} Mbps down and ${payload.geodata.broadband.maxUploadSpeed || "unknown"} Mbps up.`
      : "Broadband context is currently unavailable.",
    payload.geodata?.floodZone
      ? `FEMA flood zone: ${payload.geodata.floodZone.label}.`
      : "FEMA flood-zone context is currently unavailable.",
    payload.geodata?.streamGauges?.[0]
      ? `Nearest USGS stream gauge: ${payload.geodata.streamGauges[0].siteName} (${payload.geodata.streamGauges[0].distanceKm.toFixed(1)} km) reporting ${payload.geodata.streamGauges[0].dischargeCfs ?? "unknown"} cfs.`
      : "USGS stream-gauge context is currently unavailable.",
    payload.geodata?.airQuality
      ? `Nearest air-quality station: ${payload.geodata.airQuality.stationName} with PM2.5 ${payload.geodata.airQuality.pm25 ?? "unknown"} ug/m3, PM10 ${payload.geodata.airQuality.pm10 ?? "unknown"} ug/m3, category ${payload.geodata.airQuality.aqiCategory}.`
      : payload.geodata?.climate?.airQualityIndex !== null &&
          payload.geodata?.climate?.airQualityIndex !== undefined
        ? `OpenAQ station unavailable; Open-Meteo AQI is ${payload.geodata.climate.airQualityIndex}.`
        : "Air-quality context is currently unavailable.",
    payload.geodata?.epaHazards
      ? `EPA screening: ${payload.geodata.epaHazards.superfundCount} Superfund sites and ${payload.geodata.epaHazards.triCount} TRI facilities within roughly 50 km; nearest Superfund site ${payload.geodata.epaHazards.nearestSuperfundName ?? "unknown"} at ${payload.geodata.epaHazards.nearestSuperfundDistanceKm ?? "unknown"} km.`
      : "EPA contamination screening is currently unavailable.",
    payload.geodata?.hazards?.earthquakeCount30d !== null &&
    payload.geodata?.hazards?.earthquakeCount30d !== undefined
      ? `Recent seismic context: ${payload.geodata.hazards.earthquakeCount30d} earthquakes within 250 km over the last 30 days; strongest magnitude ${payload.geodata.hazards.strongestEarthquakeMagnitude30d ?? "unknown"}, nearest event ${payload.geodata.hazards.nearestEarthquakeKm ?? "unknown"} km away.`
      : "Recent seismic context is currently unavailable.",
    payload.geodata?.amenities?.schoolCount !== null &&
    payload.geodata?.amenities?.schoolCount !== undefined
      ? `Mapped amenities: ${payload.geodata.amenities.schoolCount} schools, ${payload.geodata.amenities.healthcareCount ?? "unknown"} healthcare sites, ${payload.geodata.amenities.transitStopCount ?? "unknown"} transit stops, and ${payload.geodata.amenities.commercialCount ?? "unknown"} commercial venues in the active analysis area.`
      : "Mapped amenity counts are currently unavailable.",
    payload.geodata?.schoolContext
      ? payload.geodata.schoolContext.score === null
        ? `School context: ${payload.geodata.schoolContext.explanation}`
        : `GeoSight school context score: ${payload.geodata.schoolContext.score}/100 (${payload.geodata.schoolContext.band}). ${payload.geodata.schoolContext.explanation}`
      : "School context is currently unavailable.",
    topLandCover
      ? `Dominant land cover signal: ${topLandCover.label} (${topLandCover.value}%).`
      : "Land cover is currently unavailable.",
  ];

  const nextQuestions = buildNextQuestions(profile.id);
  const trendLines = payload.dataTrends?.length
    ? payload.dataTrends.slice(0, 4).map(formatTrendLine)
    : [];
  const nearbyPlaceLines = payload.nearbyPlaces?.length
    ? payload.nearbyPlaces.slice(0, 4).map(formatNearbyPlaceLine)
    : [];

  if (responseMode === "nearby_places") {
    return [
      `Mission profile: ${profile.name}`,
      `Location: ${locationLabel}`,
      "Result mode: Nearby places",
      "",
      "Suggested places:",
      ...(nearbyPlaceLines.length
        ? nearbyPlaceLines
        : [
            "- Live nearby-place results are unavailable for this category or location right now.",
          ]),
      "",
      "Why these fit:",
      `- ${buildProfileAssessmentLine(profile.id, payload.geodata)}`,
      "- Treat these as mapped nearby candidates, then zoom in or cross-check local details before making a final decision.",
      "",
      "Supported observations:",
      ...supportedFacts.map((fact) => `- ${fact}`),
      "",
      "Risks and unknowns:",
      "- Nearby-place ranking still depends on OpenStreetMap completeness for the selected area.",
      "- Fine-grained hours, reviews, fees, or closures are not available yet unless a real places data source is connected.",
      "",
      "Next questions / next zoom levels:",
      ...nextQuestions.map((question) => `- ${question}`),
    ].join("\n");
  }

  return [
    `Mission profile: ${profile.name}`,
    `Location: ${locationLabel}`,
    "Result mode: Analysis",
    "",
    "Key factors considered:",
    ...profile.factors.map((factor) => `- ${factor.label}`),
    "",
    "Evidence mix:",
    ...buildFactorEvidenceLines(profile),
    "",
    "Trend snapshot:",
    ...(trendLines.length
      ? trendLines
      : ["- Structured trend objects are not available yet, so this read relies directly on the raw geospatial context."]),
    "",
    "Supported observations:",
    ...supportedFacts.map((fact) => `- ${fact}`),
    "",
    "Assessment:",
    `- ${buildProfileAssessmentLine(profile.id, payload.geodata)}`,
    "- This is a best-effort fallback response, so anything beyond the listed map signals should be treated as inferred rather than fully verified.",
    "",
    "Risks and unknowns:",
    "- Regulations, parcel ownership, and detailed hazard layers are not yet part of this response unless explicitly provided.",
    "- Fine-grained viability still depends on closer zoom, local surveys, and any use-case-specific regulations.",
    "",
    "Next questions / next zoom levels:",
    ...nextQuestions.map((question) => `- ${question}`),
  ].join("\n");
}
