"use client";

import { CheckCircle2, HelpCircle, XCircle, AlertTriangle } from "lucide-react";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

type SignalTone = "go" | "caution" | "risk" | "unavailable";

interface ReadinessSignal {
  label: string;
  verdict: string;
  detail: string;
  tone: SignalTone;
}

function toneClasses(tone: SignalTone) {
  if (tone === "go")
    return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
  if (tone === "caution")
    return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
  if (tone === "risk")
    return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
  return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]";
}

function ToneIcon({ tone }: { tone: SignalTone }) {
  if (tone === "go")
    return <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-[var(--foreground)]" />;
  if (tone === "caution")
    return <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />;
  if (tone === "risk")
    return <XCircle aria-hidden className="h-4 w-4 shrink-0" />;
  return <HelpCircle aria-hidden className="h-4 w-4 shrink-0" />;
}

function buildSignals(geodata: GeodataResult): ReadinessSignal[] {
  const signals: ReadinessSignal[] = [];

  // Road access
  const roadKm = geodata.nearestRoad.distanceKm;
  signals.push(
    roadKm === null
      ? {
          label: "Road access",
          verdict: "No data",
          detail: "Road proximity is unavailable for this location.",
          tone: "unavailable",
        }
      : roadKm <= 0.5
        ? {
            label: "Road access",
            verdict: `${roadKm.toFixed(2)} km — directly accessible`,
            detail: `${geodata.nearestRoad.name} is within easy reach. No significant haul road needed.`,
            tone: "go",
          }
        : roadKm <= 3
          ? {
              label: "Road access",
              verdict: `${roadKm.toFixed(1)} km — short connection needed`,
              detail: `${geodata.nearestRoad.name} is ${roadKm.toFixed(1)} km away. A modest access road would be required.`,
              tone: "caution",
            }
          : {
              label: "Road access",
              verdict: `${roadKm.toFixed(1)} km — significant haul road`,
              detail: `${geodata.nearestRoad.name} is ${roadKm.toFixed(1)} km away. Substantial road infrastructure investment likely required.`,
              tone: "risk",
            },
  );

  // Power grid
  const powerKm = geodata.nearestPower.distanceKm;
  signals.push(
    powerKm === null
      ? {
          label: "Power grid",
          verdict: "No data",
          detail: "Power grid proximity is unavailable for this location.",
          tone: "unavailable",
        }
      : powerKm <= 1
        ? {
            label: "Power grid",
            verdict: `${powerKm.toFixed(2)} km — grid connection close`,
            detail: `${geodata.nearestPower.name} is under 1 km away. Grid interconnection should be straightforward.`,
            tone: "go",
          }
        : powerKm <= 5
          ? {
              label: "Power grid",
              verdict: `${powerKm.toFixed(1)} km — moderate grid distance`,
              detail: `${geodata.nearestPower.name} is ${powerKm.toFixed(1)} km away. Verify transformer capacity and interconnection requirements.`,
              tone: "caution",
            }
          : {
              label: "Power grid",
              verdict: `${powerKm.toFixed(1)} km — long interconnection`,
              detail: `${geodata.nearestPower.name} is ${powerKm.toFixed(1)} km away. High transmission investment likely required; verify utility feasibility.`,
              tone: "risk",
            },
  );

  // Broadband
  const bb = geodata.broadband;
  if (!bb) {
    signals.push({
      label: "Broadband",
      verdict: "No data",
      detail: "Broadband availability is unavailable for this location.",
      tone: "unavailable",
    });
  } else if (bb.kind === "regional_household_baseline") {
    const pct = bb.fixedBroadbandCoveragePercent;
    signals.push({
      label: "Broadband",
      verdict:
        pct === null
          ? "Regional baseline — coverage unknown"
          : pct >= 70
            ? `${pct.toFixed(0)}% regional fixed-broadband coverage`
            : `${pct.toFixed(0)}% regional fixed-broadband — limited`,
      detail: `${bb.regionLabel ?? "Country"} Eurostat baseline. Address-level data not available outside the US.`,
      tone: pct === null ? "unavailable" : pct >= 70 ? "caution" : "risk",
    });
  } else {
    const speed = bb.maxDownloadSpeed;
    signals.push(
      speed >= 100
        ? {
            label: "Broadband",
            verdict: `${speed.toLocaleString()} Mbps max — strong connectivity`,
            detail: `${bb.providerCount} provider${bb.providerCount === 1 ? "" : "s"} with up to ${speed.toLocaleString()} Mbps down. Sufficient for most operational needs.`,
            tone: "go",
          }
        : speed > 0
          ? {
              label: "Broadband",
              verdict: `${speed.toLocaleString()} Mbps max — limited speed`,
              detail: `${bb.providerCount} provider${bb.providerCount === 1 ? "" : "s"}. May not support high-bandwidth operational requirements.`,
              tone: "caution",
            }
          : {
              label: "Broadband",
              verdict: "No broadband providers mapped",
              detail: "FCC mapping shows no broadband providers at this location. Dedicated fiber installation may be required.",
              tone: "risk",
            },
    );
  }

  // Flood exposure
  const fz = geodata.floodZone;
  signals.push(
    !fz
      ? {
          label: "Flood exposure",
          verdict: "No FEMA data",
          detail: "FEMA flood zone data is only available for US locations. Verify local flood risk through regional authorities.",
          tone: "unavailable",
        }
      : fz.isSpecialFloodHazard
        ? {
            label: "Flood exposure",
            verdict: `${fz.label} — special flood hazard area`,
            detail: "This location is in a FEMA-designated Special Flood Hazard Area. Flood insurance, elevation certificates, and mitigation measures may be required.",
            tone: "risk",
          }
        : {
            label: "Flood exposure",
            verdict: `${fz.label} — outside SFHA`,
            detail: "Not in a FEMA Special Flood Hazard Area. Standard drainage planning still recommended.",
            tone: "go",
          },
  );

  // Soil drainage
  const soil = geodata.soilProfile;
  if (!soil || !soil.drainageClass) {
    signals.push({
      label: "Soil drainage",
      verdict: "No SSURGO data",
      detail: "USDA soil data is only available for US locations. Commission a geotechnical investigation for non-US sites.",
      tone: "unavailable",
    });
  } else {
    const dc = soil.drainageClass.toLowerCase();
    const isWell = dc.includes("well") && !dc.includes("mod");
    const isMod = dc.includes("moderately") || dc.includes("somewhat");
    signals.push(
      isWell
        ? {
            label: "Soil drainage",
            verdict: `${soil.drainageClass} — favorable`,
            detail: `${soil.mapUnitName ?? "Mapped soil unit"} drains well. Good baseline for foundation design.`,
            tone: "go",
          }
        : isMod
          ? {
              label: "Soil drainage",
              verdict: `${soil.drainageClass} — investigate further`,
              detail: `${soil.mapUnitName ?? "Mapped soil unit"} has moderate drainage. Geotechnical study recommended before foundation design.`,
              tone: "caution",
            }
          : {
              label: "Soil drainage",
              verdict: `${soil.drainageClass} — potential concern`,
              detail: `${soil.mapUnitName ?? "Mapped soil unit"} drains poorly. May require drainage improvement, soil stabilization, or raised foundations.`,
              tone: "risk",
            },
    );
  }

  // Seismic
  const seis = geodata.seismicDesign;
  if (!seis || !seis.siteClass) {
    signals.push({
      label: "Seismic site class",
      verdict: "No USGS data",
      detail: "ASCE 7 seismic design data is only available for US locations. Consult local building codes for non-US sites.",
      tone: "unavailable",
    });
  } else {
    const sc = seis.siteClass.toUpperCase();
    const isGood = sc === "A" || sc === "B";
    const isMid = sc === "C" || sc === "D";
    signals.push(
      isGood
        ? {
            label: "Seismic site class",
            verdict: `Site class ${seis.siteClass} — rock / stiff soil`,
            detail: `${seis.dataSource}. Firm ground with low amplification. Favorable seismic baseline.`,
            tone: "go",
          }
        : isMid
          ? {
              label: "Seismic site class",
              verdict: `Site class ${seis.siteClass} — stiff to soft soil`,
              detail: `${seis.dataSource}. Moderate amplification possible. Structural engineer review recommended.`,
              tone: "caution",
            }
          : {
              label: "Seismic site class",
              verdict: `Site class ${seis.siteClass} — soft or liquefiable soil`,
              detail: `${seis.dataSource}. High amplification risk or special study required. Consult a geotechnical engineer before design.`,
              tone: "risk",
            },
    );
  }

  return signals;
}

