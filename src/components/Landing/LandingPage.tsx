"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Factory,
  Globe2,
  House,
  LineChart,
  Loader2,
  Route,
  ShieldAlert,
  Trees,
} from "lucide-react";
import { LandingUseCase } from "@/types";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { getCurrentCoordinates } from "@/lib/cesium-search";
import { DEMO_REGISTRY } from "@/lib/demos/registry";
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
} as const;

const GUIDED_DEMO_IDS = ["pnw-cooling", "tokyo-commercial", "wa-residential"] as const;
const FEATURED_USE_CASE_IDS = ["home-buying", "market-analysis", "infrastructure"] as const;

function getIcon(iconName: (typeof LANDING_USE_CASES)[number]["icon"]) {
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
      className="rounded-[1.35rem] border p-4 text-left transition duration-300"
      style={{
        borderColor: active ? `${useCase.accentColor}55` : "var(--border-soft)",
        background: active ? `${useCase.accentColor}14` : "var(--surface-raised)",
      }}
      aria-pressed={active}
    >
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

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryCompetitionDemo = useMemo(
    () => DEMO_REGISTRY.find((demo) => demo.id === "pnw-cooling") ?? DEMO_REGISTRY[0],
    [],
  );
  const guidedDemos = useMemo(
    () =>
      DEMO_REGISTRY.filter((demo) =>
        GUIDED_DEMO_IDS.includes(demo.id as (typeof GUIDED_DEMO_IDS)[number]),
      ),
    [],
  );
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
      demoOpen: false,
    });
  }, [selectedUseCase?.profileId, selectedUseCase, setUiContext]);

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
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1520px] space-y-6">
        <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 md:p-7 lg:p-8">
          <div className="hero-orbit right-[-4rem] top-[-3rem]" />
          <div className="hero-orbit bottom-[-6rem] left-[-5rem]" />

          <div className="relative flex justify-end">
            <ThemeToggle compact />
          </div>

          <div className="relative mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="eyebrow text-[var(--accent)]">GeoSight</div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                  Ask one place a serious question, then reveal the depth only when you need it
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
                  Start with a mission lens and a location. GeoSight keeps the first step calm, then
                  expands into provenance, scoring, hazards, and deeper analysis as the workflow demands it.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Prompt-first workspace",
                  "Visible provenance",
                  "Live-source spatial reasoning",
                ].map((item) => (
                  <span
                    key={item}
                    className="metric-chip px-4 py-2 text-sm text-[var(--foreground-soft)]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() =>
                  router.push(
                    buildExploreHref({
                      profileId: primaryCompetitionDemo.profileId,
                      demoId: primaryCompetitionDemo.id,
                      entrySource: "demo",
                      judgeMode: Boolean(primaryCompetitionDemo.competition),
                      missionRunPresetId: primaryCompetitionDemo.competition?.missionRunPresetId,
                    }),
                  )
                }
              >
                Open primary competition demo
              </Button>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-5 shadow-[var(--shadow-soft)]">
              <div className="space-y-3">
                <div className="eyebrow">Step 1</div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  Pick one of three featured starting lenses
                </h2>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  Keep the first choice small, then unlock the location step once the lens is clear.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featuredUseCases.map((useCase) => (
                  <UseCaseCard
                    key={useCase.id}
                    useCase={useCase}
                    active={useCase.id === selectedUseCaseId}
                    onSelect={handleSelectUseCase}
                  />
                ))}
              </div>

              <details className="mt-4 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                  More starting lenses
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

              {selectedUseCase ? (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                      Open GeoSight
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
              ) : (
                <div className="mt-5 rounded-[1.35rem] border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-5 text-sm leading-6 text-[var(--muted-foreground)]">
                  Step 2 stays hidden until you choose a mission lens.
                </div>
              )}

              {error ? (
                <div className="mt-4 rounded-[1.35rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="eyebrow">Guided demos</div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Three strong stories, kept secondary to the main flow
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                Infrastructure depth, global proof, and everyday usefulness are still here when you
                need a guided judging path.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {guidedDemos.map((demo) => {
              const Icon = getIcon(demo.icon);
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      buildExploreHref({
                        profileId: demo.profileId,
                        demoId: demo.id,
                        entrySource: "demo",
                        judgeMode: Boolean(demo.competition),
                        missionRunPresetId: demo.competition?.missionRunPresetId,
                      }),
                    )
                  }
                  className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-left transition duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                      style={{
                        borderColor: `${demo.accentColor}33`,
                        color: demo.accentColor,
                        background: `${demo.accentColor}14`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                        {demo.name}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        {demo.locationName}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                        {demo.tagline}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
