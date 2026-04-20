"use client";

import { useState } from "react";
import { Download, Mountain } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { Button } from "@/components/ui/button";
import { encodeHeightmapPng, downloadBlob } from "@/lib/heightmap-encode";

interface TerrainExportCardProps {
  /** Center of the current location */
  lat: number | null;
  lng: number | null;
  locationName: string;
}

interface Preset {
  label: string;
  engine: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { label: "505 × 505", engine: "Unreal", width: 505, height: 505 },
  { label: "1009 × 1009", engine: "Unreal", width: 1009, height: 1009 },
  { label: "2017 × 2017", engine: "Unreal", width: 2017, height: 2017 },
  { label: "513 × 513", engine: "Unity", width: 513, height: 513 },
  { label: "1025 × 1025", engine: "Unity", width: 1025, height: 1025 },
];

const RADIUS_OPTIONS = [
  { label: "5 km", km: 5 },
  { label: "10 km", km: 10 },
  { label: "20 km", km: 20 },
  { label: "50 km", km: 50 },
];

function kmToDeg(km: number, lat: number): { dLat: number; dLon: number } {
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLon };
}

export function TerrainExportCard({ lat, lng, locationName }: TerrainExportCardProps) {
  const [presetIdx, setPresetIdx] = useState(0);
  const [radiusIdx, setRadiusIdx] = useState(1); // 10 km default
  const [status, setStatus] = useState<"idle" | "fetching" | "encoding" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEmpty = lat === null || lng === null;

  async function handleExport() {
    if (!lat || !lng) return;
    const preset = PRESETS[presetIdx];
    const radius = RADIUS_OPTIONS[radiusIdx];
    if (!preset || !radius) return;

    const { dLat, dLon } = kmToDeg(radius.km, lat);
    const bbox = {
      west: lng - dLon,
      south: lat - dLat,
      east: lng + dLon,
      north: lat + dLat,
    };

    setStatus("fetching");
    setErrorMsg(null);

    try {
      const url = new URL("/api/terrain-export", window.location.origin);
      url.searchParams.set("west", String(bbox.west));
      url.searchParams.set("south", String(bbox.south));
      url.searchParams.set("east", String(bbox.east));
      url.searchParams.set("north", String(bbox.north));
      url.searchParams.set("width", String(preset.width));
      url.searchParams.set("height", String(preset.height));

      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        data: number[];
        width: number;
        height: number;
        minElevation: number;
        maxElevation: number;
      };

      setStatus("encoding");
      const blob = await encodeHeightmapPng({
        data: json.data,
        width: json.width,
        height: json.height,
        minElevation: json.minElevation,
        maxElevation: json.maxElevation,
      });

      const safeName = locationName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      downloadBlob(blob, `${safeName}_heightmap_${preset.width}x${preset.height}.png`);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
      setStatus("error");
    }
  }

  const busy = status === "fetching" || status === "encoding";

  return (
    <WorkspaceCardShell
      eyebrow="Terrain tools"
      title="Heightmap export"
      subtitle="16-bit grayscale PNG for game engines and GIS"
      empty={isEmpty}
      emptyTitle="No location selected"
      emptyDescription="Search for a location to export its terrain heightmap."
    >
      <div className="space-y-4">
        {/* Resolution presets */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Resolution
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPresetIdx(i)}
                className={[
                  "rounded-full border px-3 py-1 text-xs transition",
                  i === presetIdx
                    ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--foreground-soft)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                <span className="font-medium">{p.label}</span>
                <span className="ml-1.5 text-[var(--muted-foreground)]">{p.engine}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Radius */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Area radius
          </p>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((r, i) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRadiusIdx(i)}
                className={[
                  "rounded-full border px-3 py-1 text-xs transition",
                  i === radiusIdx
                    ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--foreground-soft)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export button */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={handleExport}
          >
            {busy ? (
              <>
                <Mountain className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                {status === "fetching" ? "Fetching tiles…" : "Encoding…"}
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export heightmap
              </>
            )}
          </Button>
          {status === "done" && (
            <span className="text-xs text-[var(--muted-foreground)]">Downloaded</span>
          )}
          {status === "error" && errorMsg && (
            <span className="text-xs text-[var(--danger-foreground)]">{errorMsg}</span>
          )}
        </div>

        {/* Format note */}
        <p className="text-xs text-[var(--muted-foreground)]">
          16-bit grayscale PNG · EPSG:4326 · elevation linearly normalised 0–65535
        </p>
      </div>
    </WorkspaceCardShell>
  );
}
