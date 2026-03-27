import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelection } from "@/types";

interface SidebarProps {
  selectedLocationName: string;
  selectedRegion: RegionSelection;
  onSelectRegion: (region: RegionSelection) => void;
  quickRegions: RegionSelection[];
}

export function Sidebar({
  selectedLocationName,
  selectedRegion,
  onSelectRegion,
  quickRegions,
}: SidebarProps) {
  return (
    <aside className="glass-panel data-grid z-20 flex w-full max-w-[360px] flex-col gap-4 rounded-[2rem] p-4 lg:h-[calc(100vh-2rem)]">
      <div className="space-y-2">
        <Badge>GeoSight</Badge>
        <h1 className="text-3xl font-semibold text-white">Intelligent geospatial analysis</h1>
        <p className="text-sm leading-6 text-slate-300">
          Ask open-ended questions about any place on Earth, from parcels and neighborhoods to cities, regions, and countries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <p>
            GeoSight is general-purpose by design. The featured story today is Pacific Northwest data center cooling, but the same location engine also supports hiking, housing, retail, logistics, and general exploration questions.
          </p>
          <p className="text-cyan-100">Current focus: {selectedLocationName}</p>
          <p className="font-mono text-xs text-cyan-100">
            {selectedRegion.center.lat.toFixed(4)} / {selectedRegion.center.lng.toFixed(4)}
          </p>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Featured demo regions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickRegions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelectRegion(region)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedRegion.id === region.id
                  ? "border-cyan-300/40 bg-cyan-400/12"
                  : "border-white/8 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="text-sm font-medium text-white">{region.name}</div>
              <div className="mt-1 text-xs text-slate-400">
                {region.center.lat.toFixed(3)}, {region.center.lng.toFixed(3)}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Button variant="secondary" className="justify-start rounded-2xl">
        Multi-use GeoSight with cooling demo
      </Button>
    </aside>
  );
}
