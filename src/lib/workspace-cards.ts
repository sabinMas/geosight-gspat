import {
  CardAudience,
  CardComplexity,
  WorkspaceCardDefinition,
  WorkspaceCardDensityBudget,
  WorkspaceCardId,
  WorkspaceCardPreference,
  WorkspaceRevealTrigger,
} from "@/types";

const WORKSPACE_CARD_REGISTRY_BASE = [
  {
    id: "active-location",
    title: "Active location",
    summary: "Pin the current place and scan the key trust signals.",
    questionAnswered: "What is the current place and how trustworthy is the data around it?",
    regionCoverage: "Global - coverage quality varies by source domain",
    failureMode: "Shows available fields with status badges; null values shown as '--'",
    freshnessWindow: "Live on location change",
    nextActions: ["Open source awareness for full provenance", "Ask GeoSight a question", "Save site to comparison"],
    icon: "MapPin",
    category: "context",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 10,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a place to see the current map focus and quick context.",
  },
  {
    id: "chat",
    title: "Ask GeoSight",
    summary: "Ask mission-aware questions grounded in the active place.",
    questionAnswered: "How should GeoSight interpret this place through the active mission lens?",
    regionCoverage: "Global - bounded by active geodata coverage",
    failureMode: "Falls back from Groq to Gemini to deterministic assessment",
    freshnessWindow: "Live per question",
    nextActions: ["Ask a follow-up question", "Switch between analysis and nearby places mode", "Open sources to inspect coverage"],
    icon: "MessageSquare",
    category: "analysis",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 20,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Choose a place to start asking questions.",
  },
  {
    id: "results",
    title: "Results",
    summary: "Switch between trend summaries and nearby place discovery.",
    questionAnswered: "What are the strongest signals and nearby destinations around this place?",
    regionCoverage: "Global - nearby places depend on OpenStreetMap completeness",
    failureMode: "Shows loading state, empty results, or unavailable source messaging",
    freshnessWindow: "Analysis trends refresh on geodata change; nearby places on category/location change",
    nextActions: ["Open a trend or place for follow-up reasoning", "Switch categories", "Save a site for comparison"],
    icon: "PanelsTopLeft",
    category: "analysis",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 30,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Switch between map analysis and nearby places for the active location.",
  },
  {
    id: "score",
    title: "Mission score",
    summary: "See the weighted suitability score for this mission.",
    questionAnswered: "How suitable is this location for the current mission profile?",
    regionCoverage: "Global - strongest where supporting live sources are available",
    failureMode: "Hides until geodata is ready; score factors degrade individually when data is missing",
    freshnessWindow: "Recomputed on geodata change",
    nextActions: ["Open factor breakdown", "Compare saved sites", "Use score as a first-pass shortlist signal"],
    icon: "Gauge",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 40,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "GeoSight will calculate a mission score when geodata is ready.",
  },
  {
    id: "factor-breakdown",
    title: "Factor breakdown",
    summary: "Inspect how each factor changed the score.",
    questionAnswered: "Why did the mission score move up or down?",
    regionCoverage: "Global - depends on underlying score inputs",
    failureMode: "Shows only the factors that can be scored from the current geodata",
    freshnessWindow: "Recomputed on geodata change",
    nextActions: ["Inspect evidence types", "Open source awareness", "Compare factor behavior across sites"],
    icon: "BarChart3",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 50,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to see the score explained factor by factor.",
  },
  {
    id: "compare",
    title: "Comparison",
    summary: "Review saved locations side by side.",
    questionAnswered: "Which saved candidate looks strongest once the same factors are compared side by side?",
    regionCoverage: "Global - driven by whatever saved sites the user captured",
    failureMode: "Prompts for more saved sites until at least two are available",
    freshnessWindow: "Updates when saved sites change",
    nextActions: ["Save another site", "Open source awareness for a compared site", "Use comparison to shortlist candidates"],
    icon: "Columns3",
    category: "comparison",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 60,
    requiredData: ["saved-sites"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Save at least two sites to unlock side-by-side comparison.",
  },
  {
    id: "terrain-viewer",
    title: "Terrain tools",
    summary: "Adjust terrain exaggeration and framing.",
    questionAnswered: "How does the landscape feel when I exaggerate or reframe the terrain?",
    regionCoverage: "Global where Cesium terrain is available",
    failureMode: "Terrain controls remain interactive even if analysis data is missing",
    freshnessWindow: "Immediate client-side interaction",
    nextActions: ["Adjust exaggeration", "Open elevation profile", "Zoom to another sub-area"],
    icon: "Mountain",
    category: "terrain",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 70,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open terrain tools for exaggeration and fly-around controls.",
  },
  {
    id: "elevation-profile",
    title: "Elevation profile",
    summary: "Inspect a sampled terrain transect through the region.",
    questionAnswered: "How does elevation change across the active region?",
    regionCoverage: "US high-res via USGS; global fallback via OpenTopoData",
    failureMode: "Returns partial or null transect values when elevation providers fail",
    freshnessWindow: "On demand with 6 hour elevation caching",
    nextActions: ["Adjust transect length", "Pair with terrain viewer", "Use slope context in analysis"],
    icon: "LineChart",
    category: "terrain",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 80,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to inspect an elevation transect across the active region.",
  },
  {
    id: "image-upload",
    title: "Imagery tools",
    summary: "Upload imagery and add remote-sensing context.",
    questionAnswered: "What does a quick client-side pixel histogram suggest about this uploaded image?",
    regionCoverage: "Global - client-side only",
    failureMode: "Shows upload UI only until an image is selected or parsed successfully",
    freshnessWindow: "Immediate on upload",
    nextActions: ["Upload an image", "Open land classification", "Use results as a heuristic only"],
    icon: "ImagePlus",
    category: "media",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 90,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Upload imagery when you want image-based land-cover context.",
  },
  {
    id: "land-classifier",
    title: "Land classification",
    summary: "Review inferred land-cover buckets.",
    questionAnswered: "What rough land-cover mix does GeoSight infer from uploaded imagery or map context?",
    regionCoverage: "Global - heuristic client-side or geodata-derived estimates only",
    failureMode: "Shows only available buckets and hides zero-value classes",
    freshnessWindow: "Updates on upload or geodata-derived land-cover refresh",
    nextActions: ["Treat as heuristic", "Compare with map-derived land cover", "Open source awareness for limitations"],
    icon: "Leaf",
    category: "media",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 100,
    requiredData: ["classification"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open land classification after uploading imagery or using geodata-derived cover.",
  },
  {
    id: "source-awareness",
    title: "Source awareness",
    summary: "Check provider freshness, coverage, and confidence.",
    questionAnswered: "Where did this location intelligence come from and how much should I trust it?",
    regionCoverage: "Global - reflects the active source registry context",
    failureMode: "Shows limited and unavailable states explicitly instead of hiding them",
    freshnessWindow: "Updates on geodata change",
    nextActions: ["Inspect a weak source", "Compare source limits across regions", "Use it to explain confidence gaps"],
    icon: "ShieldCheck",
    category: "context",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 110,
    requiredData: ["source-metadata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Review source freshness, coverage, and confidence here.",
  },
  {
    id: "school-context",
    title: "School context",
    summary: "Inspect nearby school context and official metrics.",
    questionAnswered: "What school signals are available here, and which parts are official versus GeoSight-derived?",
    regionCoverage: "US public K-12 baseline; strongest in Washington with official accountability data",
    failureMode: "Explains outside-US and no-match cases explicitly",
    freshnessWindow: "On demand with 24 hour source caching",
    nextActions: ["Check official Washington matches", "Use school context in residential due diligence", "Open sources for coverage limits"],
    icon: "GraduationCap",
    category: "planning",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 115,
    requiredData: ["school-context"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to inspect nearby public-school context and Washington official metrics.",
  },
  {
    id: "hazard-context",
    title: "Hazard context",
    summary: "Earthquakes, active fires, global disaster alerts, and weather risk signals for the active area.",
    questionAnswered: "What live risk signals stand out at this location right now?",
    regionCoverage: "Global earthquakes via USGS; global fire via NASA FIRMS; global weather via Open-Meteo; global disaster alerts via GDACS",
    failureMode: "Each signal degrades independently and shows status badge when limited or unavailable",
    freshnessWindow: "Earthquakes 6h / Fire 3h / Weather 6h / GDACS 15m",
    nextActions: ["Compare hazard signals across saved sites", "Open source awareness for data limits", "Ask GeoSight to interpret the risk profile"],
    icon: "ShieldAlert",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 116,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a location to see earthquake, fire, and weather hazard context.",
  },
  {
    id: "climate-history",
    title: "Climate trends (10-year)",
    summary: "Historical temperature and precipitation trends from 2015-2024.",
    questionAnswered: "Is this location warming, cooling, or stable over the past decade?",
    regionCoverage: "Global - Open-Meteo historical archive",
    failureMode: "Shows unavailable message if historical data cannot be retrieved",
    freshnessWindow: "Archived through previous calendar year",
    nextActions: ["Compare with current climate snapshot", "Review air quality trends"],
    icon: "TrendingUp",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 85,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a location to see 10-year climate trends.",
  },
  {
    id: "broadband-context",
    title: "Broadband context",
    summary: "Point-level FCC availability in the US, plus Eurostat household broadband baselines in Europe.",
    questionAnswered: "How strong is the fixed-broadband baseline here right now?",
    regionCoverage: "US address-level via FCC Broadband Map; Europe country-level household baseline via Eurostat",
    failureMode: "Shows unavailable or limited state explicitly when the point lookup or country-level baseline is unsupported",
    freshnessWindow: "FCC cached up to 24 hours; Eurostat follows official annual releases",
    nextActions: ["Compare another corridor", "Pair with mission score", "Open source awareness for limits"],
    icon: "Wifi",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 118,
    requiredData: ["geodata", "score"],
    supportedProfiles: ["data-center", "residential"],
    emptyState: "Select a location to inspect broadband context for the active point or region.",
  },
  {
    id: "flood-risk",
    title: "Flood risk",
    summary: "Read the FEMA flood-zone designation with a simple risk badge.",
    questionAnswered: "Is this point inside a mapped Special Flood Hazard Area or a lower-risk zone?",
    regionCoverage: "United States only via FEMA NFHL",
    failureMode: "Shows unsupported region or missing FEMA response instead of inferring flood safety",
    freshnessWindow: "Cached up to 24 hours",
    nextActions: ["Compare another parcel", "Cross-check local floodplain rules", "Use with residential due diligence"],
    icon: "Waves",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 119,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "residential"],
    emptyState: "Select a US location to inspect FEMA flood-zone context.",
  },
  {
    id: "cooling-water",
    title: "Cooling water",
    summary: "Nearest stream gauge, discharge, and mapped water access for cooling context.",
    questionAnswered: "Is there a meaningful nearby water source with live USGS discharge context?",
    regionCoverage: "United States gauges plus mapped waterways elsewhere",
    failureMode: "Falls back to mapped water proximity when no live USGS gauge is nearby",
    freshnessWindow: "Waterways on location change; gauges cached 15-30 minutes",
    nextActions: ["Compare gauge volumes across sites", "Cross-check permitting and rights", "Pair with flood risk"],
    icon: "Droplets",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 120,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center"],
    emptyState: "Select a location to inspect nearby mapped water and USGS gauge context.",
  },
  {
    id: "groundwater",
    title: "Groundwater levels",
    summary: "Nearby USGS monitoring wells and current water table depth.",
    questionAnswered: "How deep is the water table here and what does it mean for construction or water access?",
    regionCoverage: "United States - USGS groundwater monitoring network",
    failureMode: "Shows unavailable message when no wells are in range",
    freshnessWindow: "Live readings within 30 days",
    nextActions: ["Check soil profile for drainage context", "Compare with flood risk"],
    icon: "Droplets",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 180,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "residential", "hiking", "commercial"],
    emptyState: "Select a US location to see groundwater monitoring data.",
  },
  {
    id: "soil-profile",
    title: "Soil profile",
    summary: "USDA soil type, drainage, depth to bedrock, and water table.",
    questionAnswered: "What kind of ground is beneath this location and what does it mean for building or drainage?",
    regionCoverage: "United States - NRCS SSURGO soil survey",
    failureMode: "Shows unavailable message when soil data is not mapped",
    freshnessWindow: "Periodic survey updates",
    nextActions: ["Check groundwater levels", "Review flood risk", "Assess terrain"],
    icon: "Layers",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 190,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "residential", "hiking", "commercial"],
    emptyState: "Select a US location to see soil survey data.",
  },
  {
    id: "seismic-design",
    title: "Seismic risk profile",
    summary: "USGS site-specific seismic hazard and design parameters.",
    questionAnswered: "What is the statistical ground shaking risk at this site for the next 50 years?",
    regionCoverage: "United States - USGS seismic design maps (ASCE 7-22)",
    failureMode: "Shows unavailable message outside US coverage",
    freshnessWindow: "Based on ASCE 7-22 reference document",
    nextActions: ["Check earthquake history", "Review terrain stability"],
    icon: "Activity",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 200,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "residential", "commercial"],
    emptyState: "Select a US location to see seismic design parameters.",
  },
  {
    id: "air-quality",
    title: "Air quality",
    summary: "Nearest particle-monitoring station context with a color-coded AQI badge.",
    questionAnswered: "What does the nearest live PM2.5 / PM10 reading suggest about air quality here?",
    regionCoverage: "Global where OpenAQ stations exist; Open-Meteo fallback context where they do not",
    failureMode: "Shows station gaps explicitly instead of guessing air quality",
    freshnessWindow: "Cached up to 30 minutes",
    nextActions: ["Compare nearby neighborhoods or trailheads", "Use with climate context", "Inspect source status"],
    icon: "Wind",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 121,
    requiredData: ["geodata"],
    supportedProfiles: ["hiking", "residential"],
    emptyState: "Select a location to inspect OpenAQ or Open-Meteo air-quality context.",
  },
  {
    id: "contamination-risk",
    title: "Contamination screening",
    summary: "Nearby Superfund and TRI context with a warning badge for close-in sites.",
    questionAnswered: "Are there contamination-screening signals nearby that deserve due diligence?",
    regionCoverage: "United States only via EPA Envirofacts",
    failureMode: "Shows unsupported region or unavailable EPA screening explicitly",
    freshnessWindow: "Cached up to 12 hours",
    nextActions: ["Cross-check parcel and remediation history", "Compare another candidate", "Use with flood and school context"],
    icon: "TriangleAlert",
    category: "planning",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 122,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "residential"],
    emptyState: "Select a US location to inspect nearby EPA contamination-screening context.",
  },
  {
    id: "earthquake-history",
    title: "Earthquake history",
    summary: "5-year USGS ComCat seismic record — event count by year, M4+ events list, and max magnitude.",
    questionAnswered: "How seismically active has this area been over the past five years?",
    regionCoverage: "Global — USGS ComCat covers all recorded earthquakes worldwide",
    failureMode: "Shows unavailable state when USGS does not respond or returns no events",
    freshnessWindow: "Cached 24 hours per coordinate",
    nextActions: ["Review seismic design profile", "Compare hazard context", "Check terrain stability"],
    icon: "Activity",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 125,
    requiredData: ["geodata"],
    supportedProfiles: ["hiking", "residential", "data-center", "commercial"],
    emptyState: "Select a location to see the 5-year earthquake history.",
  },
  {
    id: "fire-history",
    title: "Wildfire history",
    summary: "Annual NASA FIRMS fire detection archive — season intensity by year and elevated-activity flags.",
    questionAnswered: "Has this area experienced elevated wildfire activity in recent years?",
    regionCoverage: "Global — NASA VIIRS_SNPP archive where the FIRMS API key is configured",
    failureMode: "Returns zero-count years when FIRMS key is absent; shows unavailable state on API failure",
    freshnessWindow: "Cached 24 hours per coordinate",
    nextActions: ["Check hazard context for current fire alerts", "Review air quality", "Use with outdoor fit"],
    icon: "Flame",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 126,
    requiredData: ["geodata"],
    supportedProfiles: ["hiking", "residential"],
    emptyState: "Select a location to see the wildfire history for this area.",
  },
] as const;

