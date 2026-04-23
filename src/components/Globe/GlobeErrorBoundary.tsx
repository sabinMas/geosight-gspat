"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface GlobeErrorBoundaryProps {
  children: ReactNode;
  /** Rendered in place of the globe when init fails — typically a MapLibre 2D map. */
  fallback: ReactNode;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps the 3D globe. On WebGL / Cesium Ion failures, renders a 2D MapLibre
 * fallback so the rest of the workspace keeps working even without a valid
 * Ion token or a GPU context.
 */
export class GlobeErrorBoundary extends Component<
  GlobeErrorBoundaryProps,
  GlobeErrorBoundaryState
> {
  state: GlobeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[globe-error-boundary]", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="relative h-full w-full">
        {this.props.fallback}
        <div className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs text-[var(--warning-foreground)] shadow-[var(--shadow-soft)]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          3D globe unavailable — showing 2D map.
        </div>
      </div>
    );
  }
}
