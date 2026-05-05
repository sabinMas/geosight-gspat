"use client";

import { useState } from "react";
import { Database, AlertCircle, Loader } from "lucide-react";
import { WorkspaceCardShell } from "./WorkspaceCardShell";
import { EndpointBrowser } from "./DataDiscoveryCard/EndpointBrowser";
import { FeatureTypeSelector } from "./DataDiscoveryCard/FeatureTypeSelector";
import { ResultsPanel } from "./DataDiscoveryCard/ResultsPanel";

interface WFSQueryState {
  endpoint?: {
    url: string;
    name: string;
  };
  featureType?: {
    name: string;
    title: string;
  };
  features: GeoJSON.Feature[];
  isLoading: boolean;
  error?: string;
}

export function DataDiscoveryCard() {
  const [tab, setTab] = useState<"endpoints" | "query" | "results">("endpoints");
  const [queryState, setQueryState] = useState<WFSQueryState>({
    features: [],
    isLoading: false,
  });

  const handleEndpointSelected = (endpoint: { url: string; name: string }) => {
    setQueryState({ features: [], isLoading: false });
    setTab("query");
  };

  const handleFeaturesLoaded = (features: GeoJSON.Feature[]) => {
    setQueryState((prev) => ({
      ...prev,
      features,
      isLoading: false,
    }));
    setTab("results");
  };

  const handleError = (error: string) => {
    setQueryState((prev) => ({
      ...prev,
      error,
      isLoading: false,
    }));
  };

  return (
    <WorkspaceCardShell
      id="data-discovery"
      title="Custom data discovery"
      subtitle="Import vector data from public WFS endpoints"
      icon={Database}
    >
      <div className="flex flex-col h-full gap-3">
        {/* Tab buttons */}
        <div className="flex gap-2 border-b border-[color:var(--border-soft)]">
          <button
            onClick={() => setTab("endpoints")}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab === "endpoints"
                ? "border-[color:var(--accent-strong)] text-[color:var(--foreground)]"
                : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Browse endpoints
          </button>
          <button
            onClick={() => setTab("query")}
            disabled={!queryState.endpoint}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab === "query"
                ? "border-[color:var(--accent-strong)] text-[color:var(--foreground)]"
                : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Query builder
          </button>
          <button
            onClick={() => setTab("results")}
            disabled={queryState.features.length === 0}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab === "results"
                ? "border-[color:var(--accent-strong)] text-[color:var(--foreground)]"
                : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Results ({queryState.features.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "endpoints" && (
            <EndpointBrowser onEndpointSelected={handleEndpointSelected} />
          )}

          {tab === "query" && queryState.endpoint && (
            <FeatureTypeSelector
              endpoint={queryState.endpoint}
              onFeaturesLoaded={handleFeaturesLoaded}
              onError={handleError}
              isLoading={queryState.isLoading}
            />
          )}

          {tab === "results" && queryState.features.length > 0 && (
            <ResultsPanel features={queryState.features} />
          )}

          {tab === "results" && queryState.features.length === 0 && (
            <div className="flex items-center justify-center h-32 text-[color:var(--muted-foreground)]">
              <p className="text-sm">No features loaded. Query a WFS endpoint to see results.</p>
            </div>
          )}

          {queryState.error && (
            <div className="flex gap-2 p-3 rounded-lg bg-[color:var(--surface-warning)] text-[color:var(--foreground-warning)]">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Error loading features</p>
                <p className="text-xs mt-1">{queryState.error}</p>
              </div>
            </div>
          )}

          {queryState.isLoading && (
            <div className="flex items-center justify-center h-32 text-[color:var(--muted-foreground)]">
              <div className="flex flex-col items-center gap-2">
                <Loader className="h-5 w-5 animate-spin" />
                <p className="text-sm">Loading features...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceCardShell>
  );
}
