"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Compass,
  Database,
  Factory,
  Globe2,
  HelpCircle,
  House,
  Layers,
  LineChart,
  Loader2,
  Map,
  Route,
  ShieldAlert,
  Target,
  Trees,
} from "lucide-react";
import { LandingUseCase } from "@/types";
import { WalkthroughOverlay } from "@/components/Explore/WalkthroughOverlay";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { getCurrentCoordinates } from "@/lib/cesium-search";
import { EXPLORER_LENSES } from "@/lib/explorer-lenses";
import { LANDING_WALKTHROUGH_STEPS } from "@/lib/demos/walkthrough";
import { buildExploreHref, LANDING_USE_CASES } from "@/lib/landing";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const ICONS = {
  House,
  Trees,
  Route,
  Building2,
  LineChart,
  ShieldAlert,
  Globe2,
  Factory,
  Target,
  Compass,
  Map,
  Layers,
} as const;

const FEATURED_USE_CASE_IDS = ["home-buying", "market-analysis", "infrastructure"] as const;
const HERO_STATS = [
  "35+ Live Data Sources",
  "23 Analysis Cards",
  "5 Mission Lenses",
  "7 Hazard Domains",
  "5 Drawing Tools",
] as const;

const WHAT_GEOSIGHT_DOES = [
  {
    title: "Multi-Source Intelligence",
    description: "35+ live data sources aggregated in seconds so every place starts with evidence, not guesswork.",
    Icon: Database,
  },
  {
    title: "Mission-Driven Scoring",
    description: "The same location can tell a very different story depending on the lens you choose and the factors you weight.",
    Icon: Target,
  },
  {
    title: "Transparent Trust",
    description: "Every signal is labeled with source freshness, coverage, and confidence so you can see what is direct, derived, or limited.",
    Icon: ShieldAlert,
  },
] as const;

const POWERED_BY_PROVIDERS = [
  "USGS",
  "NOAA",
  "NASA",
  "OpenStreetMap",
  "FEMA",
  "EPA",
  "NRCS",
  "Open-Meteo",
] as const;

function getIcon(iconName: string) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

function UseCaseCard({
  useCase,
  active,
  onSelect,
}: {
  useCase: LandingUseCase;
  active: boolean;
  onSelect: (useCaseId: string) => void;
}) {
  const Icon = getIcon(useCase.icon);

  return (
    <button
      type="button"
      onClick={() => onSelect(useCase.id)}
      className="relative rounded-[1.35rem] border p-4 text-left transition duration-300"
      style={{
        borderColor: active ? `${useCase.accentColor}55` : "var(--border-soft)",
        background: active ? `${useCase.accentColor}16` : "var(--surface-raised)",
        boxShadow: active ? `0 0 0 2px ${useCase.accentColor}22, var(--shadow-soft)` : undefined,
      }}
      role="radio"
      aria-checked={active}
    >
      {active ? (
        <span
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border"
          style={{
            borderColor: `${useCase.accentColor}44`,
            background: `${useCase.accentColor}1e`,
            color: useCase.accentColor,
          }}
          aria-hidden="true"
        >
          <Check className="h-4 w-4" />
        </span>
      ) : null}
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            borderColor: active ? `${useCase.accentColor}40` : "var(--border-soft)",
            background: active ? `${useCase.accentColor}18` : "var(--surface-soft)",
            color: useCase.accentColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
            {useCase.title}
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--muted-foreground)]">
            {useCase.description}
          </p>
        </div>
      </div>
    </button>
  );
}

