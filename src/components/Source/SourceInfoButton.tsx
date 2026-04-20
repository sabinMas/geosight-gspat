"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { formatSourceTimestamp, summarizeSourceMeta } from "@/lib/source-metadata";
import { DataSourceMeta } from "@/types";

interface SourceInfoButtonProps {
  source: DataSourceMeta;
  title?: string;
}

interface PopoverPos {
  top: number;
  left: number;
  transformOrigin: string;
}

export function SourceInfoButton({ source, title }: SourceInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const reposition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 288; // w-72
    const spaceRight = window.innerWidth - rect.right;
    const alignRight = spaceRight < popoverWidth + 8;
    setPos({
      top: rect.bottom + 8,
      left: alignRight ? rect.right - popoverWidth : rect.left,
      transformOrigin: alignRight ? "top right" : "top left",
    });
  }, []);

  const openPopover = useCallback(() => {
    reposition();
    setOpen(true);
  }, [reposition]);

  useEffect(() => {
    if (!open) return;

    const handleClose = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleScroll = () => setOpen(false);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("touchstart", handleClose);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("touchstart", handleClose);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const popover = open && pos ? createPortal(
    <div
      ref={popoverRef}
      role="tooltip"
      style={{ position: "fixed", top: pos.top, left: pos.left, transformOrigin: pos.transformOrigin }}
      className="z-[9999] w-72 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 text-left shadow-[var(--shadow-panel)]"
    >
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
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
        aria-label={`Show source details for ${title ?? source.label}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? setOpen(false) : openPopover())}
        onMouseEnter={openPopover}
        onMouseLeave={() => setOpen(false)}
        onFocus={openPopover}
        onBlur={() => setOpen(false)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {popover}
    </>
  );
}
