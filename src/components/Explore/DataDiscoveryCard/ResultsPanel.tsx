"use client";

import { useMemo } from "react";
import { Database, Eye, Trash2 } from "lucide-react";

interface ResultsPanelProps {
  features: GeoJSON.Feature[];
}

export function ResultsPanel({ features }: ResultsPanelProps) {
  const geometryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const feature of features) {
      const geomType = feature.geometry?.type || "unknown";
      stats[geomType] = (stats[geomType] || 0) + 1;
    }
    return stats;
  }, [features]);

  const sampleProperties = useMemo(() => {
    if (features.length === 0) return [];
    const first = features[0];
    if (!first.properties) return [];
    return Object.keys(first.properties).slice(0, 10);
  }, [features]);

  const sampleFeatures = features.slice(0, 10);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-[color:var(--surface-soft)]">
          <p className="text-xs text-[color:var(--muted-foreground)]">Total features</p>
          <p className="text-lg font-semibold text-[color:var(--foreground)] mt-1">
            {features.length}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[color:var(--surface-soft)]">
          <p className="text-xs text-[color:var(--muted-foreground)]">Geometry types</p>
          <p className="text-lg font-semibold text-[color:var(--foreground)] mt-1">
            {Object.keys(geometryStats).length}
          </p>
        </div>
      </div>

      {/* Geometry type breakdown */}
      {Object.keys(geometryStats).length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[color:var(--muted-foreground)]">
            Geometry types
          </p>
          <div className="space-y-1">
            {Object.entries(geometryStats).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--foreground-soft)]">{type}</span>
                <span className="text-[color:var(--muted-foreground)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribute preview */}
      {sampleProperties.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[color:var(--muted-foreground)]">
            Attributes (showing {Math.min(10, sampleProperties.length)})
          </p>
          <div className="space-y-1">
            {sampleProperties.map((prop) => (
              <div key={prop} className="text-xs font-mono text-[color:var(--foreground-soft)]">
                • {prop}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample data table */}
      <div className="flex-1 overflow-auto flex flex-col gap-2 min-h-0">
        <p className="text-xs font-medium text-[color:var(--muted-foreground)]">
          Sample features (first 10)
        </p>
        <div className="overflow-auto flex-1 rounded-lg border border-[color:var(--border-soft)]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[color:var(--surface-soft)] border-b border-[color:var(--border-soft)]">
              <tr>
                {sampleProperties.map((prop) => (
                  <th
                    key={prop}
                    className="px-3 py-2 text-left font-medium text-[color:var(--muted-foreground)] whitespace-nowrap"
                  >
                    {prop}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-soft)]">
              {sampleFeatures.map((feature, idx) => (
                <tr key={idx} className="hover:bg-[color:var(--surface-soft)]">
                  {sampleProperties.map((prop) => (
                    <td
                      key={prop}
                      className="px-3 py-2 text-[color:var(--foreground-soft)] truncate max-w-[200px]"
                      title={String(feature.properties?.[prop] || "")}
                    >
                      {feature.properties?.[prop] ? String(feature.properties[prop]).slice(0, 50) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[color:var(--border-soft)]">
        <button
          className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border-soft)] text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)] transition flex items-center justify-center gap-2"
          title="View on globe (coming soon)"
        >
          <Eye className="h-4 w-4" />
          View on globe
        </button>
        <button
          className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border-soft)] text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)] transition flex items-center justify-center gap-2"
          title="Clear results"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
