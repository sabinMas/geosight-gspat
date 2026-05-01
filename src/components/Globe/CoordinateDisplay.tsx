"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  Cartesian2,
  Cartographic,
  Math as CesiumMath,
  Viewer as CesiumViewer,
} from "cesium";
import { toMgrsString, toUtmCoordinate } from "@/lib/geospatial";
import type { Coordinates } from "@/types";

interface CoordinateDisplayProps {
  viewerRef: RefObject<CesiumViewer | null>;
  viewerReady: boolean;
}

function isViewerUsable(viewer: CesiumViewer | null): viewer is CesiumViewer {
  return Boolean(viewer && !viewer.isDestroyed());
}

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string) {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(5)}°${suffix}`;
}

function formatAltitude(altitudeMeters: number | null) {
  if (altitudeMeters === null || !Number.isFinite(altitudeMeters)) {
    return "—";
  }

  if (altitudeMeters >= 1000) {
    return `${(altitudeMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(altitudeMeters)} m`;
}

function getApproxZoomLevel(altitudeMeters: number | null) {
  if (altitudeMeters === null || !Number.isFinite(altitudeMeters)) {
    return null;
  }

  const zoomLevel = 18 - Math.log2(Math.max(altitudeMeters, 1) / 700);
  return Math.min(18, Math.max(1, Math.round(zoomLevel)));
}

export function CoordinateDisplay({
  viewerRef,
  viewerReady,
}: CoordinateDisplayProps) {
  const [cursorCoordinates, setCursorCoordinates] = useState<Coordinates | null>(null);
  const [cameraAltitude, setCameraAltitude] = useState<number | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !isViewerUsable(viewer)) {
      return;
    }

    const canvas = viewer.scene.canvas;

    const updateCameraAltitude = () => {
      const cartographic = Cartographic.fromCartesian(viewer.camera.positionWC);
      setCameraAltitude(Number.isFinite(cartographic.height) ? cartographic.height : null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cartesian = viewer.camera.pickEllipsoid(
        new Cartesian2(x, y),
        viewer.scene.globe.ellipsoid,
      );

      if (!cartesian) {
        setCursorCoordinates(null);
        updateCameraAltitude();
        return;
      }

      const cartographic = Cartographic.fromCartesian(cartesian);
      setCursorCoordinates({
        lat: CesiumMath.toDegrees(cartographic.latitude),
        lng: CesiumMath.toDegrees(cartographic.longitude),
      });
      updateCameraAltitude();
    };

    const handleMouseLeave = () => {
      setCursorCoordinates(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    viewer.camera.changed.addEventListener(updateCameraAltitude);
    updateCameraAltitude();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      viewer.camera.changed.removeEventListener(updateCameraAltitude);
    };
  }, [viewerReady, viewerRef]);

  const utm = cursorCoordinates ? toUtmCoordinate(cursorCoordinates) : null;
  const mgrs = cursorCoordinates ? toMgrsString(cursorCoordinates) : null;
  const zoomLevel = getApproxZoomLevel(cameraAltitude);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs leading-5 text-[var(--muted-foreground)] shadow-[var(--shadow-panel)] backdrop-blur-lg [font-family:var(--font-jetbrains-mono)]">
      <div>
        WGS84{" "}
        {cursorCoordinates
          ? `${formatCoordinate(cursorCoordinates.lat, "N", "S")} ${formatCoordinate(cursorCoordinates.lng, "E", "W")}`
          : "Move cursor over globe"}
      </div>
      <div>
        UTM{" "}
        {utm
          ? `${utm.zoneNumber}${utm.zoneLetter} ${Math.round(utm.easting)}E ${Math.round(utm.northing)}N`
          : "Unavailable"}
      </div>
      <div>MGRS {mgrs ?? "Unavailable"}</div>
      <div>
        View {zoomLevel !== null ? `Z${zoomLevel}` : "—"} · {formatAltitude(cameraAltitude)} alt
      </div>
    </div>
  );
}
