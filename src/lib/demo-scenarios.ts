import type { WorkspaceCardId } from "@/types";

export interface DemoStep {
  title: string;
  message: string;
  cardId?: WorkspaceCardId;
  targetId?: string;
  duration: number;
}

export interface DemoScenario {
  id: string;
  label: string;
  tagline: string;
  icon: string;
  lat: number;
  lng: number;
  profileId?: string;
  lensId?: string;
  appMode: "explorer" | "pro";
  locationName: string;
  steps: DemoStep[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "home-buyer",
    label: "Home Buyer",
    tagline: "Analyzing Boulder, CO for a family relocating from Denver",
    icon: "🏡",
    lat: 40.015,
    lng: -105.2705,
    profileId: "residential",
    appMode: "pro",
    locationName: "Boulder, CO",
    steps: [
      {
        title: "Home Buyer Analysis — Boulder, CO",
        message:
          "GeoSight is pulling live data from 40+ government sources to build a complete location picture — terrain, hazards, schools, climate, and housing market.",
        targetId: "demo-globe",
        duration: 5000,
      },
      {
        title: "Live Composite Score",
        message:
          "A deterministic score computed from weighted factors: flood risk, air quality, seismic exposure, school quality, and housing affordability — no AI hallucination, all sourced data.",
        targetId: "demo-score",
        duration: 5500,
      },
      {
        title: "Strengths & Watchouts",
        message:
          "Top-impact factors surface automatically. Unavailable data is quarantined so it never inflates the score — you always know what's confirmed vs. estimated.",
        targetId: "demo-score",
        duration: 5500,
      },
      {
        title: "School Quality Data",
        message:
          "NCES public school data: enrollment, proficiency scores, grade spans, and distance for every nearby school — updated annually from federal datasets.",
        cardId: "school-context",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "Housing Market",
        message:
          "Median price trends, days-on-market, and affordability index from live housing feeds — paired directly with terrain and hazard data for a complete picture.",
        cardId: "housing-market",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "GeoAnalyst — Ask Anything",
        message:
          "AI reasoning grounded in the live data bundle — ask about flood history, school district boundaries, or climate trajectory. Answers cite their sources.",
        cardId: "chat",
        targetId: "demo-panel",
        duration: 5500,
      },
    ],
  },
  {
    id: "data-center",
    label: "Data Center Site",
    tagline: "Evaluating Phoenix, AZ for hyperscale cooling infrastructure",
    icon: "🖥️",
    lat: 33.4484,
    lng: -112.074,
    profileId: "data-center-cooling",
    appMode: "pro",
    locationName: "Phoenix, AZ",
    steps: [
      {
        title: "Data Center Site Evaluation — Phoenix, AZ",
        message:
          "The Data Center Cooling profile weights thermal load, seismic exposure, and climate trajectory above standard terrain factors. Loading live feeds now.",
        targetId: "demo-globe",
        duration: 5000,
      },
      {
        title: "Thermal Load Rating",
        message:
          "Ambient temp, wind cooling capacity, cooling degree days, and 30-year climate trend → a 4-tier rating: Excellent / Favorable / Moderate / Challenging.",
        cardId: "thermal-load",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "Wildfire Structural Risk",
        message:
          "Fire proximity + aridity index + vegetation density + heat amplification from NASA FIRMS and NOAA — a structural risk score, not just proximity to past fires.",
        cardId: "wildfire-risk",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "Live Disaster Alerts",
        message:
          "Real-time GDACS feed: wildfires, earthquakes, floods within range — with severity level, distance, and direct links to official incident reports.",
        cardId: "disaster-alerts",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "Drawing & Spatial Tools",
        message:
          "Draw a search radius, measure haul distances, or drop infrastructure markers directly on the 3D terrain. Export as GeoJSON for your CAD or GIS pipeline.",
        targetId: "demo-drawing",
        duration: 5500,
      },
    ],
  },
  {
    id: "trail-scout",
    label: "Trail Scout",
    tagline: "Exploring Yosemite Valley, CA for hiking & recreation planning",
    icon: "🥾",
    lat: 37.8651,
    lng: -119.5383,
    lensId: "trail-scout",
    appMode: "explorer",
    locationName: "Yosemite Valley, CA",
    steps: [
      {
        title: "Trail Scout — Yosemite Valley, CA",
        message:
          "The Trail Scout lens evaluates terrain, access, elevation profile, and current conditions for hiking and outdoor recreation planning.",
        targetId: "demo-globe",
        duration: 5000,
      },
      {
        title: "3D Terrain Navigation",
        message:
          "Powered by Cesium with live satellite, road, and hillshade basemaps. Switch to drive mode and navigate the terrain first-person with WASD controls.",
        targetId: "demo-globe",
        duration: 5500,
      },
      {
        title: "NPS Official Trail Data",
        message:
          "National Park Service trails: surface type, difficulty rating, length, and accessibility status pulled directly from the NPS API — not crowdsourced.",
        cardId: "nps-trails",
        targetId: "demo-panel",
        duration: 6000,
      },
      {
        title: "Nearby Places",
        message:
          "OpenStreetMap data surfaces trailheads, campgrounds, ranger stations, and visitor centers within the analysis radius — with distance and category.",
        targetId: "demo-nearby",
        duration: 5500,
      },
      {
        title: "Drought & Wildfire Conditions",
        message:
          "Precipitation deficit, aridity index, and fire proximity from NOAA and NASA — conditions that matter for backcountry safety and seasonal access.",
        cardId: "drought-risk",
        targetId: "demo-panel",
        duration: 6000,
      },
    ],
  },
];