function overallTone(signals: ReadinessSignal[]): { label: string; tone: SignalTone } {
  const risk = signals.filter((s) => s.tone === "risk").length;
  const caution = signals.filter((s) => s.tone === "caution").length;
  const go = signals.filter((s) => s.tone === "go").length;
  if (risk >= 2) return { label: "Significant constraints", tone: "risk" };
  if (risk === 1) return { label: "One critical constraint", tone: "caution" };
  if (caution >= 3) return { label: "Multiple items need review", tone: "caution" };
  if (go >= 4) return { label: "Strong site baseline", tone: "go" };
  return { label: "Preliminary screen complete", tone: "caution" };
}

export function SiteReadinessCard({ geodata }: { geodata: GeodataResult | null }) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Site development" title="Site readiness" loading={true} />
    );
  }

  const signals = buildSignals(geodata);
  const overall = overallTone(signals);
  const sources = [
    geodata.sources.infrastructure,
    geodata.sources.broadband,
    geodata.sources.floodZone,
    geodata.sources.soilProfile,
    geodata.sources.seismicDesign,
  ];
  const trustSummary = summarizeSourceTrust(sources, "Site readiness");

  return (
    <WorkspaceCardShell
      eyebrow="Site development"
      title="Site readiness"
      subtitle="First-pass screen across six infrastructure and hazard domains. Each signal is derived from live or US-only data sources — unavailable items require site-specific investigation."
      headerExtra={
        <span className={`self-start shrink-0 rounded-full border px-3 py-1 text-xs font-semibold cursor-default pointer-events-none select-none ${toneClasses(overall.tone)}`}>
          {overall.label}
        </span>
      }
    >
        {signals.map((signal) => (
          <div
            key={signal.label}
            className={`flex gap-3 rounded-xl border p-3 ${toneClasses(signal.tone)}`}
          >
            <ToneIcon tone={signal.tone} />
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                {signal.label}
              </div>
              <div className="text-sm font-semibold leading-5">{signal.verdict}</div>
              <div className="text-xs leading-5 opacity-80">{signal.detail}</div>
            </div>
          </div>
        ))}

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--muted-foreground)]">
          This is a screening tool, not a due-diligence report. Soil and seismic data are US-only. All signals should be verified by qualified engineers before project commitment.
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={sources}
          note="Road and power proximity from OSM infrastructure layer. Broadband from FCC BroadbandMap (US) or Eurostat baseline (non-US). Flood zone from FEMA NFHL (US only). Soil from USDA SSURGO (US only). Seismic from USGS ASCE 7-22 (US only)."
        />
    </WorkspaceCardShell>
  );
}
