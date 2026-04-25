"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("min-w-0 max-w-full break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className: markdownClassName, ...props }) => (
            <h1
              className={cn(
                "text-2xl font-semibold tracking-tight text-[var(--foreground)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          h2: ({ className: markdownClassName, ...props }) => (
            <h2
              className={cn(
                "pt-2 text-lg font-semibold text-[var(--foreground)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          h3: ({ className: markdownClassName, ...props }) => (
            <h3
              className={cn(
                "text-base font-semibold text-[var(--foreground)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          p: ({ className: markdownClassName, ...props }) => (
            <p
              className={cn(
                // No whitespace-pre-wrap: it preserves stray \n from streaming
                // chunks and forces one-word-per-line in narrow columns.
                "text-sm leading-7 text-[var(--foreground-soft)] break-words",
                markdownClassName,
              )}
              {...props}
            />
          ),
          ul: ({ className: markdownClassName, ...props }) => (
            <ul
              className={cn(
                "list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--foreground-soft)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          ol: ({ className: markdownClassName, ...props }) => (
            <ol
              className={cn(
                "list-decimal space-y-2 pl-5 text-sm leading-7 text-[var(--foreground-soft)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          li: ({ className: markdownClassName, ...props }) => (
            <li className={cn(markdownClassName)} {...props} />
          ),
          blockquote: ({ className: markdownClassName, ...props }) => (
            <blockquote
              className={cn(
                "border-l-2 border-[color:var(--border-strong)] pl-4 text-sm italic text-[var(--muted-foreground)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          a: ({ className: markdownClassName, ...props }) => (
            <a
              className={cn(
                "font-medium text-[var(--accent)] underline underline-offset-4",
                markdownClassName,
              )}
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          pre: ({ className: markdownClassName, ...props }) => (
            <pre
              className={cn(
                "overflow-x-auto rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 text-xs leading-6 text-[var(--foreground-soft)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          code: ({ className: markdownClassName, ...props }) => (
            <code
              className={cn(
                "rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[0.95em] text-[var(--foreground)]",
                markdownClassName,
              )}
              {...props}
            />
          ),
          strong: ({ className: markdownClassName, ...props }) => (
            <strong className={cn("font-semibold text-[var(--foreground)]", markdownClassName)} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
