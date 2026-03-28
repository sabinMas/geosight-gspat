import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--muted-foreground)] transition focus:border-[var(--border-strong)] focus:bg-[var(--surface-raised)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
