"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DemoScenario } from "@/lib/demo-scenarios";
import type { WorkspaceCardId } from "@/types";

interface DemoRunnerProps {
  scenario: DemoScenario;
  dataReady: boolean;
  onOpenCard: (cardId: WorkspaceCardId) => void;
  onStop: () => void;
}

function SpotlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(`[data-demo-id="${targetId}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetId]);

  if (!rect) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[88] animate-pulse rounded-2xl"
      style={{
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
        boxShadow: "0 0 0 2px var(--accent), 0 0 20px 2px rgba(83,221,255,0.25)",
      }}
    />
  );
}

function ProgressBar({ duration, stepKey }: { duration: number; stepKey: number }) {
  const [pct, setPct] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setPct(100);
    startRef.current = null;
    if (duration <= 0) return;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / duration);
      setPct(remaining * 100);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, duration]);

  if (duration <= 0) return null;

  return (
    <div className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--border-soft)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DemoRunner({ scenario, dataReady, onOpenCard, onStop }: DemoRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [waitingForData, setWaitingForData] = useState(true);

  const step = scenario.steps[stepIndex];
  const isLastStep = stepIndex >= scenario.steps.length - 1;

  // Wait for data before advancing past the first step
  useEffect(() => {
    if (dataReady) setWaitingForData(false);
  }, [dataReady]);

  const advance = useCallback(() => {
    if (isLastStep) {
      onStop();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [isLastStep, onStop]);

  // Open the card when a step requires it
  useEffect(() => {
    if (!waitingForData && step.cardId) {
      onOpenCard(step.cardId);
    }
  }, [stepIndex, waitingForData, step.cardId, onOpenCard]);

  // Auto-advance timer
  useEffect(() => {
    if (waitingForData || step.duration <= 0) return;
    const t = setTimeout(advance, step.duration);
    return () => clearTimeout(t);
  }, [stepIndex, waitingForData, step.duration, advance]);

  return (
    <>
      {/* Spotlight ring */}
      {step.targetId && !waitingForData && (
        <SpotlightRing targetId={step.targetId} />
      )}

      {/* Semi-transparent backdrop (does not block clicks) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[87] bg-[rgba(4,10,18,0.35)]"
      />

      {/* Step panel */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-[88px] left-1/2 z-[89] w-[min(460px,calc(100vw-2rem))] -translate-x-1/2"
      >
        <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-soft)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{scenario.icon}</span>
              <span className="eyebrow">{scenario.label} demo</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full"
              aria-label="Stop demo"
              onClick={onStop}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            {waitingForData ? (
              <div className="flex items-center gap-2.5 text-sm text-[var(--muted-foreground)]">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                Loading analysis data…
              </div>
            ) : (
              <>
                <p className="mb-1 text-sm font-semibold text-[var(--foreground)]">
                  {step.title}
                </p>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  {step.message}
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          {!waitingForData && (
            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] px-4 py-3">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {scenario.steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to step ${i + 1}`}
                    onClick={() => setStepIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === stepIndex
                        ? "w-4 bg-[var(--accent)]"
                        : "w-1.5 bg-[var(--border-strong)] hover:bg-[var(--muted-foreground)]",
                    )}
                  />
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-full"
                onClick={advance}
              >
                {isLastStep ? "Done" : "Next"}
                {!isLastStep && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
              </Button>
            </div>
          )}

          {/* Progress bar */}
          {!waitingForData && (
            <ProgressBar duration={step.duration} stepKey={stepIndex} />
          )}
        </div>
      </div>
    </>
  );
}
