import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSourceTimestamp,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import {
  buildSourceRegistryPreview,
  formatSourceRegionScopes,
  inferSourceRegistryContextFromGeodata,
  SOURCE_DOMAIN_LABELS,
} from "@/lib/source-registry";
import { GeodataResult } from "@/types";

interface SourceAwarenessCardProps {
  geodata: GeodataResult | null;
}

export function SourceAwarenessCard({ geodata }: SourceAwarenessCardProps) {
  if (!geodata) {
    return null;
  }

  const registryContext = inferSourceRegistryContextFromGeodata(geodata);
  const registryPreview = buildSourceRegistryPreview(registryContext);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Trust and provenance</div>
        <CardTitle>Source awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Review what is direct, what is derived, and where regional coverage or freshness limits
          apply before acting on the analysis.
        </p>
        <div className="grid gap-3">
          {Object.values(geodata.sources).map((source) => (
            <div
              key={source.id}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{source.label}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {summarizeSourceMeta(source)}
                  </div>
                </div>
                <SourceStatusBadge source={source} />
              </div>
              <div className="mt-3 text-xs leading-5 text-[var(--foreground-soft)]">
                {source.confidence}
              </div>
              {source.fallbackProviders?.length ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Fallbacks: {source.fallbackProviders.join(", ")}
                </div>
              ) : null}
              {source.accessType || source.regionScopes?.length ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {source.accessType ? `${source.accessType.replaceAll("_", " ")} source` : null}
                  {source.accessType && source.regionScopes?.length ? " • " : null}
                  {source.regionScopes?.length
                    ? formatSourceRegionScopes(source.regionScopes)
                    : null}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                {formatSourceTimestamp(source.lastUpdated)}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
          <div className="text-sm font-semibold text-[var(--foreground)]">Regional source strategy</div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            GeoSight&apos;s current provider guidance for {formatSourceRegionScopes(registryContext.scopes)}.
            This registry helps future agents choose region-aware fallbacks instead of assuming US-only sources.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {registryPreview.map((guidance) => (
              <div
                key={guidance.domain}
                className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {SOURCE_DOMAIN_LABELS[guidance.domain]}
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {guidance.primary?.name ?? "No provider selected yet"}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {guidance.primary?.notes ?? "No registry guidance available for this domain yet."}
                </div>
                {guidance.fallbacks.length ? (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Fallbacks: {guidance.fallbacks.slice(0, 2).map((provider) => provider.name).join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
