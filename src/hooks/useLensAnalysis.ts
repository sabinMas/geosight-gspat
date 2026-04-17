"use client";

import { useEffect } from "react";
import { ExploreState } from "@/hooks/useExploreState";
import { getActiveLayerLabels } from "@/lib/map-layers";
import { LensAnalysisRequestBody, LensAnalysisResult } from "@/types";

const SUPPORTED_LENS_IDS = new Set([
  "hunt-planner",
  "trail-scout",
  "land-quick-check",
  "road-trip",
  "general-explore",
]);

async function readLensAnalysisError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "GeoSight couldn't run this lens analysis right now.";
  } catch {
    return "GeoSight couldn't run this lens analysis right now.";
  }
}

export function useLensAnalysis(state: ExploreState) {
  const {
    activeLensId,
    analysisInputMode,
    drawnGeometry,
    locationReady,
    selectedPoint,
    selectedLocationName,
    selectedShapeId,
    globeViewMode,
    layers,
    setAnalysisError,
    setAnalysisLoading,
    setAnalysisResult,
  } = state;

  useEffect(() => {
    if (!activeLensId || !SUPPORTED_LENS_IDS.has(activeLensId)) {
      setAnalysisLoading(false);
      setAnalysisError(null);
      setAnalysisResult(null);
      return;
    }

    const hasLocationInput = analysisInputMode === "location" && locationReady;
    const hasGeometryInput = analysisInputMode === "geometry" && drawnGeometry.features.length > 0;

    if (!hasLocationInput && !hasGeometryInput) {
      setAnalysisLoading(false);
      setAnalysisError(null);
      setAnalysisResult(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const payload: LensAnalysisRequestBody = {
        lensId: activeLensId,
        geometrySource: analysisInputMode,
        location: locationReady ? selectedPoint : null,
        locationName: selectedLocationName,
        geometry: drawnGeometry,
        selectedGeometryId: selectedShapeId,
        globeViewMode,
        activeLayerLabels: getActiveLayerLabels(layers, globeViewMode),
      };

      try {
        const response = await fetch("/api/lens-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readLensAnalysisError(response));
        }

        const result = (await response.json()) as LensAnalysisResult;
        if (!controller.signal.aborted) {
          setAnalysisResult(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAnalysisResult(null);
          setAnalysisError(
            error instanceof Error
              ? error.message
              : "GeoSight couldn't run this lens analysis right now.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setAnalysisLoading(false);
        }
      }
    }, analysisInputMode === "geometry" ? 420 : 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    activeLensId,
    analysisInputMode,
    drawnGeometry,
    globeViewMode,
    layers,
    locationReady,
    selectedLocationName,
    selectedPoint,
    selectedShapeId,
    setAnalysisError,
    setAnalysisLoading,
    setAnalysisResult,
  ]);
}