const LANDING_WALKTHROUGH_STORAGE_KEY = "geosight-landing-walkthrough-seen";

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const explorerStep2Ref = useRef<HTMLDivElement | null>(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  const featuredUseCases = useMemo(
    () =>
      FEATURED_USE_CASE_IDS.map((useCaseId) =>
        LANDING_USE_CASES.find((useCase) => useCase.id === useCaseId),
      ).filter((useCase): useCase is LandingUseCase => Boolean(useCase)),
    [],
  );
  const additionalUseCases = useMemo(
    () =>
      LANDING_USE_CASES.filter(
        (useCase) =>
          !FEATURED_USE_CASE_IDS.includes(
            useCase.id as (typeof FEATURED_USE_CASE_IDS)[number],
          ),
      ),
    [],
  );
  const selectedUseCase = useMemo(
    () =>
      selectedUseCaseId
        ? LANDING_USE_CASES.find((useCase) => useCase.id === selectedUseCaseId) ?? null
        : null,
    [selectedUseCaseId],
  );

  useEffect(() => {
    setUiContext({
      activeProfile: selectedUseCase?.profileId,
      visiblePrimaryCardId: null,
      visibleWorkspaceCardIds: [],
      visibleControlCount: selectedUseCase ? 8 : 5,
      visibleTextBlockCount: selectedUseCase ? 7 : 6,
      shellMode: "minimal",
      locationSelected: false,
      geodataLoaded: false,
      geodataLoading: false,
      reportOpen: false,
    });
  }, [selectedUseCase?.profileId, selectedUseCase, setUiContext]);

  useEffect(() => {
    if (!selectedUseCase || !step2Ref.current) {
      return;
    }

    step2Ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedUseCase]);

  useEffect(() => {
    if (!selectedUseCaseId?.startsWith("explorer-") || !explorerStep2Ref.current) {
      return;
    }

    explorerStep2Ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedUseCaseId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LANDING_WALKTHROUGH_STORAGE_KEY) === "true") return;
    const timeout = window.setTimeout(() => setWalkthroughOpen(true), 600);
    return () => window.clearTimeout(timeout);
  }, []);

  const dismissLandingWalkthrough = useCallback(() => {
    setWalkthroughOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANDING_WALKTHROUGH_STORAGE_KEY, "true");
    }
  }, []);

  const handleSelectUseCase = (useCaseId: string) => {
    const nextUseCase =
      LANDING_USE_CASES.find((useCase) => useCase.id === useCaseId) ?? null;
    setSelectedUseCaseId(useCaseId);
    setError(null);
    setLocationQuery(nextUseCase?.suggestedQuery ?? "");
  };

  const handleRouteToExplore = (nextLocationQuery?: string) => {
    if (!selectedUseCase) {
      setError("Choose a mission lens before opening GeoSight.");
      return;
    }

    const href = buildExploreHref({
      profileId: selectedUseCase.profileId,
      locationQuery: nextLocationQuery || undefined,
      entrySource: "landing",
      appMode: "pro",
    });

    router.push(href);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedUseCase) {
      setError("Choose a mission lens to unlock the next step.");
      return;
    }

    if (!locationQuery.trim()) {
      setError("Enter a city, ZIP code, coordinates, or region to continue.");
      return;
    }

    setSubmitting(true);
    handleRouteToExplore(locationQuery.trim());
  };

  const handleUseCurrentLocation = async () => {
    setError(null);

    if (!selectedUseCase) {
      setError("Choose a mission lens before using your current location.");
      return;
    }

    setLocating(true);

    try {
      const coords = await getCurrentCoordinates();
      handleRouteToExplore(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read your current location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1520px] space-y-6">
        {/* Explorer hero */}
        <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 md:p-7 lg:p-8">
          <div className="hero-orbit right-[-4rem] top-[-3rem]" />
          <div className="hero-orbit bottom-[-6rem] left-[-5rem]" />

          <div className="relative flex items-center justify-between">
            <div className="eyebrow text-[var(--accent)]">GeoSight</div>
            <div className="flex items-center gap-3">
              <Link
                href="/explore?mode=pro"
                className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                For professionals →
              </Link>
              <button
                type="button"
                onClick={() => setWalkthroughOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
                aria-label="Start guided tour"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Tour
              </button>
              <ThemeToggle compact />
            </div>
          </div>

          <div className="relative mt-8 space-y-6">
            <div className="space-y-3 text-center">
              <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                See any place clearly.
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--foreground-soft)] sm:text-base">
                GeoSight turns maps, hazards, climate, infrastructure, and trust signals into a single spatial intelligence workspace.
              </p>
              <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 pt-2">
                {HERO_STATS.map((stat) => (
                  <span
                    key={stat}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-soft)]"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            </div>

            <h2 className="text-center text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              STEP 1 — CHOOSE A LENS
            </h2>
            <div role="radiogroup" aria-label="Analysis lens" data-walkthrough="landing-lens-grid" className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EXPLORER_LENSES.map((lens) => {
                const Icon = getIcon(lens.icon);
                const isActive = selectedUseCaseId === `explorer-${lens.id}`;
                return (
                  <button
                    key={lens.id}
                    type="button"
                    onClick={() => {
                      setSelectedUseCaseId(`explorer-${lens.id}`);
                      setError(null);
                      setLocationQuery("");
                    }}
                    className="relative rounded-[1.35rem] border p-4 text-left transition duration-300"
                    style={{
                      borderColor: isActive ? "#00e5ff55" : "var(--border-soft)",
                      background: isActive ? "#00e5ff16" : "var(--surface-raised)",
                      boxShadow: isActive ? "0 0 0 2px #00e5ff22, var(--shadow-soft)" : undefined,
                    }}
                    role="radio"
                    aria-checked={isActive}
                  >
                    {isActive && (
                      <span
                        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border"
                        style={{
                          borderColor: "#00e5ff44",
                          background: "#00e5ff1e",
                          color: "#00e5ff",
                        }}
                        aria-hidden="true"
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: isActive ? "#00e5ff40" : "var(--border-soft)",
                          background: isActive ? "#00e5ff18" : "var(--surface-soft)",
                          color: "#00e5ff",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--foreground)]">
                          {lens.label}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                          {lens.tagline}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Location entry — always visible, dimmed until a lens is selected */}
            <div ref={explorerStep2Ref} className="mx-auto max-w-xl">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                STEP 2 — ENTER A LOCATION
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  if (!selectedUseCaseId?.startsWith("explorer-")) {
                    setError("Choose a lens above before searching for a location.");
                    return;
                  }
                  if (!locationQuery.trim()) {
                    setError("Enter a city, address, or coordinates to continue.");
                    return;
                  }
                  const lensId = selectedUseCaseId.replace("explorer-", "");
                  const lens = EXPLORER_LENSES.find((l) => l.id === lensId);
                  if (!lens) return;
                  setSubmitting(true);
                  router.push(
                    buildExploreHref({
                      profileId: lens.profileId,
                      locationQuery: locationQuery.trim() || undefined,
                      entrySource: "landing",
                      appMode: "explorer",
                      lensId: lens.id,
                    }),
                  );
                }}
                className="space-y-4"
              >
                {/* Input row — dimmed and non-interactive until a lens is chosen */}
                <div data-walkthrough="landing-location-input" className={`transition-opacity duration-200 ${selectedUseCaseId?.startsWith("explorer-") ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                  <Input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="City, region, or coordinates…"
                    aria-label="Enter a city, region, or coordinates"
                    className="h-12 rounded-[1.5rem]"
                    autoFocus={Boolean(selectedUseCaseId?.startsWith("explorer-"))}
                  />
                </div>
                {/* Button row — always interactive so users get feedback if they skip Step 1 */}
                <div className={`flex gap-3 transition-opacity duration-200 ${selectedUseCaseId?.startsWith("explorer-") ? "opacity-100" : "opacity-60"}`}>
                  <Button type="submit" data-walkthrough="landing-explore-button" className="h-12 flex-1 rounded-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Explore this place
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-full"
                    onClick={async () => {
                      setError(null);
                      if (!selectedUseCaseId?.startsWith("explorer-")) {
                        setError("Choose a lens above before using your location.");
                        return;
                      }
                      setLocating(true);
                      try {
                        const coords = await getCurrentCoordinates();
                        setLocationQuery(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "Unable to read your location.",
                        );
                      } finally {
                        setLocating(false);
                      }
                    }}
                    disabled={locating}
                  >
                    {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Use my location
                  </Button>
                </div>
                {error ? (
                  <div className="rounded-[1.35rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                    {error}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="space-y-2">
            <div className="eyebrow">What GeoSight does</div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Spatial intelligence that stays grounded in evidence
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
              GeoSight is built to help people move from a place name to a defensible first-pass decision without needing a GIS workstation.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {WHAT_GEOSIGHT_DOES.map(({ title, description, Icon }) => (
              <div
                key={title}
                className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="eyebrow">Powered by</div>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Public geospatial and environmental data providers that keep the analysis grounded in live or official context.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POWERED_BY_PROVIDERS.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-soft)]"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pro / analyst section */}
        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="eyebrow">Professional tools</div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                For analysts, planners, and site teams
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                Factor scoring, source awareness, and full data provenance.
              </p>
            </div>
            <Link
              href="/explore?mode=pro"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
            >
              Open Pro workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredUseCases.map((useCase) => (
              <UseCaseCard
                key={useCase.id}
                useCase={useCase}
                active={useCase.id === selectedUseCaseId}
                onSelect={handleSelectUseCase}
              />
            ))}
          </div>

          {selectedUseCase && !selectedUseCaseId?.startsWith("explorer-") ? (
            <div ref={step2Ref} className="step2-appear mt-5 rounded-[1.5rem]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="eyebrow">Step 2</div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">
                    Focus a place with the {selectedUseCase.title.toLowerCase()} lens
                  </h3>
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    Suggested start: {selectedUseCase.suggestedQuery}
                  </p>
                </div>
                <Input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder={selectedUseCase.suggestedQuery}
                  className="h-12 rounded-[1.5rem]"
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" className="h-12 flex-1 rounded-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Open Pro workspace
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-full"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                  >
                    {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Use my location
                  </Button>
                </div>
              </form>
              {error && !selectedUseCaseId?.startsWith("explorer-") ? (
                <div className="mt-4 rounded-[1.35rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {error}
                </div>
              ) : null}
            </div>
          ) : null}

          <details className="group mt-4 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[var(--foreground)]">
              <span>More Pro starting lenses</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {additionalUseCases.map((useCase) => (
                <UseCaseCard
                  key={useCase.id}
                  useCase={useCase}
                  active={useCase.id === selectedUseCaseId}
                  onSelect={handleSelectUseCase}
                />
              ))}
            </div>
          </details>
        </section>

      </div>

      <WalkthroughOverlay
        open={walkthroughOpen}
        steps={LANDING_WALKTHROUGH_STEPS}
        onClose={dismissLandingWalkthrough}
      />
    </main>
  );
}
