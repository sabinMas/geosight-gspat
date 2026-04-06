import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { GeodataResult } from "@/types";

interface FloodRiskCardProps {
  geodata: GeodataResult | null;
}

function getRiskTone(geodata: GeodataResult) {
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

function getRiskLabel(geodata: GeodataResult) {
  if (!geodata.floodZone?.floodZone) {
    return "Unavailable";
  }

  if (geodata.floodZone.isSpecialFloodHazard) {
    return "High";
  }

  if (geodata.floodZone.floodZone === "X") {
    return "Low";
  }

  return "Moderate";
}

export function FloodRiskCard({ geodata }: FloodRiskCardProps) {
  if (!geodata) {
    return null;
  }

  const trustSummary = summarizeSourceTrust([geodata.sources.floodZone], "Flood screening");

  return (
    <WorkspaceCardShell eyebrow="Floodplain due diligence" title="Flood risk">
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${getRiskTone(geodata)}`}>
          Flood risk: {getRiskLabel(geodata)}
        </div>

        {geodata.floodZone ? (
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Plain-language summary</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {geodata.floodZone.label}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              GeoSight summarizes the mapped FEMA designation into a simple risk badge first, then keeps the zone code below for technical review.
            </div>
          </div>
        ) : (
          <StatePanel
            tone={geodata.sources.floodZone.status === "unavailable" ? "unavailable" : "partial"}
            eyebrow="Flood mapping"
            title="FEMA did not return a flood-zone designation for this point"
            description={geodata.sources.floodZone.note ?? "This can mean the point falls outside the current mapped coverage or the provider did not return an intersecting flood polygon."}
            compact
          />
        )}

        {geodata.floodZone?.isSpecialFloodHazard ? (
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
              {geodata.floodZone?.floodZone ?? "--"}
            </div>
          </div>
        </details>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.floodZone]}
          note="This card reflects FEMA's mapped floodplain layer. It does not replace local floodplain review, insurance diligence, or engineering-grade stormwater analysis."
        />
    </WorkspaceCardShell>
  );
}
