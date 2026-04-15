"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Compass,
  Factory,
  Globe2,
  House,
  Layers,
  LineChart,
  Loader2,
  Map,
  Route,
  ShieldAlert,
  Target,
  Trees,
  Navigation,
} from "lucide-react";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { getCurrentCoordinates } from "@/lib/cesium-search";
import { EXPLORER_LENSES } from "@/lib/explorer-lenses";
import { buildExploreHref } from "@/lib/landing";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Footer } from "./Footer";

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

function getIcon(iconName: string) {
  return ICONS[iconName as keyof typeof ICONS] ?? Globe2;
}

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const [selectedLensId, setSelectedLensId] = useState<string>(EXPLORER_LENSES[0].id);
  const [locationQuery, setLocationQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedLens = useMemo(
    () => EXPLORER_LENSES.find((l) => l.id === selectedLensId) ?? EXPLORER_LENSES[0],
    [selectedLensId],
  );

  useEffect(() => {
    setUiContext({
      activeProfile: selectedLens.profileId,
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
  }, [selectedLens.profileId, setUiContext]);

  const handleSelectLens = (lensId: string) => {
    setSelectedLensId(lensId);
    setError(null);
    // Focus the input after lens selection so user flows naturally into typing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!locationQuery.trim()) {
      setError("Enter a city, address, or coordinates to continue.");
      return;
    }

    setSubmitting(true);
    router.push(
      buildExploreHref({
        profileId: selectedLens.profileId,
        locationQuery: locationQuery.trim(),
        entrySource: "landing",
        appMode: "explorer",
        lensId: selectedLens.id,
      }),
    );
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setLocating(true);

    try {
      const coords = await getCurrentCoordinates();
      const coordString = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      setLocationQuery(coordString);
      // Auto-submit with coordinates
      setSubmitting(true);
      router.push(
        buildExploreHref({
          profileId: selectedLens.profileId,
          locationQuery: coordString,
          entrySource: "landing",
          appMode: "explorer",
          lensId: selectedLens.id,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read your location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Topbar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--foreground)]">GeoSight</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/explore?mode=pro")}
            className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            For professionals
            <ArrowRight className="ml-1 inline-block h-3 w-3" />
          </button>
          <ThemeToggle compact />
        </div>
      </div>

      {/* Central search card */}
      <div className="glass-panel relative w-full max-w-xl overflow-hidden rounded-[2rem] p-6 md:p-8">
        {/* Subtle glow orbs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent)] opacity-[0.04] blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--color-warning)] opacity-[0.04] blur-[50px]" />

        {/* Lens chips */}
        <div className="relative mb-5 flex flex-wrap gap-2">
          {EXPLORER_LENSES.map((lens) => {
            const Icon = getIcon(lens.icon);
            const isActive = selectedLensId === lens.id;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => handleSelectLens(lens.id)}
                aria-pressed={isActive}
                title={lens.whyItMatters}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition duration-200"
                style={{
                  borderColor: isActive ? "var(--accent-strong)" : "var(--border-soft)",
                  background: isActive ? "var(--accent-soft)" : "var(--surface-soft)",
                  color: isActive ? "var(--accent-foreground)" : "var(--muted-foreground)",
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {lens.label}
                {isActive && <Check className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="relative space-y-3">
          <div className="relative">
            <Input
              ref={inputRef}
              value={locationQuery}
              onChange={(e) => { setLocationQuery(e.target.value); setError(null); }}
              placeholder={`Search a place — ${selectedLens.tagline.split("—")[0].trim().toLowerCase()}`}
              className="h-12 rounded-[1.5rem] pr-12 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              title="Use my current location"
              aria-label="Use my current location"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-panel)] text-[var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-full"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Analyze this place
          </Button>
        </form>

        {error ? (
          <div className="mt-3 rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger-foreground)]">
            {error}
          </div>
        ) : null}

        {/* Active lens hint */}
        <p className="mt-4 text-center text-xs leading-5 text-[var(--muted-foreground)]">
          {selectedLens.tagline}
        </p>
      </div>

      {/* Pro link — below card */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/explore?mode=pro")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-xs text-[var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
        >
          Open Pro workspace
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <Footer />
    </main>
  );
}
