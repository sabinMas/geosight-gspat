"use client";

import { useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  CustomDataSource,
  HorizontalOrigin,
  Math as CesiumMath,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from "cesium";
import { DrawnShape, DrawingTool } from "@/types";

const TOOL_COLORS: Record<Exclude<DrawingTool, "none">, string> = {
  polygon: "#a78bfa",
  marker:  "#fb923c",
  measure: "#34d399",
  circle:  "#f472b6",
};

function pickPosition(
  viewer: CesiumViewer,
  screenPos: Cartesian2,
): Cartesian3 | undefined {
  return (
    (viewer.scene.pickPositionSupported
      ? viewer.scene.pickPosition(screenPos)
      : undefined) ??
    viewer.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid) ??
    undefined
  );
}

function toLatLng(pos: Cartesian3): { lat: number; lng: number } {
  const c = Cartographic.fromCartesian(pos);
  return {
    lat: CesiumMath.toDegrees(c.latitude),
    lng: CesiumMath.toDegrees(c.longitude),
  };
}

const GRID_INTERVAL_DEG = 0.001; // ~111m per interval at equator

/** Snap a lat/lng coordinate to the nearest grid intersection. */
function applyGridSnap(
  coord: { lat: number; lng: number },
): { lat: number; lng: number } {
  return {
    lat: Math.round(coord.lat / GRID_INTERVAL_DEG) * GRID_INTERVAL_DEG,
    lng: Math.round(coord.lng / GRID_INTERVAL_DEG) * GRID_INTERVAL_DEG,
  };
}

/** Great-circle distance between two lat/lng points in metres. */
function haversineMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

/** Build ~64-point polygon approximating a circle on the earth's surface. */
function circlePolygon(
  center: { lat: number; lng: number },
  radiusM: number,
  height = 5,
): Cartesian3[] {
  const R = 6_371_000;
  const cLat = (center.lat * Math.PI) / 180;
  const cLng = (center.lng * Math.PI) / 180;
  const pts: Cartesian3[] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(cLat) * Math.cos(radiusM / R) +
        Math.cos(cLat) * Math.sin(radiusM / R) * Math.cos(angle),
    );
    const lng2 =
      cLng +
      Math.atan2(
        Math.sin(angle) * Math.sin(radiusM / R) * Math.cos(cLat),
        Math.cos(radiusM / R) - Math.sin(cLat) * Math.sin(lat2),
      );
    pts.push(Cartesian3.fromRadians(lng2, lat2, height));
  }
  return pts;
}

function formatDistance(metres: number): string {
  const km = metres / 1000;
  const mi = km * 0.621371;
  return `${mi.toFixed(2)} mi / ${km.toFixed(2)} km`;
}

function formatArea(sqm: number): string {
  const acres = sqm * 0.000247105;
  const ha = sqm / 10_000;
  const km2 = sqm / 1_000_000;
  if (km2 >= 1) return `${acres.toFixed(1)} ac / ${ha.toFixed(1)} ha / ${km2.toFixed(2)} km²`;
  return `${acres.toFixed(2)} ac / ${ha.toFixed(2)} ha`;
}

