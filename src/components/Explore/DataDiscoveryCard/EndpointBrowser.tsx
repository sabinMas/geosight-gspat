"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, CheckCircle2, AlertCircle, Loader, X } from "lucide-react";
import {
  PUBLIC_WFS_ENDPOINTS,
  validateWFSEndpoint,
  loadCustomWFSEndpoints,
  saveCustomWFSEndpoint,
  removeCustomWFSEndpoint,
  type WFSEndpoint,
} from "@/lib/wfs-registry";

interface EndpointBrowserProps {
  onEndpointSelected: (endpoint: { url: string; name: string }) => void;
}

type FilterCategory = "all" | "usgs" | "noaa" | "un-agencies" | "opendata" | "research";
type FilterRegion = "all" | "global" | "us" | "eu" | "asia";

export function EndpointBrowser({ onEndpointSelected }: EndpointBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterRegion, setFilterRegion] = useState<FilterRegion>("all");
  const [customUrl, setCustomUrl] = useState("");
  const [customEndpoints, setCustomEndpoints] = useState<WFSEndpoint[]>([]);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [endpointStatuses, setEndpointStatuses] = useState<Record<string, WFSEndpoint["status"]>>({});

  // Load custom endpoints on mount
  useEffect(() => {
    const loaded = loadCustomWFSEndpoints();
    setCustomEndpoints(loaded);
  }, []);

  // Pre-validate some endpoints on mount (first 3 to avoid too many requests)
  useEffect(() => {
    const validateSome = async () => {
      const toTest = [PUBLIC_WFS_ENDPOINTS[0], PUBLIC_WFS_ENDPOINTS[1]];
      for (const ep of toTest) {
        if (!endpointStatuses[ep.id]) {
          const status = await validateWFSEndpoint(ep.url);
          setEndpointStatuses((prev) => ({ ...prev, [ep.id]: status }));
        }
      }
    };
    validateSome();
  }, [endpointStatuses]);

  const allEndpoints = useMemo(
    () => [...PUBLIC_WFS_ENDPOINTS, ...customEndpoints],
    [customEndpoints],
  );

  const filtered = useMemo(() => {
    return allEndpoints.filter((ep) => {
      const matchesSearch =
        searchQuery === "" ||
        ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.organization.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || ep.category === filterCategory;

      const matchesRegion =
        filterRegion === "all" || ep.region === filterRegion;

      return matchesSearch && matchesCategory && matchesRegion;
    });
  }, [searchQuery, filterCategory, filterRegion, allEndpoints]);

  const handleTestEndpoint = async (endpoint: WFSEndpoint) => {
    setTestingEndpoint(endpoint.id);
    const status = await validateWFSEndpoint(endpoint.url);
    setEndpointStatuses((prev) => ({ ...prev, [endpoint.id]: status }));
    setTestingEndpoint(null);
  };

  const handleAddCustomUrl = async (url: string) => {
    if (!url.trim()) return;
    try {
      const status = await validateWFSEndpoint(url);
      const newEndpoint: WFSEndpoint = {
        id: `custom-${Date.now()}`,
        name: new URL(url).hostname,
        url,
        organization: "Custom",
        description: "User-added WFS endpoint",
        category: "other",
        region: "global",
        status,
        lastTestedAt: Date.now(),
      };
      saveCustomWFSEndpoint(newEndpoint);
      setCustomEndpoints((prev) => [...prev, newEndpoint]);
      setEndpointStatuses((prev) => ({ ...prev, [newEndpoint.id]: status }));
      setCustomUrl("");
      onEndpointSelected({ url: newEndpoint.url, name: newEndpoint.name });
    } catch (err) {
      console.error("Failed to add custom endpoint", err);
    }
  };

  const handleRemoveCustom = (id: string) => {
    removeCustomWFSEndpoint(id);
    setCustomEndpoints((prev) => prev.filter((ep) => ep.id !== id));
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-panel)] text-sm focus:outline-none focus:border-[color:var(--accent-strong)]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[color:var(--muted-foreground)]">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {["all", "usgs", "noaa", "un-agencies", "opendata", "research"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat as FilterCategory)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                filterCategory === cat
                  ? "bg-[color:var(--accent-strong)] text-white"
                  : "bg-[color:var(--surface-soft)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-panel)]"
              }`}
            >
              {cat === "un-agencies" ? "UN" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Region filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[color:var(--muted-foreground)]">
          Region
        </label>
        <div className="flex flex-wrap gap-2">
          {["all", "global", "us", "eu", "asia"].map((region) => (
            <button
              key={region}
              onClick={() => setFilterRegion(region as FilterRegion)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                filterRegion === region
                  ? "bg-[color:var(--accent-strong)] text-white"
                  : "bg-[color:var(--surface-soft)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-panel)]"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[color:var(--muted-foreground)]">
            <p className="text-sm">No endpoints match your filters.</p>
          </div>
        ) : (
          filtered.map((endpoint) => {
            const status = endpointStatuses[endpoint.id] || endpoint.status;
            const isCustom = endpoint.id.startsWith("custom-");
            return (
              <div
                key={endpoint.id}
                className="flex items-start gap-2 p-3 rounded-lg border border-[color:var(--border-soft)] hover:bg-[color:var(--surface-soft)] transition group"
              >
                <button
                  onClick={() => onEndpointSelected({ url: endpoint.url, name: endpoint.name })}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-medium text-sm text-[color:var(--foreground)]">
                    {endpoint.name}
                  </p>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                    {endpoint.organization}
                  </p>
                  {endpoint.description && (
                    <p className="text-xs text-[color:var(--foreground-soft)] mt-1">
                      {endpoint.description}
                    </p>
                  )}
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-1 capitalize">
                    {endpoint.region}
                  </p>
                </button>
                <div className="shrink-0 flex items-center gap-1">
                  {testingEndpoint === endpoint.id ? (
                    <Loader className="h-4 w-4 animate-spin text-[color:var(--muted-foreground)]" />
                  ) : status === "active" ? (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--accent-success)]" />
                  ) : status === "cors-blocked" ? (
                    <div title="CORS blocked - may need proxy" className="inline-flex">
                      <AlertCircle className="h-4 w-4 text-[color:var(--accent-warning)]" />
                    </div>
                  ) : status ? (
                    <div title="Unreachable" className="inline-flex">
                      <AlertCircle className="h-4 w-4 text-[color:var(--accent-error)]" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTestEndpoint(endpoint)}
                      className="text-xs px-1.5 py-0.5 rounded text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-panel)] opacity-0 group-hover:opacity-100 transition"
                    >
                      Test
                    </button>
                  )}
                  {isCustom && (
                    <button
                      onClick={() => handleRemoveCustom(endpoint.id)}
                      className="text-[color:var(--muted-foreground)] hover:text-[color:var(--accent-error)] opacity-0 group-hover:opacity-100 transition"
                      title="Remove custom endpoint"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom URL input */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[color:var(--border-soft)]">
        <label className="text-xs font-medium text-[color:var(--muted-foreground)]">
          Add a custom WFS URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://example.com/wfs"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddCustomUrl(customUrl);
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-panel)] text-xs focus:outline-none focus:border-[color:var(--accent-strong)]"
          />
          <button
            onClick={() => handleAddCustomUrl(customUrl)}
            disabled={!customUrl.trim()}
            className="px-3 py-2 rounded-lg bg-[color:var(--accent-strong)] text-white text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Custom endpoints are saved locally and tested automatically
        </p>
      </div>
    </div>
  );
}
