"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PersistentAiBarProps {
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (question: string) => void;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

export function PersistentAiBar({
  disabled = false,
  loading = false,
  onSubmit,
}: PersistentAiBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [question, setQuestion] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Collapse when clicking outside
  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  // "/" shortcut to expand and focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        setExpanded(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 60);
      }

      if (event.key === "Escape" && expanded) {
        setExpanded(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [expanded]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled || loading) {
      return;
    }

    onSubmit(trimmed);
    setQuestion("");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!disabled) setExpanded(true);
        }}
        disabled={disabled}
        title="Ask GeoSight about this place (press /)"
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]",
          disabled && "cursor-default opacity-50",
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
        <span className="hidden sm:inline">Ask GeoSight about this place</span>
        <span className="sm:hidden">Ask GeoSight</span>
        <span className="ml-1 hidden rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] xl:inline-flex">
          /
        </span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 flex-col gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 items-center gap-2"
        aria-label="Ask GeoSight from anywhere in the workspace"
      >
        <div className="relative min-w-0 flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
          <Input
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about this place…"
            aria-label="Ask GeoSight about the active place"
            disabled={disabled}
            className="h-10 rounded-full bg-[var(--surface-soft)] pl-9 pr-3 shadow-none focus-visible:ring-[var(--accent)]/40"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="h-10 shrink-0 rounded-full px-4"
          disabled={disabled || loading || !question.trim()}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {loading ? "Sending" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
