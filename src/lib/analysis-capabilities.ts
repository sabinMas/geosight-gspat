import {
  AnalysisCapability,
  AnalysisCapabilityId,
  DataTrend,
  GeodataResult,
  MissionProfile,
  RegionSelection,
  SubsurfaceDataset,
  type AnalysisCapabilityOutputFormat,
  type AnalysisCapabilityTriggerMode,
  type AnalysisModelLane,
  type SubsurfaceDatasetId,
  type SubsurfaceDatasetRenderingMode,
} from "@/types";

type CapabilityContext = {
  geodata: GeodataResult | null;
  profile: MissionProfile;
  locationName: string;
  selectedRegion: RegionSelection;
  dataTrends: DataTrend[];
  subsurfaceDatasets: SubsurfaceDataset[];
};

type CapabilityDefinition = {
  analysisId: AnalysisCapabilityId;
  title: string;
  shortLabel: string;
  description: string;
  triggerMode: AnalysisCapabilityTriggerMode;
  outputFormat: AnalysisCapabilityOutputFormat;
  modelLane: AnalysisModelLane;
  failureMode: string;
  evaluate: (context: CapabilityContext) => {
    available: boolean;
    recommended: boolean;
    reason: string;
  };
};

function formatValue(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }

  return `${value}${suffix}`;
}

