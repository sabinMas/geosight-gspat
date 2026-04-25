import type { Metadata } from "next";
import {
  CloudSun,
  MapPin,
  Users,
  Home,
  AlertTriangle,
  Droplets,
  Wind,
  GraduationCap,
  Wifi,
  Mountain,
  Satellite,
  ArrowLeft,
} from "lucide-react";
import {
  SOURCE_PROVIDER_REGISTRY,
  SOURCE_DOMAIN_LABELS,
  SOURCE_REGION_LABELS,
} from "@/lib/source-registry";
import type { SourceDomain, SourceRegionScope, SourceAccessType } from "@/types";
import Link from "next/link";
import { Footer } from "@/components/Landing/Footer";

export const metadata: Metadata = {
  title: "Data Sources — GeoSight",
  description:
    "Every data provider GeoSight pulls from — terrain, climate, hazards, demographics, and more. Fully transparent about where the intelligence comes from.",
};

const DOMAIN_ORDER: SourceDomain[] = [
  "weather",
  "terrain",
  "hazards",
  "hydrology",
  "environmental",
  "demographics",
  "housing",
  "schools",
  "broadband",
  "nearby_places",
  "imagery",
];

const DOMAIN_ICONS: Record<SourceDomain, React.ReactNode> = {
  weather: <CloudSun className="h-4 w-4" />,
  nearby_places: <MapPin className="h-4 w-4" />,
  demographics: <Users className="h-4 w-4" />,
  housing: <Home className="h-4 w-4" />,
  hazards: <AlertTriangle className="h-4 w-4" />,
  hydrology: <Droplets className="h-4 w-4" />,
  environmental: <Wind className="h-4 w-4" />,
  schools: <GraduationCap className="h-4 w-4" />,
  broadband: <Wifi className="h-4 w-4" />,
  terrain: <Mountain className="h-4 w-4" />,
  imagery: <Satellite className="h-4 w-4" />,
};

const ACCESS_TYPE_LABELS: Record<SourceAccessType, string> = {
  api: "API",
  dataset: "Dataset",
  catalog: "Catalog",
  tile_service: "Tile service",
  derived: "Derived",
};

function groupByPrimaryDomain(): Map<SourceDomain, typeof SOURCE_PROVIDER_REGISTRY> {
  const map = new Map<SourceDomain, typeof SOURCE_PROVIDER_REGISTRY>();
  for (const domain of DOMAIN_ORDER) {
    map.set(domain, []);
  }
  // Each provider goes under its first listed domain
  for (const provider of SOURCE_PROVIDER_REGISTRY) {
    const primary = provider.domains[0];
    if (map.has(primary)) {
      map.get(primary)!.push(provider);
    }
  }
  return map;
}

function CoveragePill({ scope }: { scope: SourceRegionScope }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
        bg-[var(--accent-soft)] border border-[color:var(--accent-strong)] text-[var(--accent)]
        cursor-default pointer-events-none select-none"
    >
      {SOURCE_REGION_LABELS[scope]}
    </span>
  );
}

function StatusPill({ integrated }: { integrated: boolean }) {
  return integrated ? (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
        bg-[var(--success-soft)] border border-[color:var(--success-border)] text-[var(--foreground)]
        cursor-default pointer-events-none select-none"
    >
      Live
    </span>
  ) : (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
        bg-[var(--surface-soft)] border border-[color:var(--border-soft)] text-[var(--muted-foreground)]
        cursor-default pointer-events-none select-none"
    >
      Planned
    </span>
  );
}

function AccessTypePill({ type }: { type: SourceAccessType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]
        bg-[var(--surface-soft)] border border-[color:var(--border-soft)] text-[var(--muted-foreground)]
        cursor-default pointer-events-none select-none"
    >
      {ACCESS_TYPE_LABELS[type]}
    </span>
  );
}

export default function SourcesPage() {
  const grouped = groupByPrimaryDomain();
  const totalProviders = SOURCE_PROVIDER_REGISTRY.length;
  const integratedCount = SOURCE_PROVIDER_REGISTRY.filter((p) => p.integrated).length;
  const globalCount = SOURCE_PROVIDER_REGISTRY.filter((p) =>
    p.coverage.includes("global"),
  ).length;
  const domainCount = DOMAIN_ORDER.filter((d) => (grouped.get(d)?.length ?? 0) > 0).length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Back nav */}
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3 w-3" />
          GeoSight
        </Link>
      </div>

      {/* Header */}
      <header className="mx-auto max-w-5xl px-6 pt-10 pb-8">
        <div className="eyebrow mb-3">Data Sources</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          The intelligence behind every analysis
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--foreground-soft)]">
          GeoSight aggregates {integratedCount} live data sources across terrain, climate, hazards,
          demographics, and more. Here&rsquo;s everything we pull from.
        </p>

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
              bg-[var(--surface-raised)] border border-[color:var(--border-soft)] text-[var(--foreground-soft)]
              cursor-default pointer-events-none select-none"
          >
            {integratedCount} integrated sources
          </span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
              bg-[var(--surface-raised)] border border-[color:var(--border-soft)] text-[var(--foreground-soft)]
              cursor-default pointer-events-none select-none"
          >
            {globalCount} with global coverage
          </span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
              bg-[var(--surface-raised)] border border-[color:var(--border-soft)] text-[var(--foreground-soft)]
              cursor-default pointer-events-none select-none"
          >
            {domainCount} domains
          </span>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
              bg-[var(--surface-raised)] border border-[color:var(--border-soft)] text-[var(--foreground-soft)]
              cursor-default pointer-events-none select-none"
          >
            {totalProviders} total providers
          </span>
        </div>
      </header>

      {/* Provider grid by domain */}
      <main className="mx-auto max-w-5xl px-6 pb-20 space-y-12">
        {DOMAIN_ORDER.map((domain) => {
          const providers = grouped.get(domain) ?? [];
          if (providers.length === 0) return null;
          return (
            <section key={domain}>
              {/* Domain heading */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[var(--muted-foreground)]">
                  {DOMAIN_ICONS[domain]}
                </span>
                <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {SOURCE_DOMAIN_LABELS[domain]}
                </h2>
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 flex flex-col gap-3"
                  >
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {provider.url ? (
                          <a
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors leading-tight"
                          >
                            {provider.name}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-[var(--foreground)] leading-tight">
                            {provider.name}
                          </span>
                        )}
                      </div>
                      <StatusPill integrated={provider.integrated} />
                    </div>

                    {/* Notes */}
                    <p className="text-xs leading-5 text-[var(--muted-foreground)] line-clamp-2">
                      {provider.notes}
                    </p>

                    {/* Footer pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                      <AccessTypePill type={provider.accessType} />
                      {provider.coverage.map((scope) => (
                        <CoveragePill key={scope} scope={scope} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}
