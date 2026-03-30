"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian3,
  Cartographic,
  Color,
  createWorldTerrainAsync,
  EllipsoidTerrainProvider,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from "cesium";
import { Entity, ScreenSpaceEvent, ScreenSpaceEventHandler, Viewer } from "resium";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { Coordinates, DemoMapOverlay, RegionSelection, SavedSite } from "@/types";
import { LayerState } from "./DataLayers";

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium";
}

Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

interface CesiumGlobeProps {
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  onPointSelect: (coords: Coordinates) => void;
  savedSites: SavedSite[];
  layers: LayerState;
  terrainExaggeration: number;
  demoOverlays?: DemoMapOverlay[];
}

export function CesiumGlobe({
  selectedPoint,
  selectedRegion,
  onPointSelect,
  savedSites,
  layers,
  terrainExaggeration,
  demoOverlays = [],
}: CesiumGlobeProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const lastFlyTargetRef = useRef<string | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  const terrainProvider = useMemo(
    () =>
      createWorldTerrainAsync().catch((error) => {
        console.warn("[cesium-globe] world terrain unavailable, using ellipsoid terrain", error);
        return new EllipsoidTerrainProvider();
      }),
    [],
  );

  const isViewerUsable = (viewer: CesiumViewer | null): viewer is CesiumViewer =>
    Boolean(viewer && !viewer.isDestroyed());

  const requestViewerReset = (reason: string) => {
    if (resetTimeoutRef.current !== null) {
      return;
    }

    console.warn(`[cesium-globe] resetting viewer after ${reason}`);
    setViewerReady(false);
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
          isFirstTarget ? DEFAULT_VIEW.height : 16000,
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

  const activeOverlayEntities = useMemo(
    () =>
      demoOverlays.filter((overlay) => {
        switch (overlay.layer) {
          case "water":
            return layers.water;
          case "power":
            return layers.power;
          case "roads":
            return layers.roads;
          default:
            return false;
        }
      }),
    [demoOverlays, layers.power, layers.roads, layers.water],
  );

  return (
    <div ref={hostRef} className="h-full w-full">
      <Viewer
        key={viewerKey}
        full
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

        {activeOverlayEntities.map((overlay) => (
          <Entity
            key={overlay.id}
            polyline={{
              positions: Cartesian3.fromDegreesArray(
                overlay.positions.flatMap((point) => [point.lng, point.lat]),
              ),
              width: overlay.width,
              material: Color.fromCssColorString(overlay.color),
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