function formatDecimal(value: number | null | undefined, suffix = "", digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function hasSeismicDesignData(geodata: GeodataResult | null) {
  return Boolean(
    geodata?.seismicDesign &&
      [geodata.seismicDesign.pga, geodata.seismicDesign.ss, geodata.seismicDesign.s1].some(
        (value) => value !== null && value !== undefined,
      ),
  );
}

function hasGroundwaterData(geodata: GeodataResult | null) {
  return Boolean(geodata?.groundwater.wellCount && geodata.groundwater.wellCount > 0);
}

function hasSoilData(geodata: GeodataResult | null) {
  return Boolean(
    geodata?.soilProfile &&
      [
        geodata.soilProfile.mapUnitName,
        geodata.soilProfile.depthToWaterTableCm,
        geodata.soilProfile.depthToBedrockCm,
        geodata.soilProfile.dominantTexture,
      ].some((value) => value !== null && value !== undefined && value !== ""),
  );
}

function hasHazardData(geodata: GeodataResult | null) {
  if (!geodata) {
    return false;
  }

  return [
    geodata.hazards.earthquakeCount30d,
    geodata.hazards.activeFireCount7d,
    geodata.floodZone?.floodZone,
    geodata.airQuality?.aqiCategory,
    geodata.epaHazards?.superfundCount,
  ].some((value) => value !== null && value !== undefined);
}

function hasClimateData(geodata: GeodataResult | null, dataTrends: DataTrend[]) {
  return Boolean(
    geodata &&
      (geodata.climateHistory ||
        geodata.climate.currentTempC !== null ||
        dataTrends.some(
          (trend) => trend.id.includes("climate") || trend.id.includes("temperature"),
        )),
  );
}

const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  {
    analysisId: "seismic-context",
    title: "Interpret seismic context",
    shortLabel: "Seismic",
    description: "Explain live earthquake history and seismic design signals for this place.",
    triggerMode: "user_triggered",
    outputFormat: "interpretation",
    modelLane: "analysis",
    failureMode: "Falls back to a deterministic interpretation if providers fail.",
    evaluate: ({ geodata, profile }) => {
      const available =
        Boolean(geodata?.hazards.earthquakeCount30d !== null && geodata?.hazards.earthquakeCount30d !== undefined) ||
        hasSeismicDesignData(geodata);

      return {
        available,
        recommended: available && ["data-center", "commercial", "residential"].includes(profile.id),
        reason: available
          ? "Earthquake history or seismic design parameters are available for this location."
          : "Seismic history and design-map inputs are unavailable here.",
      };
    },
  },
  {
    analysisId: "groundwater-soil",
    title: "Explain groundwater and soil profile",
    shortLabel: "Subsurface",
    description: "Interpret water-table depth, soil texture, drainage, and buildability context.",
    triggerMode: "user_triggered",
    outputFormat: "interpretation",
    modelLane: "analysis",
    failureMode: "Falls back to deterministic subsurface interpretation if providers fail.",
    evaluate: ({ geodata, profile, subsurfaceDatasets }) => {
      const available =
        hasGroundwaterData(geodata) ||
        hasSoilData(geodata) ||
        subsurfaceDatasets.some((dataset) =>
          dataset.id === "groundwater" || dataset.id === "soil-profile",
        );

      return {
        available,
        recommended: available && ["data-center", "residential", "commercial"].includes(profile.id),
        reason: available
          ? "Groundwater, soil, or other subsurface signals are available for this place."
          : "Groundwater and soil-profile coverage are unavailable here right now.",
      };
    },
  },
  {
    analysisId: "hazard-stack",
    title: "Summarize hazard stack",
    shortLabel: "Hazards",
    description: "Summarize flood, fire, seismic, weather, contamination, and other risk signals.",
    triggerMode: "user_triggered",
    outputFormat: "risk_readout",
    modelLane: "analysis",
    failureMode: "Falls back to deterministic hazard summary if providers fail.",
    evaluate: ({ geodata }) => {
      const available = hasHazardData(geodata);

      return {
        available,
        recommended: available,
        reason: available
          ? "GeoSight has live or limited hazard signals to interpret here."
          : "The current location does not have enough hazard inputs loaded yet.",
      };
    },
  },
  {
    analysisId: "climate-trends",
    title: "Interpret climate trends",
    shortLabel: "Climate",
    description: "Explain current climate signals alongside the 10-year trend context.",
    triggerMode: "user_triggered",
    outputFormat: "interpretation",
    modelLane: "analysis",
    failureMode: "Falls back to deterministic climate summary if providers fail.",
    evaluate: ({ geodata, dataTrends, profile }) => {
      const available = hasClimateData(geodata, dataTrends);

      return {
        available,
        recommended: available && ["data-center", "hiking"].includes(profile.id),
        reason: available
          ? "Current climate and trend data are available for interpretation."
          : "Climate history or trend context is unavailable here.",
      };
    },
  },
  {
    analysisId: "source-confidence",
    title: "Explain source confidence",
    shortLabel: "Confidence",
    description: "Translate source freshness, coverage, and fallback posture into plain language.",
    triggerMode: "user_triggered",
    outputFormat: "summary",
    modelLane: "analysis",
    failureMode: "Falls back to deterministic source-confidence explanation if providers fail.",
    evaluate: ({ geodata }) => ({
      available: Boolean(geodata?.sources),
      recommended: Boolean(geodata?.sources),
      reason: geodata?.sources
        ? "Source metadata is loaded and ready for interpretation."
        : "Source metadata is unavailable until geodata finishes loading.",
    }),
  },
  {
    analysisId: "tomography-context",
    title: "Interpret tomography",
    shortLabel: "Tomography",
    description: "Interpret underground or tomography-style volume datasets when they are available.",
    triggerMode: "user_triggered",
    outputFormat: "interpretation",
    modelLane: "scientific",
    failureMode: "Hidden until a tomography-capable dataset is present.",
    evaluate: ({ subsurfaceDatasets }) => {
      const dataset = subsurfaceDatasets.find((entry) => entry.id === "tomography");
      const available = Boolean(dataset?.aiInterpretationAvailable);

      return {
        available,
        recommended: available,
        reason: available
          ? "A tomography-capable dataset is loaded for this region."
          : "No tomography-capable dataset is loaded for this location yet.",
      };
    },
  },
];