function getRevealTriggers(cardId: WorkspaceCardId): WorkspaceRevealTrigger[] {
  switch (cardId) {
    case "active-location":
      return ["location_selected"];
    case "chat":
      return ["ask_reasoning", "location_selected"];
    case "results":
      return ["ask_summary", "location_selected"];
    case "score":
      return ["ask_reasoning", "location_selected"];
    case "factor-breakdown":
      return ["ask_reasoning", "ask_comparison"];
    case "compare":
      return ["ask_comparison"];
    case "terrain-viewer":
    case "elevation-profile":
      return ["ask_terrain"];
    case "image-upload":
    case "land-classifier":
      return ["ask_imagery"];
    case "source-awareness":
      return ["ask_trust", "report_opened"];
    case "school-context":
      return ["ask_schools"];
    case "hazard-context":
      return ["ask_hazard"];
    case "earthquake-history":
    case "fire-history":
      return ["ask_hazard", "location_selected"];
    case "outdoor-fit":
      return ["ask_reasoning", "ask_hazard", "location_selected"];
    case "trip-summary":
      return ["ask_reasoning", "location_selected"];
    default:
      return ["ask_reasoning"];
  }
}

function getDensityBudget(cardId: WorkspaceCardId): WorkspaceCardDensityBudget {
  switch (cardId) {
    case "active-location":
    case "results":
    case "score":
    case "hazard-context":
      return "low";
    case "chat":
    case "compare":
    case "source-awareness":
    case "factor-breakdown":
      return "high";
    default:
      return "medium";
  }
}

