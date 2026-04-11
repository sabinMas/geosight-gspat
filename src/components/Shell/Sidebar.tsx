import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionProfile, RegionSelection } from "@/types";
import { ProfileSelector } from "./ProfileSelector";

interface SidebarProps {
  activeProfile: MissionProfile;
  profiles: MissionProfile[];
  onSelectProfile: (profile: MissionProfile) => void;
  onSelectRegion: (region: RegionSelection) => void;
  quickRegions: RegionSelection[];
  quickRegionsLoading: boolean;
  selectedRegion: RegionSelection;
}

export function Sidebar({
  activeProfile,
  profiles,
  onSelectProfile,
  onSelectRegion,
  quickRegions,
  quickRegionsLoading,
  selectedRegion,
}: SidebarProps) {
  return (
    <aside className="glass-panel z-20 flex h-full w-full min-w-0 flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-panel)]">
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Lens</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSelector
              activeProfileId={activeProfile.id}
              profiles={profiles}
              onSelectProfile={onSelectProfile}
              variant="sidebar-carousel"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick regions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickRegionsLoading ? (
              <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                Generating nearby regions from the active location...
              </div>
            ) : null}

            {!quickRegionsLoading && quickRegions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                Select a place to build nearby quick regions.
              </div>
            ) : null}

            {quickRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => onSelectRegion(region)}
                aria-pressed={selectedRegion.id === region.id}
                className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${
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
                {region.secondaryLabel ? (
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {region.secondaryLabel}
                  </div>
                ) : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
          <div>
            <div className="text-sm font-medium text-[var(--foreground)]">Theme</div>
          </div>
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
}
