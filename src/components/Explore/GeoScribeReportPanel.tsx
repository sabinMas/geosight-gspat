"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Copy, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeoScribeReportPanelProps {
  open: boolean;
  locationName: string;
  loading: boolean;
  error: string | null;
  markdown: string;
  onClose: () => void;
}

function parseMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let bulletItems: string[] = [];

  const flushBullets = () => {
    if (!bulletItems.length) {
      return;
    }

    const items = bulletItems;
    bulletItems = [];
    nodes.push(
      <ul
        key={`list-${nodes.length}`}
        className="space-y-2 pl-5 text-sm leading-7 text-[var(--foreground-soft)]"
      >
        {items.map((item, index) => (
          <li key={`item-${index}`} className="list-disc">
            {item}
          </li>
        ))}
      </ul>,
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletItems.push(trimmed.slice(2).trim());
      return;
    }

    flushBullets();

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1
          key={`h1-${index}`}
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          {trimmed.slice(2).trim()}
        </h1>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2
          key={`h2-${index}`}
          className="pt-2 text-lg font-semibold text-[var(--foreground)]"
        >
          {trimmed.slice(3).trim()}
        </h2>,
      );
      return;
    }

    nodes.push(
      <p key={`p-${index}`} className="text-sm leading-7 text-[var(--foreground-soft)]">
        {trimmed}
      </p>,
    );
  });

  flushBullets();
  return nodes;
}

export function GeoScribeReportPanel({
  open,
  locationName,
  loading,
  error,
  markdown,
  onClose,
}: GeoScribeReportPanelProps) {
  const [copied, setCopied] = useState(false);
  const renderedMarkdown = useMemo(() => parseMarkdown(markdown), [markdown]);

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close GeoScribe report"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-[760px] flex-col border-l border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
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
          </div>

          <div className="flex items-center gap-2">
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
          {loading ? (
            <div className="flex h-full min-h-[240px] items-center justify-center">
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-sm text-[var(--foreground-soft)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
                  <span>Generating a structured report from the live GeoSight context...</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger-foreground)]">
              {error}
            </div>
          ) : markdown ? (
            <div className="space-y-4">{renderedMarkdown}</div>
          ) : (
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Generate a report to turn the current geospatial context into a shareable written assessment.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
