import { AnalyzeRequestBody, GeodataResult, UseCaseType } from "@/types";

export const USE_CASE_LABELS: Record<UseCaseType, string> = {
  data_center_cooling: "Data center cooling",
  outdoor_recreation: "Outdoor recreation",
  residential_development: "Residential development",
  retail_commercial: "Retail and commercial",
  warehouse_logistics: "Warehouse and logistics",
  general_exploration: "General exploration",
};

export const STARTER_PROMPTS = [
  "Would this location work for a data center cooling facility?",
  "What are the best hikeable areas near this location?",
  "Is this a good area for a new neighborhood?",
  "How suitable is this spot for a retail center?",
  "Would this county support a distribution warehouse well?",
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
      "restaurant",
      "mall",
      "mixed-use",
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

export function formatLocationLabel(payload: Pick<AnalyzeRequestBody, "location" | "locationName">) {
  const coordinateText = payload.location
    ? `${payload.location.lat.toFixed(4)}, ${payload.location.lng.toFixed(4)}`
    : "Unknown coordinates";

  return payload.locationName ? `${payload.locationName} (${coordinateText})` : coordinateText;
}

export function buildGeoSightSystemPrompt(question: string) {
  const useCase = inferUseCase(question);
  const useCaseChecklist = USE_CASE_FACTORS[useCase].map((item) => `- ${item}`).join("\n");

  const prompt = `
You are GeoSight, an AI-powered geospatial intelligence assistant.

Core mission:
- GeoSight is a scalable, multi-purpose platform for asking open-ended questions about any location on Earth.
- Interpret the user's question in the context of the selected location and return clear, actionable insights.
- Treat the Pacific Northwest data center cooling story as a featured demo, not the only use case.

Current question's inferred use case:
- ${USE_CASE_LABELS[useCase]}

For this use case, prioritize:
${useCaseChecklist}

Behavior rules:
- Restate the location clearly before giving recommendations.
- Identify the use case type explicitly.
- Separate supported observations from approximations or inference.
- Make reasonable assumptions when data is incomplete, and say what those assumptions are.
- Be concise, structured, and practical.
- When the question is about data center cooling, explicitly emphasize water access, climate, terrain, grid access, and environmental or regulatory constraints.
- For every answer, include:
  1. Use case
  2. Location
  3. Key factors considered
  4. Assessment with pros and cons for this use case
  5. Risks, constraints, or unknowns
  6. Next questions or next zoom levels to explore
`;

  return { prompt, useCase };
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
    case "residential_development":
      return roadKm !== null && topLandCover
        ? `For housing, the strongest early signals are road access at about ${roadKm.toFixed(1)} km and dominant land cover of ${topLandCover.label.toLowerCase()}.`
        : "For residential use, road access, hazard exposure, and parcel readiness still need closer validation.";
    case "retail_commercial":
      return roadKm !== null
        ? `For commercial use, access is the main early proxy we have, and major road access is about ${roadKm.toFixed(1)} km away.`
        : "For commercial use, the current dataset is enough for a rough screening pass but not enough to estimate traffic or customer demand.";
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
        "Zoom in on valleys, ridgelines, or waterfront edges to compare trail alignment options.",
        "Add hazard, habitat, or seasonal access layers before choosing a final recreation concept.",
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
        "Add the next most relevant risk or infrastructure layer based on your decision goal.",
      ];
  }
}

export function buildFallbackAssessment(payload: AnalyzeRequestBody) {
  const useCase = inferUseCase(payload.question);
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

  return [
    `Use case: ${USE_CASE_LABELS[useCase]}`,
    `Location: ${locationLabel}`,
    "",
    "Key factors considered:",
    ...USE_CASE_FACTORS[useCase].map((item) => `- ${item}`),
    "",
    "Supported observations:",
    ...supportedFacts.map((fact) => `- ${fact}`),
    "",
    "Assessment:",
    `- ${buildAssessmentLine(useCase, payload.geodata)}`,
    `- This is a best-effort fallback response, so anything beyond the listed map signals should be treated as inferred rather than fully verified.`,
    "",
    "Risks and unknowns:",
    "- Regulations, parcel ownership, and detailed hazard layers are not yet part of this response unless explicitly provided.",
    "- Fine-grained viability still depends on closer zoom, local surveys, and any use-case-specific regulations.",
    "",
    "Next questions / next zoom levels:",
    ...nextQuestions.map((question) => `- ${question}`),
  ].join("\n");
}
