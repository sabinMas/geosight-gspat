"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSourceTimestamp, summarizeSourceMeta } from "@/lib/source-metadata";
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
  const [showRegistryStrategy, setShowRegistryStrategy] = useState(false);

  if (!geodata) {
    return null;
  }

  const registryContext = inferSourceRegistryContextFromGeodata(geodata);
  const registryPreview = buildSourceRegistryPreview(registryContext);
  const activeProviderSummary = [
    geodata.sources.elevation,
    geodata.sources.demographics,
    geodata.sources.climate,
    geodata.sources.school,
    geodata.sources.hazardFire,
  ];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Trust and provenance</div>
        <CardTitle>Source awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Check source status, freshness, and regional limits before acting.
        </p>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
          <div className="text-sm font-semibold text-[var(--foreground)]">Active regional providers</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {activeProviderSummary.map((source) => (
              <div
                key={`provider-${source.id}`}
                className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {source.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {source.provider}
                    </div>
                  </div>
                  <SourceStatusBadge source={source} />
                </div>
                {source.note ? (
                  <div className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                    {source.note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Object.values(geodata.sources).map((source) => (
            <div
              key={source.id}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {source.label}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {summarizeSourceMeta(source)}
                  </div>
                </div>
                <SourceStatusBadge source={source} />
              </div>

              <div className="mt-3 text-xs leading-5 text-[var(--foreground-soft)]">
                {source.confidence}
              </div>
              {source.note ? (
                <div className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                  {source.note}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted-foreground)]">
                {source.accessType ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] px-2.5 py-1">
                    {source.accessType.replaceAll("_", " ")}
                  </span>
                ) : null}
                {source.regionScopes?.length ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] px-2.5 py-1">
                    {formatSourceRegionScopes(source.regionScopes)}
                  </span>
                ) : null}
                <span className="rounded-full border border-[color:var(--border-soft)] px-2.5 py-1">
                  {formatSourceTimestamp(source.lastUpdated)}
                </span>
                {source.fallbackProviders?.length ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] px-2.5 py-1">
                    Fallbacks: {source.fallbackProviders.join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Regional source strategy
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Provider guidance for {formatSourceRegionScopes(registryContext.scopes)}.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setShowRegistryStrategy((current) => !current)}
            >
              {showRegistryStrategy ? "Hide" : "Show"}
              {showRegistryStrategy ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>

          {showRegistryStrategy ? (
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
                      Fallbacks:{" "}
                      {guidance.fallbacks
                        .slice(0, 2)
                        .map((provider) => provider.name)
                        .join(", ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
