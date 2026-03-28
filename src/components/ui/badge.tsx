import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
