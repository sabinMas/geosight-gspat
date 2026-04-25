"use client";

import { Activity, AlertTriangle, CloudRain, Flame, ShieldAlert, Wind, Zap } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

function ParamRow({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--border-soft)] last:border-0">
      <span className="shrink-0 max-w-[55%] break-words text-xs text-[var(--muted-foreground)]">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-right">
        <span className="break-words text-xs font-semibold text-[var(--foreground)]">
          {value ?? "—"}
        </span>
        {note ? (
          <div className="break-words text-xs text-[var(--muted-foreground)]">{note}</div>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

export function HazardDetailsCard({ geodata }: { geodata: GeodataResult | null }) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Hazard parameters" title="Technical hazard data" loading={true} />
    );
  }

  const { seismicDesign, floodZone, hazards, hazardAlerts, airQuality, climate, epaHazards } = geodata;

  function alertLevelClass(level: string) {
    const l = level.toLowerCase();
    if (l === "red") return "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]";
    if (l === "orange") return "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]";
    return "bg-[var(--surface-soft)] border-[color:var(--border-soft)] text-[var(--foreground)]";
  }

  const allSources = [
    geodata.sources.hazards,
    geodata.sources.hazardFire,
    geodata.sources.hazardAlerts,
    geodata.sources.floodZone,
    geodata.sources.seismicDesign,
    geodata.sources.airQuality,
    geodata.sources.epaHazards,
  ];
  const trustSummary = summarizeSourceTrust(allSources, "Hazard parameters");

  return (
    <WorkspaceCardShell
      eyebrow="Hazard parameters"
      title="Technical hazard data"
      subtitle="Raw measurements from live sources. US-only domains are labeled. Use alongside the compound resilience score."
    >
        {/* Seismic */}
        <div>
          <SectionHeader icon={Activity} label="Seismic design (ASCE 7-22)" />
          {seismicDesign && seismicDesign.pga !== null ? (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
              <ParamRow label="Peak Ground Acceleration (PGA)" value={`${seismicDesign.pga.toFixed(3)}g`} />
              <ParamRow label="Spectral Acceleration SS (0.2s)" value={seismicDesign.ss !== null ? `${seismicDesign.ss.toFixed(3)}g` : null} />
              <ParamRow label="Spectral Acceleration S1 (1.0s)" value={seismicDesign.s1 !== null ? `${seismicDesign.s1.toFixed(3)}g` : null} />
              <ParamRow label="Site class" value={seismicDesign.siteClass} />
              <ParamRow label="Risk category" value={seismicDesign.riskCategory} />
              <ParamRow label="Source" value={seismicDesign.dataSource} />
            </div>
          ) : (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
              USGS seismic design values are US-only coverage. Not available for this location.
            </div>
          )}
        </div>

        {/* Earthquakes */}
        <div>
          <SectionHeader icon={Zap} label="Earthquake activity (30 days)" />
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
            <ParamRow
              label="Events recorded (30d)"
              value={hazards.earthquakeCount30d !== null ? `${hazards.earthquakeCount30d}` : null}
            />
            <ParamRow
              label="Strongest magnitude"
              value={hazards.strongestEarthquakeMagnitude30d !== null ? `M${hazards.strongestEarthquakeMagnitude30d.toFixed(1)}` : null}
            />
            <ParamRow
              label="Nearest epicenter"
              value={hazards.nearestEarthquakeKm !== null ? `${hazards.nearestEarthquakeKm.toFixed(0)} km` : null}
            />
          </div>
        </div>

        {/* Flood */}
        <div>
          <SectionHeader icon={CloudRain} label="Flood zone (FEMA)" />
          {floodZone ? (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
              <ParamRow label="FEMA zone" value={floodZone.floodZone} />
              {floodZone.label ? <ParamRow label="Zone description" value={floodZone.label} /> : null}
            </div>
          ) : (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
              FEMA flood zone data is US-only coverage. Not available for this location.
            </div>
          )}
        </div>

        {/* Fire */}
        <div>
          <SectionHeader icon={Flame} label="Fire detection (NASA FIRMS)" />
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
            <ParamRow
              label="VIIRS detections (7d)"
              value={hazards.activeFireCount7d !== null ? `${hazards.activeFireCount7d}` : null}
              note={hazards.activeFireCount7d === null ? "NASA FIRMS key not configured" : undefined}
            />
            <ParamRow
              label="Nearest fire detection"
              value={hazards.nearestFireKm !== null ? `${hazards.nearestFireKm.toFixed(1)} km` : null}
            />
          </div>
        </div>

        {/* GDACS Alerts */}
        <div>
          <SectionHeader icon={ShieldAlert} label="Active disaster alerts (GDACS)" />
          {hazardAlerts && hazardAlerts.featuredAlerts.length > 0 ? (
            <div className="space-y-2">
              {hazardAlerts.featuredAlerts.slice(0, 5).map((alert) => (
                <div
                  key={`${alert.eventId}-${alert.episodeId}`}
                  className={`rounded-xl border px-3 py-2.5 text-xs ${alertLevelClass(alert.alertLevel)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{alert.eventLabel || alert.eventType}</span>
                    <span className="rounded-full border border-current px-2 py-0.5 text-xs uppercase tracking-[0.12em] font-semibold opacity-80 cursor-default pointer-events-none select-none">
                      {alert.alertLevel}
                    </span>
                  </div>
                  <div className="mt-1 text-[var(--muted-foreground)]">
                    {alert.country}{alert.distanceKm !== null ? ` · ${alert.distanceKm.toFixed(0)} km away` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[color:var(--success-border)] bg-[var(--success-soft)] px-4 py-3 text-xs text-[var(--foreground)]">
              {hazardAlerts === null ? "GDACS alert feed unavailable." : "No active GDACS alerts in the current feed."}
            </div>
          )}
        </div>

        {/* Air quality */}
        <div>
          <SectionHeader icon={Wind} label="Air quality" />
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
            {airQuality ? (
              <>
                <ParamRow label="AQI category" value={airQuality.aqiCategory} />
                <ParamRow label="PM2.5" value={airQuality.pm25 !== null ? `${airQuality.pm25} μg/m³` : null} />
                <ParamRow label="PM10" value={airQuality.pm10 !== null ? `${airQuality.pm10} μg/m³` : null} />
              </>
            ) : climate.airQualityIndex !== null ? (
              <ParamRow label="Open-Meteo AQI" value={`${climate.airQualityIndex}`} note="European AQI scale" />
            ) : (
              <ParamRow label="Air quality" value={null} note="No air quality data for this location" />
            )}
          </div>
        </div>

        {/* EPA contamination */}
        {epaHazards !== null ? (
          <div>
            <SectionHeader icon={AlertTriangle} label="Contamination screening (EPA)" />
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-1">
              <ParamRow label="Superfund sites" value={`${epaHazards.superfundCount}`} />
              <ParamRow label="TRI facilities" value={`${epaHazards.triCount}`} />
              {epaHazards.nearestSuperfundDistanceKm !== null ? (
                <ParamRow label="Nearest Superfund" value={`${epaHazards.nearestSuperfundDistanceKm.toFixed(1)} km`} />
              ) : null}
            </div>
          </div>
        ) : null}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={allSources}
          note="Seismic, flood, and contamination data are US-only. Fire and disaster alerts are globally sourced."
        />
    </WorkspaceCardShell>
  );
}
