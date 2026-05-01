import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--muted-foreground)] transition-all duration-200 focus:border-[var(--border-strong)] focus:bg-[var(--surface-raised)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] focus:shadow-[var(--shadow-panel)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
