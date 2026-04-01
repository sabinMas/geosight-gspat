export interface ScoringMethodologyEntry {
  description: string;
  calibration: string;
  scoreRange: string;
  nullBehavior: string;
}

export const SCORING_METHODOLOGY: Record<string, ScoringMethodologyEntry> = {
  scoreCountSignal: {
    description:
      "Converts a count-based signal into a score by scaling from a low-count penalty toward an ideal-count target and flattening once the count is high enough.",
    calibration:
      "Used for amenities, providers, and other count-based context where more is helpful up to a mission-specific ceiling rather than indefinitely.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when count data is unavailable and 15 when the observed count is zero or below.",
  },
  scoreFromDistance: {
    description:
      "Linear interpolation between ideal and cutoff distances, with support for either proximity-favored or remoteness-favored factors.",
    calibration:
      "Ideal and cutoff distances are tuned per mission profile so infrastructure-heavy profiles reward tighter access while recreation profiles tolerate or reward more separation.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when the distance reading is unavailable.",
  },
  scoreTerrain: {
    description:
      "Step-function scoring over elevation bands. Different modes reward lower buildability-friendly terrain or mid-elevation terrain variety depending on the mission.",
    calibration:
      "Cooling and commercial cases favor flatter lower-elevation terrain; hiking favors moderate relief and visual variety; residential buildability sits between those extremes.",
    scoreRange: "30-90",
    nullBehavior: "Returns 55 when elevation is unavailable.",
  },
  scoreDischargeVolume: {
    description:
      "Scores mapped stream-gauge discharge using discrete flow bands so larger nearby rivers rate higher for cooling-water context.",
    calibration:
      "Thresholds roughly separate very large rivers, medium industrially relevant flows, and small streams that are less meaningful for cooling or water-intake screening.",
    scoreRange: "28-100",
    nullBehavior: "Returns 60 when no discharge reading is available.",
  },
  scoreClimate: {
    description:
      "Blends temperature and cooling-demand metrics for infrastructure cases or temperature and precipitation comfort for outdoor-use cases.",
    calibration:
      "Cooling mode rewards cooler annual conditions and fewer cooling degree days; outdoor mode favors moderate temperatures and manageable precipitation.",
    scoreRange: "20-100",
    nullBehavior: "Returns 60 when temperature or cooling-demand data is missing, with precipitation treated as partially optional in outdoor mode.",
  },
  scoreLandCover: {
    description:
      "Transforms land-cover class mix into a suitability score by weighting favorable and constrained surface types differently for each mission.",
    calibration:
      "Developed and industrial surfaces are favored for infrastructure, vegetation for hiking, mixed urban/open land for residential, and dense developed land for commercial uses.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when land-cover classification is unavailable.",
  },
  scoreBroadbandAvailability: {
    description:
      "Uses FCC point-level provider and speed data in the US, and falls back to Eurostat country-level household broadband percentages in Europe.",
    calibration:
      "Data-center mode uses stricter throughput targets than residential mode for US point lookups, while Europe-wide baselines score from fixed and mobile household coverage shares instead of pretending to be address-level service.",
    scoreRange: "15-100",
    nullBehavior: "Returns roughly neutral values between 58 and 60 when broadband data is unavailable or unsupported.",
  },
  scoreFloodRisk: {
    description:
      "Maps FEMA flood-zone designations to a simple infrastructure or residential suitability score, heavily penalizing Special Flood Hazard Areas.",
    calibration:
      "Zone X receives the strongest score, mapped SFHAs receive the strongest penalty, and lower-confidence zones like B, C, and D sit in the middle.",
    scoreRange: "0-100",
    nullBehavior: "Returns 60 when FEMA coverage is unavailable and 58 when no flood-zone result is returned.",
  },
  scoreAirQualityContext: {
    description:
      "Prefers direct OpenAQ particulate readings when available and otherwise falls back to Open-Meteo AQI context to estimate environmental comfort.",
    calibration:
      "The scoring bands mirror familiar air-quality categories: good conditions score high while unhealthy and hazardous ranges degrade sharply.",
    scoreRange: "10-94",
    nullBehavior: "Returns 60 when neither station data nor AQI context is available.",
  },
  scoreContaminationRisk: {
    description:
      "Starts from a high baseline and subtracts penalties for nearby Superfund counts, TRI facility counts, and close-in contamination proximity.",
    calibration:
      "Superfund sites carry the strongest penalty, TRI facilities add lighter screening friction, and very close Superfund proximity triggers an extra deduction.",
    scoreRange: "15-92",
    nullBehavior: "Returns around 58-60 when EPA contamination screening is unavailable or empty.",
  },
  scoreWaterAccess: {
    description:
      "Blends mapped water-body proximity, distance to the nearest live USGS gauge, and discharge volume into a single cooling-water access score.",
    calibration:
      "Mapped access sets the baseline, gauge distance refines whether the water source is instrumented nearby, and discharge volume pushes large reliable rivers upward.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when gauge data is unavailable because mapped water proximity is still considered.",
  },
  scoreGroundwaterDepth: {
    description:
      "Scores the nearest groundwater well's latest depth-to-water reading, using different thresholds for infrastructure and residential screening.",
    calibration:
      "Data-center screening prefers deeper water tables to reduce dewatering exposure, while residential screening prefers moderate depths that avoid both saturation and extreme excavation complexity.",
    scoreRange: "40-100",
    nullBehavior: "Returns 55 when no nearby groundwater monitoring well has a usable water-level reading.",
  },
  scoreSoilBuildability: {
    description:
      "Translates drainage class and hydrologic soil group into a coarse buildability score for foundations and site drainage.",
    calibration:
      "Well-drained group A soils receive the strongest score, group B with moderate drainage remains favorable, group C is middling, and poorly drained group D soils receive the sharpest penalty.",
    scoreRange: "30-95",
    nullBehavior: "Returns 50 when soil-profile data is unavailable.",
  },
  scoreSeismicRisk: {
    description:
      "Uses USGS peak ground acceleration as an inverse shaking-risk score where lower PGA corresponds to easier structural design conditions.",
    calibration:
      "The bands roughly separate very low, low-to-moderate, moderate, and high seismic design burden for screening purposes.",
    scoreRange: "30-95",
    nullBehavior: "Returns 60 when seismic design values are unavailable.",
  },
  scoreHazardAlerts: {
    description:
      "Scores the current regional disaster risk using GDACS live alert counts. Red-level alerts trigger the sharpest penalty; orange/elevated alerts apply a moderate penalty; high global alert volumes apply a light penalty; quiet periods score highest.",
    calibration:
      "Thresholds are count-based: any active red alert drops the score to 25, any elevated alert drops it to 50, more than ten total active alerts drop it to 65, and a quiet global period scores 85. Null data returns a neutral 70 rather than tanking the score.",
    scoreRange: "25-85",
    nullBehavior: "Returns 70 when GDACS alert data is unavailable, treating the absence of data as a mildly cautious neutral rather than assuming safety or danger.",
  },
  hazardAlerts: {
    description:
      "Regional disaster alert exposure uses the GDACS live global alert feed. Alert severity and count at the time of analysis are translated into a risk-adjusted score.",
    calibration:
      "The factor is intended as a global first-pass hazard signal supplementing site-specific FEMA and seismic data, not as a replacement for local emergency planning or engineering assessment.",
    scoreRange: "25-85",
    nullBehavior: "Returns 70 when the GDACS feed is unavailable so the factor does not unfairly penalize locations where the feed timed out.",
  },
  waterProximity: {
    description:
      "Cooling water access is scored with the composite water-access method, not just raw distance. GeoSight combines mapped water proximity with nearby USGS stream-gauge distance and discharge volume.",
    calibration:
      "This factor is tuned for data-center cooling where large nearby monitored water sources are materially better than small uninstrumented channels.",
    scoreRange: "15-100",
    nullBehavior: "Degrades toward a neutral screening score when gauge data is sparse or missing.",
  },
  terrain: {
    description:
      "Terrain factors use elevation-band scoring rather than slope rasters. Depending on profile, the same terrain helper rewards either lower buildability-friendly terrain or moderate elevation variety.",
    calibration:
      "Data-center and commercial scoring favors flatter lower-elevation terrain; hiking favors mid-elevation terrain variety; residential buildability uses the buildability banding.",
    scoreRange: "30-90",
    nullBehavior: "Returns 55 when elevation is unavailable.",
  },
  powerInfrastructure: {
    description:
      "Utility access is scored from the nearest power corridor or substation distance using the standard distance interpolation method.",
    calibration:
      "Data-center and commercial profiles use tighter ideal distances so nearby utility adjacency is rewarded more strongly than in general exploration.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when no power-distance reading is available.",
  },
  climate: {
    description:
      "Climate suitability uses the infrastructure-focused climate blend: annual temperature and cooling-degree demand are weighted together.",
    calibration:
      "Cooler average temperatures and lower cooling demand rate highest for infrastructure and thermal-efficiency use cases.",
    scoreRange: "20-100",
    nullBehavior: "Returns 60 when climate values are incomplete.",
  },
  transportation: {
    description:
      "Road transportation uses distance interpolation, rewarding close but not necessarily zero-distance access to mapped roads and corridors.",
    calibration:
      "Infrastructure profiles use relatively tight ideal access because construction and operations logistics worsen as road distance increases.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when no road-distance reading is available.",
  },
  landClassification: {
    description:
      "Land classification is derived from GeoSight's land-cover mix and then scored differently by mission: developed for infrastructure, vegetation for hiking, residential mix for housing, and commercial intensity for retail/logistics.",
    calibration:
      "The same underlying land-cover data is interpreted through mission-specific weightings rather than one universal land-cover score.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when land-cover classification is unavailable.",
  },
  broadbandConnectivity: {
    description:
      "Broadband readiness blends provider count, top download/upload speeds, and technology mix, with stricter throughput expectations for infrastructure than for housing.",
    calibration:
      "Fiber availability adds a bonus, cable adds a smaller lift, and fixed wireless reduces the score slightly when it is the strongest available option.",
    scoreRange: "15-100",
    nullBehavior: "Returns near-neutral values when broadband coverage is unsupported or missing.",
  },
  floodRisk: {
    description:
      "Flood risk translates FEMA zone designations into a planning score, with mapped Special Flood Hazard Areas taking the steepest penalty.",
    calibration:
      "This is a screening heuristic for due diligence, not a parcel-scale hydraulic model or local floodplain permit determination.",
    scoreRange: "0-100",
    nullBehavior: "Returns roughly neutral values when FEMA data is unsupported or missing.",
  },
  contaminationRisk: {
    description:
      "Contamination screening subtracts penalties for nearby Superfund and TRI context, with stronger deductions when a Superfund site is both present and close.",
    calibration:
      "The factor is intentionally conservative and is meant to trigger diligence rather than declare a site unusable on its own.",
    scoreRange: "15-92",
    nullBehavior: "Returns near-neutral values when EPA screening is unsupported or unavailable.",
  },
  terrainVariety: {
    description:
      "Terrain variety uses the terrain helper's hiking-oriented elevation bands, rewarding moderate elevation gain and landscape variation more than flat lowlands.",
    calibration:
      "The bands are designed for recreation value rather than construction cost, so very flat land and extremely high alpine terrain both score lower than mid-range terrain.",
    scoreRange: "42-88",
    nullBehavior: "Returns 55 when elevation is unavailable.",
  },
  vegetationDensity: {
    description:
      "Vegetation density uses the land-cover scoring mode that rewards vegetation, forest, and some agricultural land while discounting constrained urban or barren surfaces.",
    calibration:
      "It is intended as a recreation and scenic-context factor, not an ecological health index.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when land-cover classification is unavailable.",
  },
  waterFeatures: {
    description:
      "Water features nearby use direct water-distance interpolation, rewarding close rivers, lakes, and streams for recreation appeal.",
    calibration:
      "Hiking profiles use a much tighter ideal distance than infrastructure profiles because visible, reachable water is part of the destination value.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when mapped water proximity is unavailable.",
  },
  remoteness: {
    description:
      "Remoteness combines a far-from-roads score with mapped trailhead density, balancing solitude with practical recreation access.",
    calibration:
      "This factor intentionally rewards some separation from roads without treating total inaccessibility as ideal.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when road or trailhead context is missing.",
  },
  trailAccess: {
    description:
      "Trail access blends OSM-mapped trailhead and named hiking-path counts (65% weight) with road proximity for day-use logistics (35% weight). The trailhead count is a derived live signal from the Overpass/OSM query; road distance is a direct live measurement.",
    calibration:
      "3 trailheads scores near the ideal; 12+ saturates the count signal. Road proximity is still required because most trailheads involve vehicular access. The blend upgrades this factor from a road-proxy to a live trail-density signal.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when both OSM count and road-distance context are unavailable; count signal alone returns at least 15.",
  },
  weather: {
    description:
      "Outdoor weather uses the recreation-oriented climate blend, favoring moderate temperatures and manageable precipitation.",
    calibration:
      "This is meant as an annualized comfort signal for broad usability rather than a short-term forecast or shoulder-season specialty metric.",
    scoreRange: "25-100",
    nullBehavior: "Returns 60 when the required climate fields are incomplete.",
  },
  airQuality: {
    description:
      "Air quality uses direct OpenAQ particulate readings when possible and falls back to Open-Meteo AQI context when station coverage is sparse.",
    calibration:
      "The factor is calibrated for lifestyle and recreation screening, not medical risk certification or regulatory compliance.",
    scoreRange: "10-94",
    nullBehavior: "Returns 60 when no air-quality context is available.",
  },
  schoolAccess: {
    description:
      "School access uses GeoSight's normalized school-context analysis rather than pure distance. It incorporates nearby school matches and official Washington accountability signals when available.",
    calibration:
      "The factor is strongest in the US and especially Washington; outside that coverage it becomes a neutral placeholder instead of guessing.",
    scoreRange: "0-100",
    nullBehavior: "Returns about 50 when school-context data is unavailable or unsupported.",
  },
  roadTransit: {
    description:
      "Road and transit access is scored from proximity to mapped roads and corridors, serving as a combined commuting and access proxy.",
    calibration:
      "Residential scoring uses closer ideal access than hiking but wider cutoffs than freight-heavy commercial screening.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when no road-distance reading is available.",
  },
  buildability: {
    description:
      "Residential buildability uses the terrain helper's buildability mode, which rewards lower and more moderate terrain over high or complex relief.",
    calibration:
      "It is a coarse grading and constructability signal, not a geotechnical slope-stability model.",
    scoreRange: "30-88",
    nullBehavior: "Returns 55 when elevation is unavailable.",
  },
  groundwaterDepth: {
    description:
      "Groundwater depth uses the nearest recent USGS well reading. Data-center scoring favors deeper water tables; residential scoring favors a moderate depth band.",
    calibration:
      "This is a screening signal for dewatering and foundation context, not a parcel-specific hydrogeologic study.",
    scoreRange: "40-100",
    nullBehavior: "Returns 55 when groundwater monitoring data is unavailable nearby.",
  },
  soilBuildability: {
    description:
      "Soil buildability uses NRCS soil drainage class and hydrologic group to estimate whether the ground is favorable for drainage and foundation work.",
    calibration:
      "It rewards well-drained group A and B soils and penalizes poorly drained group D soils most strongly.",
    scoreRange: "30-95",
    nullBehavior: "Returns 50 when NRCS soil data is unavailable.",
  },
  seismicRisk: {
    description:
      "Seismic risk uses USGS design-map PGA values as an inverse structural-risk score so lower shaking potential receives a higher screening score.",
    calibration:
      "This is a code-oriented hazard screening metric, not a replacement for structural engineering or site-specific geotechnical review.",
    scoreRange: "30-95",
    nullBehavior: "Returns 60 when USGS seismic design values are unavailable.",
  },
  amenities: {
    description:
      "Amenity density combines mapped food, transit, and park counts with a modest road-access bonus and a lighter urban-land-cover adjustment.",
    calibration:
      "It is intended as a neighborhood convenience proxy for housing, not a full walkability or retail-demand model.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when amenity counts are sparse.",
  },
  trafficPopulation: {
    description:
      "Traffic and population density use the commercial-demand heuristic: commercial venue count, food-and-drink count, road access, and urban land-cover all act as demand proxies.",
    calibration:
      "This is intentionally a first-pass screening factor because the project does not yet use parcel-level traffic counts or sub-city population grids globally.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when live amenity or road context is incomplete.",
  },
  freightAccess: {
    description:
      "Freight access uses the standard road-distance interpolation with tighter commercial thresholds, rewarding close access to major corridors.",
    calibration:
      "Warehouse and logistics use cases receive stronger penalties once road access moves beyond the commercial cutoff distance.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when no road-distance reading is available.",
  },
  commercialDensity: {
    description:
      "Existing commercial density blends commercial venue count, developed-land intensity, and power proximity into a corridor-activity heuristic.",
    calibration:
      "The factor is aimed at retail and warehouse context, where visible activity and utility readiness often reinforce each other.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when one or more supporting signals are unavailable.",
  },
  landCostIndicators: {
    description:
      "Land cost indicators estimate practical development friction from road access, power access, and commercially oriented land-cover mix.",
    calibration:
      "This is a heuristic proxy for early site-readiness cost, not an appraisal or parcel-price model.",
    scoreRange: "15-100",
    nullBehavior: "Falls back toward neutral when supporting infrastructure or land-cover data is missing.",
  },
  utilities: {
    description:
      "Commercial utility infrastructure uses power-distance interpolation, rewarding closer access to substations or corridors.",
    calibration:
      "It is tuned to site-readiness screening rather than electric-load modeling or utility-capacity guarantees.",
    scoreRange: "15-100",
    nullBehavior: "Returns 50 when no power-distance reading is available.",
  },
};

export function getMethodologyForFactor(factorKey: string) {
  const entry = SCORING_METHODOLOGY[factorKey] ?? SCORING_METHODOLOGY.scoreFromDistance;

  return `${entry.description} ${entry.calibration} Score range: ${entry.scoreRange}. ${entry.nullBehavior}`;
}
