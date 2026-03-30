import Link from "next/link";
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
    <aside className="glass-panel data-grid z-20 flex max-h-[calc(100vh-2rem)] w-full max-w-[320px] flex-col gap-4 overflow-y-auto overscroll-contain rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)] scrollbar-thin xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
      <div className="space-y-3">
        <Link href="/" className="inline-flex">
          <Badge className="cursor-pointer transition hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-raised)]">
            GeoSight
          </Badge>
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Mission controls</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Change the lens, jump regions, or open a demo without crowding the main workspace.
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
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            <div className="eyebrow">Active lens</div>
            <div className="mt-2 line-clamp-2 text-base font-semibold text-[var(--foreground)]">{activeProfile.name}</div>
            <div className="mt-1 text-sm" style={{ color: activeProfile.accentColor }}>
              {activeProfile.tagline}
            </div>
            <p className="mt-3 line-clamp-3">{activeProfile.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current place</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-[var(--muted-foreground)]">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <div className="eyebrow">Current place</div>
            <div className="mt-2 line-clamp-2 text-sm font-medium text-[var(--foreground)]">{selectedLocationName}</div>
            <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
              {selectedRegion.center.lat.toFixed(4)} / {selectedRegion.center.lng.toFixed(4)}
            </div>
          </div>
          <p>Keep the main workspace focused while using the globe and prompt to steer deeper analysis.</p>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Quick regions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="group rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3" open>
            <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
              {activeProfile.name} starters
            </summary>
            <div className="mt-3 space-y-3">
              {quickRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelectRegion(region)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedRegion.id === region.id
                      ? "bg-[var(--surface-soft)]"
                      : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:bg-[var(--surface-soft)]"
                  }`}
                  style={
                    selectedRegion.id === region.id
                      ? { borderColor: activeProfile.accentColor }
                      : undefined
                  }
                >
                  <div className="text-sm font-medium text-[var(--foreground)]">{region.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
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
        <CardContent className="space-y-3 text-sm leading-6 text-[var(--muted-foreground)]">
          <p>Open the original Columbia River cooling walkthrough and benchmark set.</p>
          <Button className="w-full justify-center rounded-2xl" onClick={onOpenDemo}>
            Open cooling demo
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
