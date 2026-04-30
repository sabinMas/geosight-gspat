import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] backdrop-blur-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 flex-col gap-2 p-4 sm:p-4", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "line-clamp-2 min-w-0 text-base font-semibold tracking-tight text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 px-4 pb-4 sm:px-4 sm:pb-4", className)} {...props} />;
}

export { Card, CardContent, CardHeader, CardTitle };
