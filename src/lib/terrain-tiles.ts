import { inflateSync } from "zlib";
import { fetchWithTimeout } from "@/lib/network";

// AWS Terrain Tiles — Mapzen/Nextzen terrarium format, public, no API key
// Elevation formula: R * 256 + G + B / 256 - 32768 (meters)
const TERRARIUM_BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const TILE_SIZE = 256;

export interface ElevationGrid {
  width: number;
  height: number;
  /** Row-major Float32 elevation values in meters */
  data: Float32Array;
  minElevation: number;
  maxElevation: number;
  /** Bounding box of the grid */
  bbox: { west: number; south: number; east: number; north: number };
  /** CRS string for GIS reference */
  crs: "EPSG:4326";
  /** Approximate ground resolution in meters per pixel */
  resolutionMeters: number;
}

// ---------------------------------------------------------------------------
// Tile math
// ---------------------------------------------------------------------------

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

function tileXToLon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

function choosZoom(latSpan: number, lonSpan: number): number {
  const maxSpan = Math.max(latSpan, lonSpan);
  if (maxSpan > 10) return 10;
  if (maxSpan > 4) return 11;
  if (maxSpan > 1.5) return 12;
  if (maxSpan > 0.5) return 13;
  return 14;
}

// ---------------------------------------------------------------------------
// Minimal PNG decoder (RGB 8-bit only — matches terrarium tile format)
// ---------------------------------------------------------------------------

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgb(buffer: Buffer): {
  width: number;
  height: number;
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
} {
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIG[i]) throw new Error("Not a valid PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatParts: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") {
      idatParts.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset += 4 + 4 + length + 4;
  }

  if (!width || !height) throw new Error("PNG IHDR not found");

  const raw = inflateSync(Buffer.concat(idatParts));
  const bpp = 3; // RGB
  const stride = width * bpp;
  const r = new Uint8Array(width * height);
  const g = new Uint8Array(width * height);
  const b = new Uint8Array(width * height);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  let rawOff = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[rawOff++];
    const rowStart = rawOff;
    rawOff += stride;

    for (let x = 0; x < stride; x++) {
      const byte = raw[rowStart + x] ?? 0;
      const left = x >= bpp ? cur[x - bpp] : 0;
      const up = prev[x];
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      let decoded: number;
      switch (filter) {
        case 0: decoded = byte; break;
        case 1: decoded = (byte + left) & 0xFF; break;
        case 2: decoded = (byte + up) & 0xFF; break;
        case 3: decoded = (byte + Math.floor((left + up) / 2)) & 0xFF; break;
        case 4: decoded = (byte + paethPredictor(left, up, upLeft)) & 0xFF; break;
        default: decoded = byte;
      }
      cur[x] = decoded;
    }

    prev.set(cur);
    const base = y * width;
    for (let x = 0; x < width; x++) {
      r[base + x] = cur[x * 3];
      g[base + x] = cur[x * 3 + 1];
      b[base + x] = cur[x * 3 + 2];
    }
  }

  return { width, height, r, g, b };
}

// ---------------------------------------------------------------------------
// Fetch and decode a single terrarium tile
// ---------------------------------------------------------------------------

