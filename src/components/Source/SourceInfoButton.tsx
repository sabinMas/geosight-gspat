"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { formatSourceTimestamp, summarizeSourceMeta } from "@/lib/source-metadata";
import { DataSourceMeta } from "@/types";

interface SourceInfoButtonProps {
  source: DataSourceMeta;
  title?: string;
}

export function SourceInfoButton({ source, title }: SourceInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!open || !rootRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || rootRef.current.contains(target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
        aria-label={`Show source details for ${title ?? source.label}`}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 text-left shadow-[var(--shadow-panel)]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {title ?? source.label}
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
            {source.provider}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--foreground-soft)]">
            {summarizeSourceMeta(source)}
          </div>
          <div className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
            Refresh policy: {source.freshness}
          </div>
          <div className="text-xs leading-5 text-[var(--muted-foreground)]">
            {formatSourceTimestamp(source.lastUpdated)}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {source.confidence}
          </div>
          {source.note ? (
            <div className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
              {source.note}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
