import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--muted-foreground)] transition focus:border-[var(--border-strong)] focus:bg-[var(--surface-raised)]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
