import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NearbyPlace, NearbyPlaceCategory, NearbyPlacesSource } from "@/types";

interface NearbyPlacesListProps {
  category: NearbyPlaceCategory;
  categories: Array<{ value: NearbyPlaceCategory; label: string }>;
  places: NearbyPlace[];
  loading?: boolean;
  error?: string | null;
  source?: NearbyPlacesSource;
  onCategoryChange: (category: NearbyPlaceCategory) => void;
  headerContent?: ReactNode;
}

export function NearbyPlacesList({
  category,
  categories,
  places,
  loading = false,
  error,
  source = "unavailable",
  onCategoryChange,
  headerContent,
}: NearbyPlacesListProps) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="eyebrow">Discovery board</div>
        <CardTitle>Nearby places</CardTitle>
        {headerContent}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Browse mapped places around the active location. GeoSight now pulls nearby results from
          OpenStreetMap via Overpass and leaves the panel empty when live results are unavailable
          instead of fabricating sample places.
        </p>

        <div className="flex flex-wrap gap-2">
          {categories.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={category === option.value ? "default" : "secondary"}
              className="rounded-full"
              onClick={() => onCategoryChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="eyebrow text-[var(--accent)]">Source</span>
          <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[var(--foreground)]">
            {source === "live" ? "Live OSM data" : "Live data unavailable"}
          </span>
        </div>

        {loading ? (
          <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent-foreground)]">
            Loading nearby places...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-foreground)]">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {!loading && places.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              No nearby places matched this category around the selected location.
            </div>
          ) : null}

          {places.map((place) => (
            <div
              key={place.id}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{place.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                    {place.category}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--muted-foreground)]">
                  <div>{place.distanceKm?.toFixed(1) ?? "--"} km</div>
                  <div className="mt-1">{place.relativeLocation}</div>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{place.summary}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {place.attributes.map((attribute) => (
                  <span
                    key={attribute}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] text-[var(--foreground-soft)]"
                  >
                    {attribute}
                  </span>
                ))}
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] text-[var(--foreground-soft)]">
                  OSM live
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
