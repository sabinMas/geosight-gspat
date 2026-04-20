"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageSquareText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [question, setQuestion] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled || loading) {
      return;
    }

    onSubmit(trimmed);
    setQuestion("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 items-center gap-2"
      aria-label="Ask GeoSight from anywhere in the workspace"
    >
      <div className="relative min-w-0 flex-1">
        <MessageSquareText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          ref={inputRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask GeoSight anything about this place"
          aria-label="Ask GeoSight about the active place"
          disabled={disabled}
          className="h-11 rounded-full bg-[var(--surface-soft)] pl-9 pr-24 shadow-none focus-visible:ring-[var(--accent)]/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-2 py-0.5 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)] xl:inline-flex">
          /
        </span>
      </div>

      <Button
        type="submit"
        size="sm"
        className="h-11 shrink-0 rounded-full px-4"
        disabled={disabled || loading || !question.trim()}
      >
        <Send className="mr-1.5 h-3.5 w-3.5" />
        {loading ? "Sending" : "Ask"}
      </Button>

      <div role="status" aria-live="polite" className="sr-only">
        {loading ? "Sending question to GeoSight" : ""}
      </div>
    </form>
  );
}
