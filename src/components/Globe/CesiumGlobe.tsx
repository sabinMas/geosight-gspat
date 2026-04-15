"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  ArcGisBaseMapType,
  ArcGisMapServerImageryProvider,
  CallbackProperty,
  CameraEventType,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  CustomDataSource,
  EllipsoidGeodesic,
  EllipsoidTerrainProvider,
  GeoJsonDataSource,
  HeadingPitchRange,
  HeadingPitchRoll,
  ImageryLayer,
  Ion,
  IonWorldImageryStyle,
  Math as CesiumMath,
  Matrix4,
  PolygonHierarchy,
  Quaternion,
  Rectangle,
  sampleTerrainMostDetailed,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  Viewer as CesiumViewer,
  WebMapServiceImageryProvider,
} from "cesium";
import { estimateRegionSpanKm } from "@/lib/geospatial";
import {
  IMPORTED_FEATURE_ID_PROPERTY,
  type ImportedLayer,
} from "@/lib/file-import";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import type { WmsLayerDefinition } from "@/lib/wms-layers";
import {
  Coordinates,
  DrawnShape,
  DrawingTool,
  EarthquakeEvent,
  GlobeViewMode,
  GlobeViewSnapshot,
  RegionSelection,
  SavedSite,
  SubsurfaceDataset,
  SubsurfaceRenderMode,
} from "@/types";
import { useGlobeDrawing, useGlobeDrawnShapes } from "@/hooks/useGlobeDrawing";
import { CoordinateDisplay } from "./CoordinateDisplay";
import { LayerState } from "./DataLayers";

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium";
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() ?? "";

Ion.defaultAccessToken = CESIUM_ION_TOKEN;

function getFlyToHeight(
  selectedPoint: Coordinates,
  selectedRegion: RegionSelection,
  isFirstTarget: boolean,
) {
  const isDefaultTarget =
    Math.abs(selectedPoint.lat - DEFAULT_GLOBE_VIEW.lat) < 0.000001 &&
    Math.abs(selectedPoint.lng - DEFAULT_GLOBE_VIEW.lng) < 0.000001;

  if (isFirstTarget && isDefaultTarget) {
    return DEFAULT_GLOBE_VIEW.height;
  }

  const spanKm = estimateRegionSpanKm(selectedRegion.bbox);
  return Math.round(Math.min(Math.max(spanKm * 900, 2500), 24000));
}

function getRectangleFromBounds(bounds: [number, number, number, number]) {
  let [west, south, east, north] = bounds;

  if (east - west < 0.02) {
    const padding = (0.02 - (east - west)) / 2;
    west -= padding;
    east += padding;
  }

  if (north - south < 0.02) {
    const padding = (0.02 - (north - south)) / 2;
    south -= padding;
    north += padding;
  }

  south = Math.max(-89.9, south);
  north = Math.min(89.9, north);

  return Rectangle.fromDegrees(west, south, east, north);
}

function flyToImportedBounds(
  viewer: CesiumViewer,
  bounds: [number, number, number, number],
) {
  viewer.camera.flyTo({
    destination: getRectangleFromBounds(bounds),
    duration: 1.5,
  });
}

function flyToLocation(
  viewer: CesiumViewer,
  point: Coordinates,
  region: RegionSelection,
  isFirstTarget = false,
) {
  const flyToHeight = getFlyToHeight(point, region, isFirstTarget);
  const regionSpanKm = estimateRegionSpanKm(region.bbox);

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(point.lng, point.lat, flyToHeight),
    orientation: {
      heading: viewer.camera.heading,
      pitch: -CesiumMath.toRadians(regionSpanKm <= 8 ? 68 : 82),
      roll: 0,
    },
    duration: 1.8,
  });
}

function styleImportedDataSource(dataSource: GeoJsonDataSource, layer: ImportedLayer) {
  const strokeColor = Color.fromCssColorString(layer.style.color).withAlpha(layer.style.opacity);
  const fillColor = Color.fromCssColorString(layer.style.color).withAlpha(
    Math.max(layer.style.opacity * 0.25, 0.16),
  );

  for (const entity of dataSource.entities.values) {
    if (entity.polyline) {
      entity.polyline.material = new ColorMaterialProperty(strokeColor);
      entity.polyline.width = new ConstantProperty(layer.style.weight);
      entity.polyline.clampToGround = new ConstantProperty(true);
    }

    if (entity.polygon) {
      entity.polygon.material = new ColorMaterialProperty(fillColor);
      entity.polygon.outline = new ConstantProperty(true);
      entity.polygon.outlineColor = new ConstantProperty(strokeColor);
    }

    if (entity.point) {
      entity.point.color = new ConstantProperty(strokeColor);
      entity.point.outlineColor = new ConstantProperty(Color.WHITE.withAlpha(0.8));
      entity.point.outlineWidth = new ConstantProperty(1);
      entity.point.pixelSize = new ConstantProperty(10);
    }

    if (entity.billboard) {
      entity.billboard.color = new ConstantProperty(strokeColor);
      entity.billboard.scale = new ConstantProperty(0.95);
    }
  }
}

