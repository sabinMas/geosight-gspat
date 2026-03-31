import { ExploreInitState, LandingUseCase } from "@/types";
import { toLensParam } from "@/lib/lenses";

export const GENERAL_EXPLORATION_PROFILE_ID = "residential";

export const EXAMPLE_STARTERS: LandingUseCase[] = [
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
    profileId: "residential",
    accentColor: "#ffab00",
    icon: "ShieldAlert",
    suggestedQuery: "Sacramento, CA",
  },
  {
    id: "general-exploration",
    title: "Residential Development",
    description:
      "Start with a place and explore access, hazards, buildability, and neighborhood context.",
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

export const SURPRISE_ME_LOCATIONS = [
  "Ulaanbaatar, Mongolia",
  "Patagonia, Argentina",
  "Geiranger, Norway",
  "Rotorua, New Zealand",
  "Reykjavik, Iceland",
  "Marrakesh, Morocco",
  "Cusco, Peru",
  "Banff, Alberta",
  "Queenstown, New Zealand",
  "Sapporo, Japan",
  "Cape Town, South Africa",
  "Anchorage, AK",
  "Sedona, AZ",
  "Santa Fe, NM",
  "Bend, OR",
  "Flagstaff, AZ",
  "Bergen, Norway",
  "Innsbruck, Austria",
  "Split, Croatia",
  "Ljubljana, Slovenia",
  "Hobart, Tasmania",
  "Chiang Mai, Thailand",
  "Da Nang, Vietnam",
  "Santiago, Chile",
  "Medellin, Colombia",
  "San Miguel de Allende, Mexico",
  "Madeira, Portugal",
  "Canmore, Alberta",
  "Asheville, NC",
  "Bozeman, MT",
  "Jackson, WY",
  "Taos, NM",
  "Bar Harbor, ME",
  "Boulder, CO",
  "Victoria, BC",
  "Tromso, Norway",
  "Alesund, Norway",
  "Lofoten, Norway",
  "Galway, Ireland",
  "Bilbao, Spain",
  "Valparaiso, Chile",
  "Launceston, Tasmania",
  "Kathmandu, Nepal",
  "Pokhara, Nepal",
  "Aomori, Japan",
  "Fukuoka, Japan",
  "Busan, South Korea",
  "Jeju City, South Korea",
  "Hilo, HI",
  "Juneau, AK",
] as const;

export function pickRandomSurpriseLocation() {
  return SURPRISE_ME_LOCATIONS[Math.floor(Math.random() * SURPRISE_ME_LOCATIONS.length)];
}

export function buildExploreHref(init: ExploreInitState) {
  const params = new URLSearchParams();

  if (init.profileId) {
    params.set("profile", toLensParam(init.profileId) ?? init.profileId);
  }
  if (init.locationQuery) {
    params.set("location", init.locationQuery);
  }

  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}
