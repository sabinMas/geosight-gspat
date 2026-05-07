import { Coordinates, TerrainDerivatives } from "@/types";
import { fetchElevation } from "@/lib/usgs";

/**
 * Compute terrain derivatives (slope, aspect, TRI, relative relief) from a 3x3 DEM grid.
 * Uses the Horn method for slope and aspect calculations.
 *
 * @param coords Center coordinates for the analysis
 * @returns TerrainDerivatives object with computed metrics, or null if insufficient data
 */
export async function getTerrainDerivatives(coords: Coordinates): Promise<TerrainDerivatives | null> {
  try {
    // Fetch 3x3 grid of elevation points (center + 8 neighbors)
    // SRTM resolution is ~90m, so offset by 1-2 pixels
    const gridSize = 90; // meters per pixel (approximate for SRTM 3-arc-second)
    const positions = generateGrid3x3(coords, gridSize);

    // Fetch all 9 elevation points in parallel
    const promises = positions.map((pos) =>
      fetchElevation(pos).catch(() => null),
    );
    const elevations = await Promise.all(promises);

    // Check if we have enough valid elevation data
    const validElevations = elevations.filter((el): el is number => el !== null);
    if (validElevations.length < 5) {
      // Not enough valid points to compute derivatives
      return null;
    }

    // Arrange elevations into 3x3 grid
    // [0][1][2]
    // [3][4][5]  where [4] is the center
    // [6][7][8]
    const dem = elevations as (number | null)[];
    if (!dem[4]) {
      // Center point must be valid
      return null;
    }

    // Compute slope and aspect using Horn's method
    const { slopeDegrees, aspectDegrees } = computeSlopeAspect(dem, gridSize);
    const terrainRuggednessIndex = computeTRI(dem);
    const relativeReliefM = computeRelativeRelief(dem);

    return {
      slopeDegrees: slopeDegrees ?? null,
      aspectDegrees: aspectDegrees ?? null,
      terrainRuggednessIndex: terrainRuggednessIndex ?? null,
      relativeReliefM: relativeReliefM ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Generate 3x3 grid of coordinates centered on the input point.
 * Spacing is approximate based on degrees (1 degree ≈ 111 km).
 */
function generateGrid3x3(center: Coordinates, spacingMeters: number): Coordinates[] {
  // Convert spacing from meters to degrees (rough: 1 degree ≈ 111,000 meters)
  const spacingDegrees = spacingMeters / 111_000;

  const grid: Coordinates[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      grid.push({
        lat: center.lat + dy * spacingDegrees,
        lng: center.lng + dx * spacingDegrees,
      });
    }
  }
  return grid;
}

/**
 * Compute slope (degrees) and aspect (degrees from north) using Horn's method.
 * Dem array layout: [0][1][2], [3][4][5], [6][7][8] where [4] is center
 */
function computeSlopeAspect(
  dem: (number | null)[],
  cellSizeMeters: number,
): { slopeDegrees: number | null; aspectDegrees: number | null } {
  // Check for missing data in the 3x3 window
  if (dem.some((el) => el === null)) {
    return { slopeDegrees: null, aspectDegrees: null };
  }

  const dem0 = dem[0] as number;
  const dem1 = dem[1] as number;
  const dem2 = dem[2] as number;
  const dem3 = dem[3] as number;
  const dem5 = dem[5] as number;
  const dem6 = dem[6] as number;
  const dem7 = dem[7] as number;
  const dem8 = dem[8] as number;

  // Horn's method for slope and aspect
  // Compute gradients
  const x =
    (dem2 + 2 * dem5 + dem8 - dem0 - 2 * dem3 - dem6) / (8 * cellSizeMeters);
  const y =
    (dem6 + 2 * dem7 + dem8 - dem0 - 2 * dem1 - dem2) / (8 * cellSizeMeters);

  // Slope in degrees
  const slopeDegrees = Math.atan(Math.sqrt(x * x + y * y)) * (180 / Math.PI);

  // Aspect in degrees from north (0-360), clockwise
  let aspectDegrees = Math.atan2(x, -y) * (180 / Math.PI);
  if (aspectDegrees < 0) {
    aspectDegrees += 360;
  }

  return { slopeDegrees, aspectDegrees };
}

/**
 * Compute Terrain Ruggedness Index (TRI).
 * TRI is the mean absolute difference between the center cell and its 8 neighbors.
 */
function computeTRI(dem: (number | null)[]): number | null {
  if (dem[4] === null) {
    return null;
  }

  const center = dem[4];
  let sumAbsDiff = 0;
  let validCount = 0;

  // Sum absolute differences for all neighbors (indices 0,1,2,3,5,6,7,8)
  const neighborIndices = [0, 1, 2, 3, 5, 6, 7, 8];
  for (const i of neighborIndices) {
    if (dem[i] !== null) {
      sumAbsDiff += Math.abs((dem[i] as number) - center);
      validCount++;
    }
  }

  if (validCount < 4) {
    // Not enough valid neighbors
    return null;
  }

  return sumAbsDiff / validCount;
}

/**
 * Compute relative relief (max - min elevation in 3x3 window).
 */
function computeRelativeRelief(dem: (number | null)[]): number | null {
  const validElevations = dem.filter((el): el is number => el !== null);
  if (validElevations.length < 3) {
    return null;
  }

  const max = Math.max(...validElevations);
  const min = Math.min(...validElevations);
  return max - min;
}
