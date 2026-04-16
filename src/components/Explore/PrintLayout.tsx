"use client";

import { type RefObject, useMemo, useState } from "react";
import { toPng } from "html-to-image";
import { FileOutput, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeodataResult, SiteScore } from "@/types";

type PageOrientation = "portrait" | "landscape";
type PageSize = "A4" | "Letter";

interface PrintLayoutProps {
  open: boolean;
  locationName: string;
  profileName: string;
  siteScore: SiteScore | null;
  geodata: GeodataResult | null;
  workspaceContentRef: RefObject<HTMLDivElement | null>;
  captureMapSnapshot: () => Promise<string>;
  onClose: () => void;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function PrintLayout({
  open,
  locationName,
  profileName,
  siteScore,
  geodata,
  workspaceContentRef,
  captureMapSnapshot,
  onClose,
}: PrintLayoutProps) {
  const [orientation, setOrientation] = useState<PageOrientation>("landscape");
  const [pageSize, setPageSize] = useState<PageSize>("Letter");
  const [sections, setSections] = useState({
    mapSnapshot: true,
    siteScoreSummary: true,
    factorBreakdown: true,
    activeCardContents: true,
    sourceTrustSummary: true,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceSummary = useMemo(() => {
    if (!geodata) {
      return [];
    }

    return Object.values(geodata.sources).map((source) => ({
      label: source.label,
      provider: source.provider,
      status: source.status,
      freshness: source.freshness,
      coverage: source.coverage,
      confidence: source.confidence,
    }));
  }, [geodata]);

  if (!open) {
    return null;
  }

  const toggleSection = (key: keyof typeof sections) => {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const generatePrintableDocument = async () => {
    setGenerating(true);
    setError(null);

    try {
      const mapSnapshot = sections.mapSnapshot ? await captureMapSnapshot() : null;
      const activeCardsSnapshot =
        sections.activeCardContents && workspaceContentRef.current
          ? await toPng(workspaceContentRef.current, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: "#08141d",
            })
          : null;

      const factorRows = siteScore
        ? siteScore.factors
            .map(
              (factor) => `
                <tr>
                  <td>${escapeHtml(factor.label)}</td>
                  <td>${factor.score}</td>
                  <td>${factor.weight.toFixed(2)}</td>
                  <td>${escapeHtml(factor.detail)}</td>
                </tr>`,
            )
            .join("")
        : '<tr><td colspan="4">No factor breakdown is available yet.</td></tr>';

      const sourceRows = sourceSummary.length
        ? sourceSummary
            .map(
              (source) => `
                <tr>
                  <td>${escapeHtml(source.label)}</td>
                  <td>${escapeHtml(source.provider)}</td>
                  <td>${escapeHtml(source.status)}</td>
                  <td>${escapeHtml(source.freshness)}</td>
                  <td>${escapeHtml(source.coverage)}</td>
                  <td>${escapeHtml(source.confidence)}</td>
                </tr>`,
            )
            .join("")
        : '<tr><td colspan="6">No source summary is available yet.</td></tr>';

      const printableHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(locationName || "GeoSight print layout")}</title>
    <style>
      @page { size: ${pageSize} ${orientation}; margin: 14mm; }
      body { margin: 0; font-family: Arial, sans-serif; background: white; color: #111827; }
      main { display: grid; gap: 16px; }
      .hero { border-bottom: 2px solid #d1d5db; padding-bottom: 12px; }
      .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; }
      h1 { margin: 4px 0 0; font-size: 24px; }
      h2 { margin: 0 0 10px; font-size: 16px; }
      p { margin: 0; line-height: 1.6; }
      section { border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; break-inside: avoid; }
      img { width: 100%; border-radius: 12px; border: 1px solid #d1d5db; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
      .score { display: flex; align-items: baseline; gap: 10px; }
      .score strong { font-size: 32px; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <main>
      <div class="hero">
        <div class="eyebrow">GeoSight print layout</div>
        <h1>${escapeHtml(locationName || "Active location")}</h1>
        <p class="muted">${escapeHtml(profileName)} · Generated ${new Date().toLocaleString()}</p>
      </div>

      ${
        sections.mapSnapshot && mapSnapshot
          ? `<section><h2>Map snapshot</h2><img src="${mapSnapshot}" alt="GeoSight map snapshot" /></section>`
          : ""
      }

      ${
        sections.siteScoreSummary
          ? `<section>
              <h2>Site score summary</h2>
              ${
                siteScore
                  ? `<div class="score"><strong>${siteScore.total}</strong><span class="muted">out of 100</span></div><p>${escapeHtml(siteScore.recommendation)}</p>`
                  : `<p class="muted">Site score is not available for this location yet.</p>`
              }
            </section>`
          : ""
      }

      ${
        sections.factorBreakdown
          ? `<section>
              <h2>Factor breakdown table</h2>
              <table>
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Score</th>
                    <th>Weight</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>${factorRows}</tbody>
              </table>
            </section>`
          : ""
      }

      ${
        sections.activeCardContents
          ? `<section>
              <h2>Active card contents</h2>
              ${
                activeCardsSnapshot
                  ? `<img src="${activeCardsSnapshot}" alt="Workspace analysis cards" />`
                  : `<p class="muted">No active card surface is available to capture right now.</p>`
              }
            </section>`
          : ""
      }

      ${
        sections.sourceTrustSummary
          ? `<section>
              <h2>Source trust summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Freshness</th>
                    <th>Coverage</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>${sourceRows}</tbody>
              </table>
            </section>`
          : ""
      }
    </main>
  </body>
</html>`;

      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) {
        throw new Error("The browser blocked the print preview window.");
      }

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => {
        printWindow.print();
      }, 250);
      onClose();
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : "The print layout could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,10,18,0.58)] p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close print layout composer"
        onClick={onClose}
      />

      <section className="relative z-10 w-full max-w-3xl rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
          <div>
            <div className="eyebrow">Export</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Print layout composer
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Capture the current globe and assemble a print-ready site brief.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Close print layout composer"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Orientation
              </div>
              <div className="flex gap-2">
                {(["portrait", "landscape"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={orientation === value ? "default" : "secondary"}
                    className="rounded-full"
                    aria-pressed={orientation === value}
                    onClick={() => setOrientation(value)}
                  >
                    {value === "portrait" ? "Portrait" : "Landscape"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Paper size
              </div>
              <div className="flex gap-2">
                {(["A4", "Letter"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={pageSize === value ? "default" : "secondary"}
                    className="rounded-full"
                    aria-pressed={pageSize === value}
                    onClick={() => setPageSize(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Include sections
            </div>
            {(
              [
                ["mapSnapshot", "Map snapshot"],
                ["siteScoreSummary", "Site score summary"],
                ["factorBreakdown", "Factor breakdown table"],
                ["activeCardContents", "Active card contents"],
                ["sourceTrustSummary", "Source trust summary"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={() => toggleSection(key)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div className="px-5 pb-2 text-sm text-[var(--warning-foreground)]">{error}</div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-soft)] px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="rounded-full"
            disabled={generating}
            onClick={() => {
              void generatePrintableDocument();
            }}
          >
            {generating ? (
              <FileOutput className="mr-2 h-4 w-4" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </section>
    </div>
  );
}
