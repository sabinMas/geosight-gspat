"use client";

import { useEffect, useRef } from "react";
import type * as CesiumType from "cesium";

interface RouteCoordinate {
  lat: number;
  lng: number;
}

interface UseRouteDisplayProps {
  viewerRef: React.RefObject<CesiumType.Viewer | null>;
  viewerReady: boolean;
  routeCoordinates: RouteCoordinate[] | null;
}

const DS_NAME = "route-display";

function isViewerUsable(v: CesiumType.Viewer | null | undefined): v is CesiumType.Viewer {
  return !!v && !v.isDestroyed();
}

export function useRouteDisplay({
  viewerRef,
  viewerReady,
  routeCoordinates,
}: UseRouteDisplayProps) {
  // Keep a stable ref so the cleanup can always reach the current datasource
  const dsRef = useRef<CesiumType.CustomDataSource | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isViewerUsable(viewer) || !viewerReady) return;

    // Remove previous datasource
    const removeExisting = () => {
      const existing = viewer.dataSources.getByName(DS_NAME)[0];
      if (existing) viewer.dataSources.remove(existing, true);
      dsRef.current = null;
    };
    removeExisting();

    if (!routeCoordinates || routeCoordinates.length < 2) return;

    // Dynamically import Cesium to avoid SSR issues (matches codebase pattern)
    void import("cesium").then((Cesium) => {
      if (!isViewerUsable(viewer)) return;

      const ds = new Cesium.CustomDataSource(DS_NAME);

      // ── Route polyline ──────────────────────────────────────────────────────
      const positions = routeCoordinates.map((c) =>
        Cesium.Cartesian3.fromDegrees(c.lng, c.lat),
      );

      // Outer glow (wider, semi-transparent)
      ds.entities.add({
        polyline: {
          positions,
          width: 8,
          material: new Cesium.PolylineOutlineMaterialProperty({
            color: Cesium.Color.fromCssColorString("#00e5ff").withAlpha(0.25),
            outlineWidth: 0,
          }),
          clampToGround: true,
        },
      });

      // Inner line (accent cyan)
      ds.entities.add({
        polyline: {
          positions,
          width: 4,
          material: Cesium.Color.fromCssColorString("#00e5ff"),
          clampToGround: true,
        },
      });

      // ── Start pin (green) ──────────────────────────────────────────────────
      const start = routeCoordinates[0];
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(start.lng, start.lat),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString("#22c55e"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });

      // ── End pin (orange) ───────────────────────────────────────────────────
      const end = routeCoordinates[routeCoordinates.length - 1];
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(end.lng, end.lat),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString("#fb923c"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });

      void viewer.dataSources.add(ds).then(() => {
        dsRef.current = ds;
        viewer.scene.requestRender();
      });
    });

    // Capture the viewer locally so the cleanup closure does not depend on the
    // ref's later value (which the lint rule warns about).
    const cleanupViewer = viewer;
    return () => {
      if (isViewerUsable(cleanupViewer) && dsRef.current) {
        cleanupViewer.dataSources.remove(dsRef.current, true);
        dsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerReady, routeCoordinates]);
}
