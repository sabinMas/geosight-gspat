"use client";

import { useEffect, useRef } from "react";
import {
  BoundingSphere,
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  CustomDataSource,
  HeadingPitchRange,
  HorizontalOrigin,
  LabelStyle,
  Math as CesiumMath,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer as CesiumViewer,
} from "cesium";
import { DrawingDraftState } from "@/context/AnalysisContext";
import {
  buildCircleCoordinates,
  buildRectangleCoordinates,
  computeCircleRadiusMeters,
  getShapeCentroid,
  withShapeMeasurement,
} from "@/lib/analysis-geometry";
import { Coordinates, DrawnShape, DrawingTool } from "@/types";

const TOOL_COLORS: Record<Exclude<DrawingTool, "none">, string> = {
  polygon: "#a78bfa",
  point: "#fb923c",
  polyline: "#34d399",
  rectangle: "#00e5ff",
  circle: "#f472b6",
};

const SHAPE_ENTITY_PREFIX = "shape:";
const SHAPE_LABEL_PREFIX = "shape-label:";
const VERTEX_ENTITY_PREFIX = "vertex:";
const SNAP_RADIUS_PX = 16;
const GRID_INTERVAL_DEG = 0.001;

function isTypingContext() {
  const activeElement = document.activeElement;
  const activeTagName = activeElement?.tagName;

  return (
    activeTagName === "INPUT" ||
    activeTagName === "TEXTAREA" ||
    activeElement instanceof HTMLSelectElement ||
    activeElement?.getAttribute("contenteditable") === "true"
  );
}

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

function toLatLng(pos: Cartesian3): Coordinates {
  const cartographic = Cartographic.fromCartesian(pos);
  return {
    lat: CesiumMath.toDegrees(cartographic.latitude),
    lng: CesiumMath.toDegrees(cartographic.longitude),
  };
}

function applyGridSnap(coord: Coordinates): Coordinates {
  return {
    lat: Math.round(coord.lat / GRID_INTERVAL_DEG) * GRID_INTERVAL_DEG,
    lng: Math.round(coord.lng / GRID_INTERVAL_DEG) * GRID_INTERVAL_DEG,
  };
}

function shapePointsForViewer(shape: DrawnShape): Coordinates[] {
  if (shape.type === "circle") {
    const radiusMeters =
      shape.radiusMeters ??
      (shape.coordinates[1]
        ? computeCircleRadiusMeters(shape.coordinates[0], shape.coordinates[1])
        : 0);
    return buildCircleCoordinates(shape.coordinates[0], radiusMeters);
  }

  return shape.coordinates;
}

function fitViewerToShape(viewer: CesiumViewer, shape: DrawnShape) {
  const points = shapePointsForViewer(shape);
  if (points.length === 0) {
    return;
  }

  if (points.length === 1) {
    const point = points[0];
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(point.lng, point.lat, 1800),
      duration: 1.1,
    });
    return;
  }

  const sphere = BoundingSphere.fromPoints(
    points.map((point) => Cartesian3.fromDegrees(point.lng, point.lat, 120)),
  );
  viewer.camera.flyToBoundingSphere(sphere, {
    duration: 1.1,
    offset: new HeadingPitchRange(0, -0.95, Math.max(sphere.radius * 3.1, 900)),
  });
}

function measurementLabelPosition(shape: DrawnShape) {
  if (shape.type === "polyline" && shape.coordinates.length >= 2) {
    const middleIndex = Math.floor(shape.coordinates.length / 2);
    return shape.coordinates[middleIndex] ?? shape.coordinates[0];
  }

  if (shape.type === "point") {
    return shape.coordinates[0] ?? null;
  }

  return getShapeCentroid(shape);
}

function buildDraftShape(tool: DrawingTool, coordinates: Coordinates[]): DrawnShape | null {
  if (tool === "point" || tool === "none") {
    return null;
  }

  if (tool === "polyline" && coordinates.length >= 2) {
    return withShapeMeasurement({
      id: "draft",
      type: "polyline",
      coordinates,
      color: TOOL_COLORS.polyline,
    });
  }

  if (tool === "polygon" && coordinates.length >= 3) {
    return withShapeMeasurement({
      id: "draft",
      type: "polygon",
      coordinates,
      color: TOOL_COLORS.polygon,
    });
  }

  if (tool === "rectangle" && coordinates.length >= 2) {
    return withShapeMeasurement({
      id: "draft",
      type: "rectangle",
      coordinates: buildRectangleCoordinates(coordinates[0], coordinates[1]),
      color: TOOL_COLORS.rectangle,
    });
  }

  if (tool === "circle" && coordinates.length >= 2) {
    return withShapeMeasurement({
      id: "draft",
      type: "circle",
      coordinates: [coordinates[0], coordinates[1]],
      color: TOOL_COLORS.circle,
      radiusMeters: computeCircleRadiusMeters(coordinates[0], coordinates[1]),
    });
  }

  return null;
}