function getRevealTier(card: (typeof WORKSPACE_CARD_REGISTRY_BASE)[number]) {
  if (card.zone === "primary") {
    return "primary" as const;
  }

  if (card.emphasis === "optional") {
    return "deep_dive" as const;
  }

  return "supporting" as const;
}

function getSummaryVariant(card: (typeof WORKSPACE_CARD_REGISTRY_BASE)[number]) {
  switch (card.id) {
    case "active-location":
      return "Pin the place and scan the essentials.";
    case "chat":
      return "Ask a direct question about this place.";
    case "results":
      return "See the strongest live signals fast.";
    case "source-awareness":
      return "Inspect freshness, coverage, and trust.";
    case "compare":
      return "Compare saved sites side by side.";
    default:
      return card.summary;
  }
}

function getModeVisibility(cardId: WorkspaceCardId): { explorer: boolean; pro: boolean } {
  // Explorer-only
  if (cardId === "outdoor-fit" || cardId === "trip-summary") return { explorer: true, pro: false };

  // Visible in both modes
  const bothModes = new Set<WorkspaceCardId>([
    "active-location",
    "chat",
    "results",
    "compare",
    "terrain-viewer",
    "elevation-profile",
    "hazard-context",
    "climate-history",
    "flood-risk",
    "air-quality",
    "earthquake-history",
    "fire-history",
  ]);
  if (bothModes.has(cardId)) return { explorer: true, pro: true };

  // Pro-only (hidden in Explorer)
  return { explorer: false, pro: true };
}

