"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Crosshair, MapPin, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/Shell/SearchBar";
import { MobileBottomSheet } from "@/components/Mobile/MobileBottomSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocationSearchResult, MissionProfile, SiteScore } from "@/types";

type SnapPoint = "peek" | "half" | "full";

interface MobileChromeProps {
  locationName: string;
  locationReady: boolean;
  profile: MissionProfile;
  score: SiteScore | null;
  loading: boolean;
  onLocate: (result: LocationSearchResult) => void;
  onUserPositionChange?: (coords: { lat: number; lng: number } | null) => void;
  onOpenChat: () => void;
}

export function MobileChrome({
  locationName,
  locationReady,
  profile,
  score,
  loading,
  onLocate,
  onUserPositionChange,
  onOpenChat,
}: MobileChromeProps) {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    onUserPositionChange?.(null);
  }, [onUserPositionChange]);

  const startTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        onUserPositionChange?.({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setTracking(false);
        watchId.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, [onUserPositionChange]);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const scoreValue = score && !loading ? Math.round(score.total) : null;

  const peek = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
        {scoreValue !== null ? (
          <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
            {scoreValue}
          </span>
        ) : (
          <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--foreground)]">
          {locationReady ? locationName : "Search a place to begin"}
        </div>
        <div className="truncate text-xs text-[var(--muted-foreground)]">
          {locationReady ? profile.name : "Tap the search above"}
        </div>
      </div>
      {locationReady ? (
        <Button
          type="button"
          size="icon"
          variant="default"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat();
          }}
          aria-label="Ask GeoSight about this place"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );

  const body = (
    <div className="space-y-3">
      {locationReady ? (
        <Button
          type="button"
          variant="default"
          className="w-full rounded-full"
          onClick={onOpenChat}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Ask GeoSight about this place
        </Button>
      ) : null}

      <p className="text-xs leading-5 text-[var(--muted-foreground)]">
        Mobile view is streamlined for quick lookup — search any place, see its
        score, and ask GeoSight what stands out. Open the full workspace on a
        laptop for drawing tools, comparisons, and reports.
      </p>
    </div>
  );

  return (
    <div className="lg:hidden">
      {/* Floating top bar: back + search */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <Link
          href="/"
          aria-label="Back to landing"
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] shadow-[var(--shadow-panel)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="pointer-events-auto min-w-0 flex-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--background-elevated)] px-1 shadow-[var(--shadow-panel)]">
          <SearchBar
            compact
            placeholder="Search a place"
            submitLabel="Go"
            syncValue={locationReady ? locationName : ""}
            onLocate={onLocate}
          />
        </div>
      </div>

      {/* Floating locate-me */}
      <button
        type="button"
        onClick={() => (tracking ? stopTracking() : startTracking())}
        aria-label={tracking ? "Stop live tracking" : "Show my location"}
        className={cn(
          "fixed right-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--background-elevated)] shadow-[var(--shadow-panel)] transition",
          "bottom-[calc(140px+env(safe-area-inset-bottom)+1rem)]",
          tracking
            ? "border-[color:var(--accent-strong)] text-[var(--accent)]"
            : "border-[color:var(--border-soft)] text-[var(--foreground)]",
        )}
      >
        <Crosshair className="h-4 w-4" />
      </button>

      <MobileBottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekContent={peek}
        halfContent={body}
        fullContent={body}
      />
    </div>
  );
}
