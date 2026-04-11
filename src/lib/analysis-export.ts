import JSZip from "jszip";
import {
  CaptureFigureOptions,
  Coordinates,
  DataSourceMeta,
  DrawnShape,
  GeodataResult,
  GlobeViewSnapshot,
  MissionProfile,
  RegionSelection,
  SavedSite,
  SiteScore,
} from "@/types";

export interface ExportManifestInput {
  exportedAt: string;
  locationName: string;
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  profile: MissionProfile;
  geodata: GeodataResult | null;
  siteScore: SiteScore | null;
  savedSites: SavedSite[];
  quickRegions: RegionSelection[];
  drawnShapes: DrawnShape[];
  globeView: GlobeViewSnapshot | null;
  terrainExaggeration: number;
  activeLayers: Record<string, boolean | string | number | null | undefined>;
  activeLayerLabels: string[];
  captureModeEnabled: boolean;
  figure: CaptureFigureOptions;
}

const EARTH_RADIUS_METERS = 6_371_000;

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function measurementValue(shape: DrawnShape) {
  return shape.measurementLabel ?? "";
}

function shapeRadiusKm(shape: DrawnShape) {
  if (shape.type !== "circle" || shape.coordinates.length < 2) {
    return null;
  }

  const center = shape.coordinates[0];
  const edge = shape.coordinates[1];
  const latKm = (edge.lat - center.lat) * 111;
  const lngKm = (edge.lng - center.lng) * 111 * Math.cos((center.lat * Math.PI) / 180);
  return Math.sqrt(latKm * latKm + lngKm * lngKm);
}

function closeRing(coordinates: Array<{ lat: number; lng: number }>) {
  if (coordinates.length === 0) {
    return [];
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const isClosed = first.lat === last.lat && first.lng === last.lng;
  const ring = isClosed ? coordinates : [...coordinates, first];
  return ring.map((coordinate) => [coordinate.lng, coordinate.lat] as [number, number]);
}

function buildCircleRing(shape: DrawnShape, steps = 64) {
  const radiusKm = shapeRadiusKm(shape);
  if (shape.type !== "circle" || shape.coordinates.length < 2 || radiusKm === null) {
    return [];
  }

  const center = shape.coordinates[0];
  const radiusMeters = radiusKm * 1000;
  const centerLat = (center.lat * Math.PI) / 180;
  const centerLng = (center.lng * Math.PI) / 180;

  const ring: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const lat = Math.asin(
      Math.sin(centerLat) * Math.cos(radiusMeters / EARTH_RADIUS_METERS) +
        Math.cos(centerLat) *
          Math.sin(radiusMeters / EARTH_RADIUS_METERS) *
          Math.cos(angle),
    );
    const lng =
      centerLng +
      Math.atan2(
        Math.sin(angle) *
          Math.sin(radiusMeters / EARTH_RADIUS_METERS) *
          Math.cos(centerLat),
        Math.cos(radiusMeters / EARTH_RADIUS_METERS) -
          Math.sin(centerLat) * Math.sin(lat),
      );

    ring.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return ring;
}

function shapeCentroid(shape: DrawnShape) {
  if (shape.coordinates.length === 0) {
    return null;
  }

  const total = shape.coordinates.reduce(
    (accumulator, coordinate) => ({
      lat: accumulator.lat + coordinate.lat,
      lng: accumulator.lng + coordinate.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / shape.coordinates.length,
    lng: total.lng / shape.coordinates.length,
  };
}

function formatSourceMeta(source: DataSourceMeta) {
  return {
    id: source.id,
    label: source.label,
    provider: source.provider,
    status: source.status,
    freshness: source.freshness,
    coverage: source.coverage,
    confidence: source.confidence,
    lastUpdated: source.lastUpdated,
    fallbackProviders: source.fallbackProviders ?? [],
  };
}

function sourceSummary(geodata: GeodataResult | null) {
  if (!geodata) {
    return [];
  }

  return Object.entries(geodata.sources).map(([key, source]) => ({
    domain: key,
    ...formatSourceMeta(source),
  }));
}

function tableFromRows(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  const headers = Object.keys(rows[0] ?? {});
  if (headers.length === 0) {
    return "";
  }

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvValue(row[header]))
        .join(","),
    ),
  ].join("\n");
}

export function slugifyExportSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "location";
}

export function buildExportBasename(locationName: string, exportedAt: string) {
  const timestamp = exportedAt
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13);
  return `geosight-${slugifyExportSegment(locationName)}-${timestamp}`;
}

