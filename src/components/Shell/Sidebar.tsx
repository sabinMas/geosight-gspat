import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelection } from "@/types";

interface SidebarProps {
  selectedLocationName: string;
  selectedRegion: RegionSelection;
  onOpenDemo: () => void;
  onSelectRegion: (region: RegionSelection) => void;
  quickRegions: RegionSelection[];
}

export function Sidebar({
  selectedLocationName,
  selectedRegion,
  onOpenDemo,
  onSelectRegion,
  quickRegions,
}: SidebarProps) {
  return (
    <aside className="glass-panel data-grid z-20 flex w-full max-w-[360px] flex-col gap-4 rounded-[2rem] p-4 lg:h-[calc(100vh-2rem)]">
      <div className="space-y-3">
        <Badge>GeoSight</Badge>
        <h1 className="text-3xl font-semibold text-white">Location intelligence for any place</h1>
        <p className="text-sm leading-6 text-slate-300">
          Start with a city, state, ZIP, coordinates, or your current location, then ask questions
          about trails, neighborhoods, restaurants, risk, access, or land use.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
          <p>1. Pick a place from search, current location, or the globe.</p>
          <p>2. Ask GeoSight a question tied to that active location.</p>
          <p>3. Switch between area analysis and nearby-place results as needed.</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Current focus</div>
            <div className="mt-2 text-sm font-medium text-white">{selectedLocationName}</div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              {selectedRegion.center.lat.toFixed(4)} / {selectedRegion.center.lng.toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Explore example places</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Demos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
          <p>
            Open the optional Columbia River data center cooling walkthrough when you want to show
            the prebuilt scoring and site-comparison workflow.
          </p>
          <Button className="w-full justify-center rounded-2xl" onClick={onOpenDemo}>
            See data center cooling demo
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
