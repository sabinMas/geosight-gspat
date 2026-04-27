"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

type Placement = "top" | "bottom" | "left" | "right" | "center";

const CALLOUT_WIDTH = 380;
// Realistic height estimate used only for placement decisions — actual card can be taller.
// We always add maxHeight to the style so the card never overflows the viewport.
const CALLOUT_APPROX_HEIGHT = 280;
const EDGE_PADDING = 16;
const ANCHOR_GAP = 18;

function useAnchorRect(targetId: string | undefined, stepKey: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetId) {
      setRect(null);
      return;
    }

    let rafId: number | null = null;
    let cancelled = false;
    const start = performance.now();

    const update = () => {
      const el = document.querySelector(`[data-demo-id="${targetId}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };

    const pollInitial = () => {
      if (cancelled) return;
      update();
      // Poll for 500ms on step change — cards often mount/animate in.
      if (performance.now() - start < 500) {
        rafId = requestAnimationFrame(pollInitial);
      }
    };

    pollInitial();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetId, stepKey]);

  return rect;
}

function computePlacement(
  rect: DOMRect | null,
  viewportWidth: number,
  viewportHeight: number,
): { placement: Placement; style: React.CSSProperties } {
  const safeHeight = viewportHeight - 2 * EDGE_PADDING;

  if (!rect) {
    // No anchor — float above the bottom toolbar.
    const bottomOffset = 88;
    return {
      placement: "center",
      style: {
        bottom: bottomOffset,
        left: "50%",
        transform: "translateX(-50%)",
        width: `min(${CALLOUT_WIDTH}px, calc(100vw - 2rem))`,
        maxHeight: viewportHeight - bottomOffset - EDGE_PADDING,
      },
    };
  }

  const spaceBottom = viewportHeight - rect.bottom - ANCHOR_GAP;
  const spaceTop = rect.top - ANCHOR_GAP;
  const spaceRight = viewportWidth - rect.right - ANCHOR_GAP;
  const spaceLeft = rect.left - ANCHOR_GAP;

  // Pick the side with the most room.
  let placement: Placement = "bottom";
  if (spaceBottom >= CALLOUT_APPROX_HEIGHT) placement = "bottom";
  else if (spaceTop >= CALLOUT_APPROX_HEIGHT) placement = "top";
  else if (spaceRight >= CALLOUT_WIDTH) placement = "right";
  else if (spaceLeft >= CALLOUT_WIDTH) placement = "left";
  else placement = spaceBottom >= spaceTop ? "bottom" : "top";

  const style: React.CSSProperties = {
    width: `min(${CALLOUT_WIDTH}px, calc(100vw - 2rem))`,
  };

  if (placement === "bottom" || placement === "top") {
    const anchorCenterX = rect.left + rect.width / 2;
    const halfWidth = Math.min(CALLOUT_WIDTH, viewportWidth - 2 * EDGE_PADDING) / 2;
    const clampedCenterX = Math.max(
      EDGE_PADDING + halfWidth,
      Math.min(anchorCenterX, viewportWidth - EDGE_PADDING - halfWidth),
    );
    style.left = clampedCenterX;
    style.transform = "translateX(-50%)";

    if (placement === "bottom") {
      const topVal = Math.min(
        rect.bottom + ANCHOR_GAP,
        viewportHeight - CALLOUT_APPROX_HEIGHT - EDGE_PADDING,
      );
      style.top = Math.max(EDGE_PADDING, topVal);
      // maxHeight = remaining space below the top position, ensure at least some content is visible
      style.maxHeight = Math.max(120, viewportHeight - (style.top as number) - EDGE_PADDING);
    } else {
      // Anchor above the element — card grows downward from the bottom of its space.
      const bottomVal = Math.max(EDGE_PADDING, viewportHeight - rect.top + ANCHOR_GAP);
      style.bottom = bottomVal;
      style.maxHeight = viewportHeight - bottomVal - EDGE_PADDING;
    }
  } else {
    // Left / right placements — centre vertically on the anchor.
    const anchorCenterY = rect.top + rect.height / 2;
    const topVal = Math.max(
      EDGE_PADDING,
      Math.min(anchorCenterY - CALLOUT_APPROX_HEIGHT / 2, viewportHeight - CALLOUT_APPROX_HEIGHT - EDGE_PADDING),
    );
    style.top = topVal;
    style.maxHeight = safeHeight;

    if (placement === "right") {
      style.left = rect.right + ANCHOR_GAP;
    } else {
      style.right = Math.max(EDGE_PADDING, viewportWidth - rect.left + ANCHOR_GAP);
    }
  }

  return { placement, style };
}

function SpotlightRing({ rect }: { rect: DOMRect | null }) {
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
        boxShadow: "0 0 0 2px var(--accent), 0 0 24px 4px rgba(83,221,255,0.35)",
      }}
    />
  );
}

function Arrow({ placement }: { placement: Placement }) {
  if (placement === "center") return null;
  const common = "absolute h-3 w-3 rotate-45 border bg-[var(--background-elevated)]";
  const borderColor = "border-[color:var(--border-soft)]";
  if (placement === "bottom") {
    return (
      <span
        aria-hidden
        className={cn(common, borderColor, "left-1/2 -top-1.5 -translate-x-1/2 border-r-0 border-b-0")}
      />
    );
  }
  if (placement === "top") {
    return (
      <span
        aria-hidden
        className={cn(common, borderColor, "left-1/2 -bottom-1.5 -translate-x-1/2 border-l-0 border-t-0")}
      />
    );
  }
  if (placement === "right") {
    return (
      <span
        aria-hidden
        className={cn(common, borderColor, "top-1/2 -left-1.5 -translate-y-1/2 border-r-0 border-t-0")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(common, borderColor, "top-1/2 -right-1.5 -translate-y-1/2 border-l-0 border-b-0")}
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
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));

  const step = scenario.steps[stepIndex];
  const isLastStep = stepIndex >= scenario.steps.length - 1;
  const isFirstStep = stepIndex === 0;

  useEffect(() => {
    if (dataReady) setWaitingForData(false);
  }, [dataReady]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const rect = useAnchorRect(step.targetId, stepIndex);

  // Auto-scroll spotlighted element into view if off-screen.
  useEffect(() => {
    if (!step.targetId || waitingForData) return;
    const el = document.querySelector(`[data-demo-id="${step.targetId}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > viewport.height - 80) {
      (el as HTMLElement).scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [stepIndex, step.targetId, waitingForData, viewport.height]);

  const advance = useCallback(() => {
    if (isLastStep) {
      onStop();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [isLastStep, onStop]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!waitingForData && step.cardId) {
      onOpenCard(step.cardId);
    }
  }, [stepIndex, waitingForData, step.cardId, onOpenCard]);

  useEffect(() => {
    if (waitingForData || step.duration <= 0) return;
    const t = setTimeout(advance, step.duration);
    return () => clearTimeout(t);
  }, [stepIndex, waitingForData, step.duration, advance]);

  const { placement, style } = useMemo(
    () => computePlacement(step.targetId ? rect : null, viewport.width, viewport.height),
    [rect, viewport.width, viewport.height, step.targetId],
  );

  return (
    <>
      {/* Backdrop — click outside to stop */}
      <div
        aria-hidden
        onClick={onStop}
        className="fixed inset-0 z-[86] bg-[rgba(4,10,18,0.4)]"
      />

      {/* Spotlight ring */}
      {step.targetId && !waitingForData && <SpotlightRing rect={rect} />}

      {/* Callout */}
      <div
        role="dialog"
        aria-live="polite"
        aria-label={`${scenario.label} demo step ${stepIndex + 1}`}
        className="fixed z-[89] max-h-screen overflow-visible"
        style={style}
      >
        <div className="relative flex h-full max-h-[inherit] flex-col overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]">
          <Arrow placement={placement} />

          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-soft)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-base">{scenario.icon}</span>
              <span className="eyebrow truncate">{scenario.label} tour</span>
              <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                {stepIndex + 1}/{scenario.steps.length}
              </span>
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {waitingForData ? (
              <div className="flex items-center gap-2.5 text-sm text-[var(--muted-foreground)]">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                Loading analysis data…
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
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

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 rounded-full"
                    onClick={goBack}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={advance}
                >
                  {isLastStep ? "Finish" : "Next"}
                  {!isLastStep && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {!waitingForData && <ProgressBar duration={step.duration} stepKey={stepIndex} />}
        </div>
      </div>
    </>
  );
}
