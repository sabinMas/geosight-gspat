"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Tooltip, XAxis } from "recharts";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { StatePanel } from "@/components/Status/StatePanel";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { AppMode, FireHistorySummary, GeodataResult } from "@/types";
import { isExplorerMode } from "@/lib/app-mode";

interface FireHistoryCardProps {
  geodata: GeodataResult | null;
  lat: number;
  lng: number;
  appMode?: AppMode;
}

function intensityColor(count: number, max: number): string {
  if (max === 0) return "#6b7d93";
  const ratio = count / max;
  if (ratio > 0.7) return "#ef4444";
  if (ratio > 0.4) return "#f97316";
  if (ratio > 0.1) return "#eab308";
  return "#38bdf8";
}

export function FireHistoryCard({ geodata, lat, lng, appMode = "pro" }: FireHistoryCardProps) {
  const [history, setHistory] = useState<FireHistorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!geodata || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLoading(true);
    setError(null);
    setHistory(null);

    const controller = new AbortController();

    fetch(`/api/fire-history?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load fire history.");
        return res.json() as Promise<FireHistorySummary>;
      })
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Wildfire history unavailable for this location.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [geodata, lat, lng]);

  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Fire history" title="Wildfire history" loading={true} />
    );
  }

  const maxDetections = history ? Math.max(...history.byYear.map((y) => y.detectionCount), 1) : 1;
  const isExplorer = isExplorerMode(appMode);

  return (
    <WorkspaceCardShell
      eyebrow="Fire history"
      title="Wildfire history"
      loading={loading}
      loadingTitle="Fetching wildfire history..."
      loadingDescription="GeoSight is querying the NASA FIRMS archive for annual fire detection data near this location."
      error={!loading && (error || !history) ? (error ?? "NASA FIRMS did not return a valid response for this location.") : null}
    >
      {history ? (
        <>
          {history.hotYears.length > 0 ? (
            <div className="inline-flex rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--warning-foreground)]">
              High fire years: {history.hotYears.join(", ")}
            </div>
          ) : (
            <div className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
              No elevated fire seasons detected
            </div>
          )}

          {isExplorer && (
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {history.totalDetections > 0 ? (
                <>
                  GeoSight detected{" "}
                  <span className="text-[var(--foreground)]">
                    {history.totalDetections} fire events
                  </span>{" "}
                  near this area over the past {history.yearsSearched} years.
                  {history.hotYears.length > 0 && (
                    <> Active seasons: {history.hotYears.join(", ")}.</>
                  )}
                </>
              ) : (
                `No significant fire activity was detected near this area in the past ${history.yearsSearched} years.`
              )}
            </p>
          )}

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow mb-3">Fire detections by year</div>
            <SafeResponsiveContainer className="h-40">
              <BarChart data={history.byYear}>
                <XAxis dataKey="year" stroke="#6b7d93" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#081221",
                    border: "1px solid rgba(0,229,255,0.18)",
                    borderRadius: 16,
                  }}
                  formatter={(value) => [`${value}`, "Detections"]}
                />
                <Bar dataKey="detectionCount" name="Detections" radius={[4, 4, 0, 0]}>
                  {history.byYear.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={intensityColor(entry.detectionCount, maxDetections)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          </div>

          {!isExplorer && history.byYear.length > 0 && (
            <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Year-by-year breakdown
              </summary>
              <div className="mt-3 space-y-2">
                {history.byYear.map((y) => (
                  <div key={y.year} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground)]">{y.year}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {y.detectionCount} detections
                      {y.maxBrightnessK !== null && ` · max ${y.maxBrightnessK.toFixed(0)} K`}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {history.totalDetections === 0 && (
            <StatePanel
              tone="partial"
              eyebrow="Fire activity"
              title="No fire detections in this area"
              description={`NASA FIRMS did not record significant fire activity within 1° of this location over the past ${history.yearsSearched} years.`}
              compact
            />
          )}
        </>
      ) : null}
    </WorkspaceCardShell>
  );
}
