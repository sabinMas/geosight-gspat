import type { ClimateHistoryResult } from "@/lib/climate-history";
import type { GroundwaterSummary } from "@/lib/groundwater";
import type { SeismicDesignParams } from "@/lib/seismic-design";
import type { SoilProfile } from "@/lib/soil-profile";
import type { SolarResourceResult } from "@/lib/solar-resource";
export type { AppMode, CardAudience, CardComplexity } from "./app-mode";
import type { AppMode, CardAudience, CardComplexity } from "./app-mode";

export type SiteFactorKey = string;
export type ExploreEntrySource = "landing" | "direct";

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
export type DrawingTool = "none" | "polygon" | "marker" | "measure" | "circle";

/**
 * Source of geometry for lens analyzers: a point location or a drawn geometry.
 * Used by Phase 1 lens analyzers (src/lib/analysis/*) and their prompts.
 */
export type AnalysisInputMode = "location" | "geometry";

export interface DrawnShape {
  id: string;
  type: Exclude<DrawingTool, "none">;
  coordinates: Array<{ lat: number; lng: number }>;
  label?: string;
  measurementLabel?: string;
  measurement?: DrawnMeasurement;
  color: string;
  radiusMeters?: number;
  metrics?: {
    areaSqKm?: number;
    areaAcres?: number;
    perimeterKm?: number;
    perimeterMiles?: number;
    radiusKm?: number;
  };
}

export type DataSourceStatus = "live" | "derived" | "limited" | "demo" | "unavailable";
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
  | "ask_climate"
  | "ask_wildfire"
  | "ask_alerts"
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
  | "school-context"
  | "imported-layer";
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
  | "climate-history"
  | "weather-forecast"
  | "demographics-context"
  | "outdoor-fit"
  | "trip-summary"
  | "local-access"
  | "site-readiness"
  | "infrastructure-access"
  | "earthquake-history"
  | "fire-history"
  | "multi-hazard-resilience"
  | "hazard-details"
  | "housing-market"
  | "resilience-score"
  | "drought-risk"
  | "disaster-alerts"
  | "wildfire-risk"
  | "thermal-load"
  | "stream-gauges"
  | "solar-resource"
  | "attribute-table";
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
  | "tomography-context"
  | "infrastructure-cooling"
  | "commercial-logistics"
  | "site-readiness";
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
  audience: CardAudience;
  complexity: CardComplexity;
  explorerLabel?: string;
  explorerSummary?: string;
  modeVisibility: { explorer: boolean; pro: boolean };
}