function getAudience(cardId: WorkspaceCardId): CardAudience {
  const proOnly = new Set<WorkspaceCardId>([
    "score",
    "factor-breakdown",
    "image-upload",
    "land-classifier",
    "source-awareness",
    "school-context",
    "broadband-context",
    "cooling-water",
    "groundwater",
    "soil-profile",
    "seismic-design",
    "contamination-risk",
  ]);
  if (proOnly.has(cardId)) return "pro";
  if (cardId === "outdoor-fit" || cardId === "trip-summary") return "public";
  return "both";
}

function getComplexity(cardId: WorkspaceCardId): CardComplexity {
  const advanced = new Set<WorkspaceCardId>([
    "score",
    "factor-breakdown",
    "source-awareness",
    "school-context",
    "broadband-context",
    "cooling-water",
    "groundwater",
    "soil-profile",
    "seismic-design",
    "contamination-risk",
    "image-upload",
    "land-classifier",
  ]);
  return advanced.has(cardId) ? "advanced" : "simple";
}

function getExplorerLabel(cardId: WorkspaceCardId): string | undefined {
  const labels: Partial<Record<WorkspaceCardId, string>> = {
    "active-location": "You're here",
    chat: "Ask anything",
    results: "Nearby places",
    compare: "Compare spots",
    "terrain-viewer": "Terrain view",
    "elevation-profile": "How steep is it?",
    "hazard-context": "Risk snapshot",
    "climate-history": "Weather history",
    "flood-risk": "Flood zone",
    "air-quality": "Air quality",
    "outdoor-fit": "Outdoor fit",
    "trip-summary": "Trip summary",
    "earthquake-history": "Quake history",
    "fire-history": "Fire history",
  };
  return labels[cardId];
}

