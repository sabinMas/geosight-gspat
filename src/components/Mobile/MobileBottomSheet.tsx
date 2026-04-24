"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SnapPoint = "peek" | "half" | "full";

interface MobileBottomSheetProps {
  snap: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  peekContent: React.ReactNode;
  halfContent: React.ReactNode;
  fullContent: React.ReactNode;
}

// Heights are in vh; peek is a fixed px height for consistent feel on all phones.
const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  peek: "140px",
  half: "48vh",
  full: "88vh",
};

const ORDER: SnapPoint[] = ["peek", "half", "full"];

function nextSnap(current: SnapPoint, direction: "up" | "down"): SnapPoint {
  const idx = ORDER.indexOf(current);
  if (direction === "up") return ORDER[Math.min(ORDER.length - 1, idx + 1)];
  return ORDER[Math.max(0, idx - 1)];
}

export function MobileBottomSheet({
  snap,
  onSnapChange,
  peekContent,
  halfContent,
  fullContent,
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = sheetRef.current?.getBoundingClientRect().height ?? 0;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    setDragDelta(e.clientY - dragStartY.current);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      const threshold = 48;

      if (delta < -threshold) onSnapChange(nextSnap(snap, "up"));
      else if (delta > threshold) onSnapChange(nextSnap(snap, "down"));

      dragStartY.current = null;
      setDragDelta(0);
      setIsDragging(false);
    },
    [onSnapChange, snap],
  );

  // Reset scroll to top when snap changes away from full
  useEffect(() => {
    if (snap !== "full" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [snap]);

  const baseHeight = SNAP_HEIGHTS[snap];
  const style: React.CSSProperties = isDragging
    ? { height: `calc(${baseHeight} - ${dragDelta}px)` }
    : { height: baseHeight };

  return (
    <div
      ref={sheetRef}
      className={cn(
        "pointer-events-auto fixed bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-[1.75rem] border-t border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]",
        !isDragging && "transition-[height] duration-300 ease-out",
      )}
      style={style}
      role="dialog"
      aria-label="Location details"
    >
      {/* Drag handle area */}
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          if (snap === "peek") onSnapChange("half");
          else if (snap === "half") onSnapChange("full");
          else onSnapChange("peek");
        }}
        role="button"
        aria-label="Drag or tap to resize sheet"
      >
        <span className="h-1.5 w-10 rounded-full bg-[var(--border-strong)]" />
      </div>

      {/* Peek content — always visible */}
      <div className="shrink-0 px-4 pb-3">{peekContent}</div>

      {/* Scrollable body — half + full */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          snap === "peek" && "pointer-events-none opacity-0",
        )}
      >
        <div className="space-y-4">
          {halfContent}
          {snap === "full" && <div className="space-y-4 pt-2">{fullContent}</div>}
        </div>
      </div>
    </div>
  );
}