/** Minimum prop contract shared by all workspace cards that render geodata. */
export interface WorkspaceCardBaseProps {
  geodata: GeodataResult | null;
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
  lat?: number;
  lng?: number;
  entrySource?: ExploreEntrySource;
  appMode?: AppMode;
  lensId?: string;
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

export interface GlobeViewSnapshot {
  headingDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  altitudeMeters: number | null;
  latitude: number | null;
  longitude: number | null;
  viewportWidthPx: number | null;
  viewportHeightPx: number | null;
  metersPerPixel: number | null;
}

export interface CaptureFigureOptions {
  title: string;
  subtitle: string;
  notes: string;
  showScaleBar: boolean;
  showLegend: boolean;
  showNorthArrow: boolean;
  emphasizeAoi: boolean;
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

export interface GdacsAlertSummaryItem {
  eventId: number;
  episodeId: number;
  eventType: string;
  eventLabel: string;
  alertLevel: string;
  alertScore: number | null;
  country: string;
  description: string;
  distanceKm: number | null;
  fromDate: string | null;
  toDate: string | null;
  datemodified: string | null;
  reportUrl: string | null;
}

export interface GdacsAlertSummary {
  totalCurrentAlerts: number;
  elevatedCurrentAlerts: number;
  redCurrentAlerts: number;
  orangeCurrentAlerts: number;
  nearestAlert: GdacsAlertSummaryItem | null;
  featuredAlerts: GdacsAlertSummaryItem[];
}

export type HazardRiskTier = "low" | "moderate" | "elevated" | "critical";

export interface HazardDomainScore {
  domain: string;
  label: string;
  score: number;
  tier: HazardRiskTier;
  detail: string;
  available: boolean;
  coverage: "global" | "us_only";
}

export interface HazardResilienceSummary {
  compoundScore: number;
  tier: HazardRiskTier;
  domains: HazardDomainScore[];
  worstDomain: HazardDomainScore | null;
}

export interface WeatherForecastDay {
  date: string;
  dayLabel: string;
  conditionLabel: string | null;
  weatherCode: number | null;
  highTempC: number | null;
  lowTempC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  windSpeedKph: number | null;
  uvIndex: number | null;
}

export interface SavedBoard {
  id: string;
  name: string;
  profileId: string;
  /** @deprecated kept for backward compat; use openCardIds */
  activeCardId: WorkspaceCardId | null;
  openCardIds?: WorkspaceCardId[];
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

export type BroadbandGranularity = "address" | "country";

interface BroadbandResultBase {
  kind: "address_availability" | "regional_household_baseline";
  granularity: BroadbandGranularity;
  regionLabel: string | null;
  referenceYear: number | null;
  technologies: string[];
}

export interface AddressBroadbandResult extends BroadbandResultBase {
  kind: "address_availability";
  granularity: "address";
  regionLabel: null;
  referenceYear: null;
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
  providerCount: number;
  hasFiber: boolean;
  fixedBroadbandCoveragePercent: null;
  mobileBroadbandCoveragePercent: null;
}

export interface RegionalBroadbandBaselineResult extends BroadbandResultBase {
  kind: "regional_household_baseline";
  granularity: "country";
  regionLabel: string;
  referenceYear: number | null;
  maxDownloadSpeed: 0;
  maxUploadSpeed: 0;
  providerCount: 0;
  hasFiber: false;
  fixedBroadbandCoveragePercent: number | null;
  mobileBroadbandCoveragePercent: number | null;
}

export type BroadbandResult = AddressBroadbandResult | RegionalBroadbandBaselineResult;

export interface FloodZoneResult {
  floodZone: string;
  isSpecialFloodHazard: boolean;
  label: string;
  /** "fema" for US regulatory zone; "glofas" for global river-discharge context */
  source: "fema" | "glofas";
  /** GloFAS only: peak 7-day forecast river discharge (m³/s) */
  peakDischargeCms?: number | null;
  /** GloFAS only: qualitative tier — "Low" | "Moderate" | "Significant" | "Major" */
  dischargeRiskLabel?: string | null;
  /** FEMA SFHA only: Base Flood Elevation in feet above NAVD88 (from NFHL layer 17) */
  baseFloodElevationFt?: number | null;
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
  /** "epa" for US EPA Envirofacts; "eea" for EEA E-PRTR industrial facilities */
  source?: "epa" | "eea";
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
    geographicGranularity: "county" | "country" | "nuts2_region";
    populationReferenceYear: number | null;
    incomeReferenceYear: number | null;
    incomeDefinition: string | null;
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
  solarResource: SolarResourceResult | null;
  airQuality: AirQualityResult | null;
  epaHazards: EPAHazardResult | null;
  hazardAlerts: GdacsAlertSummary | null;
  weatherForecast: WeatherForecastDay[];
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
    solarResource: DataSourceMeta;
    airQuality: DataSourceMeta;
    epaHazards: DataSourceMeta;
    hazardAlerts: DataSourceMeta;
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
  evidenceKind?: ScoreEvidenceKind;
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
  /** Source IDs that contributed to this factor. Optional — may be absent on older score objects. */
  sourceIds?: string[];
  sourceLastUpdated?: string;
  proxyReason?: string;
}

export interface BroadbandScoreSummary {
  kind: BroadbandResult["kind"];
  granularity: BroadbandGranularity;
  regionLabel: string | null;
  referenceYear: number | null;
  maxDownloadSpeed: number;
  maxUploadSpeed: number;
  providerCount: number;
  technologies: string[];
  fixedBroadbandCoveragePercent: number | null;
  mobileBroadbandCoveragePercent: number | null;
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
  geodata?: GeodataResult;
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
  stream?: boolean;
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


export interface EarthquakeEvent {
  mag: number;
  depth: number | null;
  distanceKm: number;
  time: string;
  place: string;
  lat: number;
  lng: number;
}

export interface EarthquakeHistorySummary {
  events: EarthquakeEvent[];
  countByYear: Record<string, number>;
  maxMag: number | null;
  totalCount: number;
  yearsSearched: number;
}

export interface FireSeasonYear {
  year: number;
  detectionCount: number;
  maxBrightnessK: number | null;
  gdacsAlerts: number;
}

export interface FireHistorySummary {
  byYear: FireSeasonYear[];
  hotYears: number[];
  totalDetections: number;
  yearsSearched: number;
}

// ---------------------------------------------------------------------------
// Drawn geometry GeoJSON types (used by analysis-geometry.ts + lens analyzers)
// ---------------------------------------------------------------------------
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

export type DrawnShapeType = Exclude<DrawingTool, "none">;

export interface DrawnMeasurement {
  kind: "distance" | "area";
  value: number;
  unit: "miles" | "acres";
  display: string;
  distanceKm?: number;
  distanceMi?: number;
  areaHa?: number;
  areaKm2?: number;
  areaAcres?: number;
  areaMi2?: number;
  perimeterKm?: number;
  perimeterMi?: number;
  bearingDeg?: number;
  bearingDisplay?: string;
}

export interface DrawnGeometryProperties {
  id: string;
  label: string | null;
  color: string;
  shapeType: DrawnShapeType;
  measurementLabel: string | null;
  measurementKind: DrawnMeasurement["kind"] | null;
  measurementUnit: DrawnMeasurement["unit"] | null;
  measurementValue: number | null;
  radiusMeters: number | null;
}

export type DrawnGeometry = Point | LineString | Polygon;
export type DrawnGeometryFeature = Feature<DrawnGeometry, DrawnGeometryProperties>;
export type DrawnGeometryFeatureCollection = FeatureCollection<DrawnGeometry, DrawnGeometryProperties>;

// ---------------------------------------------------------------------------
// Lens analysis types (used by /api/lens-analysis + useLensAnalysis)
// ---------------------------------------------------------------------------
export type AnalysisRiskLevel = "low" | "moderate" | "high";

export interface AnalysisMetricRow {
  id: string;
  label: string;
  value: string;
  icon?: string;
  detail?: string;
  riskLevel?: AnalysisRiskLevel;
  estimated?: boolean;
}

export interface LensAnalysisResult {
  lens: string;
  geometrySource: AnalysisInputMode;
  title: string;
  narrative: string | null;
  metrics: AnalysisMetricRow[];
  generatedAt: string;
  attribution: string[];
  details?: Record<string, unknown>;
}

export interface LensAnalysisRequestBody {
  lensId: string;
  geometrySource: AnalysisInputMode;
  location: Coordinates | null;
  locationName: string;
  geometry: DrawnGeometryFeatureCollection;
  selectedGeometryId?: string | null;
  globeViewMode?: GlobeViewMode;
  activeLayerLabels?: string[];
}

// ---------------------------------------------------------------------------
// Custom user-added imagery layers (layer manager)
// ---------------------------------------------------------------------------
export type CustomLayerType = "wms" | "wmts" | "xyz";

export interface CustomLayer {
  id: string;
  name: string;
  type: CustomLayerType;
  url: string;
  wmsLayers?: string;
  opacity: number;
  visible: boolean;
  order: number;
}

// ---------------------------------------------------------------------------
// Feature inspector (identify mode) types
// ---------------------------------------------------------------------------
export interface IdentifyHit {
  layerName: string;
  featureType: "imagery" | "entity" | "drawn-shape" | "saved-site" | "fire" | "earthquake";
  attributes: Record<string, string | number | boolean | null>;
  coordinates: Coordinates | null;
}

export interface IdentifyResult {
  clickCoordinates: Coordinates;
  hits: IdentifyHit[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Location tracking types
// ---------------------------------------------------------------------------
export interface UserLocationFix {
  coordinates: Coordinates;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
  timestamp: string;
}

export interface RouteRecordingSnapshot {
  isRecording: boolean;
  pointCount: number;
  totalDistanceMiles: number;
  elapsedSeconds: number;
}
