import {
  AnalyzeRequestBody,
  DataTrend,
  GeodataResult,
  NearbyPlace,
  ResultsMode,
  UseCaseType,
} from "@/types";

export const USE_CASE_LABELS: Record<UseCaseType, string> = {
  data_center_cooling: "Data center cooling",
  outdoor_recreation: "Outdoor recreation",
  places_discovery: "Places discovery",
  residential_development: "Residential development",
  retail_commercial: "Retail and commercial development",
  warehouse_logistics: "Warehouse and logistics",
  general_exploration: "General exploration",
};

export const STARTER_PROMPTS = [
  "Give me a quick overview of this place.",
  "What are some good hikes near this location?",
  "Are there interesting restaurants in this area?",
  "What neighborhoods around here might work for new housing?",
  "What risks or constraints stand out at this location?",
] as const;

const USE_CASE_FACTORS: Record<UseCaseType, string[]> = {
  data_center_cooling: [
    "water source proximity and intake practicality",
    "climate and temperature profile",
    "terrain, slope, and elevation",
    "power and grid access",
    "environmental or regulatory constraints",
  ],
  outdoor_recreation: [
    "terrain variety, slope, and access",
    "water, views, and scenic assets",
    "ecological sensitivity and hazards",
    "trail connectivity and visitor access",
    "weather and seasonal usability",
  ],
  places_discovery: [
    "nearby activity clusters and amenity mix",
    "ease of access and relative distance from the selected point",
    "fit between the requested place type and the surrounding context",
    "distinctive attributes that help the user choose between options",
    "any major unknowns caused by limited live place data",
  ],
  residential_development: [
    "terrain, flood, and hazard exposure",
    "road access and supporting infrastructure",
    "developable land cover and parcel readiness",
    "water and utility context",
    "major environmental or permitting constraints",
  ],
  retail_commercial: [
    "road visibility and access",
    "surrounding activity nodes and compatibility",
    "land readiness and development constraints",
    "utilities and service access",
    "site risks that could affect operations",
  ],
  warehouse_logistics: [
    "highway and freight access",
    "terrain and grading complexity",
    "land availability and industrial suitability",
    "power access and operational constraints",
    "flood, environmental, or permitting risks",
  ],
  general_exploration: [
    "terrain and physical geography",
    "access and nearby infrastructure",
    "water and natural features",
    "land cover and development signals",
    "major constraints, risks, and unknowns",
  ],
};

function includesAny(question: string, matches: string[]) {
  return matches.some((term) => question.includes(term));
}

