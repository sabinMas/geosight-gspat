"use client";

import { Sparkles, X } from "lucide-react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Button } from "@/components/ui/button";
import { getCapabilitySources } from "@/lib/analysis-capabilities";
import { summarizeGeneratedTrust } from "@/lib/source-trust";
import {
  AnalysisCapability,
  AnalysisCapabilityId,
  AnalysisCapabilityResult,
  GeodataResult,
} from "@/types";

interface CapabilityLauncherProps {
  capabilities: AnalysisCapability[];
  loading: boolean;
  error: string | null;
  result: AnalysisCapabilityResult | null;
  geodata: GeodataResult | null;
  onRun: (analysisId: AnalysisCapabilityId) => void;
  onClear: () => void;
}

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CapabilityLauncher({
  capabilities,
  loading,
  error,
  result,
  geodata,
  onRun,
  onClear,
}: CapabilityLauncherProps) {
  if (!capabilities.length && !result && !loading && !error) {
    return null;
  }

  const resultSources = result ? getCapabilitySources(result.analysisId, geodata) : [];
  const resultTrustSummary = result
    ? summarizeGeneratedTrust(result.mode, resultSources, result.title)
    : null;

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">AI analysis</div>
          <div className="mt-2 text-base font-semibold text-[var(--foreground)]">
            Run the scientific interpretations GeoSight can support right now
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            GeoSight scans the loaded data first, then exposes only the analyses
            that are actually grounded for this place.
          </p>
        </div>
        {result ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={onClear}
          >
            <X className="mr-2 h-4 w-4" />
            Clear result
          </Button>
        ) : null}
      </div>

      {capabilities.length ? (
        <div className="flex flex-wrap gap-2">
          {capabilities.map((capability) => {
            const isDisabled = loading || !capability.available;
            return (
              <span
                key={capability.analysisId}
                title={isDisabled ? capability.reason : undefined}
                className={isDisabled ? "cursor-not-allowed opacity-60" : undefined}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={capability.recommended ? "default" : "secondary"}
                  className={capability.recommended ? "rounded-full border-[1.5px] border-[var(--accent-strong)]" : "rounded-full"}
                  disabled={isDisabled}
                  onClick={() => onRun(capability.analysisId)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {capability.title}
                </Button>
              </span>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[1.25rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
          GeoSight is interpreting the current scientific context...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.25rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="eyebrow">Latest interpretation</div>
              <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {result.title}
              </div>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {result.model} lane | {formatGeneratedAt(result.generatedAt)}
            </div>
          </div>
          {resultTrustSummary ? (
            <TrustSummaryPanel
              className="mt-4"
              eyebrow="Interpretation status"
              summary={resultTrustSummary}
              sources={resultSources}
              note="GeoSight only exposes these interpretation actions when there is enough supporting context to make the result useful."
            />
          ) : null}
          <div className="mt-4 text-sm leading-7 text-[var(--foreground-soft)]">
            <MarkdownContent content={result.response} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