function bearingDegrees(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const CARDINAL = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function bearingDisplay(deg: number): string {
  return `${Math.round(deg).toString().padStart(3, "0")}° ${CARDINAL[Math.round(deg / 45) % 8]}`;
}

// ── Render persisted shapes ───────────────────────────────────────────────────

function formatRadiusLabel(radiusKm: number): string {
  return radiusKm >= 1
    ? `${radiusKm.toFixed(1)} km radius`
    : `${(radiusKm * 1000).toFixed(0)} m radius`;
}

export function useGlobeDrawnShapes({
  viewerRef,
  viewerReady,
  drawnShapes,
  drawingTool,
  onVertexDrag,
  captureMode = false,
}: {
  viewerRef: React.MutableRefObject<CesiumViewer | null>;
  viewerReady: boolean;
  drawnShapes: DrawnShape[];
  drawingTool?: DrawingTool;
  onVertexDrag?: (shapeId: string, vertexIndex: number, coord: { lat: number; lng: number }) => void;
  captureMode?: boolean;
}) {
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) return;

    // Remove old persistent datasource and rebuild
    const existing = viewer.dataSources.getByName("drawing-shapes")[0];
    if (existing) viewer.dataSources.remove(existing, true);

    if (drawnShapes.length === 0) return;

    const ds = new CustomDataSource("drawing-shapes");
    void viewer.dataSources.add(ds);

    for (const shape of drawnShapes) {
      const color = Color.fromCssColorString(shape.color);
      const lineWidth = captureMode ? 4 : 2;
      const fillAlpha = captureMode ? 0.12 : 0.2;

      if (shape.type === "polygon" && shape.coordinates.length >= 3) {
        ds.entities.add({
          polygon: {
            hierarchy: new PolygonHierarchy(
              shape.coordinates.map((c) => Cartesian3.fromDegrees(c.lng, c.lat, 5)),
            ),
            material: color.withAlpha(fillAlpha),
            outline: true,
            outlineColor: color,
            outlineWidth: lineWidth,
            height: 5,
          },
        });
        if (shape.measurementLabel) {
          const centroid = shape.coordinates.reduce(
            (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
            { lat: 0, lng: 0 },
          );
          ds.entities.add({
            position: Cartesian3.fromDegrees(
              centroid.lng / shape.coordinates.length,
              centroid.lat / shape.coordinates.length,
              30,
            ),
            label: {
              text: shape.measurementLabel,
              font: captureMode ? "bold 14px sans-serif" : "bold 13px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.fromCssColorString("#1e1e2e"),
              outlineWidth: 3,
              style: 2, // FILL_AND_OUTLINE
              verticalOrigin: VerticalOrigin.BOTTOM,
              horizontalOrigin: HorizontalOrigin.CENTER,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
            },
          });
        }
      }

      if (shape.type === "marker") {
        const c = shape.coordinates[0];
        ds.entities.add({
          position: Cartesian3.fromDegrees(c.lng, c.lat, 15),
          point: {
            color,
            pixelSize: captureMode ? 16 : 14,
            outlineColor: Color.WHITE,
            outlineWidth: captureMode ? 3 : 2,
          },
          label: {
            text: shape.label ?? "Pin",
            font: captureMode ? "bold 14px sans-serif" : "13px sans-serif",
            fillColor: Color.WHITE,
            outlineColor: Color.fromCssColorString("#1e1e2e"),
            outlineWidth: 3,
            style: 2,
            verticalOrigin: VerticalOrigin.BOTTOM,
            horizontalOrigin: HorizontalOrigin.CENTER,
            pixelOffset: new Cartesian2(0, -18),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
          },
        });
      }

      if (shape.type === "measure" && shape.coordinates.length >= 2) {
        const [a, b] = shape.coordinates;
        ds.entities.add({
          polyline: {
            positions: [
              Cartesian3.fromDegrees(a.lng, a.lat, 8),
              Cartesian3.fromDegrees(b.lng, b.lat, 8),
            ],
            width: captureMode ? 4 : 3,
            material: color,
          },
        });
        ds.entities.add({
          position: Cartesian3.fromDegrees(a.lng, a.lat, 12),
          point: { color, pixelSize: 10, outlineColor: Color.WHITE, outlineWidth: 2 },
        });
        ds.entities.add({
          position: Cartesian3.fromDegrees(b.lng, b.lat, 12),
          point: { color, pixelSize: 10, outlineColor: Color.WHITE, outlineWidth: 2 },
        });
        if (shape.measurementLabel) {
          const midLat = (a.lat + b.lat) / 2;
          const midLng = (a.lng + b.lng) / 2;
          ds.entities.add({
            position: Cartesian3.fromDegrees(midLng, midLat, 30),
            label: {
              text: shape.measurementLabel,
              font: captureMode ? "bold 14px sans-serif" : "bold 13px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.fromCssColorString("#1e1e2e"),
              outlineWidth: 3,
              style: 2,
              verticalOrigin: VerticalOrigin.BOTTOM,
              horizontalOrigin: HorizontalOrigin.CENTER,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
            },
          });
        }
      }

      if (shape.type === "circle" && shape.coordinates.length >= 2) {
        const [center, edge] = shape.coordinates;
        const radiusM = haversineMetres(center, edge);
        const pts = circlePolygon(center, radiusM, 5);
        ds.entities.add({
          polygon: {
            hierarchy: new PolygonHierarchy(pts),
            material: color.withAlpha(captureMode ? 0.12 : 0.15),
            outline: true,
            outlineColor: color,
            outlineWidth: lineWidth,
            height: 5,
          },
        });
        ds.entities.add({
          position: Cartesian3.fromDegrees(center.lng, center.lat, 20),
          point: {
            color,
            pixelSize: captureMode ? 12 : 10,
            outlineColor: Color.WHITE,
            outlineWidth: captureMode ? 3 : 2,
          },
        });
        if (shape.measurementLabel) {
          ds.entities.add({
            position: Cartesian3.fromDegrees(center.lng, center.lat, 40),
            label: {
              text: shape.measurementLabel,
              font: captureMode ? "bold 14px sans-serif" : "bold 13px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.fromCssColorString("#1e1e2e"),
              outlineWidth: 3,
              style: 2,
              verticalOrigin: VerticalOrigin.BOTTOM,
              horizontalOrigin: HorizontalOrigin.CENTER,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
            },
          });
        }
      }

      // Vertex handles for drag-editing (polygon and measure only, not during active drawing)
      if (!drawingTool || drawingTool === "none") {
        if (
          (shape.type === "polygon" && shape.coordinates.length >= 3) ||
          (shape.type === "measure" && shape.coordinates.length >= 2)
        ) {
          shape.coordinates.forEach((coord, vertexIndex) => {
            ds.entities.add({
              id: `vertex-${shape.id}-${vertexIndex}`,
              position: Cartesian3.fromDegrees(coord.lng, coord.lat, shape.type === "measure" ? 12 : 8),
              point: {
                color: Color.WHITE,
                pixelSize: 12,
                outlineColor: Color.fromCssColorString(shape.color),
                outlineWidth: 3,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
              },
            });
          });
        }
      }
    }

    // Vertex drag interaction — only when not in active drawing mode
    let dragHandler: ScreenSpaceEventHandler | null = null;
    if (onVertexDrag && (!drawingTool || drawingTool === "none")) {
      let draggingShapeId: string | null = null;
      let draggingVertexIndex: number | null = null;
      dragHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

      dragHandler.setInputAction((event: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(event.position);
        if (!picked?.id?.id) return;
        const match = String(picked.id.id).match(/^vertex-(.+)-(\d+)$/);
        if (!match) return;
        draggingShapeId = match[1];
        draggingVertexIndex = parseInt(match[2], 10);
        viewer.scene.screenSpaceCameraController.enableInputs = false;
      }, ScreenSpaceEventType.LEFT_DOWN);

      dragHandler.setInputAction((event: { startPosition: Cartesian2; endPosition: Cartesian2 }) => {
        if (draggingShapeId === null || draggingVertexIndex === null) return;
        const pos = viewer.camera.pickEllipsoid(event.endPosition, viewer.scene.globe.ellipsoid);
        if (!pos) return;
        const carto = Cartographic.fromCartesian(pos);
        onVertexDrag(draggingShapeId, draggingVertexIndex, {
          lat: CesiumMath.toDegrees(carto.latitude),
          lng: CesiumMath.toDegrees(carto.longitude),
        });
      }, ScreenSpaceEventType.MOUSE_MOVE);

      dragHandler.setInputAction(() => {
        draggingShapeId = null;
        draggingVertexIndex = null;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
      }, ScreenSpaceEventType.LEFT_UP);
    }

    return () => {
      const ds2 = viewer.dataSources.getByName("drawing-shapes")[0];
      if (ds2) viewer.dataSources.remove(ds2, true);
      if (dragHandler && !dragHandler.isDestroyed()) dragHandler.destroy();
    };
  }, [captureMode, drawnShapes, drawingTool, onVertexDrag, viewerRef, viewerReady]);
}

