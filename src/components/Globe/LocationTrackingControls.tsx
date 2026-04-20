"use client";

import { Crosshair, Loader2, Navigation, Radar, Square, Waypoints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteRecordingSnapshot, UserLocationFix } from "@/types";

interface LocationTrackingControlsProps {
  currentFix: UserLocationFix | null;
  locateError: string | null;
  isLocating: boolean;
  isFollowing: boolean;
  isRecording: boolean;
  recordingSnapshot: RouteRecordingSnapshot;
  onLocateOnce: () => void;
  onStartFollowing: () => void;
  onStopFollowing: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDismissError: () => void;
  onClose: () => void;
}

function formatAccuracy(fix: UserLocationFix | null) {
  if (!fix?.accuracyMeters || !Number.isFinite(fix.accuracyMeters)) {
    return null;
  }

  return `${Math.round(fix.accuracyMeters)} m accuracy`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDistance(miles: number) {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }

  return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
}

export function LocationTrackingControls({
  currentFix,
  locateError,
  isLocating,
  isFollowing,
  isRecording,
  recordingSnapshot,
  onLocateOnce,
  onStartFollowing,
  onStopFollowing,
  onStartRecording,
  onStopRecording,
  onDismissError,
  onClose,
}: LocationTrackingControlsProps) {
  const accuracyLabel = formatAccuracy(currentFix);

  return (
    <div className="pointer-events-none absolute right-4 top-32 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-[320px]">
      <div className="pointer-events-auto rounded-[1.8rem] border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] p-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Live location
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              Field tracking
            </div>
          </div>
          {isLocating ? (
            <div className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              GPS
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
            aria-label="Close location tracking panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            size="sm"
            className="h-12 rounded-2xl"
            variant="secondary"
            disabled={isLocating}
            onClick={onLocateOnce}
          >
            <Crosshair className="mr-2 h-4 w-4" />
            Locate once
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-12 rounded-2xl"
            variant={isFollowing ? "default" : "secondary"}
            disabled={isLocating && !isFollowing}
            onClick={isFollowing ? onStopFollowing : onStartFollowing}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {isFollowing ? "Stop follow" : "Follow me"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-12 rounded-2xl"
            variant={isRecording ? "default" : "secondary"}
            disabled={isLocating && !isRecording}
            onClick={isRecording ? onStopRecording : onStartRecording}
          >
            {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Waypoints className="mr-2 h-4 w-4" />}
            {isRecording ? "Stop route" : "Record route"}
          </Button>
        </div>

        {currentFix ? (
          <div className="mt-3 rounded-[1.2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              <Radar className="h-3.5 w-3.5" />
              Last known fix
            </div>
            <div className="mt-1 text-sm font-medium text-[var(--foreground)]">
              {currentFix.coordinates.lat.toFixed(5)}, {currentFix.coordinates.lng.toFixed(5)}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
              {accuracyLabel ? <span>{accuracyLabel}</span> : null}
              {currentFix.headingDegrees !== null ? (
                <span>{Math.round(currentFix.headingDegrees)}° heading</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {isRecording ? (
          <div className="mt-3 rounded-[1.2rem] border border-cyan-300/25 bg-cyan-400/10 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.16em] text-cyan-50/80">
              Recording route
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-cyan-50/65">
                  Distance
                </div>
                <div className="mt-1 font-semibold text-cyan-50">
                  {formatDistance(recordingSnapshot.totalDistanceMiles)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-cyan-50/65">
                  Time
                </div>
                <div className="mt-1 font-semibold text-cyan-50">
                  {formatElapsed(recordingSnapshot.elapsedSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-cyan-50/65">
                  Points
                </div>
                <div className="mt-1 font-semibold text-cyan-50">
                  {recordingSnapshot.pointCount}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {locateError ? (
          <div className="mt-3 rounded-[1.2rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-foreground)]">
            <div>{locateError}</div>
            <button
              type="button"
              className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--danger-foreground)]/80 transition hover:text-[var(--danger-foreground)]"
              onClick={onDismissError}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