export function inferUseCase(question: string): UseCaseType {
  const normalized = question.toLowerCase();

  if (
    includesAny(normalized, [
      "data center",
      "datacenter",
      "cooling",
      "hyperscale",
      "server farm",
      "compute campus",
    ])
  ) {
    return "data_center_cooling";
  }

  if (
    includesAny(normalized, [
      "hike",
      "trail",
      "recreation",
      "camp",
      "park",
      "outdoor",
      "bike",
    ])
  ) {
    return "outdoor_recreation";
  }

  if (
    includesAny(normalized, [
      "restaurant",
      "food",
      "eat",
      "coffee",
      "bar",
      "brewery",
      "things to do",
      "places",
      "nearby",
    ])
  ) {
    return "places_discovery";
  }

  if (
    includesAny(normalized, [
      "residential",
      "housing",
      "neighborhood",
      "homes",
      "subdivision",
      "apartments",
      "residents",
    ])
  ) {
    return "residential_development";
  }

  if (
    includesAny(normalized, [
      "retail",
      "commercial",
      "store",
      "shopping",
      "mixed-use",
      "office park",
    ])
  ) {
    return "retail_commercial";
  }

  if (
    includesAny(normalized, [
      "warehouse",
      "distribution",
      "logistics",
      "fulfillment",
      "industrial",
      "freight",
    ])
  ) {
    return "warehouse_logistics";
  }

  return "general_exploration";
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
- If the user asks about hikes or trails, mention difficulty, terrain, and scenic qualities when possible.
- If the user asks about restaurants or places, mention type, vibe, and any practical access cues when possible.
- End with a short summary and 1-2 follow-up suggestions.
`;
  }

  return `
Response format guidance:
- Lead with a concise summary of the area.
- Use the available structured data trends and map context to support your reasoning.
- Present a few concrete findings, then explain pros, cons, and unknowns.
- End with next questions or next zoom levels the user should explore.
`;
}

export function buildGeoSightSystemPrompt(payload: AnalyzeRequestBody) {
  const useCase = inferUseCase(payload.question);
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);
  const useCaseChecklist = USE_CASE_FACTORS[useCase].map((item) => `- ${item}`).join("\n");

  const prompt = `
You are GeoSight, an AI-powered geospatial intelligence assistant.

Core mission:
- GeoSight is a multi-purpose platform for asking open-ended questions about any location on Earth.
- Treat the selected location as the center of the answer.
- Data center cooling is only one optional use case; it is not the default voice or framing.

Current question's inferred use case:
- ${USE_CASE_LABELS[useCase]}

Current response mode:
- ${responseMode === "nearby_places" ? "Nearby places / lists" : "Area analysis / trends"}

Use case checklist:
${useCaseChecklist}

Behavior rules:
- Restate the active location clearly.
- Separate supported observations from approximations or inference.
- Use any structured nearby-place results or trend objects included in the input JSON.
- If structured nearby places are placeholders, say that clearly rather than implying live POI data.
- Be concise, practical, and grounded in the selected place.
- When the question is about data center cooling, explicitly emphasize water access, climate, terrain, grid access, and environmental or regulatory constraints.

${buildResponseGuidance(responseMode)}
`;

  return { prompt, useCase, responseMode };
}

function pickTopLandCover(geodata?: GeodataResult) {
  if (!geodata?.landClassification?.length) {
    return null;
  }

  return [...geodata.landClassification].sort((a, b) => b.value - a.value)[0];
}

function buildAssessmentLine(useCase: UseCaseType, geodata?: GeodataResult) {
  if (!geodata) {
    return "Only limited map context is available, so this is a qualitative first-pass assessment.";
  }

  const waterKm = geodata.nearestWaterBody.distanceKm;
  const roadKm = geodata.nearestRoad.distanceKm;
  const powerKm = geodata.nearestPower.distanceKm;
  const elevation = geodata.elevationMeters;
  const topLandCover = pickTopLandCover(geodata);

  switch (useCase) {
    case "data_center_cooling":
      return waterKm !== null && powerKm !== null
        ? `This location looks strongest when water access and power access are both short-haul; right now water is about ${waterKm.toFixed(1)} km away and power is about ${powerKm.toFixed(1)} km away.`
        : "This location could be workable for cooling infrastructure, but the most important signals remain water access and nearby power availability.";
    case "outdoor_recreation":
      return elevation !== null && waterKm !== null
        ? `The terrain and natural feature mix suggest a recreation read based on elevation around ${elevation} m and water access roughly ${waterKm.toFixed(1)} km away.`
        : "This area may have recreation potential, but the current map data is too coarse to judge trail quality or scenic value confidently.";
    case "places_discovery":
      return roadKm !== null
        ? `This place looks workable for nearby-place discovery because it has usable access context and a recognizably active surrounding area within a few kilometers.`
        : "This area can still support place discovery, but the current inputs are missing some access context that would help rank options more confidently.";
    case "residential_development":
      return roadKm !== null && topLandCover
        ? `For housing, the strongest early signals are road access at about ${roadKm.toFixed(1)} km and dominant land cover of ${topLandCover.label.toLowerCase()}.`
        : "For residential use, road access, hazard exposure, and parcel readiness still need closer validation.";
    case "retail_commercial":
      return roadKm !== null
        ? `For commercial development, access is the main early proxy we have, and major road access is about ${roadKm.toFixed(1)} km away.`
        : "For commercial development, the current dataset is enough for a rough screening pass but not enough to estimate demand or frontage quality.";
    case "warehouse_logistics":
      return roadKm !== null && elevation !== null
        ? `For logistics, road access around ${roadKm.toFixed(1)} km and elevation near ${elevation} m make this a first-pass industrial screening candidate.`
        : "For logistics use, highway adjacency and grading complexity remain the biggest unknowns.";
    default:
      return "This is a broad exploratory read using terrain, land cover, water, and access signals from the current map context.";
  }
}

function buildNextQuestions(useCase: UseCaseType) {
  switch (useCase) {
    case "data_center_cooling":
      return [
        "Zoom in on the lowest-slope parcels near water and compare them to a second candidate closer to transmission lines.",
        "Check floodplain or permitting layers before treating the water adjacency as an advantage.",
      ];
    case "outdoor_recreation":
      return [
        "Switch to nearby places mode to compare trail-style results around this location.",
        "Add hazard, habitat, or seasonal access layers before choosing a final recreation concept.",
      ];
    case "places_discovery":
      return [
        "Refine the nearby-places category to hikes, restaurants, or landmarks depending on what you want next.",
        "Zoom in to neighborhood scale if you need tighter routing or walkability context.",
      ];
    case "residential_development":
      return [
        "Zoom in to parcel scale and compare flatter ground near existing roads.",
        "Check flood, wildfire, and utility extension layers before treating this as a build-ready area.",
      ];
    case "retail_commercial":
      return [
        "Compare this site to another candidate closer to major roads or existing activity nodes.",
        "Zoom in to inspect frontage, access points, and nearby development pattern.",
      ];
    case "warehouse_logistics":
      return [
        "Zoom in on highway-adjacent land to compare truck routing and grading risk.",
        "Check industrial zoning, floodplain, and power redundancy before moving forward.",
      ];
    default:
      return [
        "Zoom in on the most promising sub-area for a more detailed parcel-scale read.",
        "Switch between analysis and nearby places mode depending on whether you need trends or candidate destinations next.",
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

export function buildFallbackAssessment(payload: AnalyzeRequestBody) {
  const useCase = inferUseCase(payload.question);
  const responseMode = inferResponseMode(payload.question, payload.resultsMode);
  const locationLabel = formatLocationLabel(payload);
  const topLandCover = pickTopLandCover(payload.geodata);
  const supportedFacts = [
    payload.geodata?.elevationMeters !== null && payload.geodata?.elevationMeters !== undefined
      ? `Elevation is about ${payload.geodata.elevationMeters} m.`
      : "Elevation is currently unavailable.",
    payload.geodata?.nearestWaterBody
      ? `Nearest mapped water feature: ${payload.geodata.nearestWaterBody.name} (${payload.geodata.nearestWaterBody.distanceKm ?? "unknown"} km).`
      : "Water proximity is currently unavailable.",
    payload.geodata?.nearestRoad
      ? `Nearest mapped road access: ${payload.geodata.nearestRoad.name} (${payload.geodata.nearestRoad.distanceKm ?? "unknown"} km).`
      : "Road access is currently unavailable.",
    payload.geodata?.nearestPower
      ? `Nearest mapped power infrastructure: ${payload.geodata.nearestPower.name} (${payload.geodata.nearestPower.distanceKm ?? "unknown"} km).`
      : "Power access is currently unavailable.",
    topLandCover
      ? `Dominant land cover signal: ${topLandCover.label} (${topLandCover.value}%).`
      : "Land cover is currently unavailable.",
  ];

  const nextQuestions = buildNextQuestions(useCase);
  const trendLines = payload.dataTrends?.length
    ? payload.dataTrends.slice(0, 4).map(formatTrendLine)
    : [];
  const nearbyPlaceLines = payload.nearbyPlaces?.length
    ? payload.nearbyPlaces.slice(0, 4).map(formatNearbyPlaceLine)
    : [];

  if (responseMode === "nearby_places") {
    return [
      `Use case: ${USE_CASE_LABELS[useCase]}`,
      `Location: ${locationLabel}`,
      "Result mode: Nearby places",
      "",
      "Suggested places:",
      ...(nearbyPlaceLines.length
        ? nearbyPlaceLines
        : [
            "- Nearby-place results are not populated yet. GeoSight's list UI is ready, but it still needs a live trail or POI data source for real results.",
          ]),
      "",
      "Why these fit:",
      `- ${buildAssessmentLine(useCase, payload.geodata)}`,
      "- Use these results as a shortlist rather than as verified live inventory if the source is marked as placeholder.",
      "",
      "Supported observations:",
      ...supportedFacts.map((fact) => `- ${fact}`),
      "",
      "Risks and unknowns:",
      "- Nearby-place ranking is currently scaffolded for future live APIs, so category details may be approximate.",
      "- Fine-grained hours, reviews, fees, or closures are not available yet unless a real places data source is connected.",
      "",
      "Next questions / next zoom levels:",
      ...nextQuestions.map((question) => `- ${question}`),
    ].join("\n");
  }

  return [
    `Use case: ${USE_CASE_LABELS[useCase]}`,
    `Location: ${locationLabel}`,
    "Result mode: Analysis",
    "",
    "Key factors considered:",
    ...USE_CASE_FACTORS[useCase].map((item) => `- ${item}`),
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
    `- ${buildAssessmentLine(useCase, payload.geodata)}`,
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
