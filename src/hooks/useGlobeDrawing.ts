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
  // Priority:
  // 1. scene.pickPosition — uses depth buffer; accurate on entities and (if depth-testing is on) terrain.
  // 2. globe.pick(ray) — intersects terrain surface. Critical when zoomed close: ellipsoid sits far below terrain
  //    so ellipsoid picks land in the wrong spot visually.
  // 3. pickEllipsoid — last-resort fallback for distant views / flat globe.
  const scenePick = viewer.scene.pickPositionSupported
    ? viewer.scene.pickPosition(screenPos)
    : undefined;
  if (scenePick) return scenePick;

  const ray = viewer.camera.getPickRay(screenPos);
  if (ray) {
    const terrainPick = viewer.scene.globe.pick(ray, viewer.scene);
    if (terrainPick) return terrainPick;
  }

  return (
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

function formatDistanceShort(metres: number): string {
  const km = metres / 1000;
  if (km >= 1) return `${km.toFixed(2)} km`;
  return `${Math.round(metres)} m`;
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
        const coords = shape.coordinates;
        const segments = shape.measurement?.segments;

        // Polyline through all vertices
        ds.entities.add({
          polyline: {
            positions: coords.map((c) => Cartesian3.fromDegrees(c.lng, c.lat, 8)),
            width: captureMode ? 4 : 3,
            material: color,
          },
        });

        // Vertex dots
        for (const c of coords) {
          ds.entities.add({
            position: Cartesian3.fromDegrees(c.lng, c.lat, 12),
            point: { color, pixelSize: 8, outlineColor: Color.WHITE, outlineWidth: 1.5 },
          });
        }

        const labelFont = captureMode ? "bold 13px sans-serif" : "bold 12px sans-serif";
        const labelStyle = {
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString("#1e1e2e"),
          outlineWidth: 3,
          style: 2 as number,
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
        };

        if (segments && segments.length > 1) {
          // Multi-segment: per-segment labels at midpoints + total at endpoint
          for (let i = 0; i < segments.length; i++) {
            const a = coords[i];
            const b = coords[i + 1];
            if (!a || !b) continue;
            ds.entities.add({
              position: Cartesian3.fromDegrees((a.lng + b.lng) / 2, (a.lat + b.lat) / 2, 50),
              label: {
                text: segments[i].label,
                font: captureMode ? "bold 12px sans-serif" : "bold 11px sans-serif",
                showBackground: true,
                backgroundColor: Color.fromCssColorString("#1e1e2e").withAlpha(0.75),
                backgroundPadding: new Cartesian2(4, 3),
                ...labelStyle,
              },
            });
          }
          // Total label at the last vertex
          const last = coords[coords.length - 1];
          if (shape.measurementLabel) {
            ds.entities.add({
              position: Cartesian3.fromDegrees(last.lng, last.lat, 60),
              label: { text: shape.measurementLabel, font: labelFont, ...labelStyle },
            });
          }
        } else if (shape.measurementLabel) {
          // Simple 2-point or legacy — single label at midpoint
          const a = coords[0];
          const b = coords[coords.length - 1];
          ds.entities.add({
            position: Cartesian3.fromDegrees((a.lng + b.lng) / 2, (a.lat + b.lat) / 2, 50),
            label: { text: shape.measurementLabel, font: labelFont, ...labelStyle },
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
  const liveMeasureTextRef = useRef<string>("");
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

    // ── Measure (multi-vertex polyline) ──────────────────────────────────────
    if (drawingTool === "measure") {
      // Preview polyline through all placed vertices + live cursor
      previewDs.entities.add({
        polyline: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          positions: new CallbackProperty(() => {
            const verts = verticesRef.current.map((v) =>
              Cartesian3.fromDegrees(v.lng, v.lat, 8),
            );
            if (previewPosRef.current) verts.push(previewPosRef.current);
            if (verts.length < 2) return [];
            return verts;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, false) as any,
          width: 2,
          material: color,
        },
      });

      // Live distance label near the cursor
      previewDs.entities.add({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position: new CallbackProperty(() => previewPosRef.current ?? Cartesian3.fromDegrees(0, 0, 0), false) as any,
        label: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          text: new CallbackProperty(() => liveMeasureTextRef.current, false) as any,
          font: "bold 12px sans-serif",
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString("#1e1e2e"),
          outlineWidth: 3,
          style: 2,
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.LEFT,
          pixelOffset: new Cartesian2(8, -8),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          disableDepthTestDistance: Number.POSITIVE_INFINITY as any,
        },
      });

      handler.setInputAction(
        (e: { endPosition: Cartesian2 }) => {
          const [pos, isVertexSnap] = resolvePosition(e.endPosition);
          snapActiveRef.current = isVertexSnap;
          previewPosRef.current = pos ?? previewPosRef.current;

          // Update live text
          const verts = verticesRef.current;
          if (pos && verts.length > 0) {
            const cursor = toLatLng(pos);
            const last = verts[verts.length - 1];
            const segMetres = haversineMetres(last, cursor);
            const runningMetres = verts.reduce((sum, v, i) => {
              if (i === 0) return sum;
              return sum + haversineMetres(verts[i - 1], v);
            }, 0);
            const totalMetres = runningMetres + segMetres;
            liveMeasureTextRef.current =
              verts.length === 1
                ? formatDistanceShort(segMetres)
                : `+${formatDistanceShort(segMetres)} · ${formatDistanceShort(totalMetres)} total`;
          } else if (verts.length === 0) {
            liveMeasureTextRef.current = "";
          }
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );

      // LEFT_CLICK — add a vertex
      handler.setInputAction(
        (e: { position: Cartesian2 }) => {
          const [pos] = resolvePosition(e.position);
          if (!pos) return;
          const latlng = toLatLng(pos);
          verticesRef.current = [...verticesRef.current, latlng];
          previewDs.entities.add({
            position: Cartesian3.fromDegrees(latlng.lng, latlng.lat, 12),
            point: { color, pixelSize: 10, outlineColor: Color.WHITE, outlineWidth: 2 },
          });
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );

      // RIGHT_CLICK — complete the measurement
      handler.setInputAction(
        () => {
          const verts = verticesRef.current;
          if (verts.length < 2) return;

          const segments: Array<{ distanceKm: number; distanceMi: number; label: string }> = [];
          let totalMetres = 0;
          for (let i = 1; i < verts.length; i++) {
            const m = haversineMetres(verts[i - 1], verts[i]);
            const km = m / 1000;
            segments.push({ distanceKm: km, distanceMi: km * 0.621371, label: formatDistanceShort(m) });
            totalMetres += m;
          }

          const totalKm = totalMetres / 1000;
          const totalMi = totalKm * 0.621371;
          const totalLabel = formatDistance(totalMetres);
          const isSimple = verts.length === 2;
          const bearDeg = isSimple ? bearingDegrees(verts[0], verts[1]) : undefined;
          const bearDisp = bearDeg !== undefined ? bearingDisplay(bearDeg) : undefined;
          const measurementLabel = isSimple
            ? `${totalLabel} · ${bearDisp}`
            : `${totalLabel} · ${verts.length - 1} segments`;

          onShapeComplete({
            id: crypto.randomUUID(),
            type: "measure",
            coordinates: verts,
            measurementLabel,
            measurement: {
              kind: "distance",
              value: totalMi,
              unit: "miles",
              display: totalLabel,
              distanceKm: totalKm,
              distanceMi: totalMi,
              bearingDeg: bearDeg,
              bearingDisplay: bearDisp,
              segments,
              totalDistanceKm: totalKm,
              totalDistanceMi: totalMi,
            },
            color: toolColor,
          });
        },
        ScreenSpaceEventType.RIGHT_CLICK,
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
