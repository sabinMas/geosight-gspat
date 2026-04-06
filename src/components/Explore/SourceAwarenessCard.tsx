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
import { DataSourceMeta, DataSourceStatus, GeodataResult } from "@/types";

const STATUS_ORDER: DataSourceStatus[] = ["live", "derived", "limited", "unavailable"];

function CoverageAtAGlance({ sources }: { sources: Record<string, DataSourceMeta> }) {
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: Object.values(sources).filter((s) => s.status === status),
  })).filter((g) => g.items.length > 0);

  const statusDot: Record<DataSourceStatus, string> = {
    live: "bg-[var(--success-border)]",
    derived: "bg-[var(--accent)]",
    limited: "bg-[var(--warning-border)]",
    unavailable: "bg-[var(--muted-foreground)] opacity-40",
    demo: "bg-[var(--muted-foreground)] opacity-40",
  };

  return (
    <div className="space-y-3">
      {grouped.map(({ status, items }) => (
        <div key={status}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusDot[status]}`} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)] capitalize">
              {status} ({items.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((s) => (
              <span
                key={s.id}
                className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--foreground)]"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SourceAwarenessCardProps {
  geodata: GeodataResult | null;
}

export function SourceAwarenessCard({ geodata }: SourceAwarenessCardProps) {
  const [showRegistryStrategy, setShowRegistryStrategy] = useState(false);
  const [showSourceDetails, setShowSourceDetails] = useState(false);

  if (!geodata) {
    return null;
  }

  const registryContext = inferSourceRegistryContextFromGeodata(geodata);
  const registryPreview = buildSourceRegistryPreview(registryContext);
  const activeProviderSummary = Object.values(geodata.sources)
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") {
        return -1;
      }
      if (a.status !== "live" && b.status === "live") {
        return 1;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Trust and provenance</div>
        <CardTitle>Source awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="mb-3 text-sm font-semibold text-[var(--foreground)]">Coverage at a glance</div>
          <CoverageAtAGlance sources={geodata.sources} />
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <SourceStatusBadge
              source={{
                id: "live",
                label: "Live",
                provider: "GeoSight",
                status: "live",
                lastUpdated: null,
                freshness: "",
                coverage: "",
                confidence: "",
              }}
            />
            <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
              Directly returned from a live source or live lookup.
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <SourceStatusBadge
              source={{
                id: "derived",
                label: "Derived",
                provider: "GeoSight",
                status: "derived",
                lastUpdated: null,
                freshness: "",
                coverage: "",
                confidence: "",
              }}
            />
            <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
              Calculated from live inputs rather than taken from one raw feed.
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <SourceStatusBadge
              source={{
                id: "limited",
                label: "Limited",
                provider: "GeoSight",
                status: "limited",
                lastUpdated: null,
                freshness: "",
                coverage: "",
                confidence: "",
              }}
            />
            <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
              Partially supported here, often because of provider or region limits.
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <SourceStatusBadge
              source={{
                id: "unavailable",
                label: "Unavailable",
                provider: "GeoSight",
                status: "unavailable",
                lastUpdated: null,
                freshness: "",
                coverage: "",
                confidence: "",
              }}
            />
            <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
              Not returned or unsupported for this location, so GeoSight leaves the gap visible.
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
          <div className="text-sm font-semibold text-[var(--foreground)]">Active regional providers</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {activeProviderSummary.map((source) => (
              <div
                key={`provider-${source.id}`}
                className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-2"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {source.label}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
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

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[var(--foreground)]">Detailed source cards</div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setShowSourceDetails((v) => !v)}
            >
              {showSourceDetails ? "Hide" : "Show"}
              {showSourceDetails ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
          {showSourceDetails && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.values(geodata.sources).map((source) => (
                <div
                  key={source.id}
                  className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--foreground)]">
                        {source.label}
                      </div>
                      <div className="mt-1 line-clamp-3 text-xs text-[var(--muted-foreground)]">
                        {summarizeSourceMeta(source)}
                      </div>
                    </div>
                    <SourceStatusBadge source={source} />
                  </div>

                  <div className="mt-3 text-xs leading-5 text-[var(--foreground-soft)]">
                    {source.confidence}
                  </div>
                  {source.note ? (
                    <div className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--muted-foreground)]">
                      {source.note}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
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
          )}
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
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
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
