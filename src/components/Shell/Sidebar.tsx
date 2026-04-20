import { MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
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
    <aside
      className="z-20 flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-panel)]"
      style={{ background: "var(--surface-panel)", borderColor: "var(--border-soft)" }}
      role="region"
      aria-label="Mission controls and quick regions"
    >
      <nav className="flex-1 overflow-y-auto overscroll-contain" aria-label="Workspace navigation">
        {/* Lens section */}
        <div className="border-b" style={{ borderColor: "var(--border-soft)" }}>
          <h2
            className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Lens
          </h2>
          <div className="px-2 pb-3">
            <ProfileSelector
              activeProfileId={activeProfile.id}
              profiles={profiles}
              onSelectProfile={onSelectProfile}
              variant="sidebar-carousel"
            />
          </div>
        </div>

        {/* Quick regions section */}
        <div>
          <h2
            className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Quick regions
          </h2>
          <ul className="px-2 pb-3" role="list">
            {quickRegionsLoading && (
              <li
                className="rounded-xl border border-dashed px-3 py-2.5 text-xs"
                style={{ borderColor: "var(--border-soft)", color: "var(--muted-foreground)", background: "var(--surface-soft)" }}
              >
                Generating nearby regions…
              </li>
            )}
            {!quickRegionsLoading && quickRegions.length === 0 && (
              <li
                className="rounded-xl border border-dashed px-3 py-2.5 text-xs"
                style={{ borderColor: "var(--border-soft)", color: "var(--muted-foreground)", background: "var(--surface-soft)" }}
              >
                Select a place to build quick regions.
              </li>
            )}
            {quickRegions.map((region) => {
              const isSelected = selectedRegion.id === region.id;
              return (
                <li key={region.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRegion(region)}
                    aria-pressed={isSelected}
                    aria-label={`Select quick region ${region.name}`}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      background: isSelected ? "var(--surface-soft)" : "transparent",
                      color: "var(--foreground)",
                      borderLeft: isSelected ? `2px solid ${activeProfile.accentColor}` : "2px solid transparent",
                    }}
                  >
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: isSelected ? activeProfile.accentColor : "var(--muted-foreground)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{region.name}</div>
                      {region.secondaryLabel ? (
                        <div className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {region.secondaryLabel}
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Rail foot — theme toggle */}
      <div
        className="flex items-center justify-between border-t px-4 py-3"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Theme
        </span>
        <ThemeToggle compact />
      </div>
    </aside>
  );
}
