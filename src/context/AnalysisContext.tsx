"use client";

import { createContext, useContext } from "react";
import { createLayerState } from "@/lib/map-layers";
import {
  AnalysisInputMode,
  Coordinates,
  DrawnGeometryFeatureCollection,
  DrawingTool,
  LayerState,
  LensAnalysisResult,
} from "@/types";

export interface AnalysisLocationState {
  name: string;
  displayName: string;
  coordinates: Coordinates | null;
}

export interface DrawingDraftState {
  tool: DrawingTool;
  vertexCount: number;
  measurementLabel: string | null;
  canUndo: boolean;
  canComplete: boolean;
}

export interface AnalysisContextValue {
  activeLens: string | null;
  location: AnalysisLocationState;
  geometry: DrawnGeometryFeatureCollection;
  selectedGeometryId: string | null;
  layers: LayerState;
  analysisResult: LensAnalysisResult | null;
  analysisInputMode: AnalysisInputMode;
  isLoading: boolean;
  error: string | null;
  drawingDraft: DrawingDraftState;
  setAnalysisInputMode: (mode: AnalysisInputMode) => void;
  setSelectedGeometryId: (shapeId: string | null) => void;
}

const EMPTY_GEOMETRY: DrawnGeometryFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const AnalysisContext = createContext<AnalysisContextValue>({
  activeLens: null,
  location: {
    name: "",
    displayName: "",
    coordinates: null,
  },
  geometry: EMPTY_GEOMETRY,
  selectedGeometryId: null,
  layers: createLayerState(),
  analysisResult: null,
  analysisInputMode: "location",
  isLoading: false,
  error: null,
  drawingDraft: {
    tool: "none",
    vertexCount: 0,
    measurementLabel: null,
    canUndo: false,
    canComplete: false,
  },
  setAnalysisInputMode: () => undefined,
  setSelectedGeometryId: () => undefined,
});

export function AnalysisProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AnalysisContextValue;
}) {
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisContext() {
  return useContext(AnalysisContext);
}
