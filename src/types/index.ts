export type SiteFactorKey =
  | "waterProximity"
  | "terrain"
  | "powerInfrastructure"
  | "climate"
  | "transportation"
  | "landClassification";

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
  geodata?: GeodataResult;
  imageSummary?: string;
  classification?: LandCoverBucket[];
}
