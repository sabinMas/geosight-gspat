"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IMPORTED_FEATURE_ID_PROPERTY,
  type ImportedLayer,
} from "@/lib/file-import";

interface AttributeTableProps {
  open: boolean;
  layer: ImportedLayer | null;
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string | null) => void;
  onClose: () => void;
}

function getFeatureId(feature: GeoJSON.Feature, index: number) {
  const featureId =
    feature.properties?.[IMPORTED_FEATURE_ID_PROPERTY] ?? feature.id ?? `feature-${index + 1}`;
  return String(featureId);
}

export function AttributeTable({
  open,
  layer,
  selectedFeatureId,
  onSelectFeature,
  onClose,
}: AttributeTableProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const propertyKeys = useMemo(() => {
    if (!layer) {
      return [];
    }

    return Array.from(
      new Set(
        layer.features.features.flatMap((feature) =>
          Object.keys(feature.properties ?? {}).filter(
            (key) => key !== IMPORTED_FEATURE_ID_PROPERTY,
          ),
        ),
      ),
    );
  }, [layer]);

  const filteredFeatures = useMemo(() => {
    if (!layer) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return layer.features.features;
    }

    return layer.features.features.filter((feature, index) => {
      const searchableValues = [
        getFeatureId(feature, index),
        feature.geometry?.type ?? "",
        ...propertyKeys.map((key) => String(feature.properties?.[key] ?? "")),
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [layer, propertyKeys, query]);

  if (!open) {
    return null;
  }

  return (
    <section
      className="fixed bottom-20 left-4 right-4 z-40 max-h-[50vh] rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)] xl:bottom-16 xl:left-6 xl:right-6"
      role="region"
      aria-label="Imported layer attribute table"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
        <div className="min-w-0">
          <div className="eyebrow">Imported layer</div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Attribute table
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {layer
              ? `${layer.name} · ${layer.features.features.length} features`
              : "Select an imported layer to inspect its feature attributes."}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Close attribute table"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 border-b border-[color:var(--border-soft)] px-5 py-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter rows by any attribute value"
            aria-label="Filter attribute table rows"
            className="h-10 rounded-xl bg-[var(--surface-soft)] pl-9"
          />
        </div>
        <div className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
          {filteredFeatures.length} shown
        </div>
      </div>

      {layer ? (
        <>
          <div className="max-h-[calc(50vh-10.5rem)] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--background-elevated)]">
                <tr>
                  <th className="border-b border-[color:var(--border-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Feature
                  </th>
                  <th className="border-b border-[color:var(--border-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Geometry
                  </th>
                  {propertyKeys.map((key) => (
                    <th
                      key={key}
                      className="border-b border-[color:var(--border-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.map((feature, index) => {
                  const featureId = getFeatureId(feature, index);
                  const selected = featureId === selectedFeatureId;

                  return (
                    <tr
                      key={featureId}
                      className={
                        selected
                          ? "bg-[var(--accent-soft)]"
                          : "bg-transparent hover:bg-[var(--surface-soft)]"
                      }
                    >
                      <td className="border-b border-[color:var(--border-soft)] px-4 py-3">
                        <button
                          type="button"
                          className="w-full text-left text-[var(--foreground)]"
                          onClick={() =>
                            onSelectFeature(selected ? null : featureId)
                          }
                        >
                          #{index + 1}
                        </button>
                      </td>
                      <td className="border-b border-[color:var(--border-soft)] px-4 py-3 text-[var(--muted-foreground)]">
                        {feature.geometry?.type ?? "Unknown"}
                      </td>
                      {propertyKeys.map((key) => (
                        <td
                          key={`${featureId}-${key}`}
                          className="border-b border-[color:var(--border-soft)] px-4 py-3 text-[var(--foreground-soft)]"
                        >
                          {String(feature.properties?.[key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] px-5 py-3 text-xs text-[var(--muted-foreground)]">
            <span>
              {layer.features.features.length} total features
            </span>
            <span>
              {propertyKeys.length} detected columns
            </span>
          </div>
        </>
      ) : (
        <div className="px-5 py-8 text-sm text-[var(--muted-foreground)]">
          Import a GeoJSON, KML, CSV, or GPX layer and open its table from the Layers panel.
        </div>
      )}
    </section>
  );
}
