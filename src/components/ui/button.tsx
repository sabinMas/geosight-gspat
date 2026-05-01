import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full border text-sm font-medium transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] hover:opacity-95",
        secondary:
          "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]",
        ghost:
          "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
        amber:
          "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)] hover:bg-[var(--warning-hover)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
