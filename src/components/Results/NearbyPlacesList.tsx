import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NearbyPlace, NearbyPlaceCategory } from "@/types";

interface NearbyPlacesListProps {
  category: NearbyPlaceCategory;
  categories: Array<{ value: NearbyPlaceCategory; label: string }>;
  places: NearbyPlace[];
  onCategoryChange: (category: NearbyPlaceCategory) => void;
}

export function NearbyPlacesList({
  category,
  categories,
  places,
  onCategoryChange,
}: NearbyPlacesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nearby places</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          This placeholder list view is ready for real POI and trail APIs later. For now, it shows
          the UI and structured shape GeoSight will use.
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

        <div className="space-y-3">
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
