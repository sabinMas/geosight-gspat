"use client";

import { FormEvent, useMemo, useState } from "react";
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
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentCoordinates } from "@/lib/cesium-search";
import { DEMO_REGISTRY } from "@/lib/demos/registry";
import { buildExploreHref, LANDING_USE_CASES } from "@/lib/landing";
import { DemoOverlay, LandingUseCase } from "@/types";

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

function getDemoCoverageBadges(demo: DemoOverlay) {
  switch (demo.id) {
    case "tokyo-commercial":
      return ["Global proof", "World Bank fallback", "School limits visible"];
    case "wa-residential":
      return ["US depth", "WA school context", "Trust-aware briefing"];
    case "pnw-cooling":
      return ["Primary competition story", "Comparison-ready", "Infrastructure focus"];
    default:
      return ["Workspace story"];
  }
}

function getIcon(iconName: LandingUseCase["icon"]) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

function getDemoIcon(iconName: DemoOverlay["icon"]) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

export function LandingPage() {
  const router = useRouter();
  const primaryCompetitionDemo = useMemo(
    () => DEMO_REGISTRY.find((demo) => demo.id === "pnw-cooling") ?? DEMO_REGISTRY[0],
    [],
  );
  const guidedDemos = useMemo(
    () => DEMO_REGISTRY.filter((demo) => GUIDED_DEMO_IDS.includes(demo.id as (typeof GUIDED_DEMO_IDS)[number])),
    [],
  );
  const [selectedUseCaseId, setSelectedUseCaseId] = useState("general-exploration");
  const [locationQuery, setLocationQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUseCase = useMemo(
    () =>
      LANDING_USE_CASES.find((useCase) => useCase.id === selectedUseCaseId) ??
      LANDING_USE_CASES[0],
    [selectedUseCaseId],
  );

  const handleRouteToExplore = (nextLocationQuery?: string) => {
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

    if (!locationQuery.trim()) {
      setError("Enter a city, ZIP code, coordinates, or region to continue.");
      return;
    }

    setSubmitting(true);
    handleRouteToExplore(locationQuery.trim());
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
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

  const handleOpenDemo = (demo: DemoOverlay) => {
    router.push(
      buildExploreHref({
        profileId: demo.profileId,
        demoId: demo.id,
        entrySource: "demo",
        judgeMode: Boolean(demo.competition),
        missionRunPresetId: demo.competition?.missionRunPresetId,
      }),
    );
  };

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 md:p-7 lg:p-8">
          <div className="hero-orbit right-[-4rem] top-[-3rem]" />
          <div className="hero-orbit bottom-[-6rem] left-[-5rem]" />

          <div className="relative flex items-center justify-between gap-4">
            <Badge>Universal location intelligence</Badge>
            <ThemeToggle compact />
          </div>

          <div className="relative mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] xl:gap-10">
            <div className="space-y-7">
              <div className="space-y-4">
                <div className="eyebrow text-[var(--accent)]">GeoSight</div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl xl:text-[4.3rem]">
                  Watch GeoSight run grounded mission briefings for any place on Earth
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
                  Start with the Columbia River competition story, then jump to Tokyo or
                  Washington to show that GeoSight is a trust-aware spatial reasoning system, not
                  just a map or chatbot.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="h-12 rounded-full px-6"
                  onClick={() => handleOpenDemo(primaryCompetitionDemo)}
                >
                  Start primary demo
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Mission-run briefings",
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
            </div>

            <div className="rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-5 shadow-[var(--shadow-soft)]">
              <div className="space-y-3">
                <div className="eyebrow">Primary demo</div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  Columbia River infrastructure story
                </h2>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  GeoSight opens on its strongest competition path first: cooling-screening,
                  candidate comparison, and visible trust signals in one guided workflow.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  "Shortlist cooling candidates with live and derived signals.",
                  "Explain tradeoffs with score breakdowns and source awareness.",
                  "Pivot into global proof with Tokyo and everyday usefulness with Washington.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="eyebrow">Mission selector</div>
              <h2 className="text-3xl font-semibold text-[var(--foreground)]">
                Choose a lens, then open the workspace
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                Keep the first step calm: pick the mission that matches the question, then focus a
                city, region, address, or exact coordinate.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {LANDING_USE_CASES.map((useCase) => {
                  const Icon = getIcon(useCase.icon);
                  const active = useCase.id === selectedUseCaseId;

                  return (
                    <button
                      key={useCase.id}
                      type="button"
                      onClick={() => {
                        setSelectedUseCaseId(useCase.id);
                        setLocationQuery((current) => current || useCase.suggestedQuery);
                      }}
                      className="rounded-[1.5rem] border p-4 text-left transition duration-300"
                      style={{
                        borderColor: active ? `${useCase.accentColor}55` : "var(--border-soft)",
                        background: active ? `${useCase.accentColor}16` : "var(--surface-soft)",
                        boxShadow: active ? `0 16px 34px ${useCase.accentColor}18` : "none",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                          style={{
                            borderColor: active
                              ? `${useCase.accentColor}40`
                              : "var(--border-soft)",
                            background: active
                              ? `${useCase.accentColor}18`
                              : "var(--surface-raised)",
                            color: useCase.accentColor,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {useCase.title}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                            {useCase.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-5 shadow-[var(--shadow-soft)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="eyebrow">Step 2</div>
                  <h3 className="text-2xl font-semibold text-[var(--foreground)]">
                    Focus a place
                  </h3>
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    GeoSight will carry the selected mission profile into the explore workspace.
                  </p>
                </div>

                <Input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder={selectedUseCase.suggestedQuery}
                  className="h-12 rounded-[1.5rem]"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="submit"
                    className="h-12 flex-1 rounded-full"
                    disabled={submitting}
                  >
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
                    Use my current location
                  </Button>
                </div>
              </form>

              <div className="mt-4 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
                <div className="eyebrow">Selected route</div>
                <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                  {selectedUseCase.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {selectedUseCase.description}
                </p>
              </div>

              {error ? (
                <div className="mt-4 rounded-[1.5rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="space-y-4">
            <div className="eyebrow">Guided demos</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Start with one of three strongest stories
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                These are the clearest demo paths for competition judging and first-time product
                comprehension: infrastructure depth, global proof, and everyday usefulness.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              {guidedDemos.map((demo) => {
                const Icon = getDemoIcon(demo.icon);
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleOpenDemo(demo)}
                    className="w-full rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-left transition duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: `${demo.accentColor}33`,
                          color: demo.accentColor,
                          background: `${demo.accentColor}14`,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {demo.name}
                          </div>
                          <span
                            className="rounded-full border px-2 py-0.5 text-[11px]"
                            style={{
                              borderColor: `${demo.accentColor}44`,
                              color: demo.accentColor,
                            }}
                          >
                            {demo.entryMode === "overlay" ? "Overlay demo" : "Workspace demo"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          {demo.locationName}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {demo.tagline}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getDemoCoverageBadges(demo).map((badge) => (
                            <span
                              key={`${demo.id}-${badge}`}
                              className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] text-[var(--foreground-soft)]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="space-y-4">
            <div className="eyebrow">What makes this different</div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Not another map. Not another chatbot.
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Grounded",
                  text: "GeoSight ties AI answers back to source-aware spatial context.",
                },
                {
                  title: "Modular",
                  text: "The board model lets the app evolve into a true card-driven dashboard.",
                },
                {
                  title: "Global-minded",
                  text: "Search any place first, then ask mission-specific questions second.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4"
                >
                  <div className="text-base font-semibold text-[var(--foreground)]">
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