function getExplorerSummary(cardId: WorkspaceCardId): string | undefined {
  const summaries: Partial<Record<WorkspaceCardId, string>> = {
    "active-location": "See where you are and what's around you.",
    chat: "Ask a plain-English question about this place.",
    results: "See what's nearby and what stands out.",
    compare: "Compare a few spots side by side.",
    "terrain-viewer": "See the lay of the land.",
    "elevation-profile": "See how steep the terrain is across this area.",
    "hazard-context": "Quick look at nearby risks — quakes, fires, weather.",
    "climate-history": "Ten years of weather trends for this spot.",
    "flood-risk": "Is this area in a flood zone?",
    "air-quality": "How clean is the air here?",
    "outdoor-fit": "Is this place good for outdoor activities?",
    "trip-summary": "A plain-English overview of what makes this place worth visiting.",
    "earthquake-history": "How many quakes has this area seen in the last 5 years?",
    "fire-history": "Has this area had bad wildfire seasons recently?",
  };
  return summaries[cardId];
}

const EXPLORER_ONLY_CARDS: WorkspaceCardDefinition[] = [
  {
    id: "outdoor-fit",
    title: "Outdoor fit",
    summary: "A plain-English read on how suitable this location is for outdoor use.",
    questionAnswered: "Is this place good for hiking, hunting, or general outdoor activities?",
    regionCoverage: "Global where terrain and climate data are available",
    failureMode: "Shows partial assessment when some data sources are unavailable",
    freshnessWindow: "Recomputed on location change",
    nextActions: [
      "Check terrain viewer for more detail",
      "Open elevation profile",
      "Ask GeoSight a specific question",
    ],
    icon: "Trees",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: true,
    defaultOrder: 25,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a location to see the outdoor suitability summary.",
    revealTier: "supporting",
    revealTriggers: ["location_selected", "ask_terrain"],
    summaryVariant: "Plain-English outdoor suitability for this place.",
    compactActions: ["Check terrain viewer", "Open elevation profile"],
    densityBudget: "medium",
    audience: "public",
    complexity: "simple",
    explorerLabel: "Outdoor fit",
    explorerSummary: "Is this place good for outdoor activities?",
    modeVisibility: { explorer: true, pro: false },
  },
  {
    id: "trip-summary",
    title: "Trip summary",
    summary: "AI-generated plain-English overview of this location for the active Explorer lens.",
    questionAnswered: "What makes this place worth visiting — or not?",
    regionCoverage: "Global — backed by GeoAnalyst with Explorer-mode prompting",
    failureMode: "Falls back to a deterministic summary when AI is unavailable",
    freshnessWindow: "Generated on demand per location",
    nextActions: [
      "Ask GeoSight a follow-up question",
      "Open hazard context for risk details",
      "Open terrain viewer",
    ],
    icon: "Sparkles",
    category: "analysis",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 35,
    requiredData: ["geodata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a location to get an AI-generated trip summary.",
    revealTier: "supporting",
    revealTriggers: ["location_selected", "ask_summary"],
    summaryVariant: "Plain-English overview of what makes this place worth a visit.",
    compactActions: ["Ask a follow-up", "Open hazard context"],
    densityBudget: "medium",
    audience: "public",
    complexity: "simple",
    explorerLabel: "Trip summary",
    explorerSummary: "A plain-English overview of this place.",
    modeVisibility: { explorer: true, pro: false },
  },
];

export const WORKSPACE_CARD_REGISTRY: WorkspaceCardDefinition[] = [
  ...WORKSPACE_CARD_REGISTRY_BASE.map((card) => ({
    ...card,
    nextActions: [...card.nextActions],
    requiredData: [...card.requiredData],
    supportedProfiles: [
      ...new Set(
        card.supportedProfiles.flatMap((profileId) =>
          profileId === "residential"
            ? (["home-buying", "site-development"] as const)
            : [profileId],
        ),
      ),
    ],
    revealTier: getRevealTier(card),
    revealTriggers: getRevealTriggers(card.id),
    summaryVariant: getSummaryVariant(card),
    compactActions: [...card.nextActions.slice(0, 2)],
    densityBudget: getDensityBudget(card.id),
    audience: getAudience(card.id),
    complexity: getComplexity(card.id),
    explorerLabel: getExplorerLabel(card.id),
    explorerSummary: getExplorerSummary(card.id),
    modeVisibility: getModeVisibility(card.id),
  })),
  ...EXPLORER_ONLY_CARDS,
];

export const WORKSPACE_CARD_GROUPS = [
  { key: "context", label: "Core context" },
  { key: "analysis", label: "Analysis" },
  { key: "planning", label: "Planning" },
  { key: "terrain", label: "Terrain tools" },
  { key: "media", label: "Imagery tools" },
  { key: "comparison", label: "Comparison" },
] as const;

export const WORKSPACE_CARD_MAP = Object.fromEntries(
  WORKSPACE_CARD_REGISTRY.map((card) => [card.id, card]),
) as Record<WorkspaceCardId, WorkspaceCardDefinition>;

const PROFILE_VISIBLE_CARD_DEFAULTS: Record<string, WorkspaceCardId[]> = {
  "data-center": ["active-location", "chat", "results", "outdoor-fit", "trip-summary"],
  hiking: ["active-location", "chat", "results", "outdoor-fit", "trip-summary"],
  "home-buying": ["active-location", "chat", "results", "outdoor-fit", "trip-summary"],
  "site-development": ["active-location", "chat", "results", "outdoor-fit", "trip-summary"],
  commercial: ["active-location", "chat", "results", "outdoor-fit", "trip-summary"],
};

export function getWorkspaceCardDefaults(profileId: string) {
  const visibleSet = new Set(
    PROFILE_VISIBLE_CARD_DEFAULTS[profileId] ?? PROFILE_VISIBLE_CARD_DEFAULTS.commercial,
  );

  return WORKSPACE_CARD_REGISTRY.reduce<Record<WorkspaceCardId, boolean>>((acc, card) => {
    acc[card.id] = visibleSet.has(card.id);
    return acc;
  }, {} as Record<WorkspaceCardId, boolean>);
}

export function getWorkspaceCardsForProfile(profileId: string) {
  return WORKSPACE_CARD_REGISTRY.filter((card) => card.supportedProfiles.includes(profileId)).sort(
    (a, b) => a.defaultOrder - b.defaultOrder,
  );
}

export function mergeWorkspacePreferences(
  profileId: string,
  preferences: Partial<Record<WorkspaceCardId, boolean>> = {},
) {
  const defaults = getWorkspaceCardDefaults(profileId);

  return Object.keys(defaults).reduce<Record<WorkspaceCardId, boolean>>((acc, key) => {
    const cardId = key as WorkspaceCardId;
    acc[cardId] = preferences[cardId] ?? defaults[cardId];
    return acc;
  }, {} as Record<WorkspaceCardId, boolean>);
}

export function toWorkspaceCardPreferences(
  visibility: Record<WorkspaceCardId, boolean>,
) {
  return Object.entries(visibility).map(([cardId, visible]) => ({
    cardId: cardId as WorkspaceCardId,
    visible,
  })) satisfies WorkspaceCardPreference[];
}