function buildDataset(
  id: SubsurfaceDatasetId,
  title: string,
  description: string,
  footprint: RegionSelection["polygon"],
  depthRangeMeters: { min: number; max: number } | null,
  provenance: string,
  units: string,
  resolution: string,
  confidence: string,
  renderingModeSupport: SubsurfaceDatasetRenderingMode = "surface_only",
): SubsurfaceDataset {
  return {
    id,
    title,
    description,
    footprint,
    depthRangeMeters,
    sliceAvailability: depthRangeMeters
      ? [depthRangeMeters.min, Math.round((depthRangeMeters.min + depthRangeMeters.max) / 2), depthRangeMeters.max]
      : [],
    renderingModeSupport,
    provenance,
    units,
    resolution,
    confidence,
    aiInterpretationAvailable: true,
  };
}

export function deriveSubsurfaceDatasets(
  geodata: GeodataResult | null,
  selectedRegion: RegionSelection,
): SubsurfaceDataset[] {
  if (!geodata) {
    return [];
  }

  const footprint =
    selectedRegion.polygon.length > 0 ? selectedRegion.polygon : [selectedRegion.center];
  const datasets: SubsurfaceDataset[] = [];

  if (hasGroundwaterData(geodata)) {
    const nearestWell = geodata.groundwater.nearestWell;
    datasets.push(
      buildDataset(
        "groundwater",
        "Groundwater levels",
        "Nearby monitoring wells and current water-table readings.",
        footprint,
        nearestWell?.currentLevelFt !== null && nearestWell?.currentLevelFt !== undefined
          ? {
              min: 0,
              max: Number((nearestWell.currentLevelFt * 0.3048).toFixed(1)),
            }
          : null,
        "USGS groundwater monitoring wells",
        "ft below land surface",
        "Nearest well within active search box",
        geodata.sources.groundwater.confidence,
      ),
    );
  }

  if (hasSoilData(geodata)) {
    datasets.push(
      buildDataset(
        "soil-profile",
        "Soil profile",
        "Mapped soil texture, drainage, bedrock, and water-table context.",
        footprint,
        geodata.soilProfile?.depthToBedrockCm !== null &&
          geodata.soilProfile?.depthToBedrockCm !== undefined
          ? {
              min: 0,
              max: Number((geodata.soilProfile.depthToBedrockCm / 100).toFixed(1)),
            }
          : null,
        "NRCS SSURGO soil survey",
        "cm / categorical soil classes",
        "Point-intersection lookup",
        geodata.sources.soilProfile.confidence,
      ),
    );
  }

  if (hasSeismicDesignData(geodata)) {
    datasets.push(
      buildDataset(
        "seismic-design",
        "Seismic design parameters",
        "Site-specific shaking context and engineering design parameters.",
        footprint,
        null,
        geodata.seismicDesign?.dataSource ?? "USGS Seismic Design Maps",
        "g",
        "Site-specific parameter lookup",
        geodata.sources.seismicDesign.confidence,
      ),
    );
  }

  return datasets;
}

export function evaluateAnalysisCapabilities(
  context: CapabilityContext,
): AnalysisCapability[] {
  return CAPABILITY_DEFINITIONS.map((definition) => {
    const evaluation = definition.evaluate(context);

    return {
      analysisId: definition.analysisId,
      title: definition.title,
      shortLabel: definition.shortLabel,
      description: definition.description,
      triggerMode: definition.triggerMode,
      outputFormat: definition.outputFormat,
      modelLane: definition.modelLane,
      status: evaluation.available ? ("available" as const) : ("unavailable" as const),
      recommended: evaluation.recommended,
      available: evaluation.available,
      reason: evaluation.reason,
      failureMode: definition.failureMode,
    };
  })
    .filter((capability) =>
      capability.available || capability.analysisId === "tomography-context",
    )
    .sort((left, right) => Number(right.recommended) - Number(left.recommended));
}

