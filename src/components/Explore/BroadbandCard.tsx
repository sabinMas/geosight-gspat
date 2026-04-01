import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult, SiteScore } from "@/types";

interface BroadbandCardProps {
  geodata: GeodataResult | null;
  score: SiteScore | null;
}

function formatTechnologyLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getBroadbandSummary(downloadMbps: number, providerCount: number) {
  if (downloadMbps >= 500 || providerCount >= 4) {
    return "Excellent";
  }
  if (downloadMbps >= 100 || providerCount >= 2) {
    return "Good";
  }
  return "Limited";
}

export function BroadbandCard({ geodata, score }: BroadbandCardProps) {
  if (!geodata) {
    return null;
  }

  const broadband = geodata.broadband;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Connectivity baseline</div>
        <CardTitle>Broadband context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {broadband ? (
          <>
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
              Internet: {getBroadbandSummary(broadband.maxDownloadSpeed, broadband.providerCount)}
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              GeoSight summarizes internet quality first, then keeps the detailed provider and speed readout below.
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Max download</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.maxDownloadSpeed > 0
                    ? `${broadband.maxDownloadSpeed.toLocaleString()} Mbps`
                    : "--"}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Max upload</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.maxUploadSpeed > 0
                    ? `${broadband.maxUploadSpeed.toLocaleString()} Mbps`
                    : "--"}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Providers</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.providerCount}
                </div>
              </div>
            </div>

            <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Technical details
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {broadband.technologies.length ? (
                  broadband.technologies.map((technology) => (
                    <span
                      key={technology}
                      className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]"
                    >
                      {formatTechnologyLabel(technology)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Technology classifications unavailable.
                  </span>
                )}
              </div>
              <div className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
                {broadband.hasFiber
                  ? "Fiber appears in the advertised technology mix."
                  : "No fiber technology was detected in the returned FCC technology mix."}
              </div>
              {score?.broadband?.score !== null && score?.broadband?.score !== undefined ? (
                <div className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
                  Mission broadband factor score:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {score.broadband.score} / 100
                  </span>
                </div>
              ) : null}
            </details>
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            FCC broadband availability is not available for this point right now.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>FCC Broadband Map</span>
            <SourceStatusBadge source={geodata.sources.broadband} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
