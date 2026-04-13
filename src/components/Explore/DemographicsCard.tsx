import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface DemographicsCardProps {
  geodata: GeodataResult | null;
}

function formatPopulation(value: number | null) {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number | null, currencyCode = "USD") {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function getGranularityLabel(granularity: "county" | "country" | "nuts2_region") {
  if (granularity === "county") return "County-level";
  if (granularity === "nuts2_region") return "Regional (NUTS2)";
  return "Country-level";
}

export function DemographicsCard({ geodata }: DemographicsCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Area context" title="Demographics" loading={true} />
    );
  }

  const trustSummary = summarizeSourceTrust([geodata.sources.demographics], "Demographics context");
  const demo = geodata.demographics;
  const hasAnyData =
    demo.population !== null ||
    demo.medianHouseholdIncome !== null ||
    demo.medianHomeValue !== null;

  const isEurostat = geodata.sources.demographics.provider === "Eurostat";
  const currencyCode = isEurostat ? "EUR" : "USD";
  const incomeLabel = isEurostat ? "Median equivalised net income" : "Median household income";

  return (
    <WorkspaceCardShell eyebrow="Area context" title="Demographics">
      {hasAnyData ? (
          <>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Coverage</div>
              <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                {demo.countyName ?? geodata.sources.demographics.provider}
                {demo.stateCode && demo.stateCode !== demo.countyName
                  ? `, ${demo.stateCode}`
                  : ""}
              </div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {getGranularityLabel(demo.geographicGranularity)} data ·{" "}
                {geodata.sources.demographics.provider}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Population</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {formatPopulation(demo.population)}
                </div>
                {demo.populationReferenceYear && (
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {demo.populationReferenceYear} estimate
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">{incomeLabel}</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  {formatCurrency(demo.medianHouseholdIncome, currencyCode)}
                </div>
                {demo.incomeReferenceYear && (
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {demo.incomeReferenceYear} estimate
                  </div>
                )}
              </div>

              {demo.medianHomeValue !== null && (
                <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                  <div className="eyebrow">Median home value</div>
                  <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {formatCurrency(demo.medianHomeValue)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    ACS 5-year estimate
                  </div>
                </div>
              )}
            </div>

            {demo.incomeDefinition && (
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Income definition</div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {demo.incomeDefinition}
                </p>
              </div>
            )}
          </>
        ) : (
          <StatePanel
            tone="unavailable"
            eyebrow="Demographics coverage"
            title="No demographic context is available for this location"
            description={
              geodata.sources.demographics.note ??
              "GeoSight could not retrieve population or income data for this point. US locations use FCC and ACS county-level data; European locations use Eurostat country-level data; other regions use World Bank national indicators."
            }
            compact
          />
        )}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.demographics]}
          note={
            demo.geographicGranularity === "county"
              ? "US demographics are county-level from the American Community Survey (ACS) 5-year estimates. These are area-level context, not parcel-specific valuations."
              : "Non-US demographics are country-level from Eurostat (Europe) or World Bank (elsewhere). These are national context indicators, not local or city-level data."
          }
        />
    </WorkspaceCardShell>
  );
}
