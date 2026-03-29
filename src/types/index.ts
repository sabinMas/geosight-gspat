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
export type SourceDomain =
  | "weather"
  | "nearby_places"
  | "demographics"
  | "hazards"
  | "schools"
  | "broadband"
  | "terrain"
  | "imagery";
export type SourceAccessType =
  | "api"
  | "dataset"
  | "catalog"
  | "tile_service"
  | "derived";
export type SourceRegionScope =
  | "global"
  | "us"
  | "us-wa"
  | "europe"
  | "uk"
  | "japan"
  | "india"
  | "australia-nz"
  | "latin-america"
  | "africa";
export type ThemeMode = "dark" | "light" | "system";
export type WorkspaceViewMode = "board" | "library";
export type WorkspaceCardCategory =
  | "context"
  | "analysis"
  | "planning"
  | "terrain"
  | "media"
  | "comparison";
export type WorkspaceCardZone = "primary" | "workspace";
export type WorkspaceCardEmphasis = "primary" | "secondary" | "optional";
export type WorkspaceCardSize = "wide" | "standard";
export type WorkspaceDataRequirement =
  | "geodata"
  | "score"
  | "saved-sites"
  | "classification"
  | "image"
  | "source-metadata"
  | "school-context"
  | "mission-run";
export type WorkspaceCardId =
  | "active-location"
  | "chat"
  | "results"
  | "mission-run"
  | "score"
  | "factor-breakdown"
  | "compare"
  | "terrain-viewer"
  | "elevation-profile"
  | "image-upload"
  | "land-classifier"
  | "source-awareness"
  | "school-context"
  | "hazard-context";
export type SchoolCoverageStatus =
  | "us_supported"
  | "state_accountability_supported"
  | "outside_us"
  | "no_school_matches";

export type NearbyPlaceCategory = "trail" | "hike" | "restaurant" | "landmark";
export type NearbyPlacesSource = "live" | "unavailable";
export type ScoreEvidenceKind = "direct_live" | "derived_live" | "proxy";

export interface WorkspaceCardDefinition {
  id: WorkspaceCardId;
  title: string;
  summary: string;
  questionAnswered: string;
  regionCoverage: string;
  failureMode: string;
  freshnessWindow: string;
  nextActions: string[];
  icon: string;
  category: WorkspaceCardCategory;
  zone: WorkspaceCardZone;
  emphasis: WorkspaceCardEmphasis;
  defaultSize: WorkspaceCardSize;
  defaultVisibility: boolean;
  defaultOrder: number;
  requiredData: WorkspaceDataRequirement[];
  supportedProfiles: string[];
  emptyState: string;
}

export interface WorkspaceCardPreference {
  cardId: WorkspaceCardId;
  visible: boolean;
}

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
  judgeMode?: boolean;
  missionRunPresetId?: string;
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
  competition?: {
    openingScript: string;
    missionRunPresetId: string;
    targetCardIds: WorkspaceCardId[];
    successScreenshotTargets: string[];
    fallbackNarrative: string;
  };
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
  domain?: SourceDomain;
  accessType?: SourceAccessType;
  regionScopes?: SourceRegionScope[];
  fallbackProviders?: string[];
}

export interface SavedBoard {
  id: string;
  name: string;
  profileId: string;
  activeCardId: WorkspaceCardId | null;
  visibleCardIds: WorkspaceCardId[];
  createdAt: string;
}

export interface SourceRegistryContext {
  countryCode?: string | null;
  stateCode?: string | null;
  scopes: SourceRegionScope[];
}

export interface SourceProviderDefinition {
  id: string;
  name: string;
  domains: SourceDomain[];
  accessType: SourceAccessType;
  coverage: SourceRegionScope[];
  priority: number;
  freshness: string;
  reliability: string;
  rateLimit: string;
  notes: string;
  integrated: boolean;
}

export interface SourceProviderGuidance {
  domain: SourceDomain;
  context: SourceRegistryContext;
  primary: SourceProviderDefinition | null;
  fallbacks: SourceProviderDefinition[];
}

export interface SchoolOfficialMetrics {
  provider: string;
  proficiencyPercent: number | null;
  participationPercent: number | null;
  subjectSummary: string | null;
  year: string | null;
}

export interface SchoolSummary {
  id: string;
  name: string;
  ncesId: string | null;
  districtName: string | null;
  city: string | null;
  stateCode: string | null;
  countyName: string | null;
  distanceKm: number | null;
  localeLabel: string | null;
  enrollment: number | null;
  gradeSpan: string | null;
  officialMetrics: SchoolOfficialMetrics | null;
}

export interface SchoolContextSummary {
  coverageStatus: SchoolCoverageStatus;
  score: number | null;
  band: string;
  explanation: string;
  nearbySchoolCount: number;
  nearestSchoolDistanceKm: number | null;
  matchedOfficialSchoolCount: number;
}

export interface SchoolContextResult extends SchoolContextSummary {
  schools: SchoolSummary[];
  sources: {
    baseline: DataSourceMeta;
    stateAccountability: DataSourceMeta;
    normalization: DataSourceMeta;
  };
  notes: string[];
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
    weatherRiskSummary: string | null;
  };
  hazards: {
    earthquakeCount30d: number | null;
    strongestEarthquakeMagnitude30d: number | null;
    nearestEarthquakeKm: number | null;
    activeFireCount7d: number | null;
    nearestFireKm: number | null;
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
  schoolContext: SchoolContextSummary | null;
  landClassification: LandCoverBucket[];
  sources: {
    elevation: DataSourceMeta;
    infrastructure: DataSourceMeta;
    climate: DataSourceMeta;
    hazards: DataSourceMeta;
    hazardFire: DataSourceMeta;
    demographics: DataSourceMeta;
    amenities: DataSourceMeta;
    school: DataSourceMeta;
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
  evidenceKind?: ScoreEvidenceKind;
  evidenceLabel?: string;
  evidenceExplanation?: string;
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

export interface MissionRunStepPreset {
  id: string;
  title: string;
  objective: string;
  question: string;
}

export interface MissionRunPreset {
  id: string;
  title: string;
  profileId: string;
  demoId?: string;
  locationQuery?: string;
  missionObjective: string;
  summary: string;
  steps: MissionRunStepPreset[];
  successSignals: string[];
  fallbackNarrative: string;
  recommendedCards: WorkspaceCardId[];
}

export interface MissionRunStepResult {
  id: string;
  title: string;
  objective: string;
  answer: string;
  model: string;
}

export interface MissionRunSourceSummary {
  liveSources: string[];
  derivedSignals: string[];
  missingCoverage: string[];
}

export interface MissionRunResult {
  presetId: string;
  title: string;
  missionObjective: string;
  headline: string;
  summary: string;
  stepResults: MissionRunStepResult[];
  recommendedCards: WorkspaceCardId[];
  sourceSummary: MissionRunSourceSummary;
  modelTrail: string[];
}

export interface MissionRunRequestBody {
  presetId: string;
  profileId: string;
  location?: Coordinates;
  locationName?: string;
  geodata?: GeodataResult;
  nearbyPlaces?: NearbyPlace[];
  dataTrends?: DataTrend[];
  imageSummary?: string;
  classification?: LandCoverBucket[];
}
