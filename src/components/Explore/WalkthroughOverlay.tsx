"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WalkthroughStep } from "@/lib/demos/walkthrough";

interface WalkthroughOverlayProps {
  open: boolean;
  steps: WalkthroughStep[];
  onClose: () => void;
}

function findTarget(target: string) {
  return (
    document.querySelector<HTMLElement>(`[data-walkthrough="${target}"]`) ??
    document.getElementById(target)
  );
}

export function WalkthroughOverlay({
  open,
  steps,
  onClose,
}: WalkthroughOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const activeStep = steps[stepIndex] ?? null;

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      if (!activeStep) {
        setTargetRect(null);
        return;
      }

      const target = findTarget(activeStep.target);
      setTargetRect(target?.getBoundingClientRect() ?? null);
    };

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [activeStep, open]);

  const highlightStyle = useMemo(() => {
    if (!targetRect) {
      return null;
    }

    return {
      left: Math.max(targetRect.left - 12, 8),
      top: Math.max(targetRect.top - 12, 8),
      width: Math.min(targetRect.width + 24, window.innerWidth - 16),
      height: targetRect.height + 24,
      boxShadow: "0 0 0 9999px rgba(4, 10, 18, 0.74)",
    };
  }, [targetRect]);

  const cardStyle = useMemo(() => {
    if (!targetRect) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }

    const width = Math.min(380, window.innerWidth - 32);
    const left = Math.min(
      Math.max(targetRect.left, 16),
      Math.max(16, window.innerWidth - width - 16),
    );
    const top = targetRect.bottom + 20;
    const placeAbove = top + 240 > window.innerHeight && targetRect.top > 280;

    return placeAbove
      ? {
          left,
          top: Math.max(targetRect.top - 236, 16),
        }
      : {
          left,
          top: Math.min(top, window.innerHeight - 236),
        };
  }, [targetRect]);

  if (!open || !activeStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95]">
      {highlightStyle ? (
        <div
          className="pointer-events-none fixed rounded-[1.75rem] border border-[color:var(--accent-strong)] bg-transparent transition-all duration-300"
          style={highlightStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(4,10,18,0.74)]" />
      )}

      <section
        className="absolute z-10 w-[min(380px,calc(100vw-32px))] rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] p-5 shadow-[var(--shadow-panel)]"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Walkthrough step ${stepIndex + 1}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Guided walkthrough</div>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              {activeStep.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
              {activeStep.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Skip walkthrough"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--muted-foreground)]">
            Step {stepIndex + 1} of {steps.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={onClose}
            >
              Skip
            </Button>
            <Button
              type="button"
              variant="default"
              className="rounded-full"
              onClick={() => {
                if (stepIndex >= steps.length - 1) {
                  onClose();
                  return;
                }

                setStepIndex((current) => current + 1);
              }}
            >
              {stepIndex >= steps.length - 1 ? "Done" : "Next"}
              {stepIndex >= steps.length - 1 ? null : (
                <ArrowRight className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
