import {
  DataSourceMeta,
  DataSourceStatus,
  SourceDomain,
  SourceRegistryContext,
} from "@/types";
import { getSourceProviderGuidance } from "@/lib/source-registry";

export function buildSourceMeta(input: {
  id: string;
  label: string;
  provider: string;
  status: DataSourceStatus;
  freshness: string;
  coverage: string;
  confidence: string;
  note?: string;
  lastUpdated?: string | null;
  domain?: SourceDomain;
  accessType?: DataSourceMeta["accessType"];
  regionScopes?: DataSourceMeta["regionScopes"];
  fallbackProviders?: string[];
}): DataSourceMeta {
  return {
    id: input.id,
    label: input.label,
    provider: input.provider,
    status: input.status,
    freshness: input.freshness,
    coverage: input.coverage,
    confidence: input.confidence,
    note: input.note,
    lastUpdated: input.lastUpdated ?? new Date().toISOString(),
    domain: input.domain,
    accessType: input.accessType,
    regionScopes: input.regionScopes,
    fallbackProviders: input.fallbackProviders,
  };
}

export function buildRegistryAwareSourceMeta(
  input: Parameters<typeof buildSourceMeta>[0] & {
    domain: SourceDomain;
    context: SourceRegistryContext;
  },
) {
  const guidance = getSourceProviderGuidance(input.domain, input.context);
  const activeProvider =
    guidance.primary?.name === input.provider
      ? guidance.primary
      : guidance.primary && input.provider.includes(guidance.primary.name)
        ? guidance.primary
        : null;

  return buildSourceMeta({
    ...input,
    accessType: input.accessType ?? activeProvider?.accessType,
    regionScopes: input.regionScopes ?? guidance.context.scopes,
    fallbackProviders:
      input.fallbackProviders ??
      guidance.fallbacks.slice(0, 3).map((provider) => provider.name),
  });
}

export function summarizeSourceMeta(meta: DataSourceMeta) {
  const parts = [meta.provider, meta.freshness, meta.coverage];

  return parts.filter(Boolean).join(" / ");
}

export function formatSourceTimestamp(lastUpdated: string | null) {
  if (!lastUpdated) {
    return "Update time unavailable";
  }

  const parsed = new Date(lastUpdated);
  if (Number.isNaN(parsed.getTime())) {
    return "Update time unavailable";
  }

  return `Updated ${parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function formatSourceStatusLabel(status: DataSourceStatus) {
  switch (status) {
    case "live":
      return "Live";
    case "derived":
      return "Derived";
    case "limited":
      return "Limited";
    case "demo":
      return "Demo";
    case "unavailable":
      return "Unavailable";
    default:
      return status;
  }
}

export function getSourceStatusTone(status: DataSourceStatus) {
  switch (status) {
    case "live":
      return "border-emerald-300/20 bg-emerald-400/8 text-emerald-50";
    case "derived":
      return "border-cyan-300/20 bg-cyan-400/8 text-cyan-50";
    case "limited":
      return "border-amber-300/20 bg-amber-400/10 text-amber-50";
    case "demo":
      return "border-sky-300/20 bg-sky-400/10 text-sky-50";
    case "unavailable":
      return "border-rose-300/20 bg-rose-400/10 text-rose-50";
    default:
      return "border-white/10 bg-white/5 text-slate-100";
  }
}
