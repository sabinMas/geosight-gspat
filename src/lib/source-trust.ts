import { DataSourceMeta } from "@/types";

export type TrustPanelTone =
  | "ready"
  | "partial"
  | "unavailable"
  | "estimated"
  | "cached";

export interface TrustPanelSummary {
  tone: TrustPanelTone;
  badgeLabel: string;
  title: string;
  description: string;
}

export type GeneratedTrustMode = "live" | "fallback" | "deterministic" | "timeout";

function normalizeSources(sources: Array<DataSourceMeta | null | undefined>) {
  return sources.filter((source): source is DataSourceMeta => Boolean(source));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildBadgeLabel(sources: DataSourceMeta[]) {
  const liveCount = sources.filter((source) => source.status === "live").length;
  const derivedCount = sources.filter((source) => source.status === "derived").length;
  const limitedCount = sources.filter((source) => source.status === "limited").length;
  const unavailableCount = sources.filter((source) => source.status === "unavailable").length;

  return [
    liveCount ? pluralize(liveCount, "live source") : null,
    derivedCount ? pluralize(derivedCount, "derived signal") : null,
    limitedCount ? pluralize(limitedCount, "limited source") : null,
    unavailableCount ? pluralize(unavailableCount, "missing source") : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatSourceNames(sources: DataSourceMeta[]) {
  if (sources.length === 0) {
    return "";
  }

  if (sources.length === 1) {
    return sources[0].label;
  }

  if (sources.length === 2) {
    return `${sources[0].label} and ${sources[1].label}`;
  }

  return `${sources
    .slice(0, -1)
    .map((source) => source.label)
    .join(", ")}, and ${sources[sources.length - 1].label}`;
}

export function summarizeSourceTrust(
  rawSources: Array<DataSourceMeta | null | undefined>,
  subject = "this view",
): TrustPanelSummary {
  const sources = normalizeSources(rawSources);

  if (sources.length === 0) {
    return {
      tone: "unavailable",
      badgeLabel: "Source metadata unavailable",
      title: `GeoSight does not have source metadata for ${subject} yet`,
      description:
        "The card can still render partial context, but the provenance bundle for this result is not ready yet.",
    };
  }

  const liveSources = sources.filter((source) => source.status === "live");
  const derivedSources = sources.filter((source) => source.status === "derived");
  const limitedSources = sources.filter((source) => source.status === "limited");
  const unavailableSources = sources.filter((source) => source.status === "unavailable");
  const badgeLabel = buildBadgeLabel(sources);

  if (unavailableSources.length === sources.length) {
    return {
      tone: "unavailable",
      badgeLabel,
      title: `${subject} is not currently backed by an active source`,
      description:
        "GeoSight is keeping the gap visible instead of fabricating a result. Treat this card as unsupported until coverage returns.",
    };
  }

  if (limitedSources.length > 0 || unavailableSources.length > 0) {
    const constrainedSources = [...limitedSources, ...unavailableSources];
    return {
      tone: "partial",
      badgeLabel,
      title: `${subject} is grounded, but some inputs are incomplete`,
      description: `${formatSourceNames(
        constrainedSources,
      )} ${constrainedSources.length === 1 ? "is" : "are"} limited or unavailable, so this card should stay at screening depth rather than final diligence depth.`,
    };
  }

  if (liveSources.length === 0 && derivedSources.length > 0) {
    return {
      tone: "ready",
      badgeLabel,
      title: `${subject} is built from derived live analysis`,
      description:
        "The values shown here are calculated from live or recently refreshed inputs rather than returned as one raw field.",
    };
  }

  if (derivedSources.length > 0) {
    return {
      tone: "ready",
      badgeLabel,
      title: `${subject} blends live measurements and derived context`,
      description:
        "GeoSight is combining direct provider responses with derived interpretation, while keeping the boundary between them visible.",
    };
  }

  return {
    tone: "ready",
    badgeLabel,
    title: `${subject} is backed by live source coverage`,
    description:
      "The current read comes straight from active providers or live lookups for this place.",
  };
}

export function summarizeGeneratedTrust(
  mode: GeneratedTrustMode,
  rawSources: Array<DataSourceMeta | null | undefined>,
  subject: string,
): TrustPanelSummary {
  const sources = normalizeSources(rawSources);
  const sourceSummary = summarizeSourceTrust(sources, subject);

  if (mode === "fallback") {
    return {
      tone: "estimated",
      badgeLabel: "Fallback synthesis",
      title: `${subject} is using GeoSight's grounded fallback writer`,
      description:
        "A live model was unavailable, so GeoSight assembled this output from the current structured location bundle and source metadata. Use it for screening and next-step planning, not as final diligence.",
    };
  }

  if (mode === "deterministic") {
    return {
      tone: "estimated",
      badgeLabel: "Deterministic synthesis",
      title: `${subject} is using GeoSight's deterministic interpretation layer`,
      description:
        "This output was generated directly from the loaded geospatial context without a live model call. It stays grounded, but it is intentionally conservative and formula-driven.",
    };
  }

  if (mode === "timeout") {
    return {
      tone: "partial",
      badgeLabel: "Live timeout",
      title: `${subject} timed out before a live model completed`,
      description:
        "GeoSight did not get a usable live model response in time. Retry the live request instead of treating this as a grounded fallback synthesis.",
    };
  }

  return {
    tone: sourceSummary.tone,
    badgeLabel: sourceSummary.badgeLabel || "Live grounded output",
    title: `${subject} is grounded in the current GeoSight context`,
    description:
      sourceSummary.tone === "partial"
        ? `${sourceSummary.description} The written output should be read alongside those gaps.`
        : "The answer is tied to the currently loaded live and derived location inputs, and it should call out missing coverage rather than filling it in.",
  };
}