// ── Active drawing interaction ────────────────────────────────────────────────

const SNAP_RADIUS_PX = 16;

/**
 * Returns the Cartesian3 position of the nearest existing vertex within
 * SNAP_RADIUS_PX screen pixels of `screenPos`, or null if none qualifies.
 */
function findSnapTarget(
  viewer: CesiumViewer,
  screenPos: Cartesian2,
  drawnShapes: DrawnShape[],
): Cartesian3 | null {
  let best: Cartesian3 | null = null;
  let bestDist = SNAP_RADIUS_PX;

  for (const shape of drawnShapes) {
    for (const coord of shape.coordinates) {
      const world = Cartesian3.fromDegrees(coord.lng, coord.lat, 0);
      const projected = new Cartesian2();
      // cartesianToCanvasCoordinates returns undefined when behind the camera
      const result = viewer.scene.cartesianToCanvasCoordinates(world, projected);
      if (!result) continue;
      const dx = result.x - screenPos.x;
      const dy = result.y - screenPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = Cartesian3.fromDegrees(coord.lng, coord.lat, 8);
      }
    }
  }

  return best;
}

export function useGlobeDrawing({
  viewerRef,
  viewerReady,
  drawingTool,
  drawnShapes = [],
  onShapeComplete,
  snapToGrid = false,
}: {
  viewerRef: React.MutableRefObject<CesiumViewer | null>;
  viewerReady: boolean;
  drawingTool: DrawingTool;
  drawnShapes?: DrawnShape[];
  onShapeComplete: (shape: DrawnShape) => void;
  snapToGrid?: boolean;
}) {
  const verticesRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const previewPosRef = useRef<Cartesian3 | null>(null);
  const firstPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const snapActiveRef = useRef(false);
  const drawnShapesRef = useRef<DrawnShape[]>(drawnShapes);
  const snapToGridRef = useRef(snapToGrid);

  useEffect(() => {
    drawnShapesRef.current = drawnShapes;
  }, [drawnShapes]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (drawingTool === "none" || !viewer || !viewerReady) return;

    const toolColor = TOOL_COLORS[drawingTool as Exclude<DrawingTool, "none">];
    const color = Color.fromCssColorString(toolColor);

    // Reset per-session state
    verticesRef.current = [];
    previewPosRef.current = null;
    firstPointRef.current = null;
    snapActiveRef.current = false;

    // Separate datasource for the in-progress preview
    const previewDs = new CustomDataSource("drawing-preview");
    void viewer.dataSources.add(previewDs);

    // Snap indicator entity — visible when cursor is near an existing vertex
    const snapIndicator = previewDs.entities.add({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      position: new CallbackProperty(() => previewPosRef.current ?? Cartesian3.fromDegrees(0, 0, 0), false) as any,
      point: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: new CallbackProperty(() => snapActiveRef.current ? Color.WHITE : Color.TRANSPARENT, false) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outlineColor: new CallbackProperty(() => snapActiveRef.current ? color : Color.TRANSPARENT, false) as any,
        outlineWidth: 3,
        pixelSize: 18,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
      },
    });
    void snapIndicator; // referenced via CallbackProperty above

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    /**
     * Resolves a screen position to a world Cartesian3, applying snap-to-vertex
     * first, then snap-to-grid if enabled and no vertex snap matched.
     * Returns [position, isSnapped] where isSnapped reflects vertex snapping only.
     */
    function resolvePosition(
      screenPos: Cartesian2,
    ): [Cartesian3 | null, boolean] {
      if (!viewer) return [null, false];
      const vertexSnap = findSnapTarget(viewer, screenPos, drawnShapesRef.current);
      if (vertexSnap) return [vertexSnap, true];
      const raw = pickPosition(viewer, screenPos);
      if (!raw) return [null, false];
      if (snapToGridRef.current) {
        const latLng = toLatLng(raw);
        const snapped = applyGridSnap(latLng);
        return [Cartesian3.fromDegrees(snapped.lng, snapped.lat, 8), false];
      }
      return [raw, false];
    }

    // ── Polygon ──────────────────────────────────────────────────────────────
    if (drawingTool === "polygon") {
      previewDs.entities.add({
        polygon: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hierarchy: new CallbackProperty(() => {
            const verts = verticesRef.current.map((v) =>
              Cartesian3.fromDegrees(v.lng, v.lat, 5),
            );
            if (previewPosRef.current) verts.push(previewPosRef.current);
            if (verts.length < 3) return new PolygonHierarchy([]);
            return new PolygonHierarchy(verts);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, false) as any,
          material: color.withAlpha(0.25),
          outline: true,
          outlineColor: color,
          outlineWidth: 2,
          height: 5,
        },
      });

      handler.setInputAction(
        (e: { endPosition: Cartesian2 }) => {
          const [pos, isVertexSnap] = resolvePosition(e.endPosition);
          snapActiveRef.current = isVertexSnap;
          previewPosRef.current = pos ?? previewPosRef.current;
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );

      handler.setInputAction(
        (e: { position: Cartesian2 }) => {
          const [pos] = resolvePosition(e.position);
          if (!pos) return;
          const latlng = toLatLng(pos);
          verticesRef.current = [...verticesRef.current, latlng];
          previewDs.entities.add({
            position: Cartesian3.fromDegrees(latlng.lng, latlng.lat, 8),
            point: { color, pixelSize: 8, outlineColor: Color.WHITE, outlineWidth: 1 },
          });
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );

      // Right-click closes the polygon
      handler.setInputAction(
        () => {
          const verts = verticesRef.current;
          if (verts.length < 3) return;
          const ring = [...verts.map((v) => [v.lng, v.lat] as [number, number]), [verts[0].lng, verts[0].lat] as [number, number]];
          let areaLabel = "";
          let measurement: DrawnShape["measurement"];
          let metrics: DrawnShape["metrics"] | undefined;
          try {
            const polygon = turf.polygon([ring]);
            const sqm = turf.area(polygon);
            const perimeterKm = turf.length(turf.lineString(ring), { units: "kilometers" });
            const areaSqKm = sqm / 1_000_000;
            const areaAcres = sqm * 0.000247105;
            const areaHa = sqm / 10_000;
            const areaMi2 = areaSqKm * 0.386102;
            const perimeterMi = perimeterKm * 0.621371;
            metrics = { areaSqKm, areaAcres, perimeterKm, perimeterMiles: perimeterMi };
            areaLabel = formatArea(sqm);
            measurement = {
              kind: "area", value: areaAcres, unit: "acres", display: areaLabel,
              areaHa, areaKm2: areaSqKm, areaAcres, areaMi2,
              perimeterKm, perimeterMi,
            };
          } catch {
            areaLabel = `${verts.length} pts`;
          }
          onShapeComplete({
            id: crypto.randomUUID(),
            type: "polygon",
            coordinates: verts,
            measurementLabel: areaLabel,
            measurement,
            metrics,
            color: toolColor,
          });
        },
        ScreenSpaceEventType.RIGHT_CLICK,
      );
    }

    // ── Marker ───────────────────────────────────────────────────────────────
    if (drawingTool === "marker") {
      handler.setInputAction(
        (e: { position: Cartesian2 }) => {
          const [pos] = resolvePosition(e.position);
          if (!pos) return;
          onShapeComplete({
            id: crypto.randomUUID(),
            type: "marker",
            coordinates: [toLatLng(pos)],
            label: "Pin",
            color: toolColor,
          });
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );
    }

    // ── Measure ──────────────────────────────────────────────────────────────
    if (drawingTool === "measure") {
      previewDs.entities.add({
        polyline: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          positions: new CallbackProperty(() => {
            const start = firstPointRef.current;
            const preview = previewPosRef.current;
            if (!start || !preview) return [];
            return [Cartesian3.fromDegrees(start.lng, start.lat, 8), preview];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, false) as any,
          width: 2,
          material: color,
        },
      });

      handler.setInputAction(
        (e: { endPosition: Cartesian2 }) => {
          const [pos, isVertexSnap] = resolvePosition(e.endPosition);
          snapActiveRef.current = isVertexSnap;
          previewPosRef.current = pos ?? previewPosRef.current;
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );

      handler.setInputAction(
        (e: { position: Cartesian2 }) => {
          const [pos] = resolvePosition(e.position);
          if (!pos) return;
          const latlng = toLatLng(pos);

          if (!firstPointRef.current) {
            firstPointRef.current = latlng;
            previewDs.entities.add({
              position: Cartesian3.fromDegrees(latlng.lng, latlng.lat, 12),
              point: { color, pixelSize: 10, outlineColor: Color.WHITE, outlineWidth: 2 },
            });
          } else {
            const start = firstPointRef.current;
            const metres = haversineMetres(start, latlng);
            const km = metres / 1000;
            const mi = km * 0.621371;
            const deg = bearingDegrees(start, latlng);
            const distLabel = formatDistance(metres);
            const bDisplay = bearingDisplay(deg);
            onShapeComplete({
              id: crypto.randomUUID(),
              type: "measure",
              coordinates: [start, latlng],
              measurementLabel: `${distLabel} · ${bDisplay}`,
              measurement: {
                kind: "distance", value: mi, unit: "miles", display: distLabel,
                distanceKm: km, distanceMi: mi, bearingDeg: deg, bearingDisplay: bDisplay,
              },
              color: toolColor,
            });
          }
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );
    }

    // ── Circle ───────────────────────────────────────────────────────────────
    if (drawingTool === "circle") {
      previewDs.entities.add({
        polygon: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hierarchy: new CallbackProperty(() => {
            const center = firstPointRef.current;
            const preview = previewPosRef.current;
            if (!center || !preview) return new PolygonHierarchy([]);
            const edge = toLatLng(preview);
            const radiusM = haversineMetres(center, edge);
            if (radiusM < 1) return new PolygonHierarchy([]);
            return new PolygonHierarchy(circlePolygon(center, radiusM, 5));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, false) as any,
          material: color.withAlpha(0.2),
          outline: true,
          outlineColor: color,
          outlineWidth: 2,
          height: 5,
        },
      });

      handler.setInputAction(
        (e: { endPosition: Cartesian2 }) => {
          const [pos] = resolvePosition(e.endPosition);
          if (pos) previewPosRef.current = pos;
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );

      handler.setInputAction(
        (e: { position: Cartesian2 }) => {
          const [pos] = resolvePosition(e.position);
          if (!pos) return;
          const latlng = toLatLng(pos);

          if (!firstPointRef.current) {
            firstPointRef.current = latlng;
            previewDs.entities.add({
              position: Cartesian3.fromDegrees(latlng.lng, latlng.lat, 12),
              point: { color, pixelSize: 10, outlineColor: Color.WHITE, outlineWidth: 2 },
            });
          } else {
            const center = firstPointRef.current;
            const radiusKm = turf.distance(
              turf.point([center.lng, center.lat]),
              turf.point([latlng.lng, latlng.lat]),
              { units: "kilometers" },
            );
            const radiusMi = radiusKm * 0.621371;
            const radiusLabel = `${radiusMi.toFixed(2)} mi / ${radiusKm.toFixed(2)} km radius`;
            onShapeComplete({
              id: crypto.randomUUID(),
              type: "circle",
              coordinates: [center, latlng],
              measurementLabel: radiusLabel,
              measurement: {
                kind: "distance", value: radiusMi, unit: "miles", display: radiusLabel,
                distanceKm: radiusKm, distanceMi: radiusMi,
              },
              metrics: { radiusKm },
              color: toolColor,
            });
          }
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );
    }

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
      const existing = viewer.dataSources.getByName("drawing-preview")[0];
      if (existing) viewer.dataSources.remove(existing, true);
      verticesRef.current = [];
      previewPosRef.current = null;
      firstPointRef.current = null;
    };
  }, [drawingTool, viewerRef, viewerReady, onShapeComplete]);
}