export function buildDrawnShapesGeoJson(drawnShapes: DrawnShape[]) {
  return {
    type: "FeatureCollection" as const,
    features: drawnShapes.map((shape) => {
      const centroid = shapeCentroid(shape);
      const properties = {
        id: shape.id,
        label: shape.label ?? null,
        shapeType: shape.type,
        measurementLabel: measurementValue(shape) || null,
        color: shape.color,
        radiusKm: shapeRadiusKm(shape),
        centroidLat: centroid?.lat ?? null,
        centroidLng: centroid?.lng ?? null,
      };

      if (shape.type === "point") {
        const point = shape.coordinates[0];
        return {
          type: "Feature" as const,
          properties,
          geometry: {
            type: "Point" as const,
            coordinates: [point.lng, point.lat],
          },
        };
      }

      if (shape.type === "polyline") {
        return {
          type: "Feature" as const,
          properties,
          geometry: {
            type: "LineString" as const,
            coordinates: shape.coordinates.map((coordinate) => [coordinate.lng, coordinate.lat]),
          },
        };
      }

      if (shape.type === "circle") {
        return {
          type: "Feature" as const,
          properties,
          geometry: {
            type: "Polygon" as const,
            coordinates: [buildCircleRing(shape)],
          },
        };
      }

      return {
        type: "Feature" as const,
        properties,
        geometry: {
          type: "Polygon" as const,
          coordinates: [closeRing(shape.coordinates)],
        },
      };
    }),
  };
}

export function buildDrawnShapesCsv(drawnShapes: DrawnShape[]) {
  const rows = drawnShapes.map((shape) => {
    const centroid = shapeCentroid(shape);
    const first = shape.coordinates[0];

    return {
      id: shape.id,
      label: shape.label ?? "",
      shapeType: shape.type,
      vertexCount: shape.coordinates.length,
      centerLat: centroid?.lat ?? first?.lat ?? null,
      centerLng: centroid?.lng ?? first?.lng ?? null,
      radiusKm: shapeRadiusKm(shape),
      measurementLabel: measurementValue(shape) || null,
      color: shape.color,
    };
  });

  return tableFromRows(
    rows.length > 0
      ? rows
      : [
          {
            id: "",
            label: "",
            shapeType: "",
            vertexCount: 0,
            centerLat: null,
            centerLng: null,
            radiusKm: null,
            measurementLabel: "",
            color: "",
          },
        ],
  );
}

export function buildSiteSummaryCsv({
  locationName,
  selectedPoint,
  geodata,
  siteScore,
  savedSites,
  profile,
}: {
  locationName: string;
  selectedPoint: Coordinates;
  geodata: GeodataResult | null;
  siteScore: SiteScore | null;
  savedSites: SavedSite[];
  profile: MissionProfile;
}) {
  const activeRow = {
    siteName: locationName,
    siteRole: "active",
    profileId: profile.id,
    profileName: profile.name,
    latitude: selectedPoint.lat,
    longitude: selectedPoint.lng,
    score: siteScore?.total ?? null,
    recommendation: siteScore?.recommendation ?? null,
    elevationMeters: geodata?.elevationMeters ?? null,
    avgTempC: geodata?.climate.averageTempC ?? null,
    currentTempC: geodata?.climate.currentTempC ?? null,
    precipMm: geodata?.climate.precipitationMm ?? null,
    windSpeedKph: geodata?.climate.windSpeedKph ?? null,
    airQualityIndex: geodata?.climate.airQualityIndex ?? null,
    nearestRoadKm: geodata?.nearestRoad.distanceKm ?? null,
    nearestWaterKm: geodata?.nearestWaterBody.distanceKm ?? null,
    nearestPowerKm: geodata?.nearestPower.distanceKm ?? null,
    floodZone: geodata?.floodZone?.floodZone ?? null,
    activeFireCount7d: geodata?.hazards.activeFireCount7d ?? null,
    earthquakeCount30d: geodata?.hazards.earthquakeCount30d ?? null,
    medianIncome: geodata?.demographics.medianHouseholdIncome ?? null,
    medianHomeValue: geodata?.demographics.medianHomeValue ?? null,
    solarPeakSunHours: geodata?.solarResource?.peakSunHours ?? null,
    hazardAlertCount: geodata?.hazardAlerts?.totalCurrentAlerts ?? 0,
  };

  const savedRows = savedSites.map((site) => ({
    siteName: site.name,
    siteRole: "saved",
    profileId: site.profileId,
    profileName: site.profileId,
    latitude: site.coordinates.lat,
    longitude: site.coordinates.lng,
    score: site.score.total,
    recommendation: site.score.recommendation,
    elevationMeters: site.geodata?.elevationMeters ?? null,
    avgTempC: site.geodata?.climate.averageTempC ?? null,
    currentTempC: site.geodata?.climate.currentTempC ?? null,
    precipMm: site.geodata?.climate.precipitationMm ?? null,
    windSpeedKph: site.geodata?.climate.windSpeedKph ?? null,
    airQualityIndex: site.geodata?.climate.airQualityIndex ?? null,
    nearestRoadKm: site.geodata?.nearestRoad.distanceKm ?? null,
    nearestWaterKm: site.geodata?.nearestWaterBody.distanceKm ?? null,
    nearestPowerKm: site.geodata?.nearestPower.distanceKm ?? null,
    floodZone: site.geodata?.floodZone?.floodZone ?? null,
    activeFireCount7d: site.geodata?.hazards.activeFireCount7d ?? null,
    earthquakeCount30d: site.geodata?.hazards.earthquakeCount30d ?? null,
    medianIncome: site.geodata?.demographics.medianHouseholdIncome ?? null,
    medianHomeValue: site.geodata?.demographics.medianHomeValue ?? null,
    solarPeakSunHours: site.geodata?.solarResource?.peakSunHours ?? null,
    hazardAlertCount: site.geodata?.hazardAlerts?.totalCurrentAlerts ?? 0,
  }));

  return tableFromRows([activeRow, ...savedRows]);
}

