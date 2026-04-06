"use client";

import { useEffect, useState } from "react";
import { Copy, Download, FileJson, FileText, Loader2, X } from "lucide-react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Button } from "@/components/ui/button";
import {
  buildExportFilename,
  downloadJsonFile,
  downloadTextFile,
} from "@/lib/export";
import { summarizeGeneratedTrust } from "@/lib/source-trust";
import { AgentExecutionMode, DataSourceMeta } from "@/types";

interface GeoScribeReportPanelProps {
  open: boolean;
  locationName: string;
  loading: boolean;
  error: string | null;
  markdown: string;
  mode: AgentExecutionMode | null;
  generatedAt: string | null;
  sources: Array<DataSourceMeta | null | undefined>;
  sourceNotes: string[];
  onClose: () => void;
}

export function GeoScribeReportPanel({
  open,
  locationName,
  loading,
  error,
  markdown,
  mode,
  generatedAt,
  sources,
  sourceNotes,
  onClose,
}: GeoScribeReportPanelProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    setCopied(false);
  }, [markdown, open]);

  const exportParts = ["geosight", locationName || "active-location", "report"];
  const trustSummary =
    mode && markdown
      ? summarizeGeneratedTrust(mode, sources, "GeoScribe report")
      : null;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(4,10,18,0.58)]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close GeoScribe report"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-[760px] flex-col border-l border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div className="eyebrow">GeoScribe report</div>
            <div className="mt-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Site assessment report
              </h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {locationName || "Active location"}
            </p>
            {generatedAt ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Generated {new Date(generatedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={!markdown || loading}
              onClick={() => {
                if (!markdown) {
                  return;
                }

                downloadTextFile(
                  markdown,
                  buildExportFilename(exportParts, "md"),
                  "text/markdown;charset=utf-8",
                );
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download .md
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={!markdown || loading}
              onClick={() => {
                if (!markdown) {
                  return;
                }

                downloadJsonFile(
                  {
                    title: "Site assessment report",
                    locationName: locationName || "Active location",
                    exportedAt: new Date().toISOString(),
                    generationMode: mode,
                    generatedAt,
                    markdown,
                  },
                  buildExportFilename(exportParts, "json"),
                );
              }}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={!markdown || loading}
              onClick={async () => {
                if (!markdown) {
                  return;
                }

                await navigator.clipboard.writeText(markdown);
                setCopied(true);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onClose}
              aria-label="Close GeoScribe report"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading && !markdown ? (
            <div className="flex h-full min-h-[240px] items-center justify-center">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-sm text-[var(--foreground-soft)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
                  <span>Generating a structured report from the live GeoSight context...</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <StatePanel
              tone="error"
              eyebrow="Report generation"
              title="GeoScribe could not generate the report"
              description={error}
            />
          ) : markdown ? (
            <div className="space-y-5">
              {trustSummary ? (
                <TrustSummaryPanel
                  summary={trustSummary}
                  sources={sources}
                  eyebrow="Report trust"
                  note={
                    sourceNotes.length
                      ? sourceNotes.slice(0, 2).join(" ")
                      : "Use this report as a decision-support artifact tied to the current GeoSight context, not as a substitute for final engineering, regulatory, or site diligence."
                  }
                />
              ) : null}
              <MarkdownContent content={markdown} className="space-y-4" />
              {loading ? (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--accent)] align-middle" />
              ) : null}
            </div>
          ) : (
            <StatePanel
              tone="cached"
              eyebrow="Report generation"
              title="Generate a report when you are ready to export the story"
              description="GeoScribe turns the current geospatial context into a shareable written assessment with an executive summary, findings, caveats, and next diligence steps."
            />
          )}
        </div>
      </aside>
    </div>
  );
}
