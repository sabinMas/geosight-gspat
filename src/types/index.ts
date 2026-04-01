import type { ClimateHistoryResult } from "@/lib/climate-history";
import type { GroundwaterSummary } from "@/lib/groundwater";
import type { SeismicDesignParams } from "@/lib/seismic-design";
import type { SoilProfile } from "@/lib/soil-profile";

export type SiteFactorKey = string;

export type UseCaseType =
  | "data_center_cooling"
  | "outdoor_recreation"
  | "places_discovery"
  | "home_buying"
  | "site_development"
  | "retail_commercial"
  | "warehouse_logistics"
  | "general_exploration";

export type ResultsMode = "analysis" | "nearby_places";
export type DataSourceStatus = "live" | "derived" | "limited" | "unavailable";
export type SourceDomain =
  | "weather"
  | "nearby_places"
  | "demographics"
  | "housing"
  | "hazards"
  | "hydrology"
  | "environmental"
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
export type WorkspaceShellMode = "minimal" | "guided" | "board";
export type GlobeViewMode = "satellite" | "road" | "water-terrain";
export type SubsurfaceRenderMode = "surface_only" | "slice_stack" | "volume_future";
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
export type WorkspaceCardRevealTier = "primary" | "supporting" | "deep_dive";
export type WorkspaceCardDensityBudget = "low" | "medium" | "high";
export type WorkspaceRevealTrigger =
  | "location_selected"
  | "ask_reasoning"
  | "ask_summary"
  | "ask_trust"
  | "ask_comparison"
  | "ask_hazard"
  | "ask_terrain"
  | "ask_imagery"
  | "ask_schools"
  | "report_opened";
export type WorkspaceDataRequirement =
  | "geodata"
  | "score"
  | "saved-sites"
  | "classification"
  | "image"
  | "source-metadata"
  | "school-context";
export type WorkspaceCardId =
  | "active-location"
  | "chat"
  | "results"
  | "score"
  | "factor-breakdown"
  | "compare"
  | "terrain-viewer"
  | "elevation-profile"
  | "image-upload"
  | "land-classifier"
  | "source-awareness"
  | "school-context"
  | "hazard-context"
  | "broadband-context"
  | "flood-risk"
  | "cooling-water"
  | "air-quality"
  | "contamination-risk"
  | "groundwater"
  | "soil-profile"
  | "seismic-design"
  | "climate-history";
export type SchoolCoverageStatus =
  | "us_supported"
  | "state_accountability_supported"
  | "outside_us"
  | "no_school_matches";

export type NearbyPlaceCategory = "trail" | "hike" | "restaurant" | "landmark";
export type NearbyPlacesSource = "live" | "unavailable";
export type ScoreEvidenceKind = "direct_live" | "derived_live" | "proxy";
export type AnalysisCapabilityId =
  | "seismic-context"
  | "groundwater-soil"
  | "hazard-stack"
  | "climate-trends"
  | "source-confidence"
  | "tomography-context";
export type AnalysisCapabilityTriggerMode = "auto_detected" | "user_triggered";
export type AnalysisCapabilityOutputFormat =
  | "summary"
  | "interpretation"
  | "ranked_list"
  | "risk_readout";
export type AnalysisModelLane =
  | "analysis"
  | "writer"
  | "scientific";
export type AnalysisCapabilityStatus = "available" | "unavailable";
export type AgentExecutionMode = "live" | "fallback" | "deterministic";
export type SubsurfaceDatasetId =
  | "groundwater"
  | "soil-profile"
  | "seismic-design"
  | "tomography";
export type SubsurfaceDatasetRenderingMode =
  | "surface_only"
  | "slice_stack"
  | "volume_future";

export interface WorkspaceCardDefinition {
  id: WorkspaceCardId;
  title: string;
  summary: string;
  questionAnswered: string;
  regionCoverage: string;
  failureMode: string;
  freshnessWindow: string;
  nextActions: readonly string[];
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
  revealTier: WorkspaceCardRevealTier;
  revealTriggers: WorkspaceRevealTrigger[];
  summaryVariant: string;
  compactActions: readonly string[];
  densityBudget: WorkspaceCardDensityBudget;
}

export interface AnalysisCapability {
  analysisId: AnalysisCapabilityId;
  title: string;
  shortLabel: string;
  description: string;
  triggerMode: AnalysisCapabilityTriggerMode;
  outputFormat: AnalysisCapabilityOutputFormat;
  modelLane: AnalysisModelLane;
  status: AnalysisCapabilityStatus;
  recommended: boolean;
  available: boolean;
  reason: string;
  failureMode: string;
}

export interface AnalysisCapabilityResult {
  analysisId: AnalysisCapabilityId;
  title: string;
  response: string;
  model: string;
  generatedAt: string;
  mode: AgentExecutionMode;
}

