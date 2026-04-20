"use client";

import { Compass, Mountain, ScanSearch } from "lucide-react";
import { CaptureFigureOptions, Coordinates, GlobeViewSnapshot, MissionProfile } from "@/types";

interface TopographicCaptureOverlayProps {
  locationName: string;
  selectedPoint: Coordinates;
  selectedRegionName: string;
  profile: MissionProfile;
  globeView: GlobeViewSnapshot | null;
  terrainExaggeration: number;
  activeLayerLabels: string[];
  figure: CaptureFigureOptions;
  drawnShapeCount: number;
  savedSiteCount: number;
}

function formatDistanceLabel(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function buildScaleBar(metersPerPixel: number | null) {
  if (!metersPerPixel || metersPerPixel <= 0) {
    return null;
  }

  const targetWidthPx = 140;
  const targetDistance = metersPerPixel * targetWidthPx;
  const niceDistances = [
    25,
    50,
    100,
    250,
    500,
    1000,
    2500,
    5000,
    10000,
    25000,
    50000,
    100000,
  ];

  const distanceMeters =
    [...niceDistances].reverse().find((candidate) => candidate <= targetDistance) ??
    niceDistances[0];

  return {
    distanceMeters,
    widthPx: Math.max(48, Math.round(distanceMeters / metersPerPixel)),
    label: formatDistanceLabel(distanceMeters),
  };
}

export function TopographicCaptureOverlay({
  locationName,
  selectedPoint,
  selectedRegionName,
  profile,
  globeView,
  terrainExaggeration,
  activeLayerLabels,
  figure,
  drawnShapeCount,
  savedSiteCount,
}: TopographicCaptureOverlayProps) {
  const scaleBar = figure.showScaleBar ? buildScaleBar(globeView?.metersPerPixel ?? null) : null;
  const title = figure.title.trim() || locationName;
  const subtitle =
    figure.subtitle.trim() ||
    `${profile.name} analysis | ${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`;
  const northRotation = globeView ? -globeView.headingDegrees : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="absolute inset-4 rounded-[2rem] border border-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />

      <div className="absolute left-4 top-4 h-10 w-10 rounded-tl-[1.5rem] border-l-2 border-t-2 border-white/40" />
      <div className="absolute right-4 top-4 h-10 w-10 rounded-tr-[1.5rem] border-r-2 border-t-2 border-white/40" />
      <div className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-[1.5rem] border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-4 right-4 h-10 w-10 rounded-br-[1.5rem] border-b-2 border-r-2 border-white/40" />

      <div className="absolute left-6 top-6 max-w-[30rem] rounded-[1.75rem] border border-white/12 bg-black/64 px-5 py-4 text-white backdrop-blur-md">
        <div className="text-xs uppercase tracking-[0.22em] text-white/62">
          GeoSight topographic figure
        </div>
        <div className="mt-2 text-2xl font-semibold leading-tight">{title}</div>
        <div className="mt-2 text-sm leading-6 text-white/78">{subtitle}</div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/74">
          <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
            AOI {selectedRegionName}
          </span>
          <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
            Terrain x{terrainExaggeration.toFixed(1)}
          </span>
          <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
            Drawings {drawnShapeCount}
          </span>
          <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
            Saved sites {savedSiteCount}
          </span>
        </div>
      </div>

      {figure.showNorthArrow ? (
        <div className="absolute right-6 top-6 rounded-[1.5rem] border border-white/12 bg-black/64 px-4 py-3 text-white backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/6">
              <div
                className="flex h-8 w-8 items-center justify-center transition-transform"
                style={{ transform: `rotate(${northRotation}deg)` }}
              >
                <Compass className="h-8 w-8 text-white" />
              </div>
              <span className="absolute -top-2 text-xs font-semibold tracking-[0.24em] text-white/82">
                N
              </span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/58">
                North reference
              </div>
              <div className="mt-1 text-xs text-white/78">
                Heading {Math.round(globeView?.headingDegrees ?? 0)} deg
              </div>
              <div className="text-xs text-white/58">
                Pitch {Math.round(globeView?.pitchDegrees ?? 0)} deg
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-6 left-6 flex flex-col gap-3">
        {scaleBar ? (
          <div className="rounded-[1.5rem] border border-white/12 bg-black/64 px-4 py-3 text-white backdrop-blur-md">
            <div className="text-xs uppercase tracking-[0.18em] text-white/58">
              Scale reference
            </div>
            <div className="mt-3">
              <div className="flex items-end gap-2">
                <div
                  className="h-2 rounded-full border border-white/45 bg-white/12"
                  style={{ width: `${scaleBar.widthPx}px` }}
                />
                <span className="text-sm font-medium text-white/86">{scaleBar.label}</span>
              </div>
              <div className="mt-1 text-xs text-white/58">
                Approx. {globeView?.metersPerPixel?.toFixed(1) ?? "?"} meters per pixel near frame base
              </div>
            </div>
          </div>
        ) : null}

        <div className="max-w-[24rem] rounded-[1.5rem] border border-white/12 bg-black/64 px-4 py-3 text-white backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/58">
            <Mountain className="h-3.5 w-3.5" />
            Figure notes
          </div>
          <div className="mt-2 text-xs leading-6 text-white/78">
            {figure.notes.trim()
              ? figure.notes
              : "Capture includes AOI framing, analyst annotations, active-layer context, and terrain-aware camera metadata."}
          </div>
        </div>
      </div>

      {figure.showLegend ? (
        <div className="absolute bottom-6 right-6 max-w-[22rem] rounded-[1.5rem] border border-white/12 bg-black/64 px-4 py-3 text-white backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/58">
            <ScanSearch className="h-3.5 w-3.5" />
            Active legend
          </div>

          <div className="mt-3 space-y-2 text-xs text-white/78">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-white/70 bg-cyan-300/80" />
              Selected site and AOI outline
            </div>
            {figure.emphasizeAoi ? (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-white/70 bg-white/70" />
                Capture-ready AOI emphasis
              </div>
            ) : null}
            {drawnShapeCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-white/70 bg-fuchsia-300/70" />
                Analyst drawings ({drawnShapeCount})
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {activeLayerLabels.length > 0 ? (
              activeLayerLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-xs text-white/76"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-xs text-white/76">
                Base globe
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
