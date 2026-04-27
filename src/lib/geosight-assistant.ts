import { DEFAULT_PROFILE } from "@/lib/profiles";
import { buildRagContext, injectRagIntoMessages } from "@/lib/rag/inject";
import { CoreMessage } from "@/lib/rag/types";
import { formatDistanceKm, getNearestStreamGauge } from "@/lib/stream-gauges";
import {
  AnalyzeRequestBody,
  ConversationMessage,
  DataTrend,
  DataSourceMeta,
  GeodataResult,
  LandCoverBucket,
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

type FallbackQuestionType =
  | "nearby_places"
  | "source_confidence"
  | "school_quality"
  | "hazard_risk"
  | "terrain_recreation"
  | "development_fit"
  | "infrastructure_fit"
  | "general_analysis";

function buildResponseGuidance(mode: ReturnType<typeof inferResponseMode>) {
  if (mode === "nearby_places") {
    return `
How to respond:
- Talk like a local who knows the area well — lead with the best option, then mention a couple more.
- Use plain sentences. No headers, no bullet lists.
- Name real places with rough distances when you have them. Never invent places.
- If the data isn't loaded, just say so in one sentence and move on.
- Match length to the question — a quick "what's nearby?" gets 2-3 sentences, not five paragraphs.
`;
  }

  return `
How to respond:
- Talk like a smart friend who knows this place — direct, casual, confident.
- Match your response length to the question. "Is this area safe?" gets 2-3 sentences. "Give me a full breakdown" gets a few paragraphs. Never pad.
- Start with the actual answer. Don't restate the location or the question. Don't open with "Great question!" or "Certainly!".
- Use contractions. Write "it's" not "it is", "there's" not "there is".
- Only mention data sources if the user asks about them or if the source meaningfully changes the answer (e.g., "FEMA hasn't mapped this area yet, so the flood read is a global model estimate").
- Don't list every signal you have access to — only use what's relevant to what was asked.
- No markdown headers. No numbered lists. No bullet-heavy outlines.
- Skip the follow-up question unless you genuinely think it would help the user's next step.
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
You are GeoSight — a geospatial assistant that knows a lot about real places and talks like a person, not a report.

You're helping someone using the ${profile.name} lens (${profile.tagline}). The live location data loaded into your context is your primary source of truth. Use it to give grounded, specific answers.

What this lens cares about:
${factorChecklist}

${profile.systemPrompt}

Hard rules:
- Never fabricate numbers, place names, or data you weren't given.
- If something is unavailable, say so in one sentence — don't dwell on it.
- Don't present a proxy estimate as if it's a direct measurement.
- No markdown headers. No bullet lists. No report structure.

${buildResponseGuidance(responseMode)}
`;

  return { prompt, responseMode };
}

export async function buildGeoSightMessagesWithRag(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<CoreMessage[]> {
  const { prompt } = buildGeoSightSystemPrompt(payload, profile);
  const conversationHistory = (payload.messages ?? [])
    .filter((message): message is ConversationMessage => Boolean(message?.content?.trim()))
    .map<CoreMessage>((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
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
      ...conversationHistory,
      {
        role: "user",
        content: serializedPayload,
      },
    ],
    payload.question,
  );
}

function sanitizeConversationHistory(messages?: ConversationMessage[]) {
  return (messages ?? [])
    .filter((message): message is ConversationMessage => Boolean(message?.content?.trim()))
    .map<CoreMessage>((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

function removeDuplicatedTrailingUserMessage(
  messages: CoreMessage[],
  userQuestion: string,
) {
  const trimmedQuestion = userQuestion.trim();
  if (!trimmedQuestion || !messages.length) {
    return messages;
  }

  const nextMessages = [...messages];
  const lastMessage = nextMessages.at(-1);
  if (
    lastMessage?.role === "user" &&
    lastMessage.content.trim() === trimmedQuestion
  ) {
    nextMessages.pop();
  }

  return nextMessages;
}

function summarizeNearbyPlaces(nearbyPlaces?: NearbyPlace[]) {
  if (!nearbyPlaces?.length) {
    return "- No nearby-place context loaded.";
  }

  return nearbyPlaces.slice(0, 6).map(formatNearbyPlaceLine).join("\n");
}

function summarizeTrendLines(dataTrends?: DataTrend[]) {
  if (!dataTrends?.length) {
    return "- No structured trend objects loaded.";
  }

  return dataTrends.slice(0, 6).map(formatTrendLine).join("\n");
}

function summarizeClassification(classification?: LandCoverBucket[]) {
  if (!classification?.length) {
    return "- No land-classification summary loaded.";
  }

  return classification
    .slice(0, 5)
    .map((bucket) => `- ${bucket.label}: ${bucket.value}% (confidence ${bucket.confidence}%).`)
    .join("\n");
}

function summarizeImageContext(imageSummary?: string) {
  if (!imageSummary?.trim()) {
    return "- No uploaded image summary is available for this request.";
  }

  return `- ${imageSummary.trim()}`;
}

type GroqContextBlockOptions = {
  activeLensLabel?: string;
  visibleLayers?: string[];
  ragContext?: string;
  extraContext?: string[];
};

export function buildGroqAnalysisContextBlock(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
  options: GroqContextBlockOptions = {},
) {
  const activeLensLabel = options.activeLensLabel?.trim() || profile.name;
  const visibleLayers = options.visibleLayers?.filter((layer) => layer.trim()).join(", ");
  const retrievedKnowledge = options.ragContext?.trim() || "No retrieved knowledge context.";
  const supportedFacts = buildSupportedFacts(payload)
    .slice(0, 22)
    .map((fact) => `- ${fact}`)
    .join("\n");
  const extraContext = (options.extraContext ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");

  return `
Active lens: ${activeLensLabel}
Selected location: ${formatLocationLabel(payload)}
Visible layers: ${visibleLayers || "Not provided in this request"}
Results mode: ${inferResponseMode(payload.question, payload.resultsMode) === "nearby_places" ? "nearby places" : "analysis"}

Retrieved knowledge:
${retrievedKnowledge}

Live location context:
${supportedFacts || "- No live location context loaded."}

Nearby place context:
${summarizeNearbyPlaces(payload.nearbyPlaces)}

Trend context:
${summarizeTrendLines(payload.dataTrends)}

Image context:
${summarizeImageContext(payload.imageSummary)}

Land classification:
${summarizeClassification(payload.classification?.length ? payload.classification : payload.geodata?.landClassification)}
${extraContext ? `\n\nAdditional context:\n${extraContext}` : ""}
  `.trim();
}

export async function buildGroqAnalysisMessages(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
  options: Omit<GroqContextBlockOptions, "ragContext"> = {},
): Promise<CoreMessage[]> {
  const { prompt } = buildGeoSightSystemPrompt(payload, profile);
  const conversationHistory = removeDuplicatedTrailingUserMessage(
    sanitizeConversationHistory(payload.messages),
    payload.question,
  );

  // RAG is opt-in via env flag — disabled by default to save ~750 input
  // tokens/request and skip the per-request Gemini embedding call.
  let ragContext = "";
  if (process.env.RAG_ENABLED === "true") {
    try {
      ragContext = await buildRagContext(payload.question);
    } catch (error) {
      console.warn("[RAG] Groq context assembly failed; continuing without RAG context.", error);
    }
  }

  return [
    {
      role: "system",
      content: prompt.trim(),
    },
    {
      role: "system",
      content: buildGroqAnalysisContextBlock(payload, profile, {
        ...options,
        ragContext,
      }),
    },
    ...conversationHistory,
    {
      role: "user",
      content: payload.question.trim(),
    },
  ];
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
        : "This area may have hiking potential, but the current map data is still too coarse to assess trail quality or scenic value confidently.";
    case "home-buying":
      return roadKm !== null && topLandCover
        ? `For home buying, the clearest early signals are commute access around ${roadKm.toFixed(1)} km, neighborhood-serving amenities, school context, and whatever flood and internet coverage say about daily-life fit.`
        : "For home buying, school context, flood exposure, internet readiness, and everyday amenities still need closer validation.";
    case "site-development":
      return roadKm !== null && topLandCover
        ? `For neighborhood development, the best early signals are road access at about ${roadKm.toFixed(1)} km, dominant land cover of ${topLandCover.label.toLowerCase()}, and whatever FEMA and broadband context says about risk and readiness.`
        : "For residential use, access, flood exposure, broadband readiness, and community-serving amenities still need closer validation.";
    case "commercial":
      return roadKm !== null && powerKm !== null
        ? `For commercial or warehouse siting, road access around ${roadKm.toFixed(1)} km and utility access around ${powerKm.toFixed(1)} km make this a workable first-pass candidate.`
        : "For commercial or warehouse use, transport access and utility readiness remain the biggest open questions.";
    case "energy-solar":
      return topLandCover
        ? `For energy and solar siting, the clearest signals are solar irradiance, terrain flatness, land cover type (current dominant: ${topLandCover.label.toLowerCase()}), and proximity to transmission infrastructure.`
        : "For solar and energy siting, irradiance, slope, land cover type, and grid access distance are the key screening factors.";
    case "agriculture":
      return topLandCover && elevation !== null
        ? `For agricultural screening, soil drainage, terrain slope, precipitation trend, and land cover type (current dominant: ${topLandCover.label.toLowerCase()}) at ${elevation} m elevation are the first signals to evaluate.`
        : "For agricultural use, soil quality, drainage class, precipitation history, and terrain slope are the primary screening factors.";
    case "emergency-response":
      return roadKm !== null
        ? `For emergency response planning, road access at ~${roadKm.toFixed(1)} km, water proximity, terrain passability, and active hazard alerts are the most critical context signals loaded.`
        : "For emergency response planning, access routes, water sources, terrain constraints, and active disaster alerts are the primary factors to evaluate.";
    case "field-research":
      return elevation !== null && waterKm !== null
        ? `For field research planning, this site at ${elevation} m elevation with water ~${waterKm.toFixed(1)} km away offers a baseline context — terrain complexity, access, and environmental hazards determine operational feasibility.`
        : "For field research, terrain access, water proximity, weather patterns, and any active hazards are the core operational planning signals.";
    default:
      return "This is a broad exploratory read using terrain, land cover, water, and access signals from the current map context.";
  }
}

function payloadBroadbandLine(geodata?: GeodataResult) {
  if (!geodata?.broadband) {
    return "unavailable broadband";
  }

  if (geodata.broadband.kind === "regional_household_baseline") {
    return `${geodata.broadband.regionLabel} baseline with ${
      geodata.broadband.fixedBroadbandCoveragePercent === null
        ? "unknown"
        : `${geodata.broadband.fixedBroadbandCoveragePercent.toFixed(1)}%`
    } fixed-broadband households`;
  }

  return geodata.broadband.maxDownloadSpeed <= 0
    ? `${geodata.broadband.providerCount} providers`
    : `${geodata.broadband.maxDownloadSpeed.toLocaleString()} Mbps down across ${geodata.broadband.providerCount} providers`;
}

function classifyFallbackQuestion(
  payload: AnalyzeRequestBody,
  profile: MissionProfile,
): FallbackQuestionType {
  const normalized = payload.question.toLowerCase();
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);

  if (responseMode === "nearby_places") {
    return "nearby_places";
  }

  if (
    includesAny(normalized, [
      "source",
      "confidence",
      "trust",
      "grounding",
      "grounded",
      "provenance",
      "freshness",
      "coverage",
      "fallback",
    ])
  ) {
    return "source_confidence";
  }

  if (
    includesAny(normalized, [
      "school",
      "district",
      "family",
      "families",
      "children",
      "child",
      "kids",
      "parent",
      "homebuyer",
      "young children",
    ])
  ) {
    return "school_quality";
  }

  if (
    includesAny(normalized, [
      "hazard",
      "risk",
      "flood",
      "fema",
      "earthquake",
      "seismic",
      "fire",
      "wildfire",
      "contamination",
      "superfund",
      "tri",
      "safe",
    ])
  ) {
    return "hazard_risk";
  }

  if (
    profile.id === "hiking" ||
    includesAny(normalized, [
      "hike",
      "trail",
      "terrain",
      "slope",
      "elevation",
      "view",
      "scenic",
      "recreation",
      "outdoor",
    ])
  ) {
    return "terrain_recreation";
  }

  if (
    profile.id === "home-buying" ||
    profile.id === "site-development" ||
    includesAny(normalized, [
      "neighborhood",
      "neighbourhood",
      "residential",
      "housing",
      "home",
      "buy",
      "buyer",
      "build",
      "suburban",
      "suburb",
      "community",
    ])
  ) {
    return "development_fit";
  }

  if (
    profile.id === "data-center" ||
    profile.id === "commercial" ||
    includesAny(normalized, [
      "data center",
      "datacenter",
      "warehouse",
      "industrial",
      "commercial",
      "substation",
      "power",
      "broadband",
      "cooling",
      "hyperscale",
      "logistics",
      "infrastructure",
    ])
  ) {
    return "infrastructure_fit";
  }

  return "general_analysis";
}

function buildSupportedFacts(payload: AnalyzeRequestBody) {
  const topLandCover = pickTopLandCover(payload.geodata);
  const nearestGauge = getNearestStreamGauge(payload.geodata);

  return [
    payload.geodata?.elevationMeters !== null && payload.geodata?.elevationMeters !== undefined
      ? `Elevation is about ${payload.geodata.elevationMeters} m. (Mapbox DEM, direct live)`
      : "Elevation is currently unavailable.",
    payload.geodata?.climate?.currentTempC !== null &&
    payload.geodata?.climate?.currentTempC !== undefined
      ? `Current weather snapshot (Open-Meteo, direct live): ${payload.geodata.climate.currentTempC.toFixed(1)} C now, wind ${payload.geodata.climate.windSpeedKph ?? "unknown"} km/h, AQI ${payload.geodata.climate.airQualityIndex ?? "unknown"}.`
      : "Current weather snapshot is currently unavailable.",
    payload.geodata?.weatherForecast?.length
      ? `7-day weather forecast (Open-Meteo, direct live): ${payload.geodata.weatherForecast
          .slice(0, 7)
          .map(
            (day, i) =>
              `${i === 0 ? "Today" : day.dayLabel} ${day.conditionLabel ?? "—"} ${day.highTempC !== null ? `H ${Math.round(day.highTempC)}C` : ""} ${day.lowTempC !== null ? `L ${Math.round(day.lowTempC)}C` : ""} ${day.precipitationProbability !== null ? `${day.precipitationProbability}% rain` : ""}`.trim(),
          )
          .join(" | ")}.`
      : "7-day weather forecast is currently unavailable.",
    payload.geodata?.nearestWaterBody
      ? `Nearest mapped water feature (OpenStreetMap, derived live): ${payload.geodata.nearestWaterBody.name} (${payload.geodata.nearestWaterBody.distanceKm ?? "unknown"} km).`
      : "Water proximity is currently unavailable.",
    payload.geodata?.nearestRoad
      ? `Nearest mapped road access (OpenStreetMap, derived live): ${payload.geodata.nearestRoad.name} (${payload.geodata.nearestRoad.distanceKm ?? "unknown"} km).`
      : "Road access is currently unavailable.",
    payload.geodata?.nearestPower
      ? `Nearest mapped power infrastructure (OpenStreetMap, derived live): ${payload.geodata.nearestPower.name} (${payload.geodata.nearestPower.distanceKm ?? "unknown"} km).`
      : "Power access is currently unavailable.",
    payload.geodata?.broadband
      ? payload.geodata.broadband.kind === "regional_household_baseline"
        ? `Broadband context (Eurostat, proxy regional): ${payload.geodata.broadband.regionLabel} country-level baseline with ${payload.geodata.broadband.fixedBroadbandCoveragePercent ?? "unknown"}% fixed-broadband households and ${payload.geodata.broadband.mobileBroadbandCoveragePercent ?? "unknown"}% mobile-broadband households.`
        : `Broadband context (FCC BroadbandMap, derived live): ${payload.geodata.broadband.providerCount} providers with up to ${payload.geodata.broadband.maxDownloadSpeed || "unknown"} Mbps down and ${payload.geodata.broadband.maxUploadSpeed || "unknown"} Mbps up.`
      : "Broadband context is currently unavailable.",
    payload.geodata?.floodZone
      ? payload.geodata.floodZone.source === "glofas"
        ? `River discharge context (GloFAS via Open-Meteo, derived live — global): ${payload.geodata.floodZone.dischargeRiskLabel ?? "Unknown"} discharge — peak ${payload.geodata.floodZone.peakDischargeCms?.toFixed(0) ?? "unknown"} m³/s (7-day forecast). Scale: Low <50 / Moderate 50–500 / Significant 500–2,000 / Major >2,000 m³/s.`
        : `FEMA flood zone (FEMA NFHL, derived live — US only): ${payload.geodata.floodZone.label}.`
      : "Flood-zone or river-discharge context is currently unavailable.",
    nearestGauge
      ? `Nearest USGS stream gauge (USGS NWIS, direct live): ${nearestGauge.siteName} (${formatDistanceKm(nearestGauge.distanceKm, "unknown distance")}) reporting ${nearestGauge.dischargeCfs ?? "unknown"} cfs.`
      : "USGS stream-gauge context is currently unavailable.",
    payload.geodata?.airQuality
      ? `Nearest air-quality station (OpenAQ, direct live): ${payload.geodata.airQuality.stationName} with PM2.5 ${payload.geodata.airQuality.pm25 ?? "unknown"} ug/m3, PM10 ${payload.geodata.airQuality.pm10 ?? "unknown"} ug/m3, category ${payload.geodata.airQuality.aqiCategory}.`
      : payload.geodata?.climate?.airQualityIndex !== null &&
          payload.geodata?.climate?.airQualityIndex !== undefined
        ? `OpenAQ station unavailable; Open-Meteo AQI is ${payload.geodata.climate.airQualityIndex}. (Open-Meteo, derived live)`
        : "Air-quality context is currently unavailable.",
    payload.geodata?.epaHazards
      ? payload.geodata.epaHazards.source === "eea"
        ? `EEA E-PRTR contamination screening (EEA industrial registry, derived live — EU/EEA): ${payload.geodata.epaHazards.superfundCount} registered industrial facilities within roughly 50 km; nearest facility ${payload.geodata.epaHazards.nearestSuperfundName ?? "unknown"} at ${payload.geodata.epaHazards.nearestSuperfundDistanceKm ?? "unknown"} km.`
        : `EPA contamination screening (EPA Envirofacts CERCLIS/TRI, derived live — US only): ${payload.geodata.epaHazards.superfundCount} Superfund sites and ${payload.geodata.epaHazards.triCount} TRI facilities within roughly 50 km; nearest Superfund site ${payload.geodata.epaHazards.nearestSuperfundName ?? "unknown"} at ${payload.geodata.epaHazards.nearestSuperfundDistanceKm ?? "unknown"} km.`
      : "Contamination screening is currently unavailable.",
    payload.geodata?.hazards?.earthquakeCount30d !== null &&
    payload.geodata?.hazards?.earthquakeCount30d !== undefined
      ? `Recent seismic context (USGS FDSN, direct live): ${payload.geodata.hazards.earthquakeCount30d} earthquakes within 250 km over the last 30 days; strongest magnitude ${payload.geodata.hazards.strongestEarthquakeMagnitude30d ?? "unknown"}, nearest event ${payload.geodata.hazards.nearestEarthquakeKm ?? "unknown"} km away.`
      : "Recent seismic context is currently unavailable.",
    payload.geodata?.hazardAlerts
      ? `Global disaster alerts (GDACS, direct live): ${payload.geodata.hazardAlerts.totalCurrentAlerts} current events worldwide; ${payload.geodata.hazardAlerts.elevatedCurrentAlerts} elevated (orange/red); nearest event ${payload.geodata.hazardAlerts.nearestAlert ? `${payload.geodata.hazardAlerts.nearestAlert.eventLabel} at ${payload.geodata.hazardAlerts.nearestAlert.distanceKm ?? "unknown"} km (${payload.geodata.hazardAlerts.nearestAlert.alertLevel})` : "none with known distance"}.`
      : "Global disaster alert context (GDACS) is currently unavailable.",
    payload.geodata?.demographics?.population !== null &&
    payload.geodata?.demographics?.population !== undefined
      ? `Area demographics (${payload.geodata.sources.demographics.provider}, derived live — ${payload.geodata.demographics.geographicGranularity}-level, ${payload.geodata.demographics.populationReferenceYear ?? "latest"}): ${new Intl.NumberFormat("en-US").format(payload.geodata.demographics.population)} population; median income ${payload.geodata.demographics.medianHouseholdIncome !== null ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(payload.geodata.demographics.medianHouseholdIncome)}` : "unavailable"}${payload.geodata.demographics.medianHomeValue !== null ? `; median home value ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(payload.geodata.demographics.medianHomeValue)}` : ""}. ${payload.geodata.demographics.incomeDefinition ?? ""}`
      : "Area demographics are currently unavailable.",
    payload.geodata?.amenities?.schoolCount !== null &&
    payload.geodata?.amenities?.schoolCount !== undefined
      ? `Mapped amenities (OpenStreetMap, derived live): ${payload.geodata.amenities.schoolCount} schools, ${payload.geodata.amenities.healthcareCount ?? "unknown"} healthcare sites, ${payload.geodata.amenities.transitStopCount ?? "unknown"} transit stops, ${payload.geodata.amenities.commercialCount ?? "unknown"} commercial venues, and ${payload.geodata.amenities.trailheadCount ?? "unknown"} mapped trailheads in the active analysis area. Note: trailhead counts are available but detailed names, coordinates, and trail descriptions are not in the live dataset.`
      : "Mapped amenity counts are currently unavailable.",
    payload.geodata?.schoolContext
      ? payload.geodata.schoolContext.score === null
        ? `School context (derived live): ${payload.geodata.schoolContext.explanation}`
        : `GeoSight school context score (derived live): ${payload.geodata.schoolContext.score}/100 (${payload.geodata.schoolContext.band}). ${payload.geodata.schoolContext.explanation}`
      : "School context is currently unavailable.",
    topLandCover
      ? `Dominant land cover signal (ML classification, derived live): ${topLandCover.label} (${topLandCover.value}%).`
      : "Land cover is currently unavailable.",
    payload.geodata?.soilProfile &&
    Object.values(payload.geodata.soilProfile).some((v) => v !== null)
      ? `Soil profile (${payload.geodata.sources.soilProfile.provider}, derived live): drainage class ${payload.geodata.soilProfile.drainageClass ?? "unknown"}, hydrologic group ${payload.geodata.soilProfile.hydrologicGroup ?? "unknown"}, dominant texture ${payload.geodata.soilProfile.dominantTexture ?? "unknown"}${payload.geodata.soilProfile.mapUnitName ? ` (${payload.geodata.soilProfile.mapUnitName})` : ""}.`
      : "Soil profile data is currently unavailable.",
    payload.geodata?.seismicDesign &&
    [payload.geodata.seismicDesign.ss, payload.geodata.seismicDesign.s1, payload.geodata.seismicDesign.pga].some((v) => v !== null)
      ? `Seismic design parameters (USGS ASCE 7-22, direct live — US only): PGA ${payload.geodata.seismicDesign.pga?.toFixed(2) ?? "unknown"} g, Ss ${payload.geodata.seismicDesign.ss?.toFixed(2) ?? "unknown"} g, S1 ${payload.geodata.seismicDesign.s1?.toFixed(2) ?? "unknown"} g, site class ${payload.geodata.seismicDesign.siteClass ?? "unknown"}.`
      : "USGS seismic design parameters are US-only; use the earthquake catalog seismicity context for non-US locations.",
    payload.geodata?.climateHistory && payload.geodata.climateHistory.summaries.length > 0
      ? (() => {
          const ch = payload.geodata!.climateHistory!;
          const delta =
            ch.recentAvgTempC !== null && ch.baselineAvgTempC !== null
              ? ch.recentAvgTempC - ch.baselineAvgTempC
              : null;
          return `Historical climate trend (Open-Meteo ERA5, derived live — 2015–2024): temperature trend is ${ch.trendDirection ?? "unknown"}${delta !== null ? ` (recent avg ${ch.recentAvgTempC?.toFixed(1)}°C vs baseline ${ch.baselineAvgTempC?.toFixed(1)}°C, Δ${delta > 0 ? "+" : ""}${delta.toFixed(1)}°C)` : ""}; ${ch.summaries.length} year summaries available.`;
        })()
      : "Historical climate trend data is currently unavailable.",
    payload.geodata?.solarResource && payload.geodata.solarResource.annualGhiKwhM2Day !== null
      ? `Solar resource (NASA POWER, direct live — global 22-year average): annual GHI ${payload.geodata.solarResource.annualGhiKwhM2Day.toFixed(2)} kWh/m²/day, peak sun hours ${payload.geodata.solarResource.peakSunHours?.toFixed(1) ?? "unknown"}, clearness index ${payload.geodata.solarResource.clearnessIndex?.toFixed(2) ?? "unknown"}.`
      : "Solar resource data is currently unavailable.",
    payload.geodata?.climate?.coolingDegreeDays !== null &&
    payload.geodata?.climate?.coolingDegreeDays !== undefined &&
    payload.geodata?.climate?.averageTempC !== null
      ? `Thermal load context (Open-Meteo, derived live): average temperature ${payload.geodata.climate.averageTempC?.toFixed(1) ?? "unknown"}°C, cooling degree days ${payload.geodata.climate.coolingDegreeDays}, wind ${payload.geodata.climate.windSpeedKph ?? "unknown"} km/h.`
      : null,
    payload.geodata?.hazards?.activeFireCount7d !== null &&
    payload.geodata?.hazards?.activeFireCount7d !== undefined
      ? `Wildfire proximity (NASA FIRMS, direct live): ${payload.geodata.hazards.activeFireCount7d} active fire detections within range over the last 7 days; nearest fire ${payload.geodata.hazards.nearestFireKm !== null ? `${payload.geodata.hazards.nearestFireKm.toFixed(0)} km away` : "distance unknown"}.`
      : "NASA FIRMS wildfire proximity data is currently unavailable (fire proximity score defaults to 0).",
    payload.geodata?.groundwater?.wellCount !== null &&
    payload.geodata?.groundwater?.wellCount !== undefined
      ? payload.geodata.groundwater.wellCount > 0
        ? `Groundwater wells (USGS WaterWatch, direct live — US only): ${payload.geodata.groundwater.wellCount} monitoring wells nearby; nearest well ${payload.geodata.groundwater.nearestWell ? `at ${payload.geodata.groundwater.nearestWell.distanceKm?.toFixed(1) ?? "unknown"} km (${payload.geodata.groundwater.nearestWell.siteName ?? "unnamed site"})` : "unknown"}.`
        : "Groundwater (USGS WaterWatch, US only): no monitoring wells found in the search area — this may indicate low-density coverage rather than an absence of groundwater."
      : "Groundwater monitoring data is currently unavailable.",
    payload.geodata?.climateHistory && payload.geodata.climateHistory.summaries.length > 0
      ? (() => {
          const ch = payload.geodata!.climateHistory!;
          const summaries = ch.summaries;
          const recentYears = summaries.slice(-5);
          const baselineYears = summaries.slice(0, 5);
          const avgPrecip = (years: typeof summaries) => {
            const vals = years.map((s) => s.totalPrecipitationMm).filter((v) => v !== null) as number[];
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          };
          const recentPrecip = avgPrecip(recentYears);
          const baselinePrecip = avgPrecip(baselineYears);
          const precipDelta = recentPrecip !== null && baselinePrecip !== null ? recentPrecip - baselinePrecip : null;
          return precipDelta !== null
            ? `Drought / precipitation context (Open-Meteo ERA5, derived live): recent 5-year average precipitation ${recentPrecip!.toFixed(0)} mm/yr vs baseline ${baselinePrecip!.toFixed(0)} mm/yr (${precipDelta > 0 ? "+" : ""}${precipDelta.toFixed(0)} mm shift); temperature trend is ${ch.trendDirection ?? "unknown"}.`
            : null;
        })()
      : null,
  ].filter((fact): fact is string => fact !== null);
}

function formatSourceConfidenceLine(source: DataSourceMeta | null | undefined) {
  if (!source) {
    return "";
  }

  return `${source.label} (${source.status}, ${source.freshness})`;
}

function buildSourceConfidenceSummary(geodata?: GeodataResult) {
  if (!geodata) {
    return "GeoSight cannot explain source confidence yet because the live location context has not finished loading.";
  }

  const limitedSources = [
    geodata.sources.school,
    geodata.sources.groundwater,
    geodata.sources.soilProfile,
    geodata.sources.airQuality,
  ].filter((source) => source.status !== "live");

  if (limitedSources.length > 0) {
    return `Most of the current read is grounded, but ${limitedSources[0].label.toLowerCase()} is still marked ${limitedSources[0].status}, so conclusions in that area should stay at screening depth.`;
  }

  return "The current read is mostly supported by live or derived source metadata, so the main caution is normal screening-level diligence rather than a missing-provider problem.";
}

function buildSchoolSummary(payload: AnalyzeRequestBody) {
  const schoolContext = payload.geodata?.schoolContext;
  if (schoolContext?.score !== null && schoolContext?.score !== undefined) {
    return `GeoSight currently scores the local school context at ${schoolContext.score}/100 (${schoolContext.band}), so there is enough signal for an early family-oriented screen.`;
  }

  if (schoolContext?.explanation) {
    return `GeoSight has only partial school-quality coverage here: ${schoolContext.explanation}`;
  }

  if (
    payload.geodata?.amenities?.schoolCount !== null &&
    payload.geodata?.amenities?.schoolCount !== undefined
  ) {
    return `GeoSight can see ${payload.geodata.amenities.schoolCount} mapped schools nearby, but direct school-quality coverage is not loaded yet for a stronger answer.`;
  }

  return "GeoSight does not have enough school context loaded yet to directly rank this place for families.";
}

function buildHazardSummary(payload: AnalyzeRequestBody) {
  const isFloodRisk = payload.geodata?.floodZone?.isSpecialFloodHazard;
  const contaminationCount = payload.geodata?.epaHazards?.superfundCount ?? 0;
  const recentEarthquakes = payload.geodata?.hazards?.earthquakeCount30d ?? 0;
  const aqi = payload.geodata?.climate.airQualityIndex;
  const elevatedGdacs = payload.geodata?.hazardAlerts?.elevatedCurrentAlerts ?? 0;
  const redGdacs = payload.geodata?.hazardAlerts?.redCurrentAlerts ?? 0;

  if (redGdacs > 0 || isFloodRisk || contaminationCount > 0 || (aqi !== null && aqi !== undefined && aqi >= 100)) {
    return "There are meaningful loaded hazard signals here, so this location should be treated as a review-first site rather than a clean yes/no candidate.";
  }

  if (elevatedGdacs > 0 || recentEarthquakes > 0 || payload.geodata?.floodZone || payload.geodata?.epaHazards) {
    return "No single loaded hazard dominates yet, but GeoSight does have enough risk context to justify a closer look before making a final decision.";
  }

  return "GeoSight does not have enough loaded hazard coverage yet to make a strong risk call.";
}

function buildTerrainSummary(payload: AnalyzeRequestBody) {
  const elevation = payload.geodata?.elevationMeters;
  const waterKm = payload.geodata?.nearestWaterBody.distanceKm;
  const topLandCover = pickTopLandCover(payload.geodata);

  if (elevation !== null && elevation !== undefined && waterKm !== null && waterKm !== undefined) {
    return `The terrain and recreation signal looks most promising where elevation, vegetation, and water features line up, and this location already has that basic mix loaded.`;
  }

  if (topLandCover) {
    return `GeoSight can see a ${topLandCover.label.toLowerCase()} land-cover pattern here, but finer terrain and recreation quality still need a closer map read.`;
  }

  return "GeoSight does not have enough terrain context loaded yet for a strong recreation or topography answer.";
}

function buildDevelopmentSummary(payload: AnalyzeRequestBody) {
  const roadKm = payload.geodata?.nearestRoad.distanceKm;
  const floodLabel = payload.geodata?.floodZone?.label;
  const broadbandSignal =
    payload.geodata?.broadband?.kind === "regional_household_baseline"
      ? payload.geodata.broadband.fixedBroadbandCoveragePercent
      : payload.geodata?.broadband?.providerCount;
  const schoolScore = payload.geodata?.schoolContext?.score;

  if (
    roadKm !== null &&
    roadKm !== undefined &&
    broadbandSignal !== null &&
    broadbandSignal !== undefined
  ) {
    const schoolClause =
      schoolScore !== null && schoolScore !== undefined
        ? ` School context is ${schoolScore}/100.`
        : "";
    return `This location has enough early neighborhood-readiness context to screen access, services, and basic constraints.${schoolClause} ${floodLabel ? `Flood posture is ${floodLabel}.` : ""}`.trim();
  }

  return "GeoSight can frame some neighborhood-fit signals here, but it still lacks a few of the family and buildability inputs needed for a confident development answer.";
}

function buildInfrastructureSummary(payload: AnalyzeRequestBody) {
  const waterKm = payload.geodata?.nearestWaterBody.distanceKm;
  const powerKm = payload.geodata?.nearestPower.distanceKm;
  const broadband =
    payload.geodata?.broadband?.kind === "regional_household_baseline"
      ? payload.geodata.broadband.fixedBroadbandCoveragePercent
      : payload.geodata?.broadband?.maxDownloadSpeed;

  if (
    waterKm !== null &&
    waterKm !== undefined &&
    powerKm !== null &&
    powerKm !== undefined
  ) {
    return `This location has enough infrastructure context loaded to judge water, power, and access at a screening level${
      broadband
        ? payload.geodata?.broadband?.kind === "regional_household_baseline"
          ? `, with a country-level fixed-broadband household baseline around ${broadband}%`
          : `, with broadband currently topping out at ${broadband} Mbps down`
        : ""
    }.`;
  }

  return "GeoSight can only make a partial infrastructure read here until more power, access, or utility context is loaded.";
}

function formatNearbyPlaceLine(place: NearbyPlace) {
  const distance = place.distanceKm === null ? "distance unknown" : `${place.distanceKm.toFixed(1)} km`;
  return `${place.name} (${place.category}, ${distance} ${place.relativeLocation})`;
}

function formatTrendLine(trend: DataTrend) {
  return `${trend.label} is ${trend.value} — ${trend.detail}`;
}

const GEO_KEYWORDS = [
  "flood", "seismic", "earthquake", "terrain", "elevation", "slope", "soil",
  "risk", "hazard", "climate", "air", "quality", "aqi", "score", "location",
  "site", "land", "water", "fire", "wildfire", "drought", "storm", "wind",
  "nearby", "distance", "access", "road", "building", "infrastructure",
  "school", "neighborhood", "housing", "home", "hike", "trail", "outdoor",
  "temperature", "precipitation", "rainfall", "snow", "fog", "humidity",
  "source", "trust", "coverage", "data", "signal", "map", "region", "area",
  "coordinate", "lat", "lng", "place", "city", "county", "state", "country",
  "altitude", "topograph", "geograph", "geology", "hydro",
];

export function buildFallbackAssessment(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
) {
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);
  const questionType = classifyFallbackQuestion(payload, profile);

  // Decline gracefully for clearly off-topic questions (no geo keywords and no geodata context)
  const normalizedQ = payload.question?.toLowerCase() ?? "";
  const hasGeoKeyword = GEO_KEYWORDS.some((kw) => normalizedQ.includes(kw));
  const hasLocationContext = !!(payload.geodata || payload.locationName || payload.location);
  if (!hasGeoKeyword && !hasLocationContext && normalizedQ.length > 0) {
    return "I'm a location intelligence assistant — I can only answer questions about a specific site (terrain, climate, hazards, access, scores, and nearby places). Try asking something about this location.";
  }
  const locationLabel = formatLocationLabel(payload);
  const supportedFacts = buildSupportedFacts(payload);

  const trendLines = payload.dataTrends?.length
    ? payload.dataTrends.slice(0, 4).map(formatTrendLine)
    : [];
  const nearbyPlaceLines = payload.nearbyPlaces?.length
    ? payload.nearbyPlaces.slice(0, 4).map(formatNearbyPlaceLine)
    : [];

  if (responseMode === "nearby_places") {
    const placeSentences = nearbyPlaceLines.length
      ? nearbyPlaceLines.join(", ")
      : "nearby place data isn't loaded for this spot yet";

    return `Around ${locationLabel}, the closest mapped options are ${placeSentences}. These come from OpenStreetMap, so hours and closures aren't tracked — worth a quick check before heading out.`;
  }

  if (questionType === "source_confidence") {
    const sourceLines = [
      formatSourceConfidenceLine(payload.geodata?.sources.elevation),
      formatSourceConfidenceLine(payload.geodata?.sources.climate),
      formatSourceConfidenceLine(payload.geodata?.sources.hazards),
      formatSourceConfidenceLine(payload.geodata?.sources.school),
      formatSourceConfidenceLine(payload.geodata?.sources.groundwater),
    ].filter(Boolean);

    return `${buildSourceConfidenceSummary(payload.geodata)} The main inputs are ${sourceLines.join("; ")}. Live and derived sources are solid for screening — anything marked limited or unavailable is where you'd want to dig deeper before making a call.`;
  }

  if (questionType === "school_quality") {
    const schoolFacts = supportedFacts.filter((fact) =>
      fact.includes("School context") ||
      fact.includes("Mapped amenities") ||
      fact.includes("Air-quality") ||
      fact.includes("FEMA flood zone"),
    ).join(" ");

    return `${buildSchoolSummary(payload)} ${schoolFacts}`;
  }

  if (questionType === "hazard_risk") {
    const hazardFacts = supportedFacts.filter((fact) =>
      fact.includes("FEMA flood zone") ||
      fact.includes("River discharge") ||
      fact.includes("USGS stream gauge") ||
      fact.includes("Recent seismic") ||
      fact.includes("Global disaster") ||
      fact.includes("Air-quality") ||
      fact.includes("EPA") ||
      fact.includes("Wildfire"),
    ).join(" ");

    return `${buildHazardSummary(payload)} ${hazardFacts}`;
  }

  if (questionType === "terrain_recreation") {
    const terrainFacts = supportedFacts.filter((fact) =>
      fact.includes("Elevation") ||
      fact.includes("Dominant land cover") ||
      fact.includes("Nearest mapped water") ||
      fact.includes("USGS stream gauge") ||
      fact.includes("Current weather") ||
      fact.includes("Historical climate trend") ||
      fact.includes("Air-quality"),
    ).join(" ");

    return `${buildTerrainSummary(payload)} ${terrainFacts}`;
  }

  if (questionType === "development_fit") {
    const devFacts = supportedFacts.filter((fact) =>
      fact.includes("Road access") ||
      fact.includes("Broadband") ||
      fact.includes("Mapped amenities") ||
      fact.includes("School context") ||
      fact.includes("FEMA flood zone") ||
      fact.includes("Dominant land cover"),
    ).join(" ");

    return `${buildDevelopmentSummary(payload)} ${devFacts}`;
  }

  if (questionType === "infrastructure_fit") {
    const infraFacts = supportedFacts.filter((fact) =>
      fact.includes("Nearest mapped water") ||
      fact.includes("Nearest mapped power") ||
      fact.includes("Broadband") ||
      fact.includes("Road access") ||
      fact.includes("FEMA flood zone") ||
      fact.includes("River discharge") ||
      fact.includes("Solar resource") ||
      fact.includes("Thermal load") ||
      fact.includes("Current weather") ||
      fact.includes("Historical climate trend"),
    ).join(" ");

    return `${buildInfrastructureSummary(payload)} ${infraFacts}`;
  }

  const keyFacts = supportedFacts.filter((f) => !f.includes("unavailable")).slice(0, 6).join(" ");
  const trendNote = trendLines.length ? " " + trendLines.join(" ") : "";

  return `${buildProfileAssessmentLine(profile.id, payload.geodata)} ${keyFacts}${trendNote}`;
}
