"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Tooltip, XAxis } from "recharts";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { AppMode, EarthquakeHistorySummary, GeodataResult } from "@/types";

interface EarthquakeHistoryCardProps {
  geodata: GeodataResult | null;
  lat: number;
  lng: number;
  appMode?: AppMode;
  onMarkersChange?: (markers: EarthquakeHistorySummary["events"]) => void;
}

function magColor(mag: number): string {
  if (mag >= 6) return "#ef4444";
  if (mag >= 5) return "#f97316";
  if (mag >= 4) return "#eab308";
  return "#38bdf8";
}

function barColor(count: number): string {
  if (count > 100) return "#ef4444";
  if (count > 40) return "#f97316";
  if (count > 10) return "#eab308";
  return "#38bdf8";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function EarthquakeHistoryCard({
  geodata,
  lat,
  lng,
  appMode = "pro",
  onMarkersChange,
}: EarthquakeHistoryCardProps) {
  const [history, setHistory] = useState<EarthquakeHistorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globeMarkersOn, setGlobeMarkersOn] = useState(false);

  useEffect(() => {
    if (!geodata || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLoading(true);
    setError(null);
    setHistory(null);

    const controller = new AbortController();

    fetch(`/api/earthquake-history?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load earthquake history.");
        return res.json() as Promise<EarthquakeHistorySummary>;
      })
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Earthquake history unavailable for this location.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [geodata, lat, lng]);

  // Clear globe markers when card unmounts
  useEffect(() => {
    return () => {
      onMarkersChange?.([]);
    };
  }, [onMarkersChange]);

  const handleGlobeToggle = () => {
    if (!history || !onMarkersChange) return;
    if (globeMarkersOn) {
      onMarkersChange([]);
      setGlobeMarkersOn(false);
    } else {
      onMarkersChange(history.events);
      setGlobeMarkersOn(true);
    }
  };

  if (!geodata) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Seismic history</div>
          <CardTitle>Earthquake history</CardTitle>
        </CardHeader>
        <CardContent>
          <StatePanel
            tone="partial"
            eyebrow="Loading"
            title="Fetching earthquake history..."
            description="GeoSight is querying the USGS ComCat archive for the last 5 years of seismic activity within 500 km."
            compact
          />
        </CardContent>
      </Card>
    );
  }

  if (error || !history) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Seismic history</div>
          <CardTitle>Earthquake history</CardTitle>
        </CardHeader>
        <CardContent>
          <StatePanel
            tone="unavailable"
            eyebrow="Unavailable"
            title="Earthquake history could not be loaded"
            description={
              error ?? "USGS ComCat did not return a valid response for this location."
            }
            compact
          />
        </CardContent>
      </Card>
    );
  }

  const yearData = Object.entries(history.countByYear)
    .filter(([y]) => y !== "unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, count]) => ({ year, count }));

  const significantEvents = history.events.filter((e) => e.mag >= 4).slice(0, 10);
  const isExplorer = appMode === "explorer";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Seismic history</div>
        <CardTitle>Earthquake history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.maxMag !== null && (
          <div
            className="inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]"
            style={{
              borderColor: `${magColor(history.maxMag)}40`,
              backgroundColor: `${magColor(history.maxMag)}18`,
            }}
          >
            Max M{history.maxMag.toFixed(1)} · {history.totalCount} events in{" "}
            {history.yearsSearched} years
          </div>
        )}

        {history.maxMag === null && (
          <div className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
            No significant events · {history.yearsSearched}-year window
          </div>
        )}

        {isExplorer && history.totalCount > 0 && history.maxMag !== null && (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            This area has seen{" "}
            <span className="text-[var(--foreground)]">{history.totalCount} earthquakes</span> in
            the last {history.yearsSearched} years. The biggest was{" "}
            <span className="text-[var(--foreground)]">M{history.maxMag.toFixed(1)}</span>.
          </p>
        )}

        {onMarkersChange && history.totalCount > 0 && (
          <button
            type="button"
            onClick={handleGlobeToggle}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              globeMarkersOn
                ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${globeMarkersOn ? "bg-[var(--accent)]" : "bg-[var(--muted-foreground)]"}`} />
            {globeMarkersOn ? "Epicenters on globe" : "Show epicenters on globe"}
          </button>
        )}

        {yearData.length > 0 && (
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow mb-3">Events per year (M2.5+)</div>
            <SafeResponsiveContainer className="h-40">
              <BarChart data={yearData}>
                <XAxis dataKey="year" stroke="#6b7d93" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#081221",
                    border: "1px solid rgba(0,229,255,0.18)",
                    borderRadius: 16,
                  }}
                  formatter={(value) => [`${value}`, "Earthquakes"]}
                />
                <Bar dataKey="count" name="Earthquakes" radius={[4, 4, 0, 0]}>
                  {yearData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={barColor(entry.count)} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          </div>
        )}

        {significantEvents.length > 0 && (
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow mb-3">M4+ significant events</div>
            <div className="space-y-2">
              {significantEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${magColor(event.mag)}22`,
                      color: magColor(event.mag),
                    }}
                  >
                    M{event.mag.toFixed(1)}
                  </span>
                  <div className="min-w-0 text-sm leading-5">
                    <div className="truncate text-[var(--foreground)]">{event.place}</div>
                    <div className="text-[var(--muted-foreground)]">
                      {formatDate(event.time)} · {event.distanceKm} km away
                      {!isExplorer && event.depth !== null && ` · ${event.depth} km deep`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.totalCount === 0 && (
          <StatePanel
            tone="partial"
            eyebrow="Activity level"
            title="No significant earthquakes recorded nearby"
            description={`No M2.5+ earthquakes were found within 500 km of this location in the past ${history.yearsSearched} years.`}
            compact
          />
        )}
      </CardContent>
    </Card>
  );
}
