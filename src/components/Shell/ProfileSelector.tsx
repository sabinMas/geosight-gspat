import { Building2, House, Server, Trees, Warehouse } from "lucide-react";
import { MissionProfile } from "@/types";

interface ProfileSelectorProps {
  activeProfileId: string;
  profiles: MissionProfile[];
  onSelectProfile: (profile: MissionProfile) => void;
}

const ICONS = {
  Building2,
  House,
  Server,
  Trees,
  Warehouse,
} as const;

export function ProfileSelector({
  activeProfileId,
  profiles,
  onSelectProfile,
}: ProfileSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:overflow-x-auto lg:pb-1">
      {profiles.map((profile) => {
        const Icon = ICONS[profile.icon as keyof typeof ICONS] ?? Building2;
        const isActive = profile.id === activeProfileId;

        return (
          <button
            key={profile.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectProfile(profile)}
            className="min-w-[82px] rounded-2xl border px-3 py-3 text-left transition"
            style={
              isActive
                ? {
                    borderColor: profile.accentColor,
                    boxShadow: `0 0 0 1px ${profile.accentColor}40, 0 0 24px ${profile.accentColor}20`,
                    backgroundColor: `${profile.accentColor}12`,
                  }
                : undefined
            }
          >
            <Icon
              className="h-4 w-4"
              style={{ color: isActive ? profile.accentColor : "#cbd5e1" }}
            />
            <div className="mt-3 text-sm font-semibold text-[var(--foreground)]">{profile.name}</div>
            <div className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">{profile.tagline}</div>
          </button>
        );
      })}
    </div>
  );
}
