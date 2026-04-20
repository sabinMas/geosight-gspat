// Client-side 16-bit grayscale PNG encoder for heightmap export.
// Uses the browser CompressionStream API (deflate) — no external dependencies.

export interface HeightmapEncodeParams {
  data: Float32Array | number[];
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
}

function crc32(buf: Uint8Array): number {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: Uint32Array | null = null;
function makeCrcTable(): Uint32Array {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}

function writeUint32BE(buf: DataView, offset: number, value: number) {
  buf.setUint32(offset, value, false);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(out.buffer);
  writeUint32BE(view, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  writeUint32BE(view, 8 + data.length, crc32(crcInput));
  return out;
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writer.write(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as any);
  writer.close();
  const reader = cs.readable.getReader();
  const parts: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/**
 * Encode a heightmap as a 16-bit grayscale PNG.
 * Elevation values are linearly normalised: minElevation → 0, maxElevation → 65535.
 */
export async function encodeHeightmapPng(params: HeightmapEncodeParams): Promise<Blob> {
  const { data, width, height, minElevation, maxElevation } = params;
  const range = maxElevation - minElevation || 1;

  // Build raw scanlines: filter byte (0 = None) + 2 bytes per pixel (big-endian uint16)
  const bpp = 2;
  const stride = width * bpp;
  const rawSize = height * (1 + stride);
  const raw = new Uint8Array(rawSize);

  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + stride);
    raw[rowOff] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const elev = data[y * width + x] ?? minElevation;
      const norm = Math.round(((elev - minElevation) / range) * 65535);
      const clamped = Math.max(0, Math.min(65535, norm));
      const pixOff = rowOff + 1 + x * bpp;
      raw[pixOff] = (clamped >> 8) & 0xff;
      raw[pixOff + 1] = clamped & 0xff;
    }
  }

  const compressed = await deflate(raw);

  // IHDR
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  writeUint32BE(ihdrView, 0, width);
  writeUint32BE(ihdrView, 4, height);
  ihdr[8] = 16; // bit depth
  ihdr[9] = 0;  // grayscale
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", compressed);
  const iendChunk = chunk("IEND", new Uint8Array(0));

  const total = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const part of [sig, ihdrChunk, idatChunk, iendChunk]) {
    out.set(part, off);
    off += part.length;
  }

  return new Blob([out], { type: "image/png" });
}

/** Trigger a browser file download. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