export function buildCapabilityPrompt(
  capabilityId: AnalysisCapabilityId,
  locationName: string,
) {
  switch (capabilityId) {
    case "seismic-context":
      return `Interpret the seismic context for ${locationName}. Distinguish direct live earthquake history from seismic design-map parameters, call out anything unavailable, and end with the most important next diligence step.`;
    case "groundwater-soil":
      return `Explain the groundwater and soil profile for ${locationName}. Use only the loaded groundwater, soil, and related subsurface context, distinguish direct live versus derived or unavailable signals, and explain what it means for buildability or water behavior.`;
    case "hazard-stack":
      return `Summarize the hazard stack for ${locationName}. Cover earthquake, fire, flood, weather, contamination, and any other loaded risk signals, while clearly separating live, limited, derived, and unavailable evidence.`;
    case "climate-trends":
      return `Interpret the climate trends for ${locationName}. Use the current climate snapshot and 10-year history where available, explain what is changing, and note any important limits or missing coverage.`;
    case "source-confidence":
      return `Explain the source confidence posture for ${locationName}. Translate provider freshness, coverage, fallback use, and confidence notes into plain language without inventing missing data.`;
    case "tomography-context":
      return `Interpret the tomography and underground context for ${locationName}. Use only the loaded subsurface dataset metadata, explain what can be inferred, and be explicit about what is not yet rendered or measured directly.`;
    default:
      return `Explain the scientific location context for ${locationName}.`;
  }
}

