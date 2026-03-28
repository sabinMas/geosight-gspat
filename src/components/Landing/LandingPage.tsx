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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentCoordinates } from "@/lib/cesium-search";
import { buildExploreHref, LANDING_USE_CASES } from "@/lib/landing";
import { LandingUseCase } from "@/types";

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

function getIcon(iconName: LandingUseCase["icon"]) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

export function LandingPage() {
  const router = useRouter();
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

  const handleOpenDemo = () => {
    router.push(
      buildExploreHref({
        profileId: "data-center",
        demoId: "pnw-cooling",
        entrySource: "demo",
      }),
    );
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,229,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.14),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <Badge>Universal location intelligence</Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Ask questions about any place on Earth
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Search a city, ZIP code, address, country, or coordinates, then let GeoSight
                  combine geospatial data, deterministic scoring, and AI reasoning for the mission
                  that matters to you.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "3D globe and terrain context",
                  "Mission-based AI reasoning",
                  "Compare locations in one workspace",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-white/10 bg-slate-950/55">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Start a location analysis</CardTitle>
                <p className="text-sm leading-6 text-slate-300">
                  Pick a use case, choose a place, and jump straight into the explore workspace.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Step 1 · Choose a lens
                  </div>
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
                          className="rounded-[1.5rem] border p-4 text-left transition hover:bg-white/8"
                          style={{
                            borderColor: active ? useCase.accentColor : "rgba(255,255,255,0.1)",
                            background: active ? `${useCase.accentColor}12` : "rgba(255,255,255,0.04)",
                            boxShadow: active ? `0 0 0 1px ${useCase.accentColor}55` : undefined,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-2xl"
                              style={{ background: `${useCase.accentColor}18`, color: useCase.accentColor }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white">{useCase.title}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-400">
                                {useCase.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Step 2 · Choose a place
                  </div>
                  <Input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder={selectedUseCase.suggestedQuery}
                    className="h-12 border-white/10 bg-slate-950/50"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" className="h-12 flex-1 rounded-2xl" disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Open GeoSight
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 rounded-2xl"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                    >
                      {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Use my current location
                    </Button>
                  </div>
                </form>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected route</div>
                  <div className="mt-2 text-base font-semibold text-white">{selectedUseCase.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{selectedUseCase.description}</p>
                </div>

                {error ? <div className="text-sm text-rose-300">{error}</div> : null}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-slate-950/50">
            <CardHeader>
              <CardTitle>How GeoSight works</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Choose a mission",
                  text: "Home search, hiking, market analysis, infrastructure, or general exploration.",
                },
                {
                  title: "Focus the map",
                  text: "Enter any place or use your current location to ground the workspace instantly.",
                },
                {
                  title: "Ask and compare",
                  text: "Use mission-aware scoring, AI reasoning, and layered map context to compare sites.",
                },
              ].map((step, index) => (
                <div key={step.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Step {index + 1}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{step.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/50">
            <CardHeader>
              <CardTitle>Featured demo overlay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
              <p>
                Need a guided walkthrough? Open the Pacific Northwest data center cooling overlay
                to see GeoSight&apos;s benchmark workflow with preloaded Columbia Gorge sites and
                comparison scoring.
              </p>
              <Button className="w-full justify-center rounded-2xl" onClick={handleOpenDemo}>
                See data center cooling demo
              </Button>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Included in the demo</div>
                <div className="mt-2 grid gap-2 text-sm text-slate-200">
                  <span>Columbia River cooling-site showcase</span>
                  <span>Preloaded benchmark scores</span>
                  <span>Optional overlay, separate from the default product flow</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
