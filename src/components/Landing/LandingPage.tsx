"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Factory,
  Globe2,
  House,
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
} from "@/lib/landing";
import { PROFILES } from "@/lib/profiles";
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

const FEATURED_EXAMPLE_IDS = ["home-buying", "market-analysis", "infrastructure"] as const;
const GITHUB_DOCS_URL = "https://github.com/sabinMas/geosight-gspat#readme";

const LENS_OPTIONS = [
  { id: GENERAL_EXPLORATION_PROFILE_ID, label: "General" },
  { id: "data-center", label: "Infrastructure" },
  { id: "commercial", label: "Commercial" },
  { id: "hiking", label: "Hiking" },
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

  return (
    <button
      type="button"
      onClick={() => onOpen(example)}
      className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 text-left transition duration-300 hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)]"
      style={{
        boxShadow: `0 14px 28px ${example.accentColor}10`,
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: `${example.accentColor}36`,
            background: `${example.accentColor}14`,
            color: example.accentColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
            {example.title}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {example.suggestedQuery}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {example.description}
          </p>
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
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
              GeoSight
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl">
              Investigate any place on Earth
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
              Terrain, infrastructure, hazards, and AI analysis for any location.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)] md:p-5">
            <SearchBar
              leadingControl={
                <label className="block">
                  <span className="sr-only">Lens</span>
                  <select
                    value={selectedLens.id}
                    onChange={(event) => setSelectedLensId(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[color:var(--border-strong)]"
                    aria-label="Select analysis lens"
                  >
                    {LENS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              }
              placeholder={`Search a place - ${activeExampleSuggestion}`}
              submitLabel="Explore"
              onLocate={(result) => {
                const locationQuery =
                  result.kind === "coordinates"
                    ? `${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`
                    : result.name;

                router.push(
                  buildExploreHref({
                    profileId: selectedLens.id,
                    locationQuery,
                  }),
                );
              }}
            />
            <div className="mt-3 text-sm text-[var(--muted-foreground)]">
              Start with a place. Change the lens any time.
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
                Start from a real place, not a scripted tour
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
              Each example opens the explore workspace with a place and lens already selected.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {featuredExamples.map((example) => (
              <ExampleCard
                key={example.id}
                example={example}
                onOpen={(selectedExample) => {
                  router.push(
                    buildExploreHref({
                      profileId: selectedExample.profileId,
                      locationQuery: selectedExample.suggestedQuery,
                    }),
                  );
                }}
              />
            ))}
          </div>
        </section>

        <footer className="px-2 pb-6 text-center text-sm leading-7 text-[var(--muted-foreground)]">
          Built with Cesium, OpenStreetMap, USGS, FEMA, FCC, EPA, and Open-Meteo.
        </footer>
      </div>
    </main>
  );
}
