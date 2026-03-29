import { ExploreEntrySource, ExploreInitState, LandingUseCase } from "@/types";

export const GENERAL_EXPLORATION_PROFILE_ID = "residential";

export const LANDING_USE_CASES: LandingUseCase[] = [
  {
    id: "home-buying",
    title: "Home Buying",
    description: "Screen neighborhoods for access, terrain, amenities, and early risk signals.",
    profileId: "residential",
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
    profileId: "residential",
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
    id: "risk-assessment",
    title: "Risk Assessment",
    description: "Interrogate terrain, water adjacency, and climate context around a location.",
    profileId: "residential",
    accentColor: "#ffab00",
    icon: "ShieldAlert",
    suggestedQuery: "Sacramento, CA",
  },
  {
    id: "general-exploration",
    title: "General Exploration",
    description: "Start with a place, then ask open-ended questions about what matters there.",
    profileId: GENERAL_EXPLORATION_PROFILE_ID,
    accentColor: "#00e5ff",
    icon: "Globe2",
    suggestedQuery: "Tokyo, Japan",
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "Evaluate water, power, climate, logistics, and industrial site-readiness.",
    profileId: "data-center",
    accentColor: "#00e5ff",
    icon: "Factory",
    suggestedQuery: "The Dalles, OR",
  },
];

export function buildExploreHref(init: ExploreInitState) {
  const params = new URLSearchParams();

  if (init.profileId) {
    params.set("profile", init.profileId);
  }
  if (init.locationQuery) {
    params.set("location", init.locationQuery);
  }
  if (init.demoId) {
    params.set("demo", init.demoId);
  }
  if (init.entrySource) {
    params.set("entrySource", init.entrySource);
  }
  if (init.judgeMode) {
    params.set("judge", "1");
  }
  if (init.missionRunPresetId) {
    params.set("missionRun", init.missionRunPresetId);
  }

  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}

export function createExploreInit(input: {
  profileId?: string;
  locationQuery?: string;
  demoId?: string;
  entrySource?: ExploreEntrySource;
  judgeMode?: boolean;
  missionRunPresetId?: string;
}): ExploreInitState {
  return {
    profileId: input.profileId,
    locationQuery: input.locationQuery?.trim() || undefined,
    demoId: input.demoId,
    entrySource: input.entrySource,
    judgeMode: input.judgeMode,
    missionRunPresetId: input.missionRunPresetId,
  };
}