function buildCompletedShape(tool: DrawingTool, coordinates: Coordinates[]): DrawnShape | null {
  if (tool === "point" && coordinates[0]) {
    return withShapeMeasurement({
      id: crypto.randomUUID(),
      type: "point",
      coordinates: [coordinates[0]],
      label: "Pin",
      color: TOOL_COLORS.point,
    });
  }

  if (tool === "polyline" && coordinates.length >= 2) {
    return withShapeMeasurement({
      id: crypto.randomUUID(),
      type: "polyline",
      coordinates,
      color: TOOL_COLORS.polyline,
    });
  }

  if (tool === "polygon" && coordinates.length >= 3) {
    return withShapeMeasurement({
      id: crypto.randomUUID(),
      type: "polygon",
      coordinates,
      color: TOOL_COLORS.polygon,
    });
  }

  if (tool === "rectangle" && coordinates.length >= 2) {
    return withShapeMeasurement({
      id: crypto.randomUUID(),
      type: "rectangle",
      coordinates: buildRectangleCoordinates(coordinates[0], coordinates[1]),
      color: TOOL_COLORS.rectangle,
    });
  }

  if (tool === "circle" && coordinates.length >= 2) {
    const radiusMeters = computeCircleRadiusMeters(coordinates[0], coordinates[1]);
    return withShapeMeasurement({
      id: crypto.randomUUID(),
      type: "circle",
      coordinates: [coordinates[0], coordinates[1]],
      color: TOOL_COLORS.circle,
      radiusMeters,
    });
  }

  return null;
}

function findSnapTarget(
  viewer: CesiumViewer,
  screenPos: Cartesian2,
  drawnShapes: DrawnShape[],
): Cartesian3 | null {
  let best: Cartesian3 | null = null;
  let bestDistance = SNAP_RADIUS_PX;

  for (const shape of drawnShapes) {
    for (const coord of shape.coordinates) {
      const world = Cartesian3.fromDegrees(coord.lng, coord.lat, 0);
      const projected = viewer.scene.cartesianToCanvasCoordinates(world, new Cartesian2());
      if (!projected) {
        continue;
      }

      const dx = projected.x - screenPos.x;
      const dy = projected.y - screenPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = Cartesian3.fromDegrees(coord.lng, coord.lat, 8);
      }
    }
  }

  return best;
}

function getPickedEntityId(viewer: CesiumViewer, position: Cartesian2) {
  const picked = viewer.scene.pick(position);
  if (!picked?.id) {
    return null;
  }

  if (typeof picked.id.id === "string") {
    return picked.id.id;
  }

  return typeof picked.id === "string" ? picked.id : null;
}

function parseShapeId(entityId: string | null) {
  if (!entityId) {
    return null;
  }

  if (entityId.startsWith(SHAPE_ENTITY_PREFIX)) {
    return entityId.slice(SHAPE_ENTITY_PREFIX.length);
  }

  if (entityId.startsWith(SHAPE_LABEL_PREFIX)) {
    return entityId.slice(SHAPE_LABEL_PREFIX.length);
  }

  return null;
}

function parseVertexEntity(entityId: string | null) {
  if (!entityId?.startsWith(VERTEX_ENTITY_PREFIX)) {
    return null;
  }

  const [, shapeId, index] = entityId.split(":");
  if (!shapeId || index === undefined) {
    return null;
  }

  return {
    shapeId,
    vertexIndex: Number(index),
  };
}

export function isDrawingEntityId(entityId: string | null) {
  return Boolean(
    entityId?.startsWith(SHAPE_ENTITY_PREFIX) ||
      entityId?.startsWith(SHAPE_LABEL_PREFIX) ||
      entityId?.startsWith(VERTEX_ENTITY_PREFIX),
  );
}

