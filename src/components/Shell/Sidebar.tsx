import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionProfile, RegionSelection } from "@/types";
import { ProfileSelector } from "./ProfileSelector";

interface SidebarProps {
  activeProfile: MissionProfile;
  profiles: MissionProfile[];
  selectedLocationName: string;
  selectedRegion: RegionSelection;
  onOpenDemo: () => void;
  onSelectProfile: (profile: MissionProfile) => void;
  onSelectRegion: (region: RegionSelection) => void;
  quickRegions: RegionSelection[];
}

export function Sidebar({
  activeProfile,
  profiles,
  selectedLocationName,
  selectedRegion,
  onOpenDemo,
  onSelectProfile,
  onSelectRegion,
  quickRegions,
}: SidebarProps) {
  return (
    <aside className="glass-panel data-grid z-20 flex w-full max-w-[360px] flex-col gap-4 rounded-[2rem] p-4 lg:h-[calc(100vh-2rem)]">
      <div className="space-y-3">
        <Badge>GeoSight</Badge>
        <h1 className="text-3xl font-semibold text-white">Multi-profile geospatial intelligence</h1>
        <p className="text-sm leading-6 text-slate-300">
          Search any place, switch mission profiles, and keep the workspace focused on only the
          cards you need.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mission profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileSelector
            activeProfileId={activeProfile.id}
            profiles={profiles}
            onSelectProfile={onSelectProfile}
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active lens</div>
            <div className="mt-2 text-base font-semibold text-white">{activeProfile.name}</div>
            <div className="mt-1 text-sm" style={{ color: activeProfile.accentColor }}>
              {activeProfile.tagline}
            </div>
            <p className="mt-3">{activeProfile.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current lens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Current focus</div>
            <div className="mt-2 text-sm font-medium text-white">{selectedLocationName}</div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              {selectedRegion.center.lat.toFixed(4)} / {selectedRegion.center.lng.toFixed(4)}
            </div>
          </div>
          <p>{activeProfile.description}</p>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Demo jump points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="group rounded-2xl border border-white/10 bg-white/5 p-3" open>
            <summary className="cursor-pointer list-none text-sm font-medium text-white">
              {activeProfile.name} starter places
            </summary>
            <div className="mt-3 space-y-3">
              {quickRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelectRegion(region)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedRegion.id === region.id
                      ? "bg-white/10"
                      : "border-white/8 bg-slate-950/40 hover:bg-white/10"
                  }`}
                  style={
                    selectedRegion.id === region.id
                      ? { borderColor: activeProfile.accentColor }
                      : undefined
                  }
                >
                  <div className="text-sm font-medium text-white">{region.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {region.center.lat.toFixed(3)}, {region.center.lng.toFixed(3)}
                  </div>
                </button>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
          <p>
            Open the original Columbia River cooling walkthrough any time you want to compare the
            prebuilt Pacific Northwest benchmark sites.
          </p>
          <Button className="w-full justify-center rounded-2xl" onClick={onOpenDemo}>
            See data center cooling demo
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
