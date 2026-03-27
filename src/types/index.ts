export type SiteFactorKey =
  | "waterProximity"
  | "terrain"
  | "powerInfrastructure"
  | "climate"
  | "transportation"
  | "landClassification";

export type UseCaseType =
  | "data_center_cooling"
  | "outdoor_recreation"
  | "places_discovery"
  | "residential_development"
  | "retail_commercial"
  | "warehouse_logistics"
  | "general_exploration";

export type ResultsMode = "analysis" | "nearby_places";

export type NearbyPlaceCategory = "trail" | "hike" | "restaurant" | "landmark";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RegionSelection {
  id: string;
  name: string;
  center: Coordinates;
  polygon: Coordinates[];
  bbox: BoundingBox;
}

export interface LandCoverBucket {
  label: string;
  value: number;
  confidence: number;
  color: string;
}

export interface GeodataResult {
  elevationMeters: number | null;
  nearestWaterBody: {
    name: string;
    distanceKm: number | null;
  };
  nearestRoad: {
    name: string;
    distanceKm: number | null;
  };
  nearestPower: {
    name: string;
    distanceKm: number | null;
  };
  climate: {
    averageTempC: number | null;
    coolingDegreeDays: number | null;
    precipitationMm: number | null;
  };
  landClassification: LandCoverBucket[];
  sourceNotes: string[];
}

export interface LocationSearchResult {
  name: string;
  coordinates: Coordinates;
  kind?: string;
  countryCode?: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: NearbyPlaceCategory;
  distanceKm: number | null;
  relativeLocation: string;
  summary: string;
  attributes: string[];
  source: "placeholder" | "live";
}

export interface DataTrend {
  id: string;
  label: string;
  value: string;
  detail: string;
  direction: "positive" | "neutral" | "watch";
  source: "derived" | "live";
}

export interface SiteFactorScore {
  key: SiteFactorKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface SiteScore {
  total: number;
  recommendation: string;
  factors: SiteFactorScore[];
}

export interface SavedSite {
  id: string;
  name: string;
  regionName: string;
  coordinates: Coordinates;
  score: SiteScore;
  geodata: GeodataResult;
  note?: string;
}

export interface DemoSiteSeed {
  id: string;
  name: string;
  coordinates: Coordinates;
  score: number;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AnalyzeRequestBody {
  question: string;
  location?: Coordinates;
  locationName?: string;
  resultsMode?: ResultsMode;
  geodata?: GeodataResult;
  nearbyPlaces?: NearbyPlace[];
  dataTrends?: DataTrend[];
  imageSummary?: string;
  classification?: LandCoverBucket[];
}
