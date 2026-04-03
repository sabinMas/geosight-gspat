import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Building2, House, Mountain, Server, Snowflake, Trees, Warehouse } from "lucide-react";
import { MissionProfile } from "@/types";

interface ProfileSelectorProps {
  activeProfileId: string;
  profiles: MissionProfile[];
  onSelectProfile: (profile: MissionProfile) => void;
  variant?: "default" | "sidebar-carousel";
}

const ICONS = {
  BarChart3,
  Building2,
  House,
  Mountain,
  Server,
  Snowflake,
  Trees,
  Warehouse,
} as const;

const SIDEBAR_CARD_WIDTH = 98;
const SIDEBAR_CARD_GAP = 8;
const SIDEBAR_VISIBLE_WIDTH = SIDEBAR_CARD_WIDTH * 2 + SIDEBAR_CARD_GAP * 2 + SIDEBAR_CARD_WIDTH / 2 + 10;

const PROFILE_ICON_BY_ID = {
  "home-buying": House,
  "site-development": Building2,
  commercial: BarChart3,
  "data-center": Snowflake,
  hiking: Mountain,
} as const;

export function ProfileSelector({
  activeProfileId,
  profiles,
  onSelectProfile,
  variant = "default",
}: ProfileSelectorProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const orderedProfiles = useMemo(() => {
    const activeIndex = profiles.findIndex((profile) => profile.id === activeProfileId);
    if (activeIndex <= 0) {
      return profiles;
    }

    const activeProfile = profiles[activeIndex];
    return [activeProfile, ...profiles.filter((profile) => profile.id !== activeProfileId)];
  }, [activeProfileId, profiles]);

  useEffect(() => {
    if (variant !== "sidebar-carousel") {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ left: 0, behavior: "auto" });
    setScrollProgress(0);
  }, [orderedProfiles, variant]);

  useEffect(() => {
    if (variant !== "sidebar-carousel") {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const updateProgress = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        setScrollProgress(1);
        return;
      }

      const visibleRatio = Math.min(container.clientWidth / container.scrollWidth, 1);
      const scrollRatio = container.scrollLeft / maxScroll;
      setScrollProgress(visibleRatio + scrollRatio * (1 - visibleRatio));
    };

    updateProgress();
    container.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      container.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [orderedProfiles, variant]);

  if (variant === "sidebar-carousel") {
    return (
      <div className="space-y-3">
        <div
          ref={scrollRef}
          className="flex w-full overflow-x-auto px-1 pb-2 scrollbar-none"
        >
          <div className="flex gap-2">
            {orderedProfiles.map((profile) => {
              const Icon =
                PROFILE_ICON_BY_ID[profile.id as keyof typeof PROFILE_ICON_BY_ID] ??
                ICONS[profile.icon as keyof typeof ICONS] ??
                Building2;
              const isActive = profile.id === activeProfileId;

              return (
                <button
                  key={profile.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectProfile(profile)}
                  className="shrink-0 overflow-hidden rounded-xl border bg-[var(--surface-raised)] px-3 py-3 text-left transition hover:bg-[var(--surface-soft)]"
                  style={{
                    width: `${SIDEBAR_CARD_WIDTH}px`,
                    minHeight: "104px",
                    borderColor: isActive ? "var(--accent)" : "var(--border-soft)",
                    boxShadow: isActive
                      ? "0 0 0 1px var(--accent-strong), 0 14px 28px color-mix(in srgb, var(--accent) 12%, transparent)"
                      : undefined,
                    backgroundColor: isActive ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: isActive ? "var(--accent)" : "var(--muted-foreground)" }}
                  />
                  <div className="mt-3 line-clamp-2 text-[11px] font-semibold leading-tight text-[var(--foreground)]">
                    {profile.name}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[9px] leading-snug text-[var(--muted-foreground)]">
                    {profile.tagline}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[3px] w-full rounded-full bg-[var(--surface-soft)]">
          <div
            className="h-[3px] rounded-full bg-[var(--accent)] transition-[width] duration-150"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    );
  }

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