async function fetchTerrainTile(
  z: number,
  x: number,
  y: number,
): Promise<{ r: Uint8Array; g: Uint8Array; b: Uint8Array }> {
  const url = `${TERRARIUM_BASE}/${z}/${x}/${y}.png`;
  const res = await fetchWithTimeout(
    url,
    { next: { revalidate: 60 * 60 * 24 * 7 } },
    10_000,
  );
  if (!res.ok) throw new Error(`Terrain tile ${z}/${x}/${y} failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { r, g, b } = decodePngRgb(buf);
  return { r, g, b };
}

function terrariumToMeters(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

// ---------------------------------------------------------------------------
// Public: build elevation grid for a bounding box
// ---------------------------------------------------------------------------

export async function buildElevationGrid(params: {
  west: number;
  south: number;
  east: number;
  north: number;
  targetWidth: number;
  targetHeight: number;
}): Promise<ElevationGrid> {
  const { west, south, east, north, targetWidth, targetHeight } = params;
  const latSpan = north - south;
  const lonSpan = east - west;
  const zoom = choosZoom(latSpan, lonSpan);

  const minTileX = lonToTileX(west, zoom);
  const maxTileX = lonToTileX(east, zoom);
  const minTileY = latToTileY(north, zoom); // Y increases southward
  const maxTileY = latToTileY(south, zoom);

  const tilesX = maxTileX - minTileX + 1;
  const tilesY = maxTileY - minTileY + 1;

  if (tilesX * tilesY > 400) {
    throw new Error(
      `AOI too large for heightmap at zoom ${zoom}: ${tilesX}×${tilesY} tiles needed (max 400). Use a smaller area or lower resolution.`,
    );
  }

  // Fetch all needed tiles in parallel (max 20 concurrent)
  const tileKeys: { z: number; x: number; y: number }[] = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      tileKeys.push({ z: zoom, x: tx, y: ty });
    }
  }

  const BATCH = 20;
  const tileData = new Map<string, { r: Uint8Array; g: Uint8Array; b: Uint8Array }>();

  for (let i = 0; i < tileKeys.length; i += BATCH) {
    const batch = tileKeys.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((k) => fetchTerrainTile(k.z, k.x, k.y).then((d) => ({ k, d }))),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        const { k, d } = r.value;
        tileData.set(`${k.x},${k.y}`, d);
      }
    }
  }

  // Stitched raster dimensions
  const stitchedW = tilesX * TILE_SIZE;
  const stitchedH = tilesY * TILE_SIZE;
  const stitchedR = new Uint8Array(stitchedW * stitchedH);
  const stitchedG = new Uint8Array(stitchedW * stitchedH);
  const stitchedB = new Uint8Array(stitchedW * stitchedH);

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tile = tileData.get(`${tx},${ty}`);
      if (!tile) continue;
      const offX = (tx - minTileX) * TILE_SIZE;
      const offY = (ty - minTileY) * TILE_SIZE;
      for (let py = 0; py < TILE_SIZE; py++) {
        for (let px = 0; px < TILE_SIZE; px++) {
          const src = py * TILE_SIZE + px;
          const dst = (offY + py) * stitchedW + (offX + px);
          stitchedR[dst] = tile.r[src];
          stitchedG[dst] = tile.g[src];
          stitchedB[dst] = tile.b[src];
        }
      }
    }
  }

  // Geographic extent of the stitched raster
  const stitchedWest = tileXToLon(minTileX, zoom);
  const stitchedEast = tileXToLon(maxTileX + 1, zoom);
  const stitchedNorth = tileYToLat(minTileY, zoom);
  const stitchedSouth = tileYToLat(maxTileY + 1, zoom);

  // Sample stitched raster at target resolution (bilinear interpolation)
  const grid = new Float32Array(targetWidth * targetHeight);
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let gy = 0; gy < targetHeight; gy++) {
    const lat = north - (gy / (targetHeight - 1)) * (north - south);
    for (let gx = 0; gx < targetWidth; gx++) {
      const lon = west + (gx / (targetWidth - 1)) * (east - west);

      // Map lon/lat to stitched pixel coords
      const px =
        ((lon - stitchedWest) / (stitchedEast - stitchedWest)) * (stitchedW - 1);
      const py =
        ((stitchedNorth - lat) / (stitchedNorth - stitchedSouth)) * (stitchedH - 1);

      // Bilinear interpolation
      const x0 = Math.max(0, Math.min(stitchedW - 2, Math.floor(px)));
      const y0 = Math.max(0, Math.min(stitchedH - 2, Math.floor(py)));
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const fx = px - x0;
      const fy = py - y0;

      const e00 = terrariumToMeters(
        stitchedR[y0 * stitchedW + x0],
        stitchedG[y0 * stitchedW + x0],
        stitchedB[y0 * stitchedW + x0],
      );
      const e10 = terrariumToMeters(
        stitchedR[y0 * stitchedW + x1],
        stitchedG[y0 * stitchedW + x1],
        stitchedB[y0 * stitchedW + x1],
      );
      const e01 = terrariumToMeters(
        stitchedR[y1 * stitchedW + x0],
        stitchedG[y1 * stitchedW + x0],
        stitchedB[y1 * stitchedW + x0],
      );
      const e11 = terrariumToMeters(
        stitchedR[y1 * stitchedW + x1],
        stitchedG[y1 * stitchedW + x1],
        stitchedB[y1 * stitchedW + x1],
      );

      const elev =
        e00 * (1 - fx) * (1 - fy) +
        e10 * fx * (1 - fy) +
        e01 * (1 - fx) * fy +
        e11 * fx * fy;

      grid[gy * targetWidth + gx] = elev;
      if (elev < minElev) minElev = elev;
      if (elev > maxElev) maxElev = elev;
    }
  }

  // Ground resolution: approximate at center latitude
  const centerLat = (north + south) / 2;
  const latResM =
    ((north - south) / (targetHeight - 1)) * 111_320;
  const lonResM =
    ((east - west) / (targetWidth - 1)) * 111_320 * Math.cos((centerLat * Math.PI) / 180);
  const resolutionMeters = (latResM + lonResM) / 2;

  return {
    width: targetWidth,
    height: targetHeight,
    data: grid,
    minElevation: minElev === Infinity ? 0 : minElev,
    maxElevation: maxElev === -Infinity ? 0 : maxElev,
    bbox: { west, south, east, north },
    crs: "EPSG:4326",
    resolutionMeters,
  };
}
