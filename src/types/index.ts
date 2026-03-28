export type SiteFactorKey = string;

export type UseCaseType =
  | "data_center_cooling"
  | "outdoor_recreation"
  | "places_discovery"
  | "residential_development"
  | "retail_commercial"
  | "warehouse_logistics"
  | "general_exploration";

export type ResultsMode = "analysis" | "nearby_places";
export type ExploreEntrySource = "landing" | "demo" | "direct";
export type DemoOverlayLayerKey = "water" | "power" | "roads";
export type DataSourceStatus = "live" | "derived" | "limited" | "unavailable" | "demo";

export type NearbyPlaceCategory = "trail" | "hike" | "restaurant" | "landmark";
export type NearbyPlacesSource = "live" | "unavailable";

export interface ScoringFactor {
  key: string;
  label: string;
  weight: number;
  scoreFn: string;
  params: Record<string, number | string>;
  description: string;
}

export interface MissionProfile {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  accentColor: string;
  factors: ScoringFactor[];
  systemPrompt: string;
  defaultLayers: {
    water: boolean;
    power: boolean;
    roads: boolean;
    heatmap: boolean;
  };
  exampleQuestions: string[];
  demoSites?: DemoSiteSeed[];
  recommendationBands: Array<{
    min: number;
    text: string;
  }>;
}

export interface ExploreInitState {
  profileId?: string;
  locationQuery?: string;
  demoId?: string;
  entrySource?: ExploreEntrySource;
}

export interface LandingUseCase {
  id: string;
  title: string;
  description: string;
  profileId?: string;
  accentColor: string;
  icon: string;
  suggestedQuery: string;
}

export interface DemoOverlay {
  id: string;
  name: string;
  tagline: string;
  description: string;
  profileId: string;
  accentColor: string;
  icon: string;
  locationName: string;
  coordinates: Coordinates;
  entryMode: "workspace" | "overlay";
  preloadedSites?: SavedSite[];
  mapOverlays?: DemoMapOverlay[];
}

export interface DemoMapOverlay {
  id: string;
  layer: DemoOverlayLayerKey;
  positions: Coordinates[];
  color: string;
  width: number;
}

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

export interface DataSourceMeta {
  id: string;
  label: string;
  provider: string;
  status: DataSourceStatus;
  lastUpdated: string | null;
  freshness: string;
  coverage: string;
  confidence: string;
  note?: string;
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
    currentTempC: number | null;
    averageTempC: number | null;
    dailyHighTempC: number | null;
    dailyLowTempC: number | null;
    coolingDegreeDays: number | null;
    precipitationMm: number | null;
    windSpeedKph: number | null;
    airQualityIndex: number | null;
  };
  hazards: {
    earthquakeCount30d: number | null;
    strongestEarthquakeMagnitude30d: number | null;
    nearestEarthquakeKm: number | null;
  };
  demographics: {
    countyName: string | null;
    stateCode: string | null;
    population: number | null;
    medianHouseholdIncome: number | null;
    medianHomeValue: number | null;
  };
  amenities: {
    schoolCount: number | null;
    healthcareCount: number | null;
    foodAndDrinkCount: number | null;
    transitStopCount: number | null;
    parkCount: number | null;
    trailheadCount: number | null;
    commercialCount: number | null;
  };
  landClassification: LandCoverBucket[];
  sources: {
    elevation: DataSourceMeta;
    infrastructure: DataSourceMeta;
    climate: DataSourceMeta;
    hazards: DataSourceMeta;
    demographics: DataSourceMeta;
    amenities: DataSourceMeta;
    landClassification: DataSourceMeta;
  };
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
  source: "live";
}

export interface DataTrend {
  id: string;
  label: string;
  value: string;
  detail: string;
  direction: "positive" | "neutral" | "watch";
  source: DataSourceMeta;
}

export interface ElevationProfilePoint {
  step: string;
  distanceKm: number;
  elevation: number | null;
  coordinates: Coordinates;
}

export interface ElevationProfileSummary {
  lengthKm: number;
  minElevation: number | null;
  maxElevation: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
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
  profileId: string;
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
  profileId: string;
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
