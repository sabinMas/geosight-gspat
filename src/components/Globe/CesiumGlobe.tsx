"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { CameraFlyTo, Entity, ScreenSpaceEvent, ScreenSpaceEventHandler, Viewer } from "resium";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { Coordinates, RegionSelection, SavedSite } from "@/types";
import { LayerState } from "./DataLayers";

Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

interface CesiumGlobeProps {
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  onPointSelect: (coords: Coordinates) => void;
  savedSites: SavedSite[];
  layers: LayerState;
  terrainExaggeration: number;
}

const FLY_TO = Cartesian3.fromDegrees(DEFAULT_VIEW.lng, DEFAULT_VIEW.lat, DEFAULT_VIEW.height);

export function CesiumGlobe({
  selectedPoint,
  selectedRegion,
  onPointSelect,
  savedSites,
  layers,
  terrainExaggeration,
}: CesiumGlobeProps) {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const terrainProvider = useMemo(() => createWorldTerrainAsync(), []);

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

  return (
    <Viewer
      full
      ref={(node) => {
        viewerRef.current = node?.cesiumElement ?? null;
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
      <CameraFlyTo duration={2.2} destination={FLY_TO} once />
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

            viewer.camera.flyTo({
              destination: Cartesian3.fromDegrees(
                CesiumMath.toDegrees(cartographic.longitude),
                CesiumMath.toDegrees(cartographic.latitude),
                16000,
              ),
              duration: 1.8,
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

      {layers.water && (
        <Entity
          polyline={{
            positions: Cartesian3.fromDegreesArray([
              -121.85, 45.68, -121.3, 45.58, -120.7, 45.63, -119.85, 45.9,
            ]),
            width: 4,
            material: Color.fromCssColorString("#00e5ff"),
          }}
        />
      )}
      {layers.power && (
        <Entity
          polyline={{
            positions: Cartesian3.fromDegreesArray([
              -121.55, 45.58, -120.9, 45.65, -120.15, 45.82,
            ]),
            width: 3,
            material: Color.fromCssColorString("#ffab00"),
          }}
        />
      )}
      {layers.roads && (
        <Entity
          polyline={{
            positions: Cartesian3.fromDegreesArray([
              -121.78, 45.69, -121.2, 45.62, -120.35, 45.68,
            ]),
            width: 3,
            material: Color.fromCssColorString("#cbd5e1"),
          }}
        />
      )}
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