export function useAoiDrawnShapes({
  viewerRef,
  viewerReady,
  drawnShapes,
  drawingTool,
  selectedShapeId,
  onSelectShape,
  onVertexDrag,
  captureMode = false,
  visible = true,
}: {
  viewerRef: React.MutableRefObject<CesiumViewer | null>;
  viewerReady: boolean;
  drawnShapes: DrawnShape[];
  drawingTool?: DrawingTool;
  selectedShapeId: string | null;
  onSelectShape?: (shapeId: string | null) => void;
  onVertexDrag?: (shapeId: string, vertexIndex: number, coord: Coordinates) => void;
  captureMode?: boolean;
  visible?: boolean;
}) {
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) {
      return;
    }

    const existing = viewer.dataSources.getByName("drawing-shapes")[0];
    if (existing) {
      void viewer.dataSources.remove(existing, true);
    }

    if (!visible || drawnShapes.length === 0) {
      return;
    }

    const dataSource = new CustomDataSource("drawing-shapes");
    void viewer.dataSources.add(dataSource);

    for (const shape of drawnShapes) {
      const isSelected = shape.id === selectedShapeId;
      const color = Color.fromCssColorString(shape.color);
      const lineColor = isSelected ? color.brighten(0.18, new Color()) : color;
      const fillColor = isSelected
        ? color.withAlpha(captureMode ? 0.24 : 0.32)
        : color.withAlpha(captureMode ? 0.12 : 0.18);

      if (shape.type === "point") {
        const coord = shape.coordinates[0];
        if (!coord) {
          continue;
        }

        dataSource.entities.add({
          id: `${SHAPE_ENTITY_PREFIX}${shape.id}`,
          position: Cartesian3.fromDegrees(coord.lng, coord.lat, 12),
          point: {
            color: lineColor,
            pixelSize: isSelected ? (captureMode ? 20 : 18) : captureMode ? 16 : 14,
            outlineColor: Color.WHITE,
            outlineWidth: captureMode ? 3 : 2,
          },
        });
      }

      if (shape.type === "polyline") {
        dataSource.entities.add({
          id: `${SHAPE_ENTITY_PREFIX}${shape.id}`,
          polyline: {
            positions: shape.coordinates.map((coord) =>
              Cartesian3.fromDegrees(coord.lng, coord.lat, 10),
            ),
            width: isSelected ? (captureMode ? 6 : 5) : captureMode ? 5 : 4,
            material: lineColor,
          },
        });
      }

      if (shape.type === "polygon" || shape.type === "rectangle") {
        dataSource.entities.add({
          id: `${SHAPE_ENTITY_PREFIX}${shape.id}`,
          polygon: {
            hierarchy: new PolygonHierarchy(
              shape.coordinates.map((coord) =>
                Cartesian3.fromDegrees(coord.lng, coord.lat, 5),
              ),
            ),
            material: fillColor,
            outline: true,
            outlineColor: lineColor,
            outlineWidth: isSelected ? (captureMode ? 4 : 3) : captureMode ? 3 : 2,
            height: 5,
          },
        });
      }

      if (shape.type === "circle") {
        const radiusMeters =
          shape.radiusMeters ??
          (shape.coordinates[1]
            ? computeCircleRadiusMeters(shape.coordinates[0], shape.coordinates[1])
            : 0);
        const circleCoordinates = buildCircleCoordinates(shape.coordinates[0], radiusMeters);
        dataSource.entities.add({
          id: `${SHAPE_ENTITY_PREFIX}${shape.id}`,
          polygon: {
            hierarchy: new PolygonHierarchy(
              circleCoordinates.map((coord) =>
                Cartesian3.fromDegrees(coord.lng, coord.lat, 5),
              ),
            ),
            material: fillColor,
            outline: true,
            outlineColor: lineColor,
            outlineWidth: isSelected ? (captureMode ? 4 : 3) : captureMode ? 3 : 2,
            height: 5,
          },
        });
      }

      const labelAnchor = measurementLabelPosition(shape);
      if (labelAnchor && (shape.measurementLabel || shape.label)) {
        dataSource.entities.add({
          id: `${SHAPE_LABEL_PREFIX}${shape.id}`,
          position: Cartesian3.fromDegrees(labelAnchor.lng, labelAnchor.lat, 24),
          label: {
            text: shape.measurementLabel ?? shape.label ?? "",
            font: captureMode ? "700 14px sans-serif" : "600 13px sans-serif",
            style: LabelStyle.FILL_AND_OUTLINE,
            fillColor: Color.WHITE,
            outlineColor: Color.fromCssColorString("#04131d"),
            outlineWidth: 3,
            pixelOffset: new Cartesian2(0, -4),
            verticalOrigin: VerticalOrigin.BOTTOM,
            horizontalOrigin: HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      if (!isSelected || captureMode || (drawingTool && drawingTool !== "none")) {
        continue;
      }

      const editableCoordinates =
        shape.type === "circle" ? shape.coordinates.slice(0, 2) : shape.coordinates;
      editableCoordinates.forEach((coord, vertexIndex) => {
        dataSource.entities.add({
          id: `${VERTEX_ENTITY_PREFIX}${shape.id}:${vertexIndex}`,
          position: Cartesian3.fromDegrees(coord.lng, coord.lat, 10),
          point: {
            color: Color.WHITE,
            pixelSize: shape.type === "point" ? 14 : 12,
            outlineColor: lineColor,
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });
    }

    let draggingShapeId: string | null = null;
    let draggingVertexIndex: number | null = null;
    const interactionHandler =
      onSelectShape || onVertexDrag
        ? new ScreenSpaceEventHandler(viewer.scene.canvas)
        : null;

    interactionHandler?.setInputAction(
      (event: { position: Cartesian2 }) => {
        if (drawingTool && drawingTool !== "none") {
          return;
        }

        const entityId = getPickedEntityId(viewer, event.position);
        const shapeId = parseShapeId(entityId) ?? parseVertexEntity(entityId)?.shapeId ?? null;
        if (shapeId) {
          onSelectShape?.(shapeId);
          return;
        }

        onSelectShape?.(null);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    interactionHandler?.setInputAction(
      (event: { position: Cartesian2 }) => {
        if (!onVertexDrag || (drawingTool && drawingTool !== "none")) {
          return;
        }

        const entity = parseVertexEntity(getPickedEntityId(viewer, event.position));
        if (!entity) {
          return;
        }

        draggingShapeId = entity.shapeId;
        draggingVertexIndex = entity.vertexIndex;
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        viewer.canvas.style.cursor = "grabbing";
      },
      ScreenSpaceEventType.LEFT_DOWN,
    );

    interactionHandler?.setInputAction(
      (event: { endPosition: Cartesian2 }) => {
        if (draggingShapeId === null || draggingVertexIndex === null || !onVertexDrag) {
          const hoveredId = getPickedEntityId(viewer, event.endPosition);
          viewer.canvas.style.cursor = isDrawingEntityId(hoveredId) ? "pointer" : "";
          return;
        }

        const position = pickPosition(viewer, event.endPosition);
        if (!position) {
          return;
        }

        onVertexDrag(draggingShapeId, draggingVertexIndex, toLatLng(position));
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    );

    interactionHandler?.setInputAction(
      () => {
        draggingShapeId = null;
        draggingVertexIndex = null;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        viewer.canvas.style.cursor = "";
      },
      ScreenSpaceEventType.LEFT_UP,
    );

    return () => {
      void viewer.dataSources.remove(dataSource, true);
      if (interactionHandler && !interactionHandler.isDestroyed()) {
        interactionHandler.destroy();
      }
      viewer.canvas.style.cursor = "";
      viewer.scene.screenSpaceCameraController.enableInputs = true;
    };
  }, [
    drawnShapes,
    drawingTool,
    onSelectShape,
    onVertexDrag,
    selectedShapeId,
    captureMode,
    visible,
    viewerReady,
    viewerRef,
  ]);
}

export function useAoiDrawing({
  viewerRef,
  viewerReady,
  drawingTool,
  drawnShapes = [],
  onShapeComplete,
  onDraftStateChange,
  undoDraftNonce,
  completeDrawingNonce,
  snapToGrid = false,
}: {
  viewerRef: React.MutableRefObject<CesiumViewer | null>;
  viewerReady: boolean;
  drawingTool: DrawingTool;
  drawnShapes?: DrawnShape[];
  onShapeComplete: (shape: DrawnShape) => void;
  onDraftStateChange?: (draft: DrawingDraftState) => void;
  undoDraftNonce?: number;
  completeDrawingNonce?: number;
  snapToGrid?: boolean;
}) {
  const verticesRef = useRef<Coordinates[]>([]);
  const previewCoordRef = useRef<Coordinates | null>(null);
  const previewMeasurementRef = useRef<string>("");
  const previewLabelCoordRef = useRef<Coordinates | null>(null);
  const drawnShapesRef = useRef<DrawnShape[]>(drawnShapes);
  const undoDraftRef = useRef(undoDraftNonce ?? 0);
  const completeDraftRef = useRef(completeDrawingNonce ?? 0);

  useEffect(() => {
    drawnShapesRef.current = drawnShapes;
  }, [drawnShapes]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (drawingTool === "none" || !viewer || !viewerReady) {
      onDraftStateChange?.({
        tool: "none",
        vertexCount: 0,
        measurementLabel: null,
        canUndo: false,
        canComplete: false,
      });
      return;
    }

    const previewDataSource = new CustomDataSource("drawing-preview");
    void viewer.dataSources.add(previewDataSource);
    const previewColor = Color.fromCssColorString(TOOL_COLORS[drawingTool]);

    const emitDraftState = (overrides?: Partial<DrawingDraftState>) => {
      const points = verticesRef.current;
      const provisionalCoordinates =
        previewCoordRef.current && drawingTool !== "point"
          ? [...points, previewCoordRef.current]
          : points;
      const draftShape = buildDraftShape(drawingTool, provisionalCoordinates);
      const canComplete =
        drawingTool === "polyline"
          ? points.length >= 2
          : drawingTool === "polygon"
            ? points.length >= 3
            : false;

      previewMeasurementRef.current = draftShape?.measurementLabel ?? "";
      previewLabelCoordRef.current = draftShape ? measurementLabelPosition(draftShape) : null;

      onDraftStateChange?.({
        tool: drawingTool,
        vertexCount: points.length,
        measurementLabel: draftShape?.measurementLabel ?? null,
        canUndo: points.length > 0,
        canComplete,
        ...overrides,
      });
    };

    const commitShape = (shape: DrawnShape | null) => {
      if (!shape) {
        return;
      }

      onShapeComplete(shape);
      fitViewerToShape(viewer, shape);
      verticesRef.current = [];
      previewCoordRef.current = null;
      previewMeasurementRef.current = "";
      previewLabelCoordRef.current = null;
      emitDraftState({
        vertexCount: 0,
        measurementLabel: null,
        canUndo: false,
        canComplete: false,
      });
    };

    const resetDraft = () => {
      verticesRef.current = [];
      previewCoordRef.current = null;
      previewMeasurementRef.current = "";
      previewLabelCoordRef.current = null;
      emitDraftState({
        vertexCount: 0,
        measurementLabel: null,
        canUndo: false,
        canComplete: false,
      });
    };

    const undoLastVertex = () => {
      if (verticesRef.current.length === 0) {
        return;
      }

      verticesRef.current = verticesRef.current.slice(0, -1);
      emitDraftState();
    };

    const finishMultipartShape = () => {
      if (drawingTool !== "polyline" && drawingTool !== "polygon") {
        return;
      }

      commitShape(buildCompletedShape(drawingTool, verticesRef.current));
    };

    const resolvePosition = (screenPos: Cartesian2): Coordinates | null => {
      const snapTarget = findSnapTarget(viewer, screenPos, drawnShapesRef.current);
      if (snapTarget) {
        return toLatLng(snapTarget);
      }

      const picked = pickPosition(viewer, screenPos);
      if (!picked) {
        return null;
      }

      const coord = toLatLng(picked);
      return snapToGrid ? applyGridSnap(coord) : coord;
    };

    previewDataSource.entities.add({
      position: new CallbackPositionProperty(
        () =>
          previewLabelCoordRef.current
            ? Cartesian3.fromDegrees(
                previewLabelCoordRef.current.lng,
                previewLabelCoordRef.current.lat,
                26,
              )
            : Cartesian3.fromDegrees(0, 0, 0),
        false,
      ),
      label: {
        text: new CallbackProperty(() => previewMeasurementRef.current, false),
        show: new CallbackProperty(
          () => Boolean(previewMeasurementRef.current && previewLabelCoordRef.current),
          false,
        ),
        font: "600 13px sans-serif",
        style: LabelStyle.FILL_AND_OUTLINE,
        fillColor: Color.WHITE,
        outlineColor: Color.fromCssColorString("#04131d"),
        outlineWidth: 3,
        pixelOffset: new Cartesian2(0, -4),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    if (drawingTool === "polyline") {
      previewDataSource.entities.add({
        polyline: {
          positions: new CallbackProperty(() => {
            const allCoords = previewCoordRef.current
              ? [...verticesRef.current, previewCoordRef.current]
              : verticesRef.current;
            return allCoords.map((coord) => Cartesian3.fromDegrees(coord.lng, coord.lat, 10));
          }, false),
          width: 4,
          material: previewColor,
        },
      });
    }

    if (drawingTool === "polygon") {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            const allCoords = previewCoordRef.current
              ? [...verticesRef.current, previewCoordRef.current]
              : verticesRef.current;
            return new PolygonHierarchy(
              allCoords.map((coord) => Cartesian3.fromDegrees(coord.lng, coord.lat, 5)),
            );
          }, false),
          material: previewColor.withAlpha(0.24),
          outline: true,
          outlineColor: previewColor,
          outlineWidth: 2,
          height: 5,
        },
      });
    }

    if (drawingTool === "rectangle") {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            if (verticesRef.current.length === 0 || !previewCoordRef.current) {
              return new PolygonHierarchy([]);
            }

            const rectangle = buildRectangleCoordinates(
              verticesRef.current[0],
              previewCoordRef.current,
            );
            return new PolygonHierarchy(
              rectangle.map((coord) => Cartesian3.fromDegrees(coord.lng, coord.lat, 5)),
            );
          }, false),
          material: previewColor.withAlpha(0.2),
          outline: true,
          outlineColor: previewColor,
          outlineWidth: 2,
          height: 5,
        },
      });
    }

    if (drawingTool === "circle") {
      previewDataSource.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            if (verticesRef.current.length === 0 || !previewCoordRef.current) {
              return new PolygonHierarchy([]);
            }

            const radiusMeters = computeCircleRadiusMeters(
              verticesRef.current[0],
              previewCoordRef.current,
            );
            return new PolygonHierarchy(
              buildCircleCoordinates(verticesRef.current[0], radiusMeters).map((coord) =>
                Cartesian3.fromDegrees(coord.lng, coord.lat, 5),
              ),
            );
          }, false),
          material: previewColor.withAlpha(0.2),
          outline: true,
          outlineColor: previewColor,
          outlineWidth: 2,
          height: 5,
        },
      });
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (event: { endPosition: Cartesian2 }) => {
        const nextCoord = resolvePosition(event.endPosition);
        if (!nextCoord) {
          return;
        }

        previewCoordRef.current = nextCoord;
        emitDraftState();
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    );

    handler.setInputAction(
      (event: { position: Cartesian2 }) => {
        const nextCoord = resolvePosition(event.position);
        if (!nextCoord) {
          return;
        }

        if (drawingTool === "point") {
          commitShape(buildCompletedShape("point", [nextCoord]));
          return;
        }

        if (drawingTool === "rectangle" || drawingTool === "circle") {
          if (verticesRef.current.length === 0) {
            verticesRef.current = [nextCoord];
            emitDraftState();
            return;
          }

          commitShape(buildCompletedShape(drawingTool, [verticesRef.current[0], nextCoord]));
          return;
        }

        verticesRef.current = [...verticesRef.current, nextCoord];
        previewCoordRef.current = nextCoord;
        emitDraftState();
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    handler.setInputAction(
      () => {
        finishMultipartShape();
      },
      ScreenSpaceEventType.RIGHT_CLICK,
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingContext()) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastVertex();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        finishMultipartShape();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        resetDraft();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    emitDraftState();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (!handler.isDestroyed()) {
        handler.destroy();
      }
      void viewer.dataSources.remove(previewDataSource, true);
      verticesRef.current = [];
      previewCoordRef.current = null;
      previewMeasurementRef.current = "";
      previewLabelCoordRef.current = null;
      onDraftStateChange?.({
        tool: "none",
        vertexCount: 0,
        measurementLabel: null,
        canUndo: false,
        canComplete: false,
      });
    };
  }, [
    drawingTool,
    drawnShapes,
    onDraftStateChange,
    onShapeComplete,
    snapToGrid,
    viewerReady,
    viewerRef,
  ]);

  useEffect(() => {
    if (
      undoDraftNonce === undefined ||
      undoDraftNonce === 0 ||
      undoDraftNonce === undoDraftRef.current
    ) {
      return;
    }

    undoDraftRef.current = undoDraftNonce;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
  }, [undoDraftNonce]);

  useEffect(() => {
    if (
      completeDrawingNonce === undefined ||
      completeDrawingNonce === 0 ||
      completeDrawingNonce === completeDraftRef.current
    ) {
      return;
    }

    completeDraftRef.current = completeDrawingNonce;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  }, [completeDrawingNonce]);
}
