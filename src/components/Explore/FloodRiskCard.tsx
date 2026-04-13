import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { GeodataResult } from "@/types";

interface FloodRiskCardProps {
  geodata: GeodataResult | null;
}

function getFemaRiskTone(geodata: GeodataResult) {
  if (!geodata.floodZone?.floodZone) {
    return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]";
  }
  if (geodata.floodZone.isSpecialFloodHazard) {
    return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
  }
  if (geodata.floodZone.floodZone === "X") {
    return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
  }
  return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
}

function getFemaRiskLabel(geodata: GeodataResult) {
  if (!geodata.floodZone?.floodZone) return "Unavailable";
  if (geodata.floodZone.isSpecialFloodHazard) return "High";
  if (geodata.floodZone.floodZone === "X") return "Low";
  return "Moderate";
}

function getGloFASTone(label: string | null | undefined) {
  switch (label) {
    case "Major": return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]";
    case "Significant": return "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]";
    case "Moderate": return "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]";
    default: return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
  }
}

export function FloodRiskCard({ geodata }: FloodRiskCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Floodplain due diligence" title="Flood risk" loading={true} />
    );
  }

  const trustSummary = summarizeSourceTrust([geodata.sources.floodZone], "Flood screening");
  const flood = geodata.floodZone;
  const isGloFAS = flood?.source === "glofas";

  return (
    <WorkspaceCardShell eyebrow="Floodplain due diligence" title="Flood risk">
      {isGloFAS ? (
        <>
          <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${getGloFASTone(flood?.dischargeRiskLabel)}`}>
            River discharge: {flood?.dischargeRiskLabel ?? "—"}
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">River discharge context</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {flood?.peakDischargeCms != null
                ? `${flood.peakDischargeCms.toFixed(0)} m³/s peak (7-day forecast)`
                : "No discharge data"}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              GloFAS ensemble model forecast from Open-Meteo. This reflects river channel
              discharge — it is hydrological context, not a regulatory flood zone designation.
              Readings near zero indicate no modelled river channel at this point.
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 text-xs leading-6 text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">Scale: </span>
            Low &lt;50 · Moderate 50–500 · Significant 500–2,000 · Major &gt;2,000 m³/s
          </div>
        </>
      ) : (
        <>
          <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${getFemaRiskTone(geodata)}`}>
            Flood risk: {getFemaRiskLabel(geodata)}
          </div>

          {flood ? (
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Plain-language summary</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {flood.label}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                GeoSight summarizes the mapped FEMA designation into a simple risk badge first, then keeps the zone code below for technical review.
              </div>
            </div>
          ) : (
            <StatePanel
              tone="partial"
              eyebrow="Flood mapping"
              title="FEMA did not return a flood-zone designation for this point"
              description={geodata.sources.floodZone.note ?? "This can mean the point falls outside the current mapped coverage or the provider did not return an intersecting flood polygon."}
              compact
            />
          )}

          {flood?.isSpecialFloodHazard ? (
            <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger-foreground)]">
              This point intersects a mapped Special Flood Hazard Area. Treat it as a material siting
              constraint and confirm local floodplain requirements before moving forward.
            </div>
          ) : null}

          <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Technical details
            </summary>
            <div className="mt-3">
              <div className="eyebrow">Mapped FEMA zone</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {flood?.floodZone ?? "--"}
              </div>
            </div>
          </details>
        </>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={[geodata.sources.floodZone]}
        note={
          isGloFAS
            ? "GloFAS (Global Flood Awareness System) provides 7-day ensemble river-discharge forecasts at ~10 km resolution via Open-Meteo. This is not a FEMA or regulatory flood-zone designation."
            : "This card reflects FEMA's mapped floodplain layer. It does not replace local floodplain review, insurance diligence, or engineering-grade stormwater analysis."
        }
      />
    </WorkspaceCardShell>
  );
}
