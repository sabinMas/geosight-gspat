"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUpDown, Navigation, MapPin, X, Loader2 } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { LocationSearchResult } from "@/types";

interface RouteWaypoint {
  label: string;
  lat: number;
  lng: number;
}

interface RouteResult {
  coordinates: { lat: number; lng: number }[];
  distanceKm: number;
  durationMin: number;
  profile: "foot" | "car";
}

interface RoutePlannerCardProps {
  /** "foot" for Trail Scout, "car" for Road Trip */
  routingProfile: "foot" | "car";
  onRouteChange: (coords: { lat: number; lng: number }[] | null) => void;
  onFlyToBounds?: (bounds: [number, number, number, number]) => void;
}

// ── Geocode helper ─────────────────────────────────────────────────────────────

async function geocodeQuery(query: string): Promise<LocationSearchResult | null> {
  const res = await fetch(
    `/api/geocode?q=${encodeURIComponent(query)}&limit=1`,
  );
  if (!res.ok) return null;
  return (await res.json()) as LocationSearchResult;
}

// ── Suggestion list ─────────────────────────────────────────────────────────────

async function fetchSuggestions(query: string): Promise<LocationSearchResult[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(
    `/api/geocode?q=${encodeURIComponent(query)}&limit=5`,
  );
  if (!res.ok) return [];
  const data = await res.json() as LocationSearchResult | LocationSearchResult[];
  return Array.isArray(data) ? data : [data];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Waypoint input ─────────────────────────────────────────────────────────────

interface WaypointInputProps {
  placeholder: string;
  value: string;
  pinColor: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationSearchResult) => void;
  onClear: () => void;
  locked: boolean; // true when a waypoint is confirmed
}

