"use client";

import { useState, useEffect } from "react";
import { Loader, MapPin, AlertCircle } from "lucide-react";
import { getWFSCapabilities } from "@/lib/wfs-discovery";

interface WFSCapability {
  name: string;
  title?: string;
  abstract?: string;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

interface FeatureTypeSelectorProps {
  endpoint: {
    url: string;
    name: string;
  };
  onFeaturesLoaded: (features: GeoJSON.Feature[]) => void;
  onError: (error: string) => void;
  isLoading: boolean;
}

export function FeatureTypeSelector({
  endpoint,
  onFeaturesLoaded,
  onError,
  isLoading,
}: FeatureTypeSelectorProps) {
  const [capabilities, setCapabilities] = useState<WFSCapability[]>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);
  const [selectedFeatureType, setSelectedFeatureType] = useState<string | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);

  // Load capabilities on mount
  useEffect(() => {
    const loadCapabilities = async () => {
      setLoadingCapabilities(true);
      setCapabilitiesError(null);
      try {
        const features = await getWFSCapabilities(endpoint.url);
        setCapabilities(features);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load WFS capabilities";
        setCapabilitiesError(message);
        onError(message);
      } finally {
        setLoadingCapabilities(false);
      }
    };

    loadCapabilities();
  }, [endpoint, onError]);

  const handleLoadFeatures = async () => {
    if (!selectedFeatureType) return;

    onError("");
    // Query features - implementation in Step 3
    // For now, just simulate loading
  };

  if (loadingCapabilities) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-[color:var(--muted-foreground)]">
        <Loader className="h-5 w-5 animate-spin" />
        <p className="text-sm">Loading available feature types...</p>
      </div>
    );
  }

  if (capabilitiesError) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-2 p-3 rounded-lg bg-[color:var(--surface-warning)] text-[color:var(--foreground-warning)]">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Failed to load capabilities</p>
            <p className="text-xs mt-1">{capabilitiesError}</p>
            <p className="text-xs mt-2 opacity-75">
              This WFS server may require a proxy or authentication. Try a different endpoint.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div>
        <p className="text-sm font-medium text-[color:var(--foreground)]">
          {endpoint.name}
        </p>
        <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
          {capabilities.length} feature type{capabilities.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Feature type list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {capabilities.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[color:var(--muted-foreground)]">
            <p className="text-sm">No feature types available from this endpoint.</p>
          </div>
        ) : (
          capabilities.map((featureType) => (
            <button
              key={featureType.name}
              onClick={() => setSelectedFeatureType(featureType.name)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedFeatureType === featureType.name
                  ? "border-[color:var(--accent-strong)] bg-[color:var(--surface-accent-soft)]"
                  : "border-[color:var(--border-soft)] hover:bg-[color:var(--surface-soft)]"
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--accent-strong)]" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[color:var(--foreground)]">
                    {featureType.title || featureType.name}
                  </p>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5 font-mono">
                    {featureType.name}
                  </p>
                  {featureType.abstract && (
                    <p className="text-xs text-[color:var(--foreground-soft)] mt-1">
                      {featureType.abstract}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Query options - placeholder for Step 3 */}
      <div className="flex flex-col gap-3 pt-2 border-t border-[color:var(--border-soft)]">
        <div>
          <label className="text-xs font-medium text-[color:var(--muted-foreground)]">
            Spatial filter (optional)
          </label>
          <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
            Coming in next phase: bbox drawing and attribute filtering
          </p>
        </div>

        <button
          onClick={handleLoadFeatures}
          disabled={!selectedFeatureType || isLoading}
          className="w-full px-4 py-2 rounded-lg bg-[color:var(--accent-strong)] text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Loading features...
            </>
          ) : (
            <>Load features</>
          )}
        </button>
      </div>
    </div>
  );
}
