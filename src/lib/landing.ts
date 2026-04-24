import { ExploreInitState, LandingUseCase } from "@/types";
import { toLensParam } from "@/lib/lenses";

export const GENERAL_EXPLORATION_PROFILE_ID = "home-buying";

export const EXAMPLE_STARTERS: LandingUseCase[] = [
  {
    id: "home-buying",
    title: "Home Buying",
    description: "Screen neighborhoods for schools, amenities, internet quality, and early risk signals.",
    profileId: "home-buying",
    accentColor: "#ffab00",
    icon: "House",
    suggestedQuery: "Bellevue, WA",
  },
  {
    id: "hiking-rec",
    title: "Hike & Rec",
    description: "Explore trails, terrain, water features, and scenic recreation potential.",
    profileId: "hiking",
    accentColor: "#5be49b",
    icon: "Trees",
    suggestedQuery: "Olympic National Park",
  },
  {
    id: "road-trip",
    title: "Road Trip Planning",
    description: "Use the explore workspace to inspect routes, stops, weather, and nearby places.",
    profileId: "commercial",
    accentColor: "#a78bfa",
    icon: "Route",
    suggestedQuery: "Boise, ID",
  },
  {
    id: "site-development",
    title: "Site Development",
    description: "Check buildability, infrastructure context, hazards, and future development fit.",
    profileId: "site-development",
    accentColor: "#ffab00",
    icon: "Building2",
    suggestedQuery: "Salem, OR",
  },
  {
    id: "market-analysis",
    title: "Market Analysis",
    description: "Review commercial access, activity patterns, and competitive corridor signals.",
    profileId: "commercial",
    accentColor: "#a78bfa",
    icon: "LineChart",
    suggestedQuery: "Phoenix, AZ",
  },
  {
    id: "surprise-me",
    title: "Surprise Me",
    description: "Jump to an interesting real-world place and see what GeoSight notices first.",
    profileId: "hiking",
    accentColor: "#53ddff",
    icon: "Globe2",
    suggestedQuery: "Ulaanbaatar, Mongolia",
  },
  {
    id: "risk-assessment",
    title: "Risk Assessment",
    description: "Interrogate terrain, water adjacency, and climate context around a location.",
    profileId: "site-development",
    accentColor: "#ffab00",
    icon: "ShieldAlert",
    suggestedQuery: "Sacramento, CA",
  },
  {
    id: "general-exploration",
    title: "General Exploration",
    description:
      "Start with a place and explore neighborhoods, amenities, risks, and place context.",
    profileId: GENERAL_EXPLORATION_PROFILE_ID,
    accentColor: "#00e5ff",
    icon: "Globe2",
    suggestedQuery: "Tokyo, Japan",
  },
  {
    id: "infrastructure",
    title: "Data Center Cooling",
    description: "Evaluate water, power, climate, logistics, and industrial site-readiness.",
    profileId: "data-center",
    accentColor: "#00e5ff",
    icon: "Factory",
    suggestedQuery: "The Dalles, OR",
  },
];

export interface LensStarter {
  label: string;
  demo?: boolean;
}

const DEFAULT_LENS_STARTERS: LensStarter[] = [
  { label: "Yosemite Valley, CA", demo: true },
  { label: "Olympic National Park, WA", demo: true },
  { label: "Austin, TX" },
  { label: "Boulder, CO" },
];

const LENS_STARTERS: Record<string, LensStarter[]> = {
  "energy-solar": [
    { label: "Phoenix, AZ", demo: true },
    { label: "Tucson, AZ", demo: true },
    { label: "Las Vegas, NV" },
    { label: "Sacramento, CA" },
  ],
  "hunt-planner": [
    { label: "Bozeman, MT", demo: true },
    { label: "Pinedale, WY" },
    { label: "Salmon, ID" },
    { label: "Lewistown, MT" },
  ],
  "trail-scout": [
    { label: "Yosemite Valley, CA", demo: true },
    { label: "Olympic National Park, WA", demo: true },
    { label: "Zion National Park, UT" },
    { label: "Glacier National Park, MT" },
  ],
  "road-trip": [
    { label: "Bend, OR", demo: true },
    { label: "Sedona, AZ" },
    { label: "Asheville, NC" },
    { label: "Taos, NM" },
  ],
  "land-quick-check": [
    { label: "Bellevue, WA", demo: true },
    { label: "Austin, TX" },
    { label: "Raleigh, NC" },
    { label: "Boulder, CO" },
  ],
  "general-explore": [
    { label: "Yosemite Valley, CA", demo: true },
    { label: "Olympic National Park, WA" },
    { label: "Austin, TX" },
    { label: "Boulder, CO" },
  ],
  agriculture: [
    { label: "Fresno, CA", demo: true },
    { label: "Lincoln, NE" },
    { label: "Davenport, IA" },
    { label: "Lubbock, TX" },
  ],
  "emergency-response": [
    { label: "Paradise, CA", demo: true },
    { label: "Asheville, NC" },
    { label: "Fort Myers, FL" },
    { label: "Boulder, CO" },
  ],
  "field-research": [
    { label: "Mammoth Lakes, CA", demo: true },
    { label: "Moab, UT" },
    { label: "Big Bend, TX" },
    { label: "Homer, AK" },
  ],
};

export function getStartersForLens(lensId: string | null | undefined): LensStarter[] {
  if (!lensId) return DEFAULT_LENS_STARTERS;
  return LENS_STARTERS[lensId] ?? DEFAULT_LENS_STARTERS;
}

export const LANDING_USE_CASES: LandingUseCase[] = EXAMPLE_STARTERS.filter(
  (example) => example.id !== "surprise-me",
);

export function buildExploreHref(init: ExploreInitState) {
  const params = new URLSearchParams();

  if (init.profileId) {
    params.set("profile", toLensParam(init.profileId) ?? init.profileId);
  }
  if (init.locationQuery) {
    params.set("location", init.locationQuery);
  }
  if (init.entrySource) {
    params.set("entrySource", init.entrySource);
  }
  if (init.appMode) {
    params.set("mode", init.appMode);
  }
  if (init.lensId) {
    params.set("lens", init.lensId);
  }
  if (init.lat !== undefined) {
    params.set("lat", String(init.lat));
  }
  if (init.lng !== undefined) {
    params.set("lng", String(init.lng));
  }
  if (init.demoScenarioId) {
    params.set("demo", init.demoScenarioId);
  }

  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}