export interface SubsurfaceDataset {
  id: SubsurfaceDatasetId;
  title: string;
  description: string;
  footprint: Coordinates[];
  depthRangeMeters: {
    min: number;
    max: number;
  } | null;
  sliceAvailability: number[];
  renderingModeSupport: SubsurfaceDatasetRenderingMode;
  provenance: string;
  units: string;
  resolution: string;
  confidence: string;
  aiInterpretationAvailable: boolean;
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
  recommendationBands: Array<{
    min: number;
    text: string;
  }>;
}

export interface ExploreInitState {
  profileId?: string;
  locationQuery?: string;
  locationLabel?: string;
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
  secondaryLabel?: string;
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
  url?: string;
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

export interface BroadbandResult {
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
  providerCount: number;
  technologies: string[];
  hasFiber: boolean;
}

export interface FloodZoneResult {
  floodZone: string;
  isSpecialFloodHazard: boolean;
  label: string;
}

export interface StreamGaugeResult {
  siteNumber: string;
  siteName: string;
  dischargeCfs: number | null;
  drainageAreaSqMi: number | null;
  distanceKm: number;
}

export interface AirQualityResult {
  stationName: string;
  pm25: number | null;
  pm10: number | null;
  aqiCategory:
    | "Good"
    | "Moderate"
    | "Unhealthy for Sensitive Groups"
    | "Unhealthy"
    | "Very Unhealthy"
    | "Hazardous";
  distanceKm: number;
}

export interface EPAHazardResult {
  superfundCount: number;
  triCount: number;
  nearestSuperfundName: string | null;
  nearestSuperfundDistanceKm: number | null;
}

export interface HousingMarketSeriesPoint {
  periodEnd: string;
  label: string;
  medianSalePrice: number | null;
  medianDom: number | null;
  activeListings: number | null;
}

export interface HousingMarketResult {
  status: DataSourceStatus;
  regionLabel: string | null;
  locationLabel: string;
  monthLabel: string | null;
  medianSalePrice: number | null;
  medianDom: number | null;
  activeListings: number | null;
  saleToListRatio: number | null;
  inventoryYoY: number | null;
  source: DataSourceMeta;
  notes: string[];
  marketUrl: string;
  series: HousingMarketSeriesPoint[];
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
  broadband: BroadbandResult | null;
  floodZone: FloodZoneResult | null;
  streamGauges: StreamGaugeResult[];
  groundwater: GroundwaterSummary;
  soilProfile: SoilProfile | null;
  seismicDesign: SeismicDesignParams | null;
  climateHistory: ClimateHistoryResult | null;
  airQuality: AirQualityResult | null;
  epaHazards: EPAHazardResult | null;
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
    broadband: DataSourceMeta;
    floodZone: DataSourceMeta;
    water: DataSourceMeta;
    groundwater: DataSourceMeta;
    soilProfile: DataSourceMeta;
    seismicDesign: DataSourceMeta;
    climateHistory: DataSourceMeta;
    airQuality: DataSourceMeta;
    epaHazards: DataSourceMeta;
  };
  sourceNotes: string[];
}

export interface LocationSearchResult {
  name: string;
  shortName?: string;
  fullName?: string;
  coordinates: Coordinates;
  kind?: string;
  countryCode?: string;
  countryName?: string;
  locality?: string;
  district?: string;
}

export type DiscoveryMode = "nearby_places" | "scored_regions";

export interface DiscoveryIntent {
  rawQuery: string;
  profileId: string;
  profileName: string;
  anchorQuery: string;
  anchorName: string;
  mode: DiscoveryMode;
  title: string;
  summary: string;
}

export interface DiscoveryCandidate {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  locationQuery: string;
  locationLabel: string;
  profileId: string;
  score: number | null;
  distanceKm: number | null;
  highlights: string[];
}

export interface DiscoveryResponse {
  intent: DiscoveryIntent;
  candidates: DiscoveryCandidate[];
  limitations: string[];
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: NearbyPlaceCategory;
  coordinates: Coordinates;
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

export interface BroadbandScoreSummary {
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
  providerCount: number;
  technologies: string[];
  score: number | null;
}

export interface SiteScore {
  total: number;
  recommendation: string;
  factors: SiteFactorScore[];
  broadband: BroadbandScoreSummary | null;
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

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentConversationMessage extends ConversationMessage {
  createdAt?: string;
}

export interface AnalyzeRequestBody {
  profileId: string;
  question: string;
  messages?: ConversationMessage[];
  location?: Coordinates;
  locationName?: string;
  resultsMode?: ResultsMode;
  geodata?: GeodataResult;
  nearbyPlaces?: NearbyPlace[];
  dataTrends?: DataTrend[];
  imageSummary?: string;
  classification?: LandCoverBucket[];
}
