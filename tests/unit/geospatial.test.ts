import {
  buildElevationTransect,
  buildRectangle,
  calculateDistanceKm,
  estimateRegionSpanKm,
  isValidCoordinates,
  toBoundingBox,
  toMgrsString,
  toUtmCoordinate,
} from "@/lib/geospatial";

describe("geospatial utilities", () => {
  test("returns zero distance for the same point", () => {
    expect(calculateDistanceKm({ lat: 47.6062, lng: -122.3321 }, { lat: 47.6062, lng: -122.3321 })).toBe(0);
  });

  test("calculates great-circle distance between Seattle and Portland", () => {
    const distanceKm = calculateDistanceKm(
      { lat: 47.6062, lng: -122.3321 },
      { lat: 45.5152, lng: -122.6784 },
    );

    expect(distanceKm).not.toBeNull();
    expect(distanceKm as number).toBeGreaterThan(230);
    expect(distanceKm as number).toBeLessThan(250);
  });

  test("returns null for invalid distance inputs", () => {
    expect(calculateDistanceKm({ lat: 95, lng: 0 }, { lat: 0, lng: 0 })).toBeNull();
  });

  test("validates legal coordinates", () => {
    expect(isValidCoordinates({ lat: 47.6, lng: -122.3 })).toBe(true);
  });

  test("rejects invalid latitude", () => {
    expect(isValidCoordinates({ lat: 100, lng: -122.3 })).toBe(false);
  });

  test("rejects invalid longitude", () => {
    expect(isValidCoordinates({ lat: 47.6, lng: -190 })).toBe(false);
  });

  test("builds a bounding box around a center point", () => {
    const bbox = toBoundingBox({ lat: 47.6062, lng: -122.3321 }, 5);

    expect(bbox.west).toBeLessThan(-122.3321);
    expect(bbox.east).toBeGreaterThan(-122.3321);
    expect(bbox.south).toBeLessThan(47.6062);
    expect(bbox.north).toBeGreaterThan(47.6062);
  });

  test("builds a rectangle with four corners around a center", () => {
    const rectangle = buildRectangle({ lat: 47.6, lng: -122.3 }, 0.1);

    expect(rectangle).toHaveLength(4);
    expect(rectangle[0]).toEqual({ lat: 47.7, lng: -122.39999999999999 });
    expect(rectangle[2]).toEqual({ lat: 47.5, lng: -122.2 });
  });

  test("clamps very small region spans to the minimum viewport range", () => {
    expect(
      estimateRegionSpanKm({
        west: -122.34,
        south: 47.6,
        east: -122.33,
        north: 47.61,
      }),
    ).toBe(6);
  });

  test("clamps very large region spans to the maximum viewport range", () => {
    expect(
      estimateRegionSpanKm({
        west: -124,
        south: 46,
        east: -116,
        north: 49,
      }),
    ).toBe(18);
  });

  test("builds an elevation transect with the requested sample count", () => {
    const transect = buildElevationTransect({ lat: 47.6, lng: -122.3 }, 12, 5, 90);

    expect(transect).toHaveLength(5);
    expect(transect[0].distanceKm).toBe(0);
    expect(transect[4].distanceKm).toBe(12);
  });

  test("converts Seattle coordinates into UTM", () => {
    const utm = toUtmCoordinate({ lat: 47.6062, lng: -122.3321 });

    expect(utm).not.toBeNull();
    expect(utm?.zoneNumber).toBe(10);
    expect(utm?.zoneLetter).toBe("T");
    expect(utm?.hemisphere).toBe("N");
    expect(utm?.easting as number).toBeGreaterThan(500000);
    expect(utm?.northing as number).toBeGreaterThan(5200000);
  });

  test("returns null for unsupported polar UTM conversions", () => {
    expect(toUtmCoordinate({ lat: 85, lng: 0 })).toBeNull();
  });

  test("formats MGRS strings", () => {
    const mgrs = toMgrsString({ lat: 47.6062, lng: -122.3321 });

    expect(mgrs).toMatch(/^10T [A-Z]{2} \d{5} \d{5}$/);
  });
});