export function buildCapabilityFallbackResponse(
  capabilityId: AnalysisCapabilityId,
  context: CapabilityContext,
) {
  const { dataTrends, geodata, locationName, subsurfaceDatasets } = context;

  switch (capabilityId) {
    case "seismic-context":
      return [
        `## Seismic context for ${locationName}`,
        `- Live earthquake history: ${formatValue(
          geodata?.hazards.earthquakeCount30d,
        )} earthquakes in the last 30 days, strongest event ${formatDecimal(
          geodata?.hazards.strongestEarthquakeMagnitude30d,
          " M",
        )}, nearest event ${formatDecimal(geodata?.hazards.nearestEarthquakeKm, " km")} away.`,
        `- Engineering signals: PGA ${formatDecimal(
          geodata?.seismicDesign?.pga,
          "g",
          2,
        )}, Ss ${formatDecimal(geodata?.seismicDesign?.ss, "g", 2)}, S1 ${formatDecimal(
          geodata?.seismicDesign?.s1,
          "g",
          2,
        )}.`,
        `- Interpretation: this combines direct recent earthquake activity with derived seismic design parameters. Use it as a screening read, not a substitute for site-specific structural engineering.`,
        `- Limits: if any values show as unavailable, GeoSight does not yet have enough local seismic coverage to make a stronger claim.`,
      ].join("\n");
    case "groundwater-soil":
      return [
        `## Groundwater and soil profile for ${locationName}`,
        `- Groundwater coverage: ${formatValue(
          geodata?.groundwater.wellCount,
        )} monitoring wells in range. Nearest well depth-to-water is ${formatDecimal(
          geodata?.groundwater.nearestWell?.currentLevelFt,
          " ft below land surface",
        )}.`,
        `- Soil context: ${geodata?.soilProfile?.mapUnitName ?? "Unavailable"} with ${
          geodata?.soilProfile?.dominantTexture ?? "unknown"
        } texture and ${geodata?.soilProfile?.drainageClass ?? "unknown"} drainage.`,
        `- Depth flags: water table ${formatDecimal(
          geodata?.soilProfile?.depthToWaterTableCm,
          " cm",
          0,
        )}, bedrock ${formatDecimal(
          geodata?.soilProfile?.depthToBedrockCm,
          " cm",
          0,
        )}.`,
        `- Interpretation: this is useful for buildability, drainage behavior, and excavation risk. Treat it as mapped subsurface context, not a substitute for a geotechnical investigation.`,
        `- Loaded subsurface layers: ${
          subsurfaceDatasets.map((dataset) => dataset.title).join(", ") || "None yet"
        }.`,
      ].join("\n");
    case "hazard-stack":
      return [
        `## Hazard stack for ${locationName}`,
        `- Seismic: ${formatValue(
          geodata?.hazards.earthquakeCount30d,
        )} recent earthquakes, strongest ${formatDecimal(
          geodata?.hazards.strongestEarthquakeMagnitude30d,
          " M",
        )}.`,
        `- Fire: ${formatValue(
          geodata?.hazards.activeFireCount7d,
        )} active fires in the last 7 days, nearest fire ${formatDecimal(
          geodata?.hazards.nearestFireKm,
          " km",
        )}.`,
        `- Flood: zone ${geodata?.floodZone?.floodZone ?? "Unavailable"}${
          geodata?.floodZone?.label ? ` (${geodata.floodZone.label})` : ""
        }.`,
        `- Atmosphere and contamination: AQI ${formatValue(
          geodata?.climate.airQualityIndex,
        )}, EPA hazard sites ${formatValue(geodata?.epaHazards?.superfundCount)}.`,
        `- Interpretation: use this as a multi-signal screening stack. It mixes direct live feeds, mapped regulatory layers, and derived summaries, so the right next step is to inspect the specific card tied to the biggest risk signal.`,
      ].join("\n");
    case "climate-trends": {
      const climateTrend = dataTrends.find((trend) => trend.id === "trend-climate");
      return [
        `## Climate trends for ${locationName}`,
        `- Current snapshot: ${formatDecimal(
          geodata?.climate.currentTempC,
          " C",
        )} with wind ${formatDecimal(geodata?.climate.windSpeedKph, " km/h")} and precipitation ${formatDecimal(
          geodata?.climate.precipitationMm,
          " mm",
        )}.`,
        `- Baseline and range: average ${formatDecimal(
          geodata?.climate.averageTempC,
          " C",
        )}, daily low ${formatDecimal(
          geodata?.climate.dailyLowTempC,
          " C",
        )}, daily high ${formatDecimal(geodata?.climate.dailyHighTempC, " C")}.`,
        `- Trend posture: ${climateTrend?.detail ?? "No broader climate trend summary is loaded yet."}`,
        `- Interpretation: GeoSight can frame climate stress and cooling behavior here, but long-horizon claims should stay tied to the dedicated climate-history card and source notes.`,
      ].join("\n");
    }
    case "source-confidence": {
      const keySources = geodata
        ? [
            geodata.sources.elevation,
            geodata.sources.climate,
            geodata.sources.hazards,
            geodata.sources.groundwater,
            geodata.sources.soilProfile,
          ]
        : [];
      return [
        `## Source confidence for ${locationName}`,
        ...keySources.map(
          (source) =>
            `- ${source.label}: ${source.status}. ${source.confidence} Freshness: ${source.freshness}. Coverage: ${source.coverage}.`,
        ),
        `- Interpretation: GeoSight is distinguishing direct live feeds, mapped reference layers, and unavailable coverage. If a source is marked unavailable or limited, keep the conclusion at screening depth instead of treating it as final diligence.`,
      ].join("\n");
    }
    case "tomography-context":
      return [
        `## Tomography and underground context for ${locationName}`,
        `- Loaded underground datasets: ${
          subsurfaceDatasets.map((dataset) => dataset.title).join(", ") || "None"
        }.`,
        `- Interpretation: GeoSight can acknowledge the available underground metadata and footprint, but full depth-slice or volume rendering is not active yet.`,
        `- Limits: until a tomography-capable dataset is loaded, this remains a future-facing capability rather than a claim about the subsurface.`,
      ].join("\n");
    default:
      return [
        `## Scientific interpretation for ${locationName}`,
        `- GeoSight produced a deterministic fallback interpretation because the live analysis lane was unavailable.`,
        `- Available trend signals: ${
          dataTrends.map((trend) => `${trend.label}: ${trend.value}`).join("; ") ||
          "No derived trends loaded yet."
        }`,
      ].join("\n");
  }
}