export function buildQuickRegionsCsv(quickRegions: RegionSelection[]) {
  const rows = quickRegions.map((region) => ({
    id: region.id,
    name: region.name,
    secondaryLabel: region.secondaryLabel ?? "",
    centerLat: region.center.lat,
    centerLng: region.center.lng,
    bboxWest: region.bbox.west,
    bboxSouth: region.bbox.south,
    bboxEast: region.bbox.east,
    bboxNorth: region.bbox.north,
  }));

  return tableFromRows(
    rows.length > 0
      ? rows
      : [
          {
            id: "",
            name: "",
            secondaryLabel: "",
            centerLat: null,
            centerLng: null,
            bboxWest: null,
            bboxSouth: null,
            bboxEast: null,
            bboxNorth: null,
          },
        ],
  );
}

export function buildExportManifest(input: ExportManifestInput) {
  return {
    product: "GeoSight",
    schemaVersion: 2,
    exportedAt: input.exportedAt,
    location: {
      name: input.locationName,
      coordinates: input.selectedPoint,
      region: {
        id: input.selectedRegion.id,
        name: input.selectedRegion.name,
        secondaryLabel: input.selectedRegion.secondaryLabel ?? null,
        bbox: input.selectedRegion.bbox,
        polygonVertexCount: input.selectedRegion.polygon.length,
      },
    },
    profile: {
      id: input.profile.id,
      name: input.profile.name,
    },
    capture: {
      modeEnabled: input.captureModeEnabled,
      terrainExaggeration: input.terrainExaggeration,
      globeView: input.globeView,
      activeLayers: input.activeLayers,
      activeLayerLabels: input.activeLayerLabels,
      figure: input.figure,
    },
    analysis: {
      score: input.siteScore?.total ?? null,
      recommendation: input.siteScore?.recommendation ?? null,
      quickRegionCount: input.quickRegions.length,
      savedSiteCount: input.savedSites.length,
      drawnShapeCount: input.drawnShapes.length,
      geodataFields: input.geodata ? Object.keys(input.geodata) : [],
      sourceNotes: input.geodata?.sourceNotes ?? [],
    },
    sources: sourceSummary(input.geodata),
  };
}

export async function buildAnalysisTablesBundle({
  siteSummaryCsv,
  quickRegionsCsv,
  drawnShapesCsv,
}: {
  siteSummaryCsv: string;
  quickRegionsCsv: string;
  drawnShapesCsv: string;
}) {
  const zip = new JSZip();
  zip.file("site-summary.csv", siteSummaryCsv);
  zip.file("quick-regions.csv", quickRegionsCsv);
  zip.file("drawn-shapes.csv", drawnShapesCsv);
  return zip.generateAsync({ type: "blob" });
}

export async function buildAnalystExportBundle({
  manifest,
  geoJson,
  siteSummaryCsv,
  quickRegionsCsv,
  drawnShapesCsv,
  screenshotDataUrl,
}: {
  manifest: ReturnType<typeof buildExportManifest>;
  geoJson: ReturnType<typeof buildDrawnShapesGeoJson>;
  siteSummaryCsv: string;
  quickRegionsCsv: string;
  drawnShapesCsv: string;
  screenshotDataUrl?: string | null;
}) {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("drawn-shapes.geojson", JSON.stringify(geoJson, null, 2));
  zip.file("site-summary.csv", siteSummaryCsv);
  zip.file("quick-regions.csv", quickRegionsCsv);
  zip.file("drawn-shapes.csv", drawnShapesCsv);

  if (screenshotDataUrl) {
    const imageData = screenshotDataUrl.split(",")[1];
    if (imageData) {
      zip.file("topographic-capture.png", imageData, { base64: true });
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, content: string, type: string) {
  downloadBlob(filename, new Blob([content], { type }));
}