interface CesiumGlobeProps {
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  globeViewMode: GlobeViewMode;
  globeRotateMode: boolean;
  subsurfaceRenderMode: SubsurfaceRenderMode;
  onPointSelect: (coords: Coordinates) => void;
  savedSites: SavedSite[];
  layers: LayerState;
  subsurfaceDatasets: SubsurfaceDataset[];
  terrainExaggeration: number;
  earthquakeMarkers?: EarthquakeEvent[];
  driveMode?: boolean;
  onExitDriveMode?: () => void;
  drawingTool?: DrawingTool;
  drawnShapes?: DrawnShape[];
  importedLayers?: ImportedLayer[];
  activeImportedLayerId?: string | null;
  selectedImportedFeatureId?: string | null;
  wmsLayers?: WmsLayerDefinition[];
  onShapeComplete?: (shape: DrawnShape) => void;
  onVertexDrag?: (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => void;
  snapToGrid?: boolean;
  captureMode?: boolean;
  onGlobeApiChange?: (api: {
    getViewSnapshot: () => GlobeViewSnapshot | null;
    requestRender: () => void;
    flyToBounds: (bounds: [number, number, number, number]) => void;
    flyToPoint: (point: Coordinates, region: RegionSelection) => void;
  } | null) => void;
}

export function CesiumGlobe({
  selectedPoint,
  selectedRegion,
  globeViewMode,
  globeRotateMode,
  subsurfaceRenderMode,
  onPointSelect,
  savedSites,
  layers,
  subsurfaceDatasets,
  terrainExaggeration,
  earthquakeMarkers = [],
  driveMode = false,
  onExitDriveMode,
  drawingTool = "none",
  drawnShapes = [],
  importedLayers = [],
  activeImportedLayerId = null,
  selectedImportedFeatureId = null,
  wmsLayers = [],
  onShapeComplete,
  onVertexDrag,
  snapToGrid = false,
  captureMode = false,
  onGlobeApiChange,
}: CesiumGlobeProps) {
  const hasCesiumToken = Boolean(CESIUM_ION_TOKEN);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const clickHandlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const dragHandlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const baseImageryLayerRef = useRef<ImageryLayer | null>(null);
  const importedDataSourcesRef = useRef(new Map<string, GeoJsonDataSource>());
  const importedHighlightDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const wmsImageryLayersRef = useRef(new Map<string, ImageryLayer>());
  const importedLayerIdsRef = useRef<string[]>([]);
  const lastFlyTargetRef = useRef<string | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  // Pin drag state
  const pinEntityRef = useRef<ReturnType<CesiumViewer["entities"]["add"]> | null>(null);
  const dragPositionRef = useRef<Cartesian3 | null>(null);
  const isDraggingPinRef = useRef(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [terrainUnavailable, setTerrainUnavailable] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  const [pointerInside, setPointerInside] = useState(false);
  const driveHudSpeedRef = useRef<HTMLSpanElement | null>(null);
  const driveHudAltRef = useRef<HTMLSpanElement | null>(null);
  const terrainExaggerationRef = useRef(terrainExaggeration);
  const subsurfaceFootprint = useMemo(
    () =>
      selectedRegion.polygon.length > 0 ? selectedRegion.polygon : [selectedPoint],
    [selectedPoint, selectedRegion.polygon],
  );

  const subsurfaceCueColor = useMemo(() => {
    if (subsurfaceDatasets.some((dataset) => dataset.id === "tomography")) {
      return Color.fromCssColorString("#5be49b");
    }
    if (subsurfaceDatasets.some((dataset) => dataset.id === "seismic-design")) {
      return Color.fromCssColorString("#c084fc");
    }
    return Color.fromCssColorString("#53ddff");
  }, [subsurfaceDatasets]);

  const regionHierarchy = useMemo(
    () =>
      (selectedRegion.polygon.length ? selectedRegion.polygon : [selectedPoint]).map((point) =>
        Cartesian3.fromDegrees(point.lng, point.lat, 120),
      ),
    [selectedPoint, selectedRegion.polygon],
  );

  const isViewerUsable = (viewer: CesiumViewer | null): viewer is CesiumViewer =>
    Boolean(viewer && !viewer.isDestroyed());

  const getMetersPerPixel = (viewer: CesiumViewer) => {
    const canvas = viewer.scene.canvas;
    const sampleY = Math.max(24, canvas.height - 96);
    const leftScreen = new Cartesian2(Math.max(12, canvas.width / 2 - 100), sampleY);
    const rightScreen = new Cartesian2(Math.min(canvas.width - 12, canvas.width / 2 + 100), sampleY);

    const leftRay = viewer.camera.getPickRay(leftScreen);
    const rightRay = viewer.camera.getPickRay(rightScreen);
    if (!leftRay || !rightRay) {
      return null;
    }

    const leftPosition = viewer.scene.globe.pick(leftRay, viewer.scene);
    const rightPosition = viewer.scene.globe.pick(rightRay, viewer.scene);
    if (!leftPosition || !rightPosition) {
      return null;
    }

    const leftCartographic = Cartographic.fromCartesian(leftPosition);
    const rightCartographic = Cartographic.fromCartesian(rightPosition);
    const geodesic = new EllipsoidGeodesic(leftCartographic, rightCartographic);
    const distanceMeters = geodesic.surfaceDistance;
    return Number.isFinite(distanceMeters) && distanceMeters > 0
      ? distanceMeters / 200
      : null;
  };

  const requestViewerReset = (reason: string) => {
    if (resetTimeoutRef.current !== null) {
      return;
    }

    console.warn(`[cesium-globe] resetting viewer after ${reason}`);
    setViewerReady(false);
    setGlobeReady(false);
    lastFlyTargetRef.current = null;

    resetTimeoutRef.current = window.setTimeout(() => {
      resetTimeoutRef.current = null;
      setViewerKey((current) => current + 1);
    }, 180);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const importedDataSources = importedDataSourcesRef.current;
    const wmsImageryLayers = wmsImageryLayersRef.current;

    setViewerReady(false);
    setGlobeReady(false);

    const viewer = new CesiumViewer(host, {
      terrainProvider: new EllipsoidTerrainProvider(),
      animation: false,
      baseLayerPicker: false,
      contextOptions: {
        webgl: {
          preserveDrawingBuffer: true,
        },
      },
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      infoBox: false,
      shouldAnimate: true,
    });

    viewerRef.current = viewer;
    setViewerReady(true);

    return () => {
      if (clickHandlerRef.current && !clickHandlerRef.current.isDestroyed()) {
        clickHandlerRef.current.destroy();
        clickHandlerRef.current = null;
      }

      viewerRef.current = null;
      baseImageryLayerRef.current = null;
      importedDataSources.clear();
      wmsImageryLayers.clear();
      setViewerReady(false);
      setGlobeReady(false);

      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [viewerKey]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    let cancelled = false;
    setTerrainUnavailable(false);

    void createWorldTerrainAsync()
      .then((provider) => {
        if (cancelled || !isViewerUsable(viewer)) {
          return;
        }

        setTerrainUnavailable(false);
        viewer.terrainProvider = provider;
        viewer.scene.requestRender();
      })
      .catch((error) => {
        if (cancelled || !isViewerUsable(viewer)) {
          return;
        }

        setTerrainUnavailable(true);
        console.warn("[cesium-globe] world terrain unavailable, using ellipsoid terrain", error);
        viewer.terrainProvider = new EllipsoidTerrainProvider();
        viewer.scene.requestRender();
      });

    return () => {
      cancelled = true;
    };
  }, [viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const controller = viewer.scene.screenSpaceCameraController;
    controller.minimumZoomDistance = 40;
    controller.maximumZoomDistance = 3e8;
    controller.enableInputs = pointerInside;
    controller.enableTilt = true;
    controller.enableLook = true;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show = true;
    }
    viewer.scene.globe.showGroundAtmosphere = true;
    controller.zoomEventTypes = [CameraEventType.WHEEL];
    controller.tiltEventTypes = [CameraEventType.RIGHT_DRAG];
    controller.rotateEventTypes = globeRotateMode
      ? [CameraEventType.LEFT_DRAG, CameraEventType.MIDDLE_DRAG]
      : [CameraEventType.MIDDLE_DRAG];
    controller.translateEventTypes = globeRotateMode ? [] : [CameraEventType.LEFT_DRAG];
    viewer.scene.requestRender();
  }, [globeRotateMode, pointerInside, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    if (!Number.isFinite(selectedPoint.lat) || !Number.isFinite(selectedPoint.lng)) {
      return;
    }

    const nextTarget = `${selectedPoint.lat.toFixed(6)}:${selectedPoint.lng.toFixed(6)}`;
    if (lastFlyTargetRef.current === nextTarget) {
      return;
    }

    const isFirstTarget = lastFlyTargetRef.current === null;
    lastFlyTargetRef.current = nextTarget;

    try {
      flyToLocation(viewer, selectedPoint, selectedRegion, isFirstTarget);
    } catch (error) {
      console.warn("[cesium-globe] camera flyTo failed", error);
    }
  }, [selectedPoint, selectedRegion, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    viewer.scene.verticalExaggeration = terrainExaggeration;
    terrainExaggerationRef.current = terrainExaggeration;
  }, [terrainExaggeration, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    let cancelled = false;

    const applyBasemap = async () => {
      try {
        let providerPromise;

        switch (globeViewMode) {
          case "road":
            providerPromise = createWorldImageryAsync({
              style: IonWorldImageryStyle.ROAD,
            });
            break;
          case "water-terrain":
            providerPromise = ArcGisMapServerImageryProvider.fromBasemapType(
              ArcGisBaseMapType.HILLSHADE,
            );
            break;
          case "satellite":
          default:
            providerPromise = createWorldImageryAsync({
              style: IonWorldImageryStyle.AERIAL_WITH_LABELS,
            });
            break;
        }

        const layer = await ImageryLayer.fromProviderAsync(providerPromise);
        if (cancelled || !isViewerUsable(viewer)) {
          return;
        }

        const existingBaseLayer = baseImageryLayerRef.current;
        if (existingBaseLayer && viewer.imageryLayers.contains(existingBaseLayer)) {
          viewer.imageryLayers.remove(existingBaseLayer, true);
        } else if (viewer.imageryLayers.length > 0) {
          const initialLayer = viewer.imageryLayers.get(0);
          viewer.imageryLayers.remove(initialLayer, true);
        }

        viewer.imageryLayers.add(layer, 0);
        baseImageryLayerRef.current = layer;
        viewer.scene.requestRender();
      } catch (error) {
        console.warn("[cesium-globe] basemap swap failed", error);
      }
    };

    void applyBasemap();

    return () => {
      cancelled = true;
    };
  }, [globeViewMode, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const nextLayerIds = new Set(wmsLayers.map((layer) => layer.id));
    const activeImageryLayers = wmsImageryLayersRef.current;

    for (const [layerId, imageryLayer] of activeImageryLayers.entries()) {
      if (nextLayerIds.has(layerId)) {
        continue;
      }

      if (viewer.imageryLayers.contains(imageryLayer)) {
        viewer.imageryLayers.remove(imageryLayer, true);
      }
      activeImageryLayers.delete(layerId);
    }

    for (const layer of wmsLayers) {
      const existingImageryLayer = activeImageryLayers.get(layer.id);
      if (existingImageryLayer) {
        existingImageryLayer.show = layer.visible ?? true;
        existingImageryLayer.alpha = layer.opacity ?? 0.82;
        continue;
      }

      const provider = new WebMapServiceImageryProvider({
        url: layer.url,
        layers: layer.layers,
        parameters: {
          transparent: true,
          format: "image/png",
        },
      });

      const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
      imageryLayer.show = layer.visible ?? true;
      imageryLayer.alpha = layer.opacity ?? 0.82;
      activeImageryLayers.set(layer.id, imageryLayer);
    }

    viewer.scene.requestRender();
  }, [viewerReady, wmsLayers]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    let cancelled = false;
    const nextLayerIds = new Set(importedLayers.map((layer) => layer.id));
    const previousLayerIds = new Set(importedLayerIdsRef.current);

    for (const [layerId, dataSource] of importedDataSourcesRef.current.entries()) {
      if (nextLayerIds.has(layerId)) {
        continue;
      }

      void viewer.dataSources.remove(dataSource, true);
      importedDataSourcesRef.current.delete(layerId);
    }

    importedLayerIdsRef.current = importedLayers.map((layer) => layer.id);

    for (const layer of importedLayers) {
      const existingDataSource = importedDataSourcesRef.current.get(layer.id);
      if (existingDataSource) {
        existingDataSource.show = layer.visible;
        styleImportedDataSource(existingDataSource, layer);
        continue;
      }

      void (async () => {
        const strokeColor = Color.fromCssColorString(layer.style.color);
        const fillColor = strokeColor.withAlpha(Math.max(layer.style.opacity * 0.25, 0.16));

        const dataSource = await GeoJsonDataSource.load(layer.features, {
          stroke: strokeColor.withAlpha(layer.style.opacity),
          fill: fillColor,
          strokeWidth: layer.style.weight,
          markerColor: strokeColor,
          clampToGround: true,
        });

        if (cancelled || !isViewerUsable(viewer)) {
          return;
        }

        dataSource.name = layer.name;
        dataSource.show = layer.visible;
        styleImportedDataSource(dataSource, layer);
        await viewer.dataSources.add(dataSource);

        if (cancelled || !isViewerUsable(viewer)) {
          void viewer.dataSources.remove(dataSource, true);
          return;
        }

        importedDataSourcesRef.current.set(layer.id, dataSource);

        if (!previousLayerIds.has(layer.id) && layer.visible) {
          flyToImportedBounds(viewer, layer.bounds);
        }

        viewer.scene.requestRender();
      })();
    }

    viewer.scene.requestRender();

    return () => {
      cancelled = true;
    };
  }, [importedLayers, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const removeHighlight = () => {
      const currentHighlight = importedHighlightDataSourceRef.current;
      if (!currentHighlight) {
        return;
      }

      if (viewer.dataSources.contains(currentHighlight)) {
        void viewer.dataSources.remove(currentHighlight, true);
      }
      importedHighlightDataSourceRef.current = null;
    };

    const layer = importedLayers.find((entry) => entry.id === activeImportedLayerId);
    const feature = layer?.features.features.find((entry, index) => {
      const featureId =
        entry.properties?.[IMPORTED_FEATURE_ID_PROPERTY] ?? entry.id ?? `${layer?.id ?? "layer"}-${index}`;
      return String(featureId) === selectedImportedFeatureId;
    });

    if (!layer || !feature || !selectedImportedFeatureId) {
      removeHighlight();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;

    void (async () => {
      removeHighlight();

      const highlightDataSource = await GeoJsonDataSource.load(
        {
          type: "FeatureCollection",
          features: [feature],
        } satisfies GeoJSON.FeatureCollection,
        {
          stroke: Color.WHITE,
          fill: Color.fromCssColorString(layer.style.color).withAlpha(0.28),
          strokeWidth: Math.max(layer.style.weight + 2, 4),
          markerColor: Color.WHITE,
          clampToGround: true,
        },
      );

      if (cancelled || !isViewerUsable(viewer)) {
        return;
      }

      for (const entity of highlightDataSource.entities.values) {
        if (entity.polyline) {
          entity.polyline.material = new ColorMaterialProperty(Color.WHITE);
          entity.polyline.width = new ConstantProperty(Math.max(layer.style.weight + 2, 4));
          entity.polyline.clampToGround = new ConstantProperty(true);
        }

        if (entity.polygon) {
          entity.polygon.material = new ColorMaterialProperty(
            Color.fromCssColorString(layer.style.color).withAlpha(0.22),
          );
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(Color.WHITE);
        }

        if (entity.point) {
          entity.point.color = new ConstantProperty(Color.WHITE);
          entity.point.outlineColor = new ConstantProperty(
            Color.fromCssColorString(layer.style.color),
          );
          entity.point.outlineWidth = new ConstantProperty(2);
          entity.point.pixelSize = new ConstantProperty(14);
        }
      }

      highlightDataSource.name = `${layer.name} highlight`;
      importedHighlightDataSourceRef.current = highlightDataSource;
      await viewer.dataSources.add(highlightDataSource);
      await viewer.flyTo(highlightDataSource, {
        duration: 0.9,
      });
      viewer.scene.requestRender();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeImportedLayerId,
    importedLayers,
    selectedImportedFeatureId,
    viewerReady,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      setGlobeReady(false);
      return;
    }

    const handleTileProgress = (remaining: number) => {
      if (remaining === 0) {
        setGlobeReady(true);
      }
    };

    setGlobeReady(viewer.scene.globe.tilesLoaded);
    viewer.scene.globe.tileLoadProgressEvent.addEventListener(handleTileProgress);
    viewer.scene.requestRender();

    return () => {
      viewer.scene.globe.tileLoadProgressEvent.removeEventListener(handleTileProgress);
    };
  }, [viewerKey, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const host = hostRef.current;

    const scheduleResize = () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;

        if (!isViewerUsable(viewer) || !viewer.container?.isConnected) {
          return;
        }

        try {
          viewer.resize();
          viewer.scene.requestRender();
        } catch (error) {
          console.warn("[cesium-globe] viewer resize failed", error);
          requestViewerReset("resize failure");
        }
      });
    };

    scheduleResize();

    const resizeObserver =
      host && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleResize();
          })
        : null;

    if (resizeObserver && host) {
      resizeObserver.observe(host);
    }
    window.addEventListener("resize", scheduleResize);
    window.addEventListener("orientationchange", scheduleResize);

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }

      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      window.removeEventListener("orientationchange", scheduleResize);
    };
  }, [viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const handleRenderError = (_scene: unknown, error: unknown) => {
      console.warn("[cesium-globe] render error", error);
      requestViewerReset("render error");
    };

    const canvas = viewer.canvas;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      requestViewerReset("webgl context loss");
    };
    const handleContextRestored = () => {
      try {
        viewer.resize();
        viewer.scene.requestRender();
      } catch (error) {
        console.warn("[cesium-globe] context restore render failed", error);
      }
    };

    viewer.scene.renderError.addEventListener(handleRenderError);
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      viewer.scene.renderError.removeEventListener(handleRenderError);
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
    };
  }, [viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    if (clickHandlerRef.current && !clickHandlerRef.current.isDestroyed()) {
      clickHandlerRef.current.destroy();
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandlerRef.current = handler;

    handler.setInputAction((event: { position: Cartesian2 }) => {
      // Yield to drawing mode — drawing hook has its own handler
      if (drawingTool !== "none") return;

      try {
        const earthPosition =
          (viewer.scene.pickPositionSupported
            ? viewer.scene.pickPosition(event.position)
            : undefined) ??
          viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);

        if (!earthPosition) {
          return;
        }

        const cartographic = Cartographic.fromCartesian(earthPosition);
        onPointSelect({
          lat: CesiumMath.toDegrees(cartographic.latitude),
          lng: CesiumMath.toDegrees(cartographic.longitude),
        });
      } catch (error) {
        console.warn("[cesium-globe] point selection failed", error);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (!handler.isDestroyed()) {
        handler.destroy();
      }

      if (clickHandlerRef.current === handler) {
        clickHandlerRef.current = null;
      }
    };
  }, [drawingTool, onPointSelect, viewerKey, viewerReady]);

  // ── Pin drag interaction ──────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady || drawingTool !== "none") return;

    if (dragHandlerRef.current && !dragHandlerRef.current.isDestroyed()) {
      dragHandlerRef.current.destroy();
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    dragHandlerRef.current = handler;

    const pickPosition = (pos: Cartesian2): Cartesian3 | undefined => {
      try {
        const picked = viewer.scene.pickPositionSupported
          ? viewer.scene.pickPosition(pos)
          : undefined;
        return picked ?? viewer.camera.pickEllipsoid(pos, viewer.scene.globe.ellipsoid) ?? undefined;
      } catch {
        return undefined;
      }
    };

    // Hover: show grab cursor when over pin
    handler.setInputAction((event: { endPosition: Cartesian2 }) => {
      if (isDraggingPinRef.current) return;
      const picked = viewer.scene.pick(event.endPosition);
      viewer.canvas.style.cursor =
        picked?.id === pinEntityRef.current ? "grab" : "";
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Press: start drag if on pin
    handler.setInputAction((event: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(event.position);
      if (picked?.id !== pinEntityRef.current) return;
      isDraggingPinRef.current = true;
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.scene.screenSpaceCameraController.enableTranslate = false;
      viewer.canvas.style.cursor = "grabbing";
    }, ScreenSpaceEventType.LEFT_DOWN);

    // Move: update pin position live
    handler.setInputAction((event: { startPosition: Cartesian2; endPosition: Cartesian2 }) => {
      if (!isDraggingPinRef.current) return;
      const pos = pickPosition(event.endPosition);
      if (pos) dragPositionRef.current = pos;
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Release: finalize position
    handler.setInputAction((event: { position: Cartesian2 }) => {
      if (!isDraggingPinRef.current) return;
      isDraggingPinRef.current = false;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.canvas.style.cursor = "";

      const pos = pickPosition(event.position) ?? dragPositionRef.current;
      if (!pos) return;
      const cartographic = Cartographic.fromCartesian(pos);
      onPointSelect({
        lat: CesiumMath.toDegrees(cartographic.latitude),
        lng: CesiumMath.toDegrees(cartographic.longitude),
      });
    }, ScreenSpaceEventType.LEFT_UP);

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
      if (dragHandlerRef.current === handler) dragHandlerRef.current = null;
      // Restore state if unmounted mid-drag
      if (isDraggingPinRef.current) {
        isDraggingPinRef.current = false;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.canvas.style.cursor = "";
      }
    };
  }, [drawingTool, onPointSelect, viewerKey, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    viewer.entities.removeAll();
    dragPositionRef.current = null;

    const basePosition = Cartesian3.fromDegrees(selectedPoint.lng, selectedPoint.lat, 220);
    const selectedColor = Color.fromCssColorString("#00e5ff");
    const haloColor = Color.WHITE.withAlpha(captureMode ? 0.95 : 0.55);
    const regionOutlinePositions = [
      ...regionHierarchy,
      regionHierarchy[0] ?? Cartesian3.fromDegrees(selectedPoint.lng, selectedPoint.lat, 120),
    ];
    const pinEntity = viewer.entities.add({
      name: "Selected Site",
      // CallbackProperty so drag moves the dot live without rebuilding the entity
      position: new CallbackProperty(
        () => dragPositionRef.current ?? basePosition,
        false,
      ) as unknown as Cartesian3,
      point: {
        color: selectedColor,
        pixelSize: captureMode ? 16 : 14,
        outlineColor: Color.WHITE,
        outlineWidth: captureMode ? 3 : 2,
      },
    });
    pinEntityRef.current = pinEntity;

    viewer.entities.add({
      name: "Selected region",
      polygon: {
        hierarchy: new PolygonHierarchy(regionHierarchy),
        material: selectedColor.withAlpha(captureMode ? 0.08 : 0.15),
        height: 12,
        outline: true,
        outlineColor: captureMode ? haloColor : selectedColor,
      },
    });

    if (regionHierarchy.length >= 2) {
      viewer.entities.add({
        name: "Selected region halo",
        polyline: {
          positions: regionOutlinePositions,
          width: captureMode ? 8 : 4,
          material: haloColor,
          clampToGround: false,
        },
      });
      viewer.entities.add({
        name: "Selected region outline",
        polyline: {
          positions: regionOutlinePositions,
          width: captureMode ? 4 : 2.5,
          material: selectedColor,
          clampToGround: false,
        },
      });
    }

    if (subsurfaceDatasets.length) {
      viewer.entities.add({
        name: "Subsurface footprint",
        polygon: {
          hierarchy: new PolygonHierarchy(
            subsurfaceFootprint.map((point) =>
              Cartesian3.fromDegrees(point.lng, point.lat, 60),
            ),
          ),
          material: subsurfaceCueColor.withAlpha(
            subsurfaceRenderMode === "surface_only" ? 0.08 : 0.18,
          ),
          height: 8,
          outline: true,
          outlineColor: subsurfaceCueColor.withAlpha(0.8),
        },
      });

      viewer.entities.add({
        name: "Subsurface focus",
        position: Cartesian3.fromDegrees(selectedPoint.lng, selectedPoint.lat, 260),
        point: {
          color: subsurfaceCueColor,
          pixelSize: 8,
          outlineColor: Color.WHITE,
          outlineWidth: 1,
        },
      });
    }

    savedSites.forEach((site) => {
      viewer.entities.add({
        name: site.name,
        position: Cartesian3.fromDegrees(site.coordinates.lng, site.coordinates.lat, 180),
        point: {
          color:
            site.score.total > 80
              ? Color.fromCssColorString("#5be49b")
              : Color.fromCssColorString("#ffab00"),
          pixelSize: 10,
          outlineColor: Color.BLACK,
          outlineWidth: 1,
        },
      });
    });

    if (layers.heatmap) {
      viewer.entities.add({
        name: "Heatmap focus",
        polygon: {
          hierarchy: new PolygonHierarchy(regionHierarchy),
          material: Color.fromCssColorString("#ff5d5d").withAlpha(0.18),
          height: 6,
          outline: false,
        },
      });
    }

    for (const eq of earthquakeMarkers) {
      if (!Number.isFinite(eq.lat) || !Number.isFinite(eq.lng)) continue;
      const mag = eq.mag;
      const pixelSize = Math.max(4, Math.min(14, (mag - 2) * 3));
      // hue: 0.33 (green) for small, 0 (red) for large (M6.5+)
      const hue = Math.max(0, 0.33 - ((mag - 2.5) / 4.5) * 0.33);
      const markerColor = Color.fromHsl(hue, 0.9, 0.55);
      viewer.entities.add({
        name: `M${mag.toFixed(1)} — ${eq.place}`,
        position: Cartesian3.fromDegrees(eq.lng, eq.lat, 100),
        point: {
          color: markerColor,
          pixelSize,
          outlineColor: Color.BLACK.withAlpha(0.6),
          outlineWidth: 1,
        },
      });
    }

    viewer.scene.requestRender();
  }, [
    captureMode,
    earthquakeMarkers,
    layers.heatmap,
    regionHierarchy,
    savedSites,
    selectedPoint.lat,
    selectedPoint.lng,
    subsurfaceCueColor,
    subsurfaceDatasets,
    subsurfaceFootprint,
    subsurfaceRenderMode,
    viewerReady,
  ]);

  // ── Drive mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!driveMode || !isViewerUsable(viewer) || !viewerReady) {
      return;
    }

    const EARTH_RADIUS = 6_371_000; // metres
    const VEHICLE_CLEARANCE = 2.8;  // metres above terrain
    const MAX_SPEED = 55;           // m/s (~200 km/h)
    const MAX_REVERSE = 15;         // m/s
    const ACCEL = 15;               // m/s²
    const BRAKE = 25;               // m/s²
    const FRICTION = 0.72;          // fraction remaining per second (natural stop ~2-3 s)
    const TURN_RATE = 1.5;          // rad/s at full speed

    // Capture starting position once — intentionally not in deps array
    let lat = selectedPoint.lat * (Math.PI / 180);
    let lng = selectedPoint.lng * (Math.PI / 180);
    let height = 200;  // start above terrain; snaps down on first frame
    let heading = 0;   // radians, Cesium convention: 0 = north
    let speed = 0;     // m/s

    // Async terrain height cache — getHeight() only works for tiles already in GPU cache,
    // so we sample the terrain provider directly every N frames as a reliable fallback.
    let cachedTerrainH: number | null = null;
    let terrainSampleInFlight = false;
    let terrainSampleFrame = 0;

    // Live position/orientation refs for CallbackProperty (avoids React re-renders)
    const posRef = { val: Cartesian3.fromRadians(lng, lat, height) };
    const oriRef = { val: Quaternion.IDENTITY.clone() };

    // Separate data source so viewer.entities.removeAll() doesn't wipe the car
    const ds = new CustomDataSource("drive-vehicle");
    void viewer.dataSources.add(ds);

    ds.entities.add({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      position: new CallbackProperty(() => posRef.val, false) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orientation: new CallbackProperty(() => oriRef.val, false) as any,
      box: {
        dimensions: new Cartesian3(4.6, 2.2, 1.6),
        material: Color.fromCssColorString("#ff4422"),
        outline: true,
        outlineColor: Color.fromCssColorString("#ff8866"),
        outlineWidth: 1,
      },
    });

    // Disable default camera controls while driving
    viewer.scene.screenSpaceCameraController.enableInputs = false;

    // Keyboard input
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.code);
      // Prevent page scroll while driving
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let rafId: number | null = null;
    let lastT: number | null = null;
    let hudFrame = 0;

    const step = (timestamp: number) => {
      if (!isViewerUsable(viewer)) return;

      const dt = lastT !== null ? Math.min((timestamp - lastT) / 1000, 0.05) : 0.016;
      lastT = timestamp;

      // ── Input ──────────────────────────────────────────────────────────────
      const forward = keys.has("KeyW") || keys.has("ArrowUp");
      const back    = keys.has("KeyS") || keys.has("ArrowDown");
      const left    = keys.has("KeyA") || keys.has("ArrowLeft");
      const right   = keys.has("KeyD") || keys.has("ArrowRight");

      if (forward) speed = Math.min(speed + ACCEL * dt, MAX_SPEED);
      if (back)    speed = Math.max(speed - BRAKE * dt, -MAX_REVERSE);

      // Rolling friction
      speed *= Math.pow(FRICTION, dt);

      // Steering — proportional to normalised speed
      const steerScale = Math.min(Math.abs(speed) / MAX_SPEED, 1);
      const turn = TURN_RATE * steerScale * dt;
      if (left)  heading -= turn;
      if (right) heading += turn;

      // ── Move (ENU displacement) ────────────────────────────────────────────
      // heading 0 = north (+lat), π/2 = east (+lng)
      const dNorth = Math.cos(heading) * speed * dt; // metres
      const dEast  = Math.sin(heading) * speed * dt;
      lat += dNorth / EARTH_RADIUS;
      lng += dEast  / (EARTH_RADIUS * Math.cos(lat));

      // ── Terrain height ─────────────────────────────────────────────────────
      // Kick off an async sample every 12 frames so we have an accurate height
      // even when getHeight() returns undefined (tiles not yet in GPU cache).
      terrainSampleFrame++;
      const heightDelta = Math.abs((cachedTerrainH ?? height) - height);
      const needsUrgentSample = heightDelta > 15;
      if ((terrainSampleFrame % 12 === 0 || needsUrgentSample) && !terrainSampleInFlight) {
        terrainSampleInFlight = true;
        const samplePos = [new Cartographic(lng, lat)];
        void sampleTerrainMostDetailed(viewer.terrainProvider, samplePos)
          .then((sampled) => {
            const h = sampled[0].height;
            if (h !== undefined && isFinite(h)) cachedTerrainH = h;
          })
          .finally(() => { terrainSampleInFlight = false; });
      }

      const carto = new Cartographic(lng, lat);
      // Prefer the synchronous cache (fastest), fall back to the async sample,
      // and if both are missing hold current altitude so the vehicle never drops to sea level.
      const terrainH = viewer.scene.globe.getHeight(carto) ?? cachedTerrainH ?? (height - VEHICLE_CLEARANCE);
      const targetH = terrainH + VEHICLE_CLEARANCE;

      if (height > targetH + 8) {
        // Falling — apply gravity
        height = Math.max(height - 30 * dt, targetH);
      } else {
        // Soft snap to terrain surface
        height += (targetH - height) * Math.min(10 * dt, 1);
      }
      // Hard floor — never clip below terrain regardless of lerp lag
      height = Math.max(height, terrainH + VEHICLE_CLEARANCE);

      // ── Entity update ──────────────────────────────────────────────────────
      const vehiclePos = Cartesian3.fromRadians(lng, lat, height);
      posRef.val = vehiclePos;
      oriRef.val = Transforms.headingPitchRollQuaternion(
        vehiclePos,
        // Offset by -π/2 so the box's long axis (local X) faces the movement direction
        new HeadingPitchRoll(heading - Math.PI / 2, 0, 0),
      );

      // ── Camera follow ──────────────────────────────────────────────────────
      viewer.camera.lookAt(
        vehiclePos,
        new HeadingPitchRange(
          heading, // behind the vehicle (Cesium HPR heading=0 → camera south of target)
          CesiumMath.toRadians(-22),
          38,
        ),
      );

      viewer.scene.requestRender();

      // ── HUD update (every 4 frames) ────────────────────────────────────────
      hudFrame++;
      if (hudFrame % 4 === 0) {
        const kph = Math.abs(Math.round(speed * 3.6));
        const altM = Math.round(height / Math.max(terrainExaggerationRef.current, 1));
        if (driveHudSpeedRef.current) driveHudSpeedRef.current.textContent = `${kph}`;
        if (driveHudAltRef.current)   driveHudAltRef.current.textContent   = `${altM}`;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      void viewer.dataSources.remove(ds, true);
      // Release camera lookAt lock
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      viewer.scene.screenSpaceCameraController.enableInputs = pointerInside;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveMode, viewerReady]);

  useEffect(() => {
    if (!onGlobeApiChange) {
      return;
    }

    const getViewSnapshot = () => {
      const viewer = viewerRef.current;
      if (!isViewerUsable(viewer)) {
        return null;
      }

      const cartographic = Cartographic.fromCartesian(viewer.camera.positionWC);
      return {
        headingDegrees: CesiumMath.toDegrees(viewer.camera.heading),
        pitchDegrees: CesiumMath.toDegrees(viewer.camera.pitch),
        rollDegrees: CesiumMath.toDegrees(viewer.camera.roll),
        altitudeMeters: Number.isFinite(cartographic.height) ? cartographic.height : null,
        latitude: Number.isFinite(cartographic.latitude)
          ? CesiumMath.toDegrees(cartographic.latitude)
          : null,
        longitude: Number.isFinite(cartographic.longitude)
          ? CesiumMath.toDegrees(cartographic.longitude)
          : null,
        viewportWidthPx: viewer.scene.canvas.width,
        viewportHeightPx: viewer.scene.canvas.height,
        metersPerPixel: getMetersPerPixel(viewer),
      };
    };

    onGlobeApiChange({
      getViewSnapshot,
      requestRender: () => {
        const viewer = viewerRef.current;
        if (!isViewerUsable(viewer)) {
          return;
        }

        viewer.scene.requestRender();
      },
      flyToBounds: (bounds) => {
        const viewer = viewerRef.current;
        if (!isViewerUsable(viewer)) {
          return;
        }

        flyToImportedBounds(viewer, bounds);
      },
      flyToPoint: (point, region) => {
        const viewer = viewerRef.current;
        if (!isViewerUsable(viewer)) {
          return;
        }

        lastFlyTargetRef.current = `${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`;
        flyToLocation(viewer, point, region, false);
      },
    });

    return () => {
      onGlobeApiChange(null);
    };
  }, [onGlobeApiChange, viewerReady, viewerKey]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
      if (clickHandlerRef.current && !clickHandlerRef.current.isDestroyed()) {
        clickHandlerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  // ── Drawing hooks ────────────────────────────────────────────────────────────
  useGlobeDrawing({
    viewerRef,
    viewerReady,
    drawingTool,
    drawnShapes,
    onShapeComplete: onShapeComplete ?? (() => undefined),
    snapToGrid,
  });

  useGlobeDrawnShapes({
    viewerRef,
    viewerReady,
    drawnShapes,
    drawingTool,
    onVertexDrag,
    captureMode,
  });

  if (!hasCesiumToken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-[color:var(--danger-border)] bg-[var(--surface-panel)] px-6 text-center shadow-[var(--shadow-panel)]">
        <div className="max-w-lg space-y-3">
          <div className="eyebrow text-[var(--danger-foreground)]">Globe unavailable</div>
          <div className="text-xl font-semibold text-[var(--foreground)]">
            Cesium Ion is not configured for this deployment
          </div>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            Add <code>NEXT_PUBLIC_CESIUM_ION_TOKEN</code> to the active environment and redeploy to
            restore the 3D globe, satellite basemap, and terrain imagery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 h-full w-full"
      onWheel={(event) => event.stopPropagation()}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
    >
      {terrainUnavailable ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-2 text-xs font-medium text-[var(--warning-foreground)] shadow-[var(--shadow-panel)]">
          Terrain data unavailable — showing flat globe
        </div>
      ) : null}

      {!globeReady ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--surface-overlay)] text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-soft)] border-t-[var(--accent)]" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading 3D map...</p>
        </div>
      ) : null}

      {/* Zoom controls — positioned above DataLayers button (bottom-10) */}
      {!driveMode ? (
        <div className="pointer-events-auto absolute bottom-24 right-4 z-10 flex flex-col gap-1">
          <button
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:text-[var(--foreground)]"
            onClick={() => { viewerRef.current?.camera.zoomIn(0.5); }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:text-[var(--foreground)]"
            onClick={() => { viewerRef.current?.camera.zoomOut(0.5); }}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {driveMode ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-5">
          {/* Speed + alt bar */}
          <div className="pointer-events-auto flex items-end gap-6 rounded-2xl border border-white/10 bg-black/60 px-6 py-3 backdrop-blur-md">
            <div className="flex flex-col items-center leading-none">
              <span
                ref={driveHudSpeedRef}
                className="text-4xl font-bold tabular-nums text-white"
              >
                0
              </span>
              <span className="mt-1 text-xs uppercase tracking-widest text-white/50">
                km/h
              </span>
            </div>
            <div className="flex flex-col items-center leading-none">
              <span
                ref={driveHudAltRef}
                className="text-2xl font-semibold tabular-nums text-white/70"
              >
                0
              </span>
              <span className="mt-1 text-xs uppercase tracking-widest text-white/50">
                m alt
              </span>
            </div>
            <div className="ml-4 grid grid-cols-3 gap-0.5 text-center text-xs leading-tight text-white/40 select-none">
              <span />
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">W</span>
              <span />
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">A</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">S</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">D</span>
            </div>
            <button
              type="button"
              onClick={onExitDriveMode}
              className="ml-4 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
            >
              Exit drive
            </button>
          </div>
        </div>
      ) : null}

      <CoordinateDisplay viewerRef={viewerRef} viewerReady={viewerReady} />
    </div>
  );
}
