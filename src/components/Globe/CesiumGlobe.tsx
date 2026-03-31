"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArcGisBaseMapType,
  ArcGisMapServerImageryProvider,
  Cartesian3,
  Cartographic,
  Color,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  EllipsoidTerrainProvider,
  ImageryLayer,
  Ion,
  IonWorldImageryStyle,
  Math as CesiumMath,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from "cesium";
import { Entity, ScreenSpaceEvent, ScreenSpaceEventHandler, Viewer } from "resium";
import { DEFAULT_GLOBE_VIEW } from "@/lib/starter-regions";
import {
  Coordinates,
  GlobeViewMode,
  RegionSelection,
  SavedSite,
  SubsurfaceDataset,
  SubsurfaceRenderMode,
} from "@/types";
import { LayerState } from "./DataLayers";

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium";
}

const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() ?? "";

Ion.defaultAccessToken = CESIUM_ION_TOKEN;

interface CesiumGlobeProps {
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  globeViewMode: GlobeViewMode;
  subsurfaceRenderMode: SubsurfaceRenderMode;
  onPointSelect: (coords: Coordinates) => void;
  savedSites: SavedSite[];
  layers: LayerState;
  subsurfaceDatasets: SubsurfaceDataset[];
  terrainExaggeration: number;
}

export function CesiumGlobe({
  selectedPoint,
  selectedRegion,
  globeViewMode,
  subsurfaceRenderMode,
  onPointSelect,
  savedSites,
  layers,
  subsurfaceDatasets,
  terrainExaggeration,
}: CesiumGlobeProps) {
  const hasCesiumToken = Boolean(CESIUM_ION_TOKEN);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const lastFlyTargetRef = useRef<string | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  const terrainProvider = useMemo(
    () =>
      createWorldTerrainAsync().catch((error) => {
        console.warn("[cesium-globe] world terrain unavailable, using ellipsoid terrain", error);
        return new EllipsoidTerrainProvider();
      }),
    [],
  );
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

  const isViewerUsable = (viewer: CesiumViewer | null): viewer is CesiumViewer =>
    Boolean(viewer && !viewer.isDestroyed());

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
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          selectedPoint.lng,
          selectedPoint.lat,
          isFirstTarget ? DEFAULT_GLOBE_VIEW.height : 16000,
        ),
        duration: 1.8,
      });
    } catch (error) {
      console.warn("[cesium-globe] camera flyTo failed", error);
    }
  }, [selectedPoint, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer)) {
      return;
    }

    viewer.scene.verticalExaggeration = terrainExaggeration;
  }, [terrainExaggeration]);

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

        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.add(layer, 0);
        viewer.scene.requestRender();
      } catch (error) {
        console.warn("[cesium-globe] basemap swap failed", error);
      }
    };

    void applyBasemap();

    return () => {
      cancelled = true;
    };
  }, [globeViewMode, viewerKey, viewerReady]);

  useEffect(() => {
    if (!viewerReady) {
      setGlobeReady(false);
      return;
    }

    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer)) {
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
    window.addEventListener("scroll", scheduleResize, true);

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }

      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      window.removeEventListener("orientationchange", scheduleResize);
      window.removeEventListener("scroll", scheduleResize, true);
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
    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
      viewerRef.current = null;
    };
  }, []);

  const regionHierarchy = useMemo(
    () =>
      (selectedRegion.polygon.length ? selectedRegion.polygon : [selectedPoint]).map((point) =>
        Cartesian3.fromDegrees(point.lng, point.lat, 120),
      ),
    [selectedPoint, selectedRegion.polygon],
  );

  if (!hasCesiumToken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-[color:var(--danger-border)] bg-[var(--surface-panel)] px-6 text-center shadow-[var(--shadow-panel)]">
        <div className="max-w-lg space-y-3">
          <div className="eyebrow text-[var(--danger-foreground)]">Globe unavailable</div>
          <div className="text-xl font-semibold text-[var(--foreground)]">
            Cesium Ion is not configured for this deployment
          </div>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            Add <code>NEXT_PUBLIC_CESIUM_ION_TOKEN</code> to the active environment and redeploy to restore the 3D globe, satellite basemap, and terrain imagery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={hostRef} className="absolute inset-0 h-full w-full">
      {!globeReady ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--surface-overlay)] text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-soft)] border-t-[var(--accent)]" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading 3D map...</p>
        </div>
      ) : null}
      <Viewer
        key={viewerKey}
        full
        baseLayer={false}
        ref={(node) => {
          const nextViewer = node?.cesiumElement ?? null;
          viewerRef.current = nextViewer;
          setViewerReady(Boolean(nextViewer && !nextViewer.isDestroyed()));
        }}
        terrainProvider={terrainProvider}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        selectionIndicator={false}
        timeline={false}
        navigationHelpButton={false}
        infoBox={false}
        shouldAnimate
        scene3DOnly
      >
        <ScreenSpaceEventHandler>
          <ScreenSpaceEvent
            action={(event) => {
              const viewer = viewerRef.current;
              if (!isViewerUsable(viewer) || !("position" in event)) {
                return;
              }

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
            }}
            type={ScreenSpaceEventType.LEFT_CLICK}
          />
        </ScreenSpaceEventHandler>

        <Entity
          name="Selected Site"
          position={Cartesian3.fromDegrees(selectedPoint.lng, selectedPoint.lat, 220)}
          point={{
            color: Color.fromCssColorString("#00e5ff"),
            pixelSize: 14,
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          }}
        />

        <Entity
          name="Selected region"
          polygon={{
            hierarchy: regionHierarchy,
            material: Color.fromCssColorString("#00e5ff").withAlpha(0.15),
            outline: true,
            outlineColor: Color.fromCssColorString("#00e5ff"),
          }}
        />

        {subsurfaceDatasets.length ? (
          <>
            <Entity
              name="Subsurface footprint"
              polygon={{
                hierarchy: subsurfaceFootprint.map((point) =>
                  Cartesian3.fromDegrees(point.lng, point.lat, 60),
                ),
                material: subsurfaceCueColor.withAlpha(
                  subsurfaceRenderMode === "surface_only" ? 0.08 : 0.18,
                ),
                outline: true,
                outlineColor: subsurfaceCueColor.withAlpha(0.8),
              }}
            />
            <Entity
              name="Subsurface focus"
              position={Cartesian3.fromDegrees(selectedPoint.lng, selectedPoint.lat, 260)}
              point={{
                color: subsurfaceCueColor,
                pixelSize: 8,
                outlineColor: Color.WHITE,
                outlineWidth: 1,
              }}
            />
          </>
        ) : null}

        {savedSites.map((site) => (
          <Entity
            key={site.id}
            name={site.name}
            position={Cartesian3.fromDegrees(site.coordinates.lng, site.coordinates.lat, 180)}
            point={{
              color:
                site.score.total > 80
                  ? Color.fromCssColorString("#5be49b")
                  : Color.fromCssColorString("#ffab00"),
              pixelSize: 10,
              outlineColor: Color.BLACK,
              outlineWidth: 1,
            }}
          />
        ))}
        {layers.heatmap && (
          <Entity
            polygon={{
              hierarchy: regionHierarchy,
              material: Color.fromCssColorString("#ff5d5d").withAlpha(0.18),
              outline: false,
            }}
          />
        )}
      </Viewer>
    </div>
  );
}
