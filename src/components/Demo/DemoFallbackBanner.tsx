"use client";

import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoFallbackBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-amber-300/35 bg-amber-400/12 px-4 py-3 text-sm text-amber-50">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
        <p className="leading-6">
          Live data loading — this may take a moment on first visit.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full text-amber-100 hover:bg-amber-300/15 hover:text-amber-50"
        onClick={onDismiss}
        aria-label="Dismiss demo loading banner"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
