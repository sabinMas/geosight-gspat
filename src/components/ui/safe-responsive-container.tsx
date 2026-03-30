"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SafeResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}

export function SafeResponsiveContainer({
  children,
  className,
  fallback = null,
}: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateReadyState = () => {
      const { width, height } = container.getBoundingClientRect();
      setIsReady(width > 0 && height > 0);
    };

    updateReadyState();

    const observer = new ResizeObserver(() => {
      updateReadyState();
    });

    observer.observe(container);
    window.addEventListener("resize", updateReadyState);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateReadyState);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("min-w-0", className)}>
      {isReady ? <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer> : fallback}
    </div>
  );
}
