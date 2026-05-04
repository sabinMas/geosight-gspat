import { useCallback, useEffect, useRef, useState } from "react";
import {
  getWFSCapabilities,
  queryWFSFeatures,
  WFSCapability,
  Feature,
  BBox,
} from "@/lib/wfs-discovery";

export interface WFSQueryState {
  url: string;
  capabilities: WFSCapability[];
  selectedFeatureType?: string;
  features: Feature[];
  loading: boolean;
  error?: string;
  lastBbox?: BBox;
}

const FEATURE_QUERY_CACHE: Record<string, { data: Feature[]; timestamp: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useWFSLayers(initialUrl?: string) {
  const [state, setState] = useState<WFSQueryState>({
    url: initialUrl || "",
    capabilities: [],
    features: [],
    loading: false,
  });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load WFS capabilities from URL.
   */
  const loadCapabilities = useCallback(async (url: string) => {
    if (!url) {
      setState((prev) => ({
        ...prev,
        capabilities: [],
        features: [],
        error: "Please provide a WFS URL",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined, url }));

    try {
      const caps = await getWFSCapabilities(url, undefined);
      setState((prev) => ({
        ...prev,
        capabilities: caps,
        error: caps.length === 0 ? "No feature types found" : undefined,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to load capabilities: ${err instanceof Error ? err.message : "Unknown error"}`,
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Query features for selected feature type within bbox.
   * Debounced to avoid excessive requests on pan/zoom.
   */
  const queryFeatures = useCallback(
    (featureType: string, bbox: BBox) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        executeQuery(featureType, bbox);
      }, 500); // 500ms debounce
    },
    [],
  );

  const executeQuery = async (featureType: string, bbox: BBox) => {
    const cacheKey = `${state.url}:${featureType}:${JSON.stringify(bbox)}`;

    // Check cache first
    const cached = FEATURE_QUERY_CACHE[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setState((prev) => ({
        ...prev,
        features: cached.data,
        lastBbox: bbox,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const features = await queryWFSFeatures(state.url, featureType, bbox);

      // Cache the result
      FEATURE_QUERY_CACHE[cacheKey] = {
        data: features,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        features,
        selectedFeatureType: featureType,
        lastBbox: bbox,
        error: features.length === 0 ? "No features found in this area" : undefined,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to query features: ${err instanceof Error ? err.message : "Unknown error"}`,
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  /**
   * Clear all WFS data and state.
   */
  const clearWFSData = useCallback(() => {
    setState({
      url: "",
      capabilities: [],
      features: [],
      loading: false,
    });
  }, []);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    loadCapabilities,
    queryFeatures,
    clearWFSData,
  };
}
