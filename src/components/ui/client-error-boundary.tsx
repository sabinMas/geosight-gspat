"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  message?: string;
}

interface ClientErrorBoundaryState {
  hasError: boolean;
}

export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[client-error-boundary]", error, errorInfo);
  }

  private readonly handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-6 py-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--danger-border)] bg-[var(--surface-raised)]">
            <AlertTriangle className="h-5 w-5 text-[var(--danger-foreground)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {this.props.title ?? "This view hit a rendering error"}
            </h2>
            <p className="text-sm leading-6 text-[var(--danger-foreground)]">
              {this.props.message ??
                "GeoSight protected the rest of the workspace. Try reopening the view or choose a different region while we keep the session alive."}
            </p>
          </div>
          <Button type="button" className="rounded-full" onClick={this.handleReset}>
            Retry view
          </Button>
        </div>
      </div>
    );
  }
}
