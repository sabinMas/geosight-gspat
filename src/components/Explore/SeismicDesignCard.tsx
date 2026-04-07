"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface SeismicDesignCardProps {
  geodata: GeodataResult | null;
}

function hasSeismicData(geodata: GeodataResult) {
  return Boolean(
    geodata.seismicDesign &&
      [geodata.seismicDesign.ss, geodata.seismicDesign.s1, geodata.seismicDesign.pga].some(
        (value) => value !== null,
      ),
  );
}

function riskBadge(pga: number | null) {
  if (pga === null) {
    return {
      label: "Unavailable",
      tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    };
  }
  if (pga < 0.1) {
    return { label: "Low", tone: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]" };
  }
  if (pga <= 0.4) {
    return { label: "Moderate", tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]" };
  }
  if (pga <= 0.8) {
    return { label: "High", tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--foreground)]" };
  }

  return { label: "Very High", tone: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--foreground)]" };
}

export function SeismicDesignCard({ geodata }: SeismicDesignCardProps) {
  if (!geodata) {
    return null;
  }

  const trustSummary = summarizeSourceTrust(
    [geodata.sources.seismicDesign, geodata.sources.hazards],
    "Seismic design screening",
  );

  const seismic = geodata.seismicDesign;
  const badge = riskBadge(seismic?.pga ?? null);

  return (
    <WorkspaceCardShell eyebrow="Structural hazard" title="Seismic risk profile">
      {!hasSeismicData(geodata) ? (
        <>
          <StatePanel
            tone={geodata.sources.seismicDesign.status === "unavailable" ? "unavailable" : "partial"}
            eyebrow="Structural hazard"
            title="Seismic design parameters are not fully available for this point"
            description={geodata.sources.seismicDesign.note ?? "GeoSight could not assemble the design-map shaking values needed for a structural screening read here."}
            compact
          />
          <TrustSummaryPanel
            summary={trustSummary}
            sources={[geodata.sources.seismicDesign, geodata.sources.hazards]}
            note="This card pairs mapped seismic design values with recent earthquake activity so you can distinguish engineering context from short-term event history."
          />
        </>
      ) : seismic ? (
        <>
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${badge.tone}`}>
          Earthquake risk: {badge.label}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
          GeoSight leads with a simple earthquake-risk badge for this location. Raw USGS design values remain available below for technical review.
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Peak ground acceleration</div>
            <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {seismic.pga === null ? "--" : `${seismic.pga.toFixed(2)} g`}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Site class</div>
            <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {seismic.siteClass ?? "--"}
            </div>
          </div>
        </div>

        <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            Technical details
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Short-period Ss</div>
              <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {seismic.ss === null ? "Unavailable" : `${seismic.ss.toFixed(2)} g`}
              </div>
            </div>
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">1-second S1</div>
              <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {seismic.s1 === null ? "Unavailable" : `${seismic.s1.toFixed(2)} g`}
              </div>
            </div>
          </div>
        </details>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
          Source: {seismic.dataSource}
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.seismicDesign, geodata.sources.hazards]}
          note="Peak ground acceleration, Ss, and S1 come from USGS design maps. They are screening inputs for engineering diligence, not a substitute for structural design."
        />
        </>
      ) : null}
    </WorkspaceCardShell>
  );
}