function WaypointInput({
  placeholder,
  value,
  pinColor,
  onChange,
  onSelect,
  onClear,
  locked,
}: WaypointInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleChange = (q: string) => {
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 300);
  };

  const handleSelect = (result: LocationSearchResult) => {
    onSelect(result);
    setSuggestions([]);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2">
        <MapPin
          className="h-4 w-4 shrink-0"
          style={{ color: pinColor }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          readOnly={locked}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] shadow-[var(--shadow-panel)]">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-soft)]"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                <span className="truncate">{s.shortName ?? s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────────

export function RoutePlannerCard({
  routingProfile,
  onRouteChange,
  onFlyToBounds,
}: RoutePlannerCardProps) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromWaypoint, setFromWaypoint] = useState<RouteWaypoint | null>(null);
  const [toWaypoint, setToWaypoint] = useState<RouteWaypoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);

  const isHiking = routingProfile === "foot";
  const eyebrow = isHiking ? "Trail Scout" : "Road Trip";
  const title = "Route planner";

  const handleSelectFrom = useCallback((r: LocationSearchResult) => {
    setFromWaypoint({ label: r.shortName ?? r.name, lat: r.coordinates.lat, lng: r.coordinates.lng });
    setFromText(r.shortName ?? r.name);
    setError(null);
    setResult(null);
    onRouteChange(null);
  }, [onRouteChange]);

  const handleSelectTo = useCallback((r: LocationSearchResult) => {
    setToWaypoint({ label: r.shortName ?? r.name, lat: r.coordinates.lat, lng: r.coordinates.lng });
    setToText(r.shortName ?? r.name);
    setError(null);
    setResult(null);
    onRouteChange(null);
  }, [onRouteChange]);

  const clearFrom = useCallback(() => {
    setFromText(""); setFromWaypoint(null);
    setResult(null); onRouteChange(null);
  }, [onRouteChange]);

  const clearTo = useCallback(() => {
    setToText(""); setToWaypoint(null);
    setResult(null); onRouteChange(null);
  }, [onRouteChange]);

  const handleSwap = useCallback(() => {
    setFromText(toText); setToText(fromText);
    setFromWaypoint(toWaypoint); setToWaypoint(fromWaypoint);
    setResult(null); onRouteChange(null);
  }, [fromText, toText, fromWaypoint, toWaypoint, onRouteChange]);

  const handleGetRoute = useCallback(async () => {
    if (!fromWaypoint && fromText.trim()) {
      const r = await geocodeQuery(fromText);
      if (r) { handleSelectFrom(r); return; }
    }
    if (!toWaypoint && toText.trim()) {
      const r = await geocodeQuery(toText);
      if (r) { handleSelectTo(r); return; }
    }
    if (!fromWaypoint || !toWaypoint) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        fromLat: String(fromWaypoint.lat),
        fromLng: String(fromWaypoint.lng),
        toLat: String(toWaypoint.lat),
        toLng: String(toWaypoint.lng),
        profile: routingProfile,
      });
      const res = await fetch(`/api/route?${params.toString()}`);
      const body = await res.json() as { coordinates?: { lat: number; lng: number }[]; distanceKm?: number; durationMin?: number; profile?: "foot" | "car"; error?: string };

      if (!res.ok || body.error) {
        setError(body.error ?? "Could not find a route between these locations.");
        return;
      }

      const route: RouteResult = {
        coordinates: body.coordinates!,
        distanceKm: body.distanceKm!,
        durationMin: body.durationMin!,
        profile: body.profile!,
      };
      setResult(route);
      onRouteChange(route.coordinates);

      // Fly to show both endpoints
      if (onFlyToBounds && route.coordinates.length > 1) {
        const lats = route.coordinates.map((c) => c.lat);
        const lngs = route.coordinates.map((c) => c.lng);
        const pad = 0.05;
        onFlyToBounds([
          Math.min(...lngs) - pad,
          Math.min(...lats) - pad,
          Math.max(...lngs) + pad,
          Math.max(...lats) + pad,
        ]);
      }
    } catch {
      setError("Routing is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [fromWaypoint, toWaypoint, fromText, toText, routingProfile, onRouteChange, onFlyToBounds, handleSelectFrom, handleSelectTo]);

  const canRoute = Boolean(fromWaypoint && toWaypoint);

  return (
    <WorkspaceCardShell eyebrow={eyebrow} title={title}>
      {/* Inputs */}
      <div className="space-y-2">
        <WaypointInput
          placeholder="From — start location"
          value={fromText}
          pinColor="#22c55e"
          onChange={setFromText}
          onSelect={handleSelectFrom}
          onClear={clearFrom}
          locked={false}
        />

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!fromText && !toText}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] disabled:cursor-default disabled:opacity-40"
            aria-label="Swap start and end"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <WaypointInput
          placeholder="To — destination"
          value={toText}
          pinColor="#fb923c"
          onChange={setToText}
          onSelect={handleSelectTo}
          onClear={clearTo}
          locked={false}
        />
      </div>

      {/* Get route button */}
      <button
        type="button"
        onClick={() => void handleGetRoute()}
        disabled={!canRoute || loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-default disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4" />
        )}
        {loading ? "Finding route…" : "Get route"}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-3 rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-foreground)]">
          {error}
        </p>
      )}

      {/* Results */}
      {result && !error && (
        <div className="mt-4 space-y-3">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
              <Navigation className="h-3 w-3" />
              {formatDistance(result.distanceKm)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)]">
              {formatDuration(result.durationMin)}
            </span>
            <span className="inline-flex items-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
              {isHiking ? "Hiking" : "Driving"}
            </span>
          </div>

          {/* Route summary row */}
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex flex-col items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                <span className="h-6 w-px bg-[color:var(--border-soft)]" />
                <span className="h-3 w-3 rounded-full bg-[#fb923c]" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">
                  {fromWaypoint?.label}
                </p>
                <p className="truncate text-xs font-medium text-[var(--foreground)]">
                  {toWaypoint?.label}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Route shown on globe · cyan line with green start and orange end
          </p>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !loading && (
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Enter two locations to see the {isHiking ? "hiking path" : "driving route"} on the globe.
        </p>
      )}
    </WorkspaceCardShell>
  );
}
