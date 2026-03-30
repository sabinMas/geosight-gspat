import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceKm } from "@/lib/stream-gauges";
import { GeodataResult } from "@/types";

interface ContaminationRiskCardProps {
  geodata: GeodataResult | null;
}

export function ContaminationRiskCard({ geodata }: ContaminationRiskCardProps) {
  if (!geodata) {
    return null;
  }

  const hazards = geodata.epaHazards;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Environmental due diligence</div>
        <CardTitle>Contamination screening</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {geodata.sources.epaHazards.status === "unavailable" ? (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            EPA contamination screening is not supported for this location yet.
          </div>
        ) : hazards ? (
          <>
            {hazards.nearestSuperfundDistanceKm !== null &&
            hazards.nearestSuperfundDistanceKm <= 10 ? (
              <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger-foreground)]">
                Warning: a mapped Superfund site falls within 10 km of this point. Treat contamination
                history and remediation status as required diligence items.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Superfund sites</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {hazards.superfundCount}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">TRI facilities</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {hazards.triCount}
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Nearest Superfund site</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {hazards.nearestSuperfundName ?? "None in current search window"}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {hazards.nearestSuperfundDistanceKm === null
                  ? "No EPA-screened site was returned within roughly 50 km."
                  : `Mapped Superfund site about ${formatDistanceKm(hazards.nearestSuperfundDistanceKm)} away.`}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            EPA contamination screening is unavailable for this point.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>EPA Envirofacts</span>
            <SourceStatusBadge source={geodata.sources.epaHazards} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
