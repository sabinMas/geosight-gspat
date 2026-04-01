"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Factory,
  Globe2,
  House,
  Info,
  LineChart,
  Loader2,
  Route,
  ShieldAlert,
  Trees,
} from "lucide-react";
import { SearchBar } from "@/components/Shell/SearchBar";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { useAgentPanel } from "@/context/AgentPanelContext";
import {
  buildExploreHref,
  EXAMPLE_STARTERS,
  GENERAL_EXPLORATION_PROFILE_ID,
  pickRandomSurpriseLocation,
  SurpriseLocation,
  SURPRISE_ME_LOCATIONS,
} from "@/lib/landing";
import { LENS_LABELS, getLensLabel, toPublicLensId } from "@/lib/lenses";
import { fetchWithTimeout } from "@/lib/network";
import { PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { DiscoveryResponse, LandingUseCase } from "@/types";
import { buttonVariants } from "../ui/button";

const ICONS = {
  House,
  Trees,
  Route,
  Building2,
  LineChart,
  ShieldAlert,
  Globe2,
  Factory,
} as const;

const FEATURED_EXAMPLE_IDS = [
  "home-buying",
  "market-analysis",
  "infrastructure",
  "surprise-me",
] as const;
const GITHUB_DOCS_URL = "https://github.com/sabinMas/geosight-gspat#readme";
const EXAMPLE_TOOLTIP_COPY: Record<string, string> = {
  "home-buying":
    "Screens neighborhoods for schools, amenities, internet quality, flood risk, and day-to-day livability. Best for buyers and relocators.",
  "market-analysis":
    "Evaluates commercial corridors for road access, utility readiness, and competitive density. Built for site selectors and developers.",
  infrastructure:
    "Scores power infrastructure, water proximity, climate, and broadband capacity. Designed for hyperscaler and colocation planning.",
  "surprise-me":
    "Drops you into a curated location anywhere on Earth - from Mongolian steppe to Norwegian fjords. Explore what GeoSight sees.",
};

const LENS_OPTIONS = [
  { id: GENERAL_EXPLORATION_PROFILE_ID, label: LENS_LABELS["home-buying"] },
  { id: "site-development", label: LENS_LABELS["site-development"] },
  { id: "data-center", label: LENS_LABELS.infrastructure },
  { id: "commercial", label: LENS_LABELS.commercial },
  { id: "hiking", label: LENS_LABELS.hiking },
] as const;

function getIcon(iconName: (typeof EXAMPLE_STARTERS)[number]["icon"]) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

function normalizeHue(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

function buildSurpriseGradient(location: SurpriseLocation) {
  const primaryHue = normalizeHue(location.lat);
  const secondaryHue = normalizeHue(location.lng * 2);
  const tertiaryHue = normalizeHue(location.lat + location.lng);

  return `linear-gradient(160deg, hsl(${primaryHue} 60% 40%) 0%, hsl(${secondaryHue} 62% 28%) 52%, hsl(${tertiaryHue} 58% 18%) 100%), radial-gradient(circle at 18% 20%, hsl(${secondaryHue} 70% 62% / 0.35), transparent 34%), radial-gradient(circle at 82% 28%, hsl(${tertiaryHue} 72% 58% / 0.28), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.06), transparent 55%)`;
}

function splitLocationLabel(locationName: string) {
  const [cityName, ...rest] = locationName.split(",").map((part) => part.trim());
  return {
    cityName: cityName || locationName,
    countryName: rest.join(", ") || "Curated global drop",
  };
}

function ExampleCard({
  example,
  onOpen,
  surpriseLocation,
  onRefreshSurprise,
}: {
  example: LandingUseCase;
  onOpen: (example: LandingUseCase) => void;
  surpriseLocation?: SurpriseLocation;
  onRefreshSurprise?: () => void;
}) {
  const Icon = getIcon(example.icon);
  const lensLabel = getLensLabel(example.profileId ?? GENERAL_EXPLORATION_PROFILE_ID);
  const publicLensId = toPublicLensId(example.profileId ?? GENERAL_EXPLORATION_PROFILE_ID);
  const tooltipCopy = EXAMPLE_TOOLTIP_COPY[example.id] ?? example.description;
  const isSurpriseCard = example.id === "surprise-me" && surpriseLocation;
  const cardLocationLabel = isSurpriseCard ? surpriseLocation.name : example.suggestedQuery;
  const surpriseLabelParts = isSurpriseCard ? splitLocationLabel(surpriseLocation.name) : null;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(example)}
        className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3 text-left transition duration-300 hover:scale-[1.03] hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)]"
      >
        <div className="space-y-3">
          <div
            className="relative h-[120px] overflow-hidden rounded-xl border border-white/8 p-3"
            style={{
              backgroundImage: isSurpriseCard
                ? buildSurpriseGradient(surpriseLocation)
                : `linear-gradient(145deg, ${example.accentColor}55, transparent 68%), linear-gradient(180deg, rgba(7, 17, 29, 0.16), rgba(7, 17, 29, 0.84)), radial-gradient(circle at 18% 22%, ${example.accentColor}40, transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.05), transparent 52%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 32px ${example.accentColor}16`,
            }}
          >
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-[2px]">
              {isSurpriseCard && surpriseLabelParts ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/65">
                    {surpriseLabelParts.countryName}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {surpriseLabelParts.cityName}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/70">
                    {lensLabel}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">{cardLocationLabel}</div>
                </>
              )}
            </div>
            <div
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{
                borderColor: `${example.accentColor}44`,
                background: `${example.accentColor}22`,
                color: "#ffffff",
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>

          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                {example.title}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {publicLensId ? LENS_LABELS[publicLensId] : lensLabel}
              </div>
            </div>
            <span className="relative flex shrink-0 items-start">
              <span className="group/info relative flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                <Info className="h-3.5 w-3.5" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-left text-xs font-normal normal-case leading-5 text-[var(--foreground)] opacity-0 shadow-[var(--shadow-panel)] transition duration-150 group-hover/info:opacity-100">
                  {tooltipCopy}
                </span>
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
            <span className="truncate">{cardLocationLabel}</span>
            <span className="translate-y-1 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              Explore {">"}
            </span>
          </div>
        </div>
      </button>
      {isSurpriseCard && onRefreshSurprise ? (
        <button
          type="button"
          onClick={onRefreshSurprise}
          className="absolute bottom-4 left-4 z-10 text-[9px] text-neutral-300/80 transition hover:text-white"
        >
          Refresh
        </button>
      ) : null}
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const [selectedLensId, setSelectedLensId] = useState<string>(GENERAL_EXPLORATION_PROFILE_ID);
  const [surpriseLocation, setSurpriseLocation] = useState<SurpriseLocation>(() =>
    pickRandomSurpriseLocation(),
  );
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResponse | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const featuredExamples = useMemo(
    () =>
      FEATURED_EXAMPLE_IDS.map((exampleId) =>
        EXAMPLE_STARTERS.find((example) => example.id === exampleId),
      ).filter((example): example is LandingUseCase => Boolean(example)),
    [],
  );
  const selectedLens = useMemo(
    () => PROFILES.find((profile) => profile.id === selectedLensId) ?? PROFILES[0],
    [selectedLensId],
  );
  const activeExampleSuggestion =
    EXAMPLE_STARTERS.find((example) => example.profileId === selectedLensId)?.suggestedQuery ??
    "Bellevue, WA";

  const rerollSurpriseLocation = () => {
    setSurpriseLocation((current) => {
      if (SURPRISE_ME_LOCATIONS.length <= 1) {
        return current;
      }

      let next = current;
      while (next.name === current.name) {
        next = pickRandomSurpriseLocation();
      }

      return next;
    });
  };

  const openLocation = (profileId: string, locationQuery: string, locationLabel?: string) => {
    setDiscoveryResult(null);
    setDiscoveryError(null);
    router.push(
      buildExploreHref({
        profileId,
        locationQuery,
        locationLabel,
      }),
    );
  };

  const handleDiscoveryFallback = async (query: string) => {
    setDiscoveryLoading(true);
    setDiscoveryError(null);

    try {
      const response = await fetchWithTimeout(
        "/api/discover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            profileId: selectedLens.id,
          }),
        },
        35_000,
      );

      const payload = (await response.json()) as DiscoveryResponse & { error?: string };
      if (!response.ok || !payload.intent) {
        const errorMessage =
          payload.error ??
          "GeoSight could not turn that prompt into a discovery shortlist yet.";
        setDiscoveryResult(null);
        setDiscoveryError(errorMessage);
        return { handled: false, error: errorMessage };
      }

      setDiscoveryResult(payload);
      setDiscoveryError(null);
      return { handled: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "GeoSight could not turn that prompt into a discovery shortlist yet.";
      setDiscoveryResult(null);
      setDiscoveryError(errorMessage);
      return { handled: false, error: errorMessage };
    } finally {
      setDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    setUiContext({
      activeProfile: selectedLensId,
      visiblePrimaryCardId: null,
      visibleWorkspaceCardIds: [],
      visibleControlCount: 5,
      visibleTextBlockCount: 4,
      shellMode: "minimal",
      locationSelected: false,
      geodataLoaded: false,
      geodataLoading: false,
      reportOpen: false,
    });
  }, [selectedLensId, setUiContext]);

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <header className="glass-panel flex items-center justify-between rounded-2xl px-5 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            GeoSight
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "secondary",
                size: "sm",
                className: "rounded-full",
              })}
            >
              Docs
            </a>
            <ThemeToggle compact />
          </div>
        </header>

        <section className="glass-panel rounded-2xl px-5 py-8 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Search-first spatial intelligence
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl">
              Investigate any place on Earth
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
              Terrain, infrastructure, hazards, and AI analysis for any location.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl space-y-4">
            <div className="flex flex-wrap justify-center gap-2">
              {LENS_OPTIONS.map((option) => {
                const profile = PROFILES.find((entry) => entry.id === option.id) ?? selectedLens;
                const Icon = getIcon(
                  EXAMPLE_STARTERS.find((example) => example.profileId === option.id)?.icon ??
                    "Globe2",
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedLensId(option.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition duration-300",
                      selectedLensId === option.id
                        ? "border-[color:var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                        : "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ background: `${profile.accentColor}18`, color: profile.accentColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)] md:p-5">
              <SearchBar
                placeholder={`Search a place - ${activeExampleSuggestion}`}
                submitLabel="Explore"
                onSearchFallback={handleDiscoveryFallback}
                onLocate={(result) => {
                  const locationQuery =
                    result.kind === "coordinates"
                      ? `${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`
                      : result.name;

                  openLocation(
                    selectedLens.id,
                    locationQuery,
                    result.fullName ?? result.shortName ?? result.name,
                  );
                }}
              />
              <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                Start with a place, or type a discovery prompt like &quot;best neighborhoods near Bellevue for a family&quot; or &quot;beginner hikes within 50 miles of Seattle&quot;.
              </div>

              {discoveryLoading ? (
                <div className="mt-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-4 text-sm text-[var(--foreground-soft)]">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                    Building a discovery shortlist from the prompt...
                  </div>
                </div>
              ) : null}

              {discoveryError ? (
                <div className="mt-4 rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger-foreground)]">
                  {discoveryError}
                </div>
              ) : null}

              {discoveryResult ? (
                <div className="mt-4 space-y-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
                  <div className="space-y-2">
                    <div className="eyebrow">Discovery shortlist</div>
                    <div className="text-lg font-semibold text-[var(--foreground)]">
                      {discoveryResult.intent.title}
                    </div>
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                      {discoveryResult.intent.summary}
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {discoveryResult.candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() =>
                          openLocation(
                            candidate.profileId,
                            candidate.locationQuery,
                            candidate.locationLabel,
                          )
                        }
                        className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-panel)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-[var(--foreground)]">
                              {candidate.title}
                            </div>
                            <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                              {candidate.subtitle}
                            </div>
                          </div>
                          {candidate.score !== null ? (
                            <div className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
                              {candidate.score}/100
                            </div>
                          ) : null}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-[var(--foreground-soft)]">
                          {candidate.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {candidate.highlights.map((highlight) => (
                            <span
                              key={`${candidate.id}-${highlight}`}
                              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Limits
                    </div>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {discoveryResult.limitations.map((limitation) => (
                        <div key={limitation}>- {limitation}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-2xl px-5 py-6 md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Try an example
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Jump straight in
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
              Pick a lens, open a real place, and let GeoSight reveal the live context.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            {featuredExamples.map((example) => (
              <ExampleCard
                key={example.id}
                example={example}
                surpriseLocation={example.id === "surprise-me" ? surpriseLocation : undefined}
                onRefreshSurprise={example.id === "surprise-me" ? rerollSurpriseLocation : undefined}
                onOpen={(selectedExample) => {
                  const targetLocation =
                    selectedExample.id === "surprise-me"
                      ? surpriseLocation.name
                      : selectedExample.suggestedQuery;

                  openLocation(
                    selectedExample.profileId ?? GENERAL_EXPLORATION_PROFILE_ID,
                    targetLocation,
                  );
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)] md:flex-row md:justify-center">
            <span>Pick a lens</span>
            <span className="hidden h-px w-12 bg-[var(--border-soft)] md:block" />
            <span>Drop a pin</span>
            <span className="hidden h-px w-12 bg-[var(--border-soft)] md:block" />
            <span>Read the intelligence</span>
          </div>
        </section>

        <footer className="px-2 pb-6 text-center text-sm leading-7 text-[var(--muted-foreground)]">
          Built with Cesium, OpenStreetMap, USGS, FEMA, FCC, EPA, and Open-Meteo.
        </footer>
      </div>
    </main>
  );
}
