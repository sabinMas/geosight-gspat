import { StarterRegionSeed } from "@/types";

export const DEFAULT_GLOBE_VIEW = {
  lat: 45.7,
  lng: -121.8,
  height: 160000,
} as const;

export const DATA_CENTER_STARTER_REGIONS: StarterRegionSeed[] = [
  {
    id: "site-a",
    name: "Site A",
    coordinates: { lat: 45.5946, lng: -121.1787 },
    score: 87,
    summary: "Near The Dalles with strong water access and mature grid adjacency.",
  },
  {
    id: "site-b",
    name: "Site B",
    coordinates: { lat: 45.8399, lng: -119.7069 },
    score: 72,
    summary: "Boardman corridor with balanced logistics and moderate utility density.",
  },
  {
    id: "site-c",
    name: "Site C",
    coordinates: { lat: 47.4235, lng: -120.3103 },
    score: 65,
    summary: "Wenatchee-adjacent site with river access offset by mountainous terrain.",
  },
];

export const HIKING_STARTER_REGIONS: StarterRegionSeed[] = [
  {
    id: "hike-hood",
    name: "Mt. Hood Foothills",
    coordinates: { lat: 45.3735, lng: -121.6959 },
    score: 84,
    summary: "Forest trails and elevation gain near Mount Hood with strong day-hike appeal.",
  },
  {
    id: "hike-olympic",
    name: "Olympic Peninsula",
    coordinates: { lat: 47.8021, lng: -123.6044 },
    score: 88,
    summary: "Remote, water-rich terrain with strong scenic and wilderness potential.",
  },
  {
    id: "hike-gorge",
    name: "Gorge Trail Corridor",
    coordinates: { lat: 45.6628, lng: -121.9046 },
    score: 79,
    summary: "Columbia Gorge trail zone balancing access, views, and terrain variety.",
  },
];

export const RESIDENTIAL_STARTER_REGIONS: StarterRegionSeed[] = [
  {
    id: "res-crossroads",
    name: "Bellevue Crossroads",
    coordinates: { lat: 47.6185, lng: -122.1307 },
    score: 76,
    summary: "Mixed neighborhood fabric with schools, retail access, and strong Eastside connectivity.",
  },
  {
    id: "res-somerset",
    name: "Bellevue Somerset",
    coordinates: { lat: 47.5698, lng: -122.1608 },
    score: 73,
    summary: "Hillside residential area with neighborhood character and regional access tradeoffs.",
  },
  {
    id: "res-newport-hills",
    name: "Bellevue Newport Hills",
    coordinates: { lat: 47.5377, lng: -122.1515 },
    score: 70,
    summary: "South Bellevue neighborhood with established housing stock and nearby amenity access.",
  },
];

export const COMMERCIAL_STARTER_REGIONS: StarterRegionSeed[] = [
  {
    id: "com-kent",
    name: "Kent Valley Corridor",
    coordinates: { lat: 47.3809, lng: -122.2348 },
    score: 82,
    summary: "Industrial and logistics corridor with strong highway and warehouse access.",
  },
  {
    id: "com-tukwila",
    name: "Tukwila Trade Zone",
    coordinates: { lat: 47.4749, lng: -122.272 },
    score: 78,
    summary: "Retail-commercial node with access to major highways and dense activity patterns.",
  },
  {
    id: "com-boardman",
    name: "Boardman Freight Edge",
    coordinates: { lat: 45.8399, lng: -119.7069 },
    score: 75,
    summary: "Freight-oriented corridor with utility access and regional logistics advantages.",
  },
];
