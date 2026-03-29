import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

interface FloodRiskCardProps {
  geodata: GeodataResult | null;
}

function getRiskTone(geodata: GeodataResult) {
  if (!geodata.floodZone?.floodZone) {
    return "border-slate-300/15 bg-slate-400/10 text-slate-100";
  }

  if (geodata.floodZone.isSpecialFloodHazard) {
    return "border-rose-300/20 bg-rose-400/10 text-rose-50";
  }

  if (geodata.floodZone.floodZone === "X") {
    return "border-emerald-300/20 bg-emerald-400/10 text-emerald-50";
  }

  return "border-amber-300/20 bg-amber-400/10 text-amber-50";
}

function getRiskLabel(geodata: GeodataResult) {
  if (!geodata.floodZone?.floodZone) {
    return "Unavailable";
  }

  if (geodata.floodZone.isSpecialFloodHazard) {
    return "High flood caution";
  }

  if (geodata.floodZone.floodZone === "X") {
    return "Lower mapped flood risk";
  }

  return "Review flood context";
}

export function FloodRiskCard({ geodata }: FloodRiskCardProps) {
  if (!geodata) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Floodplain due diligence</div>
        <CardTitle>Flood risk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${getRiskTone(geodata)}`}>
          {getRiskLabel(geodata)}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Mapped FEMA zone</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {geodata.floodZone?.floodZone ?? "--"}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {geodata.floodZone?.label ??
              "FEMA did not return a flood-zone designation for this point."}
          </div>
        </div>

        {geodata.floodZone?.isSpecialFloodHazard ? (
          <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger-foreground)]">
            This point intersects a mapped Special Flood Hazard Area. Treat it as a material siting
            constraint and confirm local floodplain requirements before moving forward.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>FEMA NFHL</span>
            <SourceStatusBadge source={geodata.sources.floodZone} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
