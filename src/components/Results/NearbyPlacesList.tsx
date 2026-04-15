import { ReactNode } from "react";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <div className="eyebrow">Nearby places</div>
        {headerContent}
      </CardHeader>
      <CardContent className="space-y-4">
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
          <span className="cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[var(--muted-foreground)]">
            {places.length} result{places.length === 1 ? "" : "s"}
          </span>
          <span className="cursor-default select-none rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[var(--muted-foreground)]">
            {source === "live" ? "Live OpenStreetMap results" : "Live mapping unavailable"}
          </span>
        </div>

        {loading ? (
          <StatePanel
            tone="loading"
            eyebrow="Nearby search"
            title="Loading mapped places around this location"
            description="GeoSight is waiting on live OpenStreetMap results for the current category."
            compact
          />
        ) : null}

        {error ? (
          <StatePanel
            tone="partial"
            eyebrow="Nearby search"
            title="GeoSight could not complete this nearby lookup cleanly"
            description={error}
            compact
          />
        ) : null}

        <div className="space-y-3">
          {!loading && places.length === 0 ? (
            <StatePanel
              tone={source === "live" ? "partial" : "unavailable"}
              eyebrow="Nearby search"
              title="No mapped places matched this category"
              description={
                source === "live"
                  ? "That does not necessarily mean nothing is there. It means the current live map data did not return a matching place in this category."
                  : "Live OpenStreetMap coverage for this lookup is unavailable right now, so GeoSight is leaving the list empty instead of guessing."
              }
              compact
            />
          ) : null}

          {places.map((place) => (
            <div
              key={place.id}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--foreground)]" title={place.name}>{place.name}</div>
                  <div className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                    {place.category}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-[var(--muted-foreground)]">
                  <div className="text-base font-semibold text-[var(--foreground)]">{place.distanceKm?.toFixed(1) ?? "--"} km</div>
                  <div className="mt-1">{place.relativeLocation}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {place.summary}
              </p>

              {place.attributes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.attributes.map((attribute) => (
                    <span
                      key={attribute}
                      className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--foreground-soft)]"
                    >
                      {attribute}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
