"use client";

import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import { buildExploreHref } from "@/lib/landing";

export default function DemosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--border-soft)" }}>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
          <Link href="/" className="inline-flex">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-4xl font-medium sm:text-5xl" style={{ color: "var(--foreground)" }}>
            Demo Walkthroughs
          </h1>
          <p className="mt-3 max-w-2xl text-base" style={{ color: "var(--muted-foreground)" }}>
            Explore guided walkthroughs showing how GeoSight analyzes different types of locations using 40+ live government data sources.
          </p>
        </div>
      </div>

      {/* Demo Cards Grid */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {DEMO_SCENARIOS.map((scenario) => {
            const href = buildExploreHref({
              profileId: scenario.profileId,
              lensId: scenario.lensId,
              lat: scenario.lat,
              lng: scenario.lng,
              appMode: scenario.appMode,
              entrySource: "landing",
              demoScenarioId: scenario.id,
            });

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => router.push(href)}
                className="group overflow-hidden rounded-2xl border transition hover:border-[color:var(--accent-strong)]"
                style={{
                  borderColor: "var(--border-soft)",
                  background: "var(--surface-panel)",
                }}
              >
                {/* Thumbnail Container */}
                <div
                  className="relative aspect-video w-full overflow-hidden flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
                >
                  <div className="text-center">
                    <div className="mb-3 inline-flex items-center justify-center h-14 w-14 rounded-full border transition group-hover:bg-[var(--accent-soft)]" style={{ borderColor: "var(--accent)" }}>
                      <Play className="h-5 w-5 fill-current" style={{ color: "var(--accent)" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      Play demo
                    </p>
                  </div>
                </div>

                {/* Demo Info */}
                <div className="flex flex-col gap-3 px-5 py-5">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                      {scenario.label}
                    </h2>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {scenario.location}
                    </p>
                  </div>

                  <p className="text-sm leading-6 text-left" style={{ color: "var(--muted-foreground)" }}>
                    {scenario.tagline}
                  </p>

                  <div className="flex gap-3 pt-2">
                    <span
                      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: "var(--border-soft)",
                        background: "var(--surface-soft)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {scenario.steps.length} steps
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: "var(--border-soft)",
                        background: "var(--surface-soft)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      ~{scenario.steps.length * 6}s
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
