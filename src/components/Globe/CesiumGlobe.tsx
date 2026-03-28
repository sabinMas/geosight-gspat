"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cartesian3,
  Cartographic,
  Color,
  createWorldTerrainAsync,
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
  const viewerRef = useRef<CesiumViewer | null>(null);
  const lastFlyTargetRef = useRef<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const terrainProvider = useMemo(() => createWorldTerrainAsync(), []);

  useEffect(() => {
    if (!viewerRef.current || !viewerReady) {
      return;
    }

    const nextTarget = `${selectedPoint.lat.toFixed(6)}:${selectedPoint.lng.toFixed(6)}`;
    if (lastFlyTargetRef.current === nextTarget) {
      return;
    }

    const isFirstTarget = lastFlyTargetRef.current === null;
    lastFlyTargetRef.current = nextTarget;
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        selectedPoint.lng,
        selectedPoint.lat,
        isFirstTarget ? DEFAULT_VIEW.height : 16000,
      ),
      duration: 1.8,
    });
  }, [selectedPoint, viewerReady]);

  useEffect(() => {
    if (!viewerRef.current) {
      return;
    }

    viewerRef.current.scene.verticalExaggeration = terrainExaggeration;
  }, [terrainExaggeration]);

  const regionHierarchy = useMemo(
    () => selectedRegion.polygon.map((point) => Cartesian3.fromDegrees(point.lng, point.lat, 120)),
    [selectedRegion],
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
    <Viewer
      full
      ref={(node) => {
        viewerRef.current = node?.cesiumElement ?? null;
        setViewerReady(Boolean(node?.cesiumElement));
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
            if (!viewer || !("position" in event)) {
              return;
            }

            const earthPosition = viewer.scene.pickPosition(event.position);
            if (!earthPosition) {
              return;
            }

            const cartographic = Cartographic.fromCartesian(earthPosition);
            onPointSelect({
              lat: CesiumMath.toDegrees(cartographic.latitude),
              lng: CesiumMath.toDegrees(cartographic.longitude),
            });
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
            color: site.score.total > 80 ? Color.fromCssColorString("#5be49b") : Color.fromCssColorString("#ffab00"),
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
  );
}
