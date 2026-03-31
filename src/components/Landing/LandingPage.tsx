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
} from "@/lib/landing";
import { LENS_LABELS, getLensLabel, toPublicLensId } from "@/lib/lenses";
import { PROFILES } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { LandingUseCase } from "@/types";
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

const LENS_OPTIONS = [
  { id: GENERAL_EXPLORATION_PROFILE_ID, label: LENS_LABELS.residential },
  { id: "data-center", label: LENS_LABELS.infrastructure },
  { id: "commercial", label: LENS_LABELS.commercial },
  { id: "hiking", label: LENS_LABELS.hiking },
] as const;

function getIcon(iconName: (typeof EXAMPLE_STARTERS)[number]["icon"]) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

function ExampleCard({
  example,
  onOpen,
}: {
  example: LandingUseCase;
  onOpen: (example: LandingUseCase) => void;
}) {
  const Icon = getIcon(example.icon);
  const lensLabel = getLensLabel(example.profileId ?? GENERAL_EXPLORATION_PROFILE_ID);
  const publicLensId = toPublicLensId(example.profileId ?? GENERAL_EXPLORATION_PROFILE_ID);

  return (
    <button
      type="button"
      onClick={() => onOpen(example)}
      className="group rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3 text-left transition duration-300 hover:scale-[1.03] hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)]"
    >
      <div className="space-y-3">
        <div
          className="relative h-[120px] overflow-hidden rounded-xl border border-white/8 p-3"
          style={{
            background: `linear-gradient(145deg, ${example.accentColor}55, transparent 68%), linear-gradient(180deg, rgba(7, 17, 29, 0.16), rgba(7, 17, 29, 0.84)), radial-gradient(circle at 18% 22%, ${example.accentColor}40, transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.05), transparent 52%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 32px ${example.accentColor}16`,
          }}
        >
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-[2px]">
            <div className="text-xs uppercase tracking-[0.18em] text-white/70">{lensLabel}</div>
            <div className="mt-1 text-lg font-semibold text-white">{example.suggestedQuery}</div>
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
          <span
            title={example.description}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
          <span className="truncate">{example.suggestedQuery}</span>
          <span className="translate-y-1 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            Explore {">"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const [selectedLensId, setSelectedLensId] = useState<string>(GENERAL_EXPLORATION_PROFILE_ID);

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

  const openLocation = (profileId: string, locationQuery: string) => {
    router.push(
      buildExploreHref({
        profileId,
        locationQuery,
      }),
    );
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
                onLocate={(result) => {
                  const locationQuery =
                    result.kind === "coordinates"
                      ? `${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`
                      : result.name;

                  openLocation(selectedLens.id, locationQuery);
                }}
              />
              <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                Start with a place. Change the lens any time.
              </div>
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
                onOpen={(selectedExample) => {
                  const targetLocation =
                    selectedExample.id === "surprise-me"
                      ? pickRandomSurpriseLocation()
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
