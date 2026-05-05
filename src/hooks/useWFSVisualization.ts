import { useMemo } from "react";
import {
  Cartesian3,
  Color,
  Entity,
  PolygonHierarchy,
  GeoJsonDataSource,
} from "cesium";

export interface WFSLayer {
  id: string;
  name: string;
  features: GeoJSON.Feature[];
  color: string;
  opacity: number;
  visible: boolean;
}

/**
 * Convert WFS features to Cesium entities for visualization.
 * Handles Point, LineString, Polygon, and Multi* geometries.
 */
export function useWFSVisualization(features: GeoJSON.Feature[], color = "#a78bfa") {
  return useMemo(() => {
    const entities: Entity[] = [];
    const cesiumColor = Color.fromCssColorString(color);

    for (const feature of features) {
      const geometry = feature.geometry;
      if (!geometry) continue;

      try {
        switch (geometry.type) {
          case "Point": {
            const [lng, lat] = geometry.coordinates as [number, number];
            entities.push({
              position: Cartesian3.fromDegrees(lng, lat, 0),
              point: {
                pixelSize: 8,
                color: cesiumColor,
                outlineColor: Color.WHITE,
                outlineWidth: 1,
              },
              properties: feature.properties || {},
            } as unknown as Entity);
            break;
          }

          case "LineString": {
            const coords = geometry.coordinates as Array<[number, number]>;
            entities.push({
              polyline: {
                positions: coords.map(([lng, lat]) =>
                  Cartesian3.fromDegrees(lng, lat, 0),
                ),
                width: 2,
                material: cesiumColor,
                clampToGround: true,
              },
              properties: feature.properties || {},
            } as unknown as Entity);
            break;
          }

          case "Polygon": {
            const coords = geometry.coordinates as Array<Array<[number, number]>>;
            const positions = coords[0].map(([lng, lat]) =>
              Cartesian3.fromDegrees(lng, lat, 0),
            );

            if (positions.length >= 3) {
              entities.push({
                polygon: {
                  hierarchy: new PolygonHierarchy(positions),
                  material: cesiumColor.withAlpha(0.3),
                  outline: true,
                  outlineColor: cesiumColor,
                  outlineWidth: 2,
                },
                properties: feature.properties || {},
              } as unknown as Entity);
            }
            break;
          }

          case "MultiPoint": {
            const coords = geometry.coordinates as Array<[number, number]>;
            for (const [lng, lat] of coords) {
              entities.push({
                position: Cartesian3.fromDegrees(lng, lat, 0),
                point: {
                  pixelSize: 8,
                  color: cesiumColor,
                  outlineColor: Color.WHITE,
                  outlineWidth: 1,
                },
                properties: feature.properties || {},
              } as unknown as Entity);
            }
            break;
          }

          case "MultiLineString": {
            const lineStrings = geometry.coordinates as Array<Array<[number, number]>>;
            for (const coords of lineStrings) {
              entities.push({
                polyline: {
                  positions: coords.map(([lng, lat]) =>
                    Cartesian3.fromDegrees(lng, lat, 0),
                  ),
                  width: 2,
                  material: cesiumColor,
                  clampToGround: true,
                },
                properties: feature.properties || {},
              } as unknown as Entity);
            }
            break;
          }

          case "MultiPolygon": {
            const polygons = geometry.coordinates as Array<Array<Array<[number, number]>>>;
            for (const polygon of polygons) {
              const positions = polygon[0].map(([lng, lat]) =>
                Cartesian3.fromDegrees(lng, lat, 0),
              );

              if (positions.length >= 3) {
                entities.push({
                  polygon: {
                    hierarchy: new PolygonHierarchy(positions),
                    material: cesiumColor.withAlpha(0.3),
                    outline: true,
                    outlineColor: cesiumColor,
                    outlineWidth: 2,
                  },
                  properties: feature.properties || {},
                } as unknown as Entity);
              }
            }
            break;
          }
        }
      } catch (err) {
        console.warn("Failed to render WFS feature:", feature, err);
        continue;
      }
    }

    return entities;
  }, [features, color]);
}

/**
 * Create a Cesium GeoJsonDataSource from WFS features.
 * Useful for clustering and advanced styling.
 */
export async function createWFSDataSource(
  features: GeoJSON.Feature[],
  name: string,
): Promise<GeoJsonDataSource> {
  const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const dataSource = new GeoJsonDataSource(name);
  await dataSource.load(featureCollection);
  return dataSource;
}

/**
 * Simplify geometries for performance when dealing with large feature sets.
 * Reduces precision to ~0.001 degrees (~100m at equator).
 */
export function simplifyCoordinates(
  coordinates: unknown,
  precision = 0.001,
): unknown {
  if (!Array.isArray(coordinates)) return coordinates;

  if (typeof coordinates[0] === "number") {
    // Single coordinate pair [lng, lat]
    return [
      Math.round(coordinates[0] / precision) * precision,
      Math.round(coordinates[1] / precision) * precision,
    ];
  }

  // Nested array of coordinates
  return (coordinates as unknown[]).map((coord) => simplifyCoordinates(coord, precision));
}

/**
 * Simplify a GeoJSON feature for faster rendering.
 */
export function simplifyFeature(feature: GeoJSON.Feature, precision = 0.001): GeoJSON.Feature {
  if (
    !feature.geometry ||
    feature.geometry.type === "GeometryCollection"
  ) {
    return feature;
  }

  const geom = feature.geometry as unknown as {
    type: string;
    coordinates: unknown;
  };

  return {
    ...feature,
    geometry: {
      ...geom,
      coordinates: simplifyCoordinates(geom.coordinates, precision),
    } as GeoJSON.Geometry,
  };
}
