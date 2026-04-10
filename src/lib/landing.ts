import { ExploreInitState, LandingUseCase } from "@/types";
import { toLensParam } from "@/lib/lenses";

export const GENERAL_EXPLORATION_PROFILE_ID = "home-buying";

export interface SurpriseLocation {
  name: string;
  lat: number;
  lng: number;
}

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

export const SURPRISE_ME_LOCATIONS: readonly SurpriseLocation[] = [
  { name: "Ulaanbaatar, Mongolia", lat: 47.8864, lng: 106.9057 },
  { name: "Patagonia, Argentina", lat: -50.3379, lng: -72.2648 },
  { name: "Geiranger, Norway", lat: 62.1015, lng: 7.2051 },
  { name: "Rotorua, New Zealand", lat: -38.1368, lng: 176.2497 },
  { name: "Reykjavik, Iceland", lat: 64.1466, lng: -21.9426 },
  { name: "Marrakesh, Morocco", lat: 31.6295, lng: -7.9811 },
  { name: "Cusco, Peru", lat: -13.5319, lng: -71.9675 },
  { name: "Banff, Alberta", lat: 51.1784, lng: -115.5708 },
  { name: "Queenstown, New Zealand", lat: -45.0312, lng: 168.6626 },
  { name: "Sapporo, Japan", lat: 43.0618, lng: 141.3545 },
  { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "Anchorage, AK", lat: 61.2181, lng: -149.9003 },
  { name: "Sedona, AZ", lat: 34.8697, lng: -111.7609 },
  { name: "Santa Fe, NM", lat: 35.687, lng: -105.9378 },
  { name: "Bend, OR", lat: 44.0582, lng: -121.3153 },
  { name: "Flagstaff, AZ", lat: 35.1983, lng: -111.6513 },
  { name: "Bergen, Norway", lat: 60.3913, lng: 5.3221 },
  { name: "Innsbruck, Austria", lat: 47.2692, lng: 11.4041 },
  { name: "Split, Croatia", lat: 43.5081, lng: 16.4402 },
  { name: "Ljubljana, Slovenia", lat: 46.0569, lng: 14.5058 },
  { name: "Hobart, Tasmania", lat: -42.8821, lng: 147.3272 },
  { name: "Chiang Mai, Thailand", lat: 18.7883, lng: 98.9853 },
  { name: "Da Nang, Vietnam", lat: 16.0544, lng: 108.2022 },
  { name: "Santiago, Chile", lat: -33.4489, lng: -70.6693 },
  { name: "Medellin, Colombia", lat: 6.2442, lng: -75.5812 },
  { name: "San Miguel de Allende, Mexico", lat: 20.9144, lng: -100.7436 },
  { name: "Madeira, Portugal", lat: 32.7607, lng: -16.9595 },
  { name: "Canmore, Alberta", lat: 51.089, lng: -115.3598 },
  { name: "Asheville, NC", lat: 35.5951, lng: -82.5515 },
  { name: "Bozeman, MT", lat: 45.677, lng: -111.0429 },
  { name: "Jackson, WY", lat: 43.4799, lng: -110.7624 },
  { name: "Taos, NM", lat: 36.4072, lng: -105.5731 },
  { name: "Bar Harbor, ME", lat: 44.3876, lng: -68.2039 },
  { name: "Boulder, CO", lat: 40.015, lng: -105.2705 },
  { name: "Victoria, BC", lat: 48.4284, lng: -123.3656 },
  { name: "Tromso, Norway", lat: 69.6492, lng: 18.9553 },
  { name: "Alesund, Norway", lat: 62.4722, lng: 6.1495 },
  { name: "Lofoten, Norway", lat: 68.1469, lng: 13.6114 },
  { name: "Galway, Ireland", lat: 53.2707, lng: -9.0568 },
  { name: "Bilbao, Spain", lat: 43.263, lng: -2.935 },
  { name: "Valparaiso, Chile", lat: -33.0472, lng: -71.6127 },
  { name: "Launceston, Tasmania", lat: -41.4332, lng: 147.1441 },
  { name: "Kathmandu, Nepal", lat: 27.7172, lng: 85.324 },
  { name: "Pokhara, Nepal", lat: 28.2096, lng: 83.9856 },
  { name: "Aomori, Japan", lat: 40.8246, lng: 140.74 },
  { name: "Fukuoka, Japan", lat: 33.5902, lng: 130.4017 },
  { name: "Busan, South Korea", lat: 35.1796, lng: 129.0756 },
  { name: "Jeju City, South Korea", lat: 33.4996, lng: 126.5312 },
  { name: "Hilo, HI", lat: 19.707, lng: -155.081 },
  { name: "Juneau, AK", lat: 58.3019, lng: -134.4197 },
] as const;

export function pickRandomSurpriseLocation() {
  return SURPRISE_ME_LOCATIONS[Math.floor(Math.random() * SURPRISE_ME_LOCATIONS.length)];
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

  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}
