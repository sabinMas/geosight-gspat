import { DEFAULT_PROFILE } from "@/lib/profiles";
import { injectRagIntoMessages } from "@/lib/rag/inject";
import { CoreMessage } from "@/lib/rag/types";
import { formatDistanceKm, getNearestStreamGauge } from "@/lib/stream-gauges";
import {
  AnalyzeRequestBody,
  ConversationMessage,
  DataTrend,
  DataSourceMeta,
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
Response style:
- Answer in natural, conversational prose. Lead with the single most relevant result, then mention a few more.
- Do NOT use markdown headers, numbered lists, or bullet-heavy outlines.
- Name specific places with their approximate distance and direction when the data is available.
- If live nearby-place data is unavailable, say so directly instead of inventing places.
- Keep it concise — 2-4 short paragraphs max. End with one follow-up suggestion if relevant.
`;
  }

  return `
Response style:
- Answer in natural, conversational prose — like a knowledgeable colleague briefing someone at a map table.
- Lead with the direct answer to what was asked. Do NOT open with a location restatement or mission profile header.
- Do NOT use markdown headers (##), numbered lists, or bullet-heavy report outlines.
- Weave data points into sentences naturally. Say "Elevation sits around 340 m with mostly forested land cover" not "- Elevation: 340 m\\n- Land cover: Forested".
- When discussing data quality, mention it inline (e.g., "flood data comes from FEMA and looks solid here, though school coverage is limited").
- Keep it concise — 2-4 short paragraphs. End with one or two follow-up questions the user might want to explore next.
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
- Answer the specific question asked — do not give a generic area overview unless that is what was requested.
- Write in natural conversational prose. Never use markdown headers, numbered lists, or bullet-heavy outlines.
- Lead with the direct answer, then support it with 2-3 key data points woven into sentences.
- When a user asks about specific things (schools, restaurants, trails, risks), name the actual items from the data with distances and directions.
- Mention data confidence inline and briefly (e.g., "this comes from live FEMA data" or "school coverage is limited here").
- If important data is unavailable, say so in one sentence — do not dedicate a full section to it.
- Be concise and practical. 2-4 paragraphs is usually enough.
- Never present proxy heuristics as if they were direct measurements.

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
    case "home-buying":
      return [
        "Switch to nearby places mode to compare schools, groceries, parks, and daily-life context around this location.",
        "Check flood, air quality, and internet context before treating this as a strong home-buying candidate.",
      ];
    case "site-development":
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
      ? `FEMA flood zone (FEMA NFHL, derived live — US only): ${payload.geodata.floodZone.label}.`
      : "FEMA flood-zone context is currently unavailable.",
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
      ? `EPA contamination screening (EPA ECHO/TRI, derived live — US only): ${payload.geodata.epaHazards.superfundCount} Superfund sites and ${payload.geodata.epaHazards.triCount} TRI facilities within roughly 50 km; nearest Superfund site ${payload.geodata.epaHazards.nearestSuperfundName ?? "unknown"} at ${payload.geodata.epaHazards.nearestSuperfundDistanceKm ?? "unknown"} km.`
      : "EPA contamination screening is currently unavailable.",
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
      ? `Mapped amenities (OpenStreetMap, derived live): ${payload.geodata.amenities.schoolCount} schools, ${payload.geodata.amenities.healthcareCount ?? "unknown"} healthcare sites, ${payload.geodata.amenities.transitStopCount ?? "unknown"} transit stops, and ${payload.geodata.amenities.commercialCount ?? "unknown"} commercial venues in the active analysis area.`
      : "Mapped amenity counts are currently unavailable.",
    payload.geodata?.schoolContext
      ? payload.geodata.schoolContext.score === null
        ? `School context (derived live): ${payload.geodata.schoolContext.explanation}`
        : `GeoSight school context score (derived live): ${payload.geodata.schoolContext.score}/100 (${payload.geodata.schoolContext.band}). ${payload.geodata.schoolContext.explanation}`
      : "School context is currently unavailable.",
    topLandCover
      ? `Dominant land cover signal (ML classification, derived live): ${topLandCover.label} (${topLandCover.value}%).`
      : "Land cover is currently unavailable.",
  ];
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
  const questionType = classifyFallbackQuestion(payload, profile);
  const locationLabel = formatLocationLabel(payload);
  const supportedFacts = buildSupportedFacts(payload);

  const nextQuestions = buildNextQuestions(profile.id);
  const trendLines = payload.dataTrends?.length
    ? payload.dataTrends.slice(0, 4).map(formatTrendLine)
    : [];
  const nearbyPlaceLines = payload.nearbyPlaces?.length
    ? payload.nearbyPlaces.slice(0, 4).map(formatNearbyPlaceLine)
    : [];

  if (responseMode === "nearby_places") {
    const placeSentences = nearbyPlaceLines.length
      ? nearbyPlaceLines.join(", ")
      : "Live nearby-place results are unavailable for this category or location right now";

    return `Looking at ${locationLabel} through the ${profile.name} lens, the nearest mapped places include ${placeSentences}.\n\n${buildProfileAssessmentLine(profile.id, payload.geodata)} Treat these as mapped nearby candidates — zoom in or cross-check local details before making a final decision.\n\nNearby-place ranking depends on OpenStreetMap completeness for this area, and fine-grained hours, reviews, or closures are not available yet.`;
  }

  if (questionType === "source_confidence") {
    const sourceLines = [
      formatSourceConfidenceLine(payload.geodata?.sources.elevation),
      formatSourceConfidenceLine(payload.geodata?.sources.climate),
      formatSourceConfidenceLine(payload.geodata?.sources.hazards),
      formatSourceConfidenceLine(payload.geodata?.sources.school),
      formatSourceConfidenceLine(payload.geodata?.sources.groundwater),
    ].filter(Boolean);

    return `${buildSourceConfidenceSummary(payload.geodata)}\n\nThe main inputs here are ${sourceLines.join("; ")}.\n\nTreat live or derived sources as usable screening evidence, and treat limited or unavailable sources as areas where GeoSight can suggest next checks but not make a final claim.`;
  }

  if (questionType === "school_quality") {
    const schoolFacts = supportedFacts.filter((fact) =>
      fact.includes("School context") ||
      fact.includes("Mapped amenities") ||
      fact.includes("Air-quality") ||
      fact.includes("FEMA flood zone"),
    ).join(" ");

    return `${buildSchoolSummary(payload)}\n\n${schoolFacts}\n\nGeoSight can only treat school quality as strong evidence when official accountability data is loaded. Family fit also depends on neighborhood-scale checks like parks, traffic calming, and housing stock that are not fully modeled yet.`;
  }

  if (questionType === "hazard_risk") {
    const hazardFacts = supportedFacts.filter((fact) =>
      fact.includes("FEMA flood zone") ||
      fact.includes("Recent seismic") ||
      fact.includes("Global disaster") ||
      fact.includes("Air-quality") ||
      fact.includes("EPA"),
    ).join(" ");

    return `${buildHazardSummary(payload)}\n\n${hazardFacts}\n\nThis is a screening-layer risk read, not a substitute for parcel, engineering, insurance, or regulatory diligence.`;
  }

  if (questionType === "terrain_recreation") {
    const terrainFacts = supportedFacts.filter((fact) =>
      fact.includes("Elevation") ||
      fact.includes("Dominant land cover") ||
      fact.includes("Nearest mapped water") ||
      fact.includes("Current weather") ||
      fact.includes("Air-quality"),
    ).join(" ");

    return `${buildTerrainSummary(payload)}\n\n${terrainFacts}\n\nGeoSight can screen terrain character and access, but it does not yet have full trail-condition, scenic-rating, or seasonal closure coverage.`;
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

    return `${buildDevelopmentSummary(payload)}\n\n${devFacts}\n\nThis does not replace parcel-level entitlement, utilities, or local zoning review.`;
  }

  if (questionType === "infrastructure_fit") {
    const infraFacts = supportedFacts.filter((fact) =>
      fact.includes("Nearest mapped water") ||
      fact.includes("Nearest mapped power") ||
      fact.includes("Broadband") ||
      fact.includes("Road access") ||
      fact.includes("FEMA flood zone") ||
      fact.includes("Current weather"),
    ).join(" ");

    return `${buildInfrastructureSummary(payload)}\n\n${infraFacts}\n\nGeoSight can screen utility and access posture, but it does not replace utility queue, transmission, or permitting diligence.`;
  }

  const keyFacts = supportedFacts.filter((f) => !f.includes("unavailable")).slice(0, 6).join(" ");
  const trendNote = trendLines.length ? " " + trendLines.join(" ") : "";

  return `${buildProfileAssessmentLine(profile.id, payload.geodata)}\n\n${keyFacts}${trendNote}\n\nThis analysis is based on currently loaded live, derived, and mapped context — anything beyond those signals should be treated as screening-level inference. ${nextQuestions[0] ?? ""}`;
}
