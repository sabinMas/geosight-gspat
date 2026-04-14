import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { formatDistanceKm } from "@/lib/stream-gauges";
import { GeodataResult } from "@/types";

interface ContaminationRiskCardProps {
  geodata: GeodataResult | null;
}

function getContaminationSummary(hazards: NonNullable<GeodataResult["epaHazards"]>) {
  if (hazards.nearestSuperfundDistanceKm !== null && hazards.nearestSuperfundDistanceKm <= 10) {
    return "Alert";
  }

  if (hazards.superfundCount > 0 || hazards.triCount > 0) {
    return "Warning";
  }

  return "None nearby";
}

function getLabels(source: NonNullable<GeodataResult["epaHazards"]>["source"]) {
  if (source === "eea") {
    return {
      facilityLabel: "EEA industrial facilities",
      secondaryLabel: "E-PRTR registry",
      nearestLabel: "Nearest registered facility",
      providerNote: "EEA E-PRTR (European Pollutant Release and Transfer Register)",
    };
  }
  return {
    facilityLabel: "Superfund sites",
    secondaryLabel: "TRI facilities",
    nearestLabel: "Nearest Superfund site",
    providerNote: "EPA Envirofacts (CERCLIS Superfund + TRI)",
  };
}

export function ContaminationRiskCard({ geodata }: ContaminationRiskCardProps) {
  if (!geodata) {
    return null;
  }

  const hazards = geodata.epaHazards;
  const labels = getLabels(hazards?.source);
  const trustSummary = summarizeSourceTrust(
    [geodata.sources.epaHazards],
    "Contamination screening",
  );
  const isEEA = hazards?.source === "eea";

  return (
    <WorkspaceCardShell eyebrow="Environmental due diligence" title="Contamination screening">
        {geodata.sources.epaHazards.status === "unavailable" ? (
          <StatePanel
            tone="unavailable"
            eyebrow="Environmental coverage"
            title="Contamination screening is not supported for this location yet"
            description={geodata.sources.epaHazards.note ?? "GeoSight currently supports EPA Envirofacts for US locations and EEA E-PRTR for EU/EEA locations. No equivalent dataset is wired for this region."}
            compact
          />
        ) : hazards ? (
          <>
            <div className="inline-flex rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
              Environmental contamination: {getContaminationSummary(hazards)}
            </div>

            {hazards.nearestSuperfundDistanceKm !== null &&
            hazards.nearestSuperfundDistanceKm <= 10 ? (
              <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger-foreground)]">
                {isEEA
                  ? "Warning: a registered EEA industrial facility falls within 10 km of this point. Review pollutant release records and operational status as part of due diligence."
                  : "Warning: a mapped Superfund site falls within 10 km of this point. Treat contamination history and remediation status as required diligence items."}
              </div>
            ) : null}

            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Plain-language summary</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {getContaminationSummary(hazards)}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {hazards.nearestSuperfundDistanceKm === null
                  ? `No ${isEEA ? "EEA E-PRTR registered facility" : "EPA-screened site"} was returned within roughly 50 km.`
                  : `${labels.nearestLabel} is about ${formatDistanceKm(hazards.nearestSuperfundDistanceKm)} away.`}
              </div>
            </div>

            <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Technical details
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
                  <div className="eyebrow">{labels.facilityLabel}</div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {hazards.superfundCount}
                  </div>
                </div>
                {!isEEA ? (
                  <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
                    <div className="eyebrow">{labels.secondaryLabel}</div>
                    <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                      {hazards.triCount}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {labels.nearestLabel}: {hazards.nearestSuperfundName ?? "None in current search window"}
              </div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                Source: {labels.providerNote}
              </div>
            </details>
          </>
        ) : (
          <StatePanel
            tone="partial"
            eyebrow="Environmental coverage"
            title="Contamination screening did not return a usable result"
            description={geodata.sources.epaHazards.note ?? "GeoSight reached the contamination screening path, but the response was incomplete or empty for this point."}
            compact
          />
        )}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.epaHazards]}
          note={isEEA
            ? "This card shows registered EEA industrial facilities from the E-PRTR registry. It flags where industrial pollution sources are located — not whether a specific site is currently safe or remediated."
            : "This card is a screening layer based on EPA facilities and site inventories. It highlights where deeper environmental due diligence should start, not whether a parcel is clean."}
        />
    </WorkspaceCardShell>
  );
}
