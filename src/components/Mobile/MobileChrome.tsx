"use client";

import { useState } from "react";
import { Compass, Loader2, MapPin, Navigation2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomSheet } from "@/components/Mobile/MobileBottomSheet";
import { buildAnalysisOverview } from "@/lib/analysis-summary";
import { cn } from "@/lib/utils";
import { GeodataResult, MissionProfile, NearbyPlaceCategory, SiteScore } from "@/types";

type SnapPoint = "peek" | "half" | "full";

interface MobileChromeProps {
  locationName: string;
  locationReady: boolean;
  profile: MissionProfile;
  score: SiteScore | null;
  geodata: GeodataResult | null;
  loading: boolean;
  error: string | null;
  onQuickCategory: (category: NearbyPlaceCategory) => void;
  onOpenWorkspace: () => void;
  rightPanelContent: React.ReactNode;
}

const QUICK_CATEGORIES: Array<{
  id: NearbyPlaceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "restaurant", label: "Food", icon: Utensils },
  { id: "trail", label: "Trails", icon: Compass },
  { id: "hike", label: "Hikes", icon: Navigation2 },
  { id: "landmark", label: "Landmarks", icon: MapPin },
];

export function MobileChrome({
  locationName,
  locationReady,
  profile,
  score,
  geodata,
  loading,
  error,
  onQuickCategory,
  onOpenWorkspace,
  rightPanelContent,
}: MobileChromeProps) {
  const [snap, setSnap] = useState<SnapPoint>("peek");

  const overview = buildAnalysisOverview({
    geodata,
    score,
    profile,
    locationName,
    loading,
    error,
  });

  const scoreValue = score && !loading ? Math.round(score.total) : null;

  const handleQuickCategory = (category: NearbyPlaceCategory) => {
    onQuickCategory(category);
    onOpenWorkspace();
    if (snap === "peek") setSnap("half");
  };

  const peek = (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        ) : scoreValue !== null ? (
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
          {locationReady
            ? `${profile.name}${scoreValue !== null ? " · " + overview.confidenceLabel : ""}`
            : "Apple Maps–style quick analysis"}
        </div>
      </div>
    </div>
  );

  const quickChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {QUICK_CATEGORIES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleQuickCategory(id)}
          disabled={!locationReady}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-soft)] transition",
            "active:bg-[var(--surface-raised)]",
            !locationReady && "opacity-50",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const half = (
    <div className="space-y-3">
      {quickChips}

      {locationReady && !loading ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Summary
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
            {overview.summary}
          </p>
        </div>
      ) : null}

      {overview.strengths.length > 0 ? (
        <div className="rounded-2xl border border-[color:var(--success-border)] bg-[var(--success-soft)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
            Strengths
          </div>
          <ul className="mt-1.5 space-y-1 text-sm leading-5 text-[var(--foreground)]">
            {overview.strengths.slice(0, 3).map((item, idx) => (
              <li key={idx} className="truncate">· {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.watchouts.length > 0 ? (
        <div className="rounded-2xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--warning-foreground)]">
            Watchouts
          </div>
          <ul className="mt-1.5 space-y-1 text-sm leading-5 text-[var(--warning-foreground)]">
            {overview.watchouts.slice(0, 3).map((item, idx) => (
              <li key={idx} className="truncate">· {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {locationReady ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full rounded-full"
          onClick={() => setSnap("full")}
        >
          View full analysis
        </Button>
      ) : null}
    </div>
  );

  const full = <div className="pt-1">{rightPanelContent}</div>;

  return (
    <div className="lg:hidden">
      <MobileBottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekContent={peek}
        halfContent={half}
        fullContent={full}
      />
    </div>
  );
}
