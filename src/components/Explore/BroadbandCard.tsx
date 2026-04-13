import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, SiteScore } from "@/types";

interface BroadbandCardProps {
  geodata: GeodataResult | null;
  score: SiteScore | null;
}

function formatTechnologyLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getAddressBroadbandSummary(downloadMbps: number, providerCount: number) {
  if (downloadMbps >= 500 || providerCount >= 4) {
    return "Excellent";
  }
  if (downloadMbps >= 100 || providerCount >= 2) {
    return "Good";
  }
  return "Limited";
}

function getRegionalBroadbandSummary(
  fixedBroadbandCoveragePercent: number | null,
  mobileBroadbandCoveragePercent: number | null,
) {
  const strongestSignal = Math.max(
    fixedBroadbandCoveragePercent ?? 0,
    mobileBroadbandCoveragePercent ?? 0,
  );

  if (strongestSignal >= 90) {
    return "Strong";
  }
  if (strongestSignal >= 75) {
    return "Solid";
  }
  if (strongestSignal > 0) {
    return "Mixed";
  }

  return "Limited";
}

export function BroadbandCard({ geodata, score }: BroadbandCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Connectivity baseline" title="Broadband context" loading={true} />
    );
  }

  const broadband = geodata.broadband;
  const trustSummary = summarizeSourceTrust([geodata.sources.broadband], "Broadband coverage");

  return (
    <WorkspaceCardShell
      eyebrow="Connectivity baseline"
      title="Broadband context"
    >
      {broadband ? (
        <>
          <div className="inline-flex rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
            Internet:{" "}
            {broadband.kind === "regional_household_baseline"
              ? getRegionalBroadbandSummary(
                  broadband.fixedBroadbandCoveragePercent,
                  broadband.mobileBroadbandCoveragePercent,
                )
              : getAddressBroadbandSummary(
                  broadband.maxDownloadSpeed,
                  broadband.providerCount,
                )}
          </div>

          {broadband.kind === "regional_household_baseline" ? (
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {`GeoSight is showing ${broadband.regionLabel} country-level household connectivity context from Eurostat, not point-level service at this exact map location.`}
            </div>
          ) : null}

          {broadband.kind === "regional_household_baseline" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Fixed broadband</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.fixedBroadbandCoveragePercent === null
                    ? "--"
                    : `${broadband.fixedBroadbandCoveragePercent.toFixed(1)}%`}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Mobile broadband</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.mobileBroadbandCoveragePercent === null
                    ? "--"
                    : `${broadband.mobileBroadbandCoveragePercent.toFixed(1)}%`}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Reference year</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {broadband.referenceYear ?? "--"}
                </div>
              </div>
            </div>
          ) : (
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
          )}

          <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Technical details
            </summary>
            {broadband.kind === "regional_household_baseline" ? (
              <div className="space-y-3">
                <div className="mt-3 flex flex-wrap gap-2">
                  {broadband.technologies.map((technology) => (
                    <span
                      key={technology}
                      className="rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"
                    >
                      {formatTechnologyLabel(technology)}
                    </span>
                  ))}
                </div>
                <div className="text-sm leading-6 text-[var(--muted-foreground)]">
                  Eurostat reports the share of households in {broadband.regionLabel} with fixed and mobile broadband connections. It does not identify local providers, installation feasibility, or exact speeds at the selected point.
                </div>
              </div>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {broadband.technologies.length ? (
                    broadband.technologies.map((technology) => (
                      <span
                        key={technology}
                        className="rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--accent)]"
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
              </>
            )}
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
        <StatePanel
          tone={geodata.sources.broadband.status === "unavailable" ? "unavailable" : "partial"}
          eyebrow="Connectivity coverage"
          title="Broadband availability is not fully loaded for this point"
          description={
            geodata.sources.broadband.note ??
            "GeoSight could not confirm broadband context for this location right now."
          }
          compact
        />
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={[geodata.sources.broadband]}
        note={
          broadband?.kind === "regional_household_baseline"
            ? "Eurostat broadband data is a country-level household baseline. It is useful for regional screening, but it should not be read as exact service availability at the chosen point."
            : "FCC broadband data reflects reported provider availability and advertised speeds. It is useful for screening, but installation reality still needs local validation."
        }
      />
    </WorkspaceCardShell>
  );
}
