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
}

export function NearbyPlacesList({
  category,
  categories,
  places,
  loading = false,
  error,
  source = "unavailable",
  onCategoryChange,
}: NearbyPlacesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nearby places</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="uppercase tracking-[0.18em] text-cyan-100">Source</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
            {source === "live" ? "Live OSM data" : "Live data unavailable"}
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-4 text-sm text-cyan-50">
            Loading nearby places...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4 text-sm text-amber-50">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {!loading && places.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
              No nearby places matched this category around the selected location.
            </div>
          ) : null}

          {places.map((place) => (
            <div key={place.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{place.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
                    {place.category}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{place.distanceKm?.toFixed(1) ?? "--"} km</div>
                  <div className="mt-1">{place.relativeLocation}</div>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">{place.summary}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {place.attributes.map((attribute) => (
                  <span
                    key={attribute}
                    className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    {attribute}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[11px] text-slate-300">
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
