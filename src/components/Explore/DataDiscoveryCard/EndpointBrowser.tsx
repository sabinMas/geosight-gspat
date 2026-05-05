"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { PUBLIC_WFS_ENDPOINTS } from "@/lib/wfs-registry";

interface EndpointBrowserProps {
  onEndpointSelected: (endpoint: { url: string; name: string }) => void;
}

type FilterCategory = "all" | "usgs" | "noaa" | "un-agencies" | "opendata" | "research";
type FilterRegion = "all" | "global" | "us" | "eu" | "asia";

export function EndpointBrowser({ onEndpointSelected }: EndpointBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterRegion, setFilterRegion] = useState<FilterRegion>("all");
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return PUBLIC_WFS_ENDPOINTS.filter((ep) => {
      const matchesSearch =
        searchQuery === "" ||
        ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.organization.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || ep.category === filterCategory;

      const matchesRegion =
        filterRegion === "all" || ep.regions.includes(filterRegion);

      return matchesSearch && matchesCategory && matchesRegion;
    });
  }, [searchQuery, filterCategory, filterRegion]);

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
          filtered.map((endpoint) => (
            <button
              key={endpoint.url}
              onClick={() => onEndpointSelected({ url: endpoint.url, name: endpoint.name })}
              className="w-full text-left p-3 rounded-lg border border-[color:var(--border-soft)] hover:bg-[color:var(--surface-soft)] hover:border-[color:var(--accent-strong)] transition"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
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
                </div>
                <div className="shrink-0">
                  {endpoint.status === "active" && (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--accent-success)]" />
                  )}
                  {endpoint.status === "untested" && (
                    <AlertCircle className="h-4 w-4 text-[color:var(--accent-warning)]" />
                  )}
                  {endpoint.status === "cors-blocked" && (
                    <AlertCircle className="h-4 w-4 text-[color:var(--accent-error)]" />
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Custom URL input */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[color:var(--border-soft)]">
        <label className="text-xs font-medium text-[color:var(--muted-foreground)]">
          Or paste a custom WFS URL
        </label>
        <input
          type="text"
          placeholder="https://example.com/wfs?service=WFS&request=GetCapabilities"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              onEndpointSelected({
                url: e.currentTarget.value,
                name: new URL(e.currentTarget.value).hostname,
              });
            }
          }}
          className="w-full px-3 py-2 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-panel)] text-xs focus:outline-none focus:border-[color:var(--accent-strong)]"
        />
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Press Enter to test the endpoint
        </p>
      </div>
    </div>
  );
}
