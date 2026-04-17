"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Coordinate parsing                                                 */
/* ------------------------------------------------------------------ */

interface ParsedCoordinate {
  lat: number;
  lng: number;
  format: string;
}

/**
 * Parses various coordinate formats:
 * - Decimal degrees: 47.6062, -122.3321
 * - DMS: 47°36'22.3"N 122°19'55.6"W
 * - DMS compact: 47 36 22.3 N 122 19 55.6 W
 * - Degrees decimal minutes: 47°36.372'N 122°19.926'W
 * - Signed decimal: -33.8688, 151.2093
 * - Swapped lng,lat with negative longitude: -122.3321, 47.6062
 */
function parseCoordinateInput(input: string): ParsedCoordinate | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try DMS with symbols: 47°36'22.3"N 122°19'55.6"W
  const dmsRegex =
    /(\d+)[°]\s*(\d+)[′']\s*([\d.]+)[″"]\s*([NSns])\s*[,/\s]+\s*(\d+)[°]\s*(\d+)[′']\s*([\d.]+)[″"]\s*([EWew])/;
  const dmsMatch = trimmed.match(dmsRegex);
  if (dmsMatch) {
    const lat =
      (parseFloat(dmsMatch[1]) +
        parseFloat(dmsMatch[2]) / 60 +
        parseFloat(dmsMatch[3]) / 3600) *
      (dmsMatch[4].toUpperCase() === "S" ? -1 : 1);
    const lng =
      (parseFloat(dmsMatch[5]) +
        parseFloat(dmsMatch[6]) / 60 +
        parseFloat(dmsMatch[7]) / 3600) *
      (dmsMatch[8].toUpperCase() === "W" ? -1 : 1);
    if (isValidLatLng(lat, lng)) return { lat, lng, format: "DMS" };
  }

  // Try DMS without symbols: 47 36 22.3 N 122 19 55.6 W
  const dmsSpaceRegex =
    /(\d+)\s+(\d+)\s+([\d.]+)\s*([NSns])\s*[,/\s]+\s*(\d+)\s+(\d+)\s+([\d.]+)\s*([EWew])/;
  const dmsSpaceMatch = trimmed.match(dmsSpaceRegex);
  if (dmsSpaceMatch) {
    const lat =
      (parseFloat(dmsSpaceMatch[1]) +
        parseFloat(dmsSpaceMatch[2]) / 60 +
        parseFloat(dmsSpaceMatch[3]) / 3600) *
      (dmsSpaceMatch[4].toUpperCase() === "S" ? -1 : 1);
    const lng =
      (parseFloat(dmsSpaceMatch[5]) +
        parseFloat(dmsSpaceMatch[6]) / 60 +
        parseFloat(dmsSpaceMatch[7]) / 3600) *
      (dmsSpaceMatch[8].toUpperCase() === "W" ? -1 : 1);
    if (isValidLatLng(lat, lng)) return { lat, lng, format: "DMS" };
  }

  // Try degrees decimal minutes: 47°36.372'N 122°19.926'W
  const ddmRegex =
    /(\d+)[°]\s*([\d.]+)[′']\s*([NSns])\s*[,/\s]+\s*(\d+)[°]\s*([\d.]+)[′']\s*([EWew])/;
  const ddmMatch = trimmed.match(ddmRegex);
  if (ddmMatch) {
    const lat =
      (parseFloat(ddmMatch[1]) + parseFloat(ddmMatch[2]) / 60) *
      (ddmMatch[3].toUpperCase() === "S" ? -1 : 1);
    const lng =
      (parseFloat(ddmMatch[4]) + parseFloat(ddmMatch[5]) / 60) *
      (ddmMatch[6].toUpperCase() === "W" ? -1 : 1);
    if (isValidLatLng(lat, lng)) return { lat, lng, format: "DDM" };
  }

  // Try decimal degrees: 47.6062, -122.3321 or 47.6062 -122.3321
  const decRegex = /([+-]?\d+\.?\d*)\s*[,/\s]\s*([+-]?\d+\.?\d*)/;
  const decMatch = trimmed.match(decRegex);
  if (decMatch) {
    const a = parseFloat(decMatch[1]);
    const b = parseFloat(decMatch[2]);

    // Standard: lat, lng
    if (isValidLatLng(a, b)) return { lat: a, lng: b, format: "Decimal" };

    // Swapped: lng, lat (common when pasting from GeoJSON)
    if (isValidLatLng(b, a)) return { lat: b, lng: a, format: "Decimal (lng,lat)" };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function formatDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(1);
  const dir = isLat ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W";
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(4, "0")}″${dir}`;
}

/* ------------------------------------------------------------------ */
/*  Preset quick-jump locations                                        */
/* ------------------------------------------------------------------ */

const QUICK_JUMPS = [
  { label: "Prime Meridian", lat: 51.4769, lng: -0.0005 },
  { label: "Null Island", lat: 0, lng: 0 },
  { label: "North Pole", lat: 89.9999, lng: 0 },
  { label: "South Pole", lat: -89.9999, lng: 0 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface GoToCoordinateDialogProps {
  open: boolean;
  onClose: () => void;
  onGoTo: (coords: { lat: number; lng: number }, label?: string) => void;
  currentCoords?: { lat: number; lng: number } | null;
}

export function GoToCoordinateDialog({
  open,
  onClose,
  onGoTo,
  currentCoords,
}: GoToCoordinateDialogProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedCoordinate | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput("");
      setError(null);
      setPreview(null);
      // Small delay so the dialog renders before focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setError(null);
    const parsed = parseCoordinateInput(value);
    setPreview(parsed);
  }, []);

  const handleSubmit = useCallback(() => {
    const parsed = parseCoordinateInput(input);
    if (!parsed) {
      setError("Could not parse coordinates. Try decimal (47.6, -122.3) or DMS.");
      return;
    }
    onGoTo(parsed, `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`);
    onClose();
  }, [input, onGoTo, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [handleSubmit, onClose],
  );

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border-soft)] bg-[var(--background)] shadow-[var(--shadow-panel)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Go to coordinates
            </span>
            <kbd className="rounded border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
              Ctrl+G
            </kbd>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Input */}
        <div className="px-4 pt-4 pb-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="47.6062, -122.3321 or 47°36′22″N 122°19′56″W"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[color:var(--accent)] focus:outline-none"
          />

          {/* Live preview */}
          {preview && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--foreground)]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <span className="tabular-nums">
                {preview.lat.toFixed(6)}, {preview.lng.toFixed(6)}
              </span>
              <span className="text-[var(--muted-foreground)]">
                ({preview.format})
              </span>
            </div>
          )}

          {/* DMS preview of parsed coordinates */}
          {preview && (
            <div className="mt-1 px-3 text-[10px] tabular-nums text-[var(--muted-foreground)]">
              {formatDMS(preview.lat, true)}{" "}
              {formatDMS(preview.lng, false)}
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-[var(--danger-foreground)]">{error}</p>
          )}
        </div>

        {/* Current position */}
        {currentCoords && (
          <div className="border-t border-[color:var(--border-soft)] px-4 py-2">
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Current: {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Quick jumps */}
        <div className="border-t border-[color:var(--border-soft)] px-4 py-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Quick jump
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_JUMPS.map((loc) => (
              <button
                key={loc.label}
                type="button"
                onClick={() => {
                  onGoTo(loc, loc.label);
                  onClose();
                }}
                className="rounded-full border border-[color:var(--border-soft)] px-2.5 py-1 text-[10px] text-[var(--foreground-soft)] transition hover:border-[color:var(--accent)] hover:text-[var(--accent)]"
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[color:var(--border-soft)] px-4 py-3">
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Accepts decimal, DMS, or DDM
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full"
            disabled={!preview}
            onClick={handleSubmit}
          >
            Go to
          </Button>
        </div>
      </div>
    </div>
  );
}
