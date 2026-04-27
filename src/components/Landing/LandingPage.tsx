"use client";

import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  FlaskConical,
  Globe2,
  HelpCircle,
  Layers,
  Leaf,
  Loader2,
  Map,
  Navigation,
  Pin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trees,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { WalkthroughOverlay } from "@/components/Explore/WalkthroughOverlay";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { getCurrentCoordinates, parseCoordinates } from "@/lib/cesium-search";
import { LANDING_WALKTHROUGH_STEPS } from "@/lib/demos/walkthrough";
import {
  fetchLocationSuggestions,
  MIN_LOCATION_SUGGESTION_LENGTH,
} from "@/lib/location-search";
import { LocationSearchResult } from "@/types";
import { ExplorerLens, EXPLORER_LENSES } from "@/lib/explorer-lenses";
import { buildExploreHref, getStartersForLens } from "@/lib/landing";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import { Button } from "../ui/button";
import { Footer } from "./Footer";

const LANDING_WALKTHROUGH_STORAGE_KEY = "geosight-landing-walkthrough-seen";

const ICONS: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  Target,
  Trees,
  Map,
  Layers,
  Compass,
  Zap,
  Leaf,
  ShieldAlert,
  FlaskConical,
  Globe2,
};

const LENS_COLORS: Record<string, string> = {
  "hunt-planner": "#fb923c",
  "trail-scout": "#34d399",
  "road-trip": "#60a5fa",
  "land-quick-check": "#a78bfa",
  "general-explore": "#00e5ff",
  "energy-solar": "#f59e0b",
  agriculture: "#22c55e",
  "emergency-response": "#ef4444",
  "field-research": "#8b5cf6",
};

const TRUST_SOURCES = ["OpenAI Codex", "NASA POWER", "USGS", "NOAA", "NASA FIRMS", "FEMA", "Sentinel-2", "OpenStreetMap"];


const HOW_IT_WORKS = [
  {
    icon: Layers,
    step: "01",
    title: "Choose a lens",
    body: "9 mission lenses focus analysis on your decision.",
  },
  {
    icon: Navigation,
    step: "02",
    title: "Search a place",
    body: "Address, landmark, or coordinates.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Get grounded intelligence",
    body: "40+ live datasets scored and explained.",
  },
] as const;

function getLensIcon(iconName: string) {
  return ICONS[iconName] ?? Globe2;
}

function getLensColor(lensId: string) {
  return LENS_COLORS[lensId] ?? "var(--accent)";
}

// ── Stepper dot ───────────────────────────────────────────────────────────────

interface StepDotProps {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function StepDot({ n, label, active, done, disabled, onClick }: StepDotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "step" : undefined}
      className="inline-flex items-center gap-2.5 rounded-full px-1 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition"
        style={{
          background: active ? "var(--accent)" : done ? "var(--surface-panel)" : "var(--surface-soft)",
          borderColor: active ? "var(--accent)" : done ? "var(--accent-strong)" : "var(--border-strong)",
          color: active ? "var(--accent-foreground)" : done ? "var(--accent)" : "var(--muted-foreground)",
        }}
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <span
        className="pr-2 text-xs font-medium"
        style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Lens card grid ────────────────────────────────────────────────────────────

function LensGrid({
  lenses,
  selectedId,
  onSelect,
}: {
  lenses: ExplorerLens[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
    >
      {lenses.map((lens) => {
        const Icon = getLensIcon(lens.icon);
        const color = getLensColor(lens.id);
        const selected = selectedId === lens.id;
        return (
          <button
            key={lens.id}
            type="button"
            onClick={() => onSelect(lens.id)}
            aria-pressed={selected}
            className="grid text-left transition duration-150 hover:-translate-y-px"
            style={{
              gridTemplateColumns: "36px 1fr",
              gridTemplateRows: "auto auto",
              gap: "4px 14px",
              padding: "18px",
              background: "var(--surface-panel)",
              border: `1px solid ${selected ? color : "var(--border-soft)"}`,
              borderRadius: "12px",
              boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${color} 15%, transparent)` : undefined,
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  {lens.label}
                </span>
                <span
                  className="shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.12em]"
                  style={{
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                  }}
                >
                  Beta
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {lens.tagline}
              </span>
            </div>
            {lens.factors && lens.factors.length > 0 && (
              <div className="col-span-2 mt-2.5 flex flex-wrap gap-1.5">
                {lens.factors.slice(0, 5).map((f) => (
                  <span
                    key={f}
                    className="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs"
                    style={{
                      background: "var(--surface-soft)",
                      color: "var(--muted-foreground)",
                      borderColor: "var(--border-soft)",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Trust strip ───────────────────────────────────────────────────────────────

function TrustStrip() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <span className="eyebrow">Data provenance</span>
      {TRUST_SOURCES.map((src) => (
        <span
          key={src}
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ShieldCheck className="h-3 w-3" style={{ color: "var(--accent)" }} />
          {src}
        </span>
      ))}
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        +34 sources
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage() {
  const router = useRouter();
  const { setUiContext } = useAgentPanel();
  const [step, setStep] = useState(1);
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dismissWalkthrough = useCallback(() => {
    setWalkthroughOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANDING_WALKTHROUGH_STORAGE_KEY, "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LANDING_WALKTHROUGH_STORAGE_KEY) === "true") return;
    const timeout = window.setTimeout(() => setWalkthroughOpen(true), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  const selectedLens = useMemo(
    () => (selectedLensId ? EXPLORER_LENSES.find((l) => l.id === selectedLensId) : null) ?? null,
    [selectedLensId],
  );

  useEffect(() => {
    setUiContext({
      activeProfile: selectedLens?.profileId ?? EXPLORER_LENSES[0].profileId,
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
  }, [selectedLens?.profileId, setUiContext]);

  useEffect(() => {
    const query = locationQuery.trim();
    setActiveIndex(-1);

    if (parseCoordinates(query) || query.length < MIN_LOCATION_SUGGESTION_LENGTH) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const results = await fetchLocationSuggestions(query, controller.signal);
        if (!controller.signal.aborted) setSuggestions(results);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [locationQuery]);

  const handleSelectSuggestion = (suggestion: LocationSearchResult) => {
    setLocationQuery(suggestion.shortName ?? suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setLocationError(null);
    setStep(3);
  };

  const handleSelectLens = (lensId: string) => {
    setSelectedLensId(lensId);
    setTimeout(() => setStep(2), 180);
  };

  const handleSubmitLocation = () => {
    if (locationQuery.trim().length < 2) {
      setLocationError("Enter a place, address, or coordinates.");
      return;
    }
    setLocationError(null);
    setStep(3);
  };

  const handleLaunch = () => {
    if (!selectedLens) return;
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
    setLocationError(null);
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      const coordString = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      setLocationQuery(coordString);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Unable to read your location.");
    } finally {
      setLocating(false);
    }
  };

  const stepFillPct1 = Math.min(100, (step - 1) * 50);
  const stepFillPct2 = Math.min(100, (step - 2) * 100);
  const lensColor = selectedLens ? getLensColor(selectedLens.id) : "var(--accent)";
  const SelectedLensIcon = selectedLens ? getLensIcon(selectedLens.icon) : Globe2;

  const [demoPickerOpen, setDemoPickerOpen] = useState(false);

  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 60%), var(--background)`,
      }}
    >
      {/* Sticky topbar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-8 sm:py-4"
        style={{
          borderColor: "var(--border-soft)",
          background: "color-mix(in srgb, var(--background) 90%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--border-soft)", background: "var(--surface-panel)", color: "var(--accent)" }}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M3 12h18M12 3c2.5 3 3.8 6 3.8 9s-1.3 6-3.8 9c-2.5-3-3.8-6-3.8-9s1.3-6 3.8-9z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            GeoSight
          </span>
          <span className="hidden text-sm sm:inline" style={{ color: "var(--muted-foreground)" }}>
            spatial intelligence
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            aria-label="Open guided tour"
            className="inline-flex items-center gap-1 text-xs transition"
            style={{ color: "var(--muted-foreground)" }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Tour
          </button>
          <button
            type="button"
            onClick={() => router.push("/explore?mode=pro")}
            className="hidden items-center gap-1 text-xs transition sm:inline-flex"
            style={{ color: "var(--muted-foreground)" }}
          >
            For professionals
            <ArrowRight className="h-3 w-3" />
          </button>
          <ThemeToggle compact />
        </div>
      </header>

      {/* Main content */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-12 pt-10 sm:px-8 sm:pt-16"
      >
        {/* Hero */}
        <section className="grid h-screen gap-8 lg:grid-cols-2 lg:gap-12 -mx-4 px-4 -mt-10 pt-10 sm:-mx-8 sm:px-8">
          {/* Left column: Content */}
          <div className="flex flex-col justify-center max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-foreground)]">
                Early Access · New releases weekly
              </span>
            </div>
            <h1 className="mb-5 text-4xl sm:text-5xl font-medium leading-tight tracking-tight" style={{ color: "var(--foreground)" }}>
              The new GIS tool for{" "}
              <span style={{ color: "var(--muted-foreground)" }}>real-world decisions.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Search any place — get terrain, climate, hazard, and solar intelligence from 40+ live government sources in seconds. Built with OpenAI Codex. Actively developed, with new lenses, cards, and data sources shipping weekly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setDemoPickerOpen(true)}
                size="lg"
                className="rounded-full gap-2"
              >
                <Sparkles className="h-4 w-4" /> Watch a demo
              </Button>
              <button
                type="button"
                onClick={() => document.getElementById("lens-stepper")?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm transition hover:underline"
                style={{ color: "var(--muted-foreground)" }}
              >
                Or configure your own →
              </button>
            </div>
          </div>

          {/* Right column: Video */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-soft)" }}>
              <iframe
                src="https://app.arcade.software/share/videos/aYjw4tiKUTfOL5ZtZHDQ"
                title="GeoSight Introduction"
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; fullscreen"
                className="absolute inset-0 w-full h-full"
                style={{ border: "none" }}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex flex-col gap-2 rounded-xl border p-4"
                style={{ background: "var(--surface-panel)", borderColor: "var(--border-soft)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    <Icon size={16} />
                  </span>
                  <span
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.step}
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {item.title}
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {item.body}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stepper */}
        <div
          id="lens-stepper"
          className="flex w-fit items-center gap-3 rounded-xl border px-5 py-4"
          role="group"
          aria-label="Set up your analysis"
          style={{ background: "var(--surface-panel)", borderColor: "var(--border-soft)" }}
        >
          <StepDot n={1} label="Choose a lens" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
          {/* Rail 1 */}
          <div className="h-0.5 min-w-8 max-w-20 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border-soft)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${stepFillPct1}%`, background: "var(--accent)" }}
            />
          </div>
          <StepDot
            n={2}
            label="Pick a place"
            active={step === 2}
            done={step > 2}
            disabled={!selectedLensId}
            onClick={() => selectedLensId && setStep(2)}
          />
          {/* Rail 2 */}
          <div className="h-0.5 min-w-8 max-w-20 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border-soft)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${stepFillPct2}%`, background: "var(--accent)" }}
            />
          </div>
          <StepDot
            n={3}
            label="Review & launch"
            active={step === 3}
            done={false}
            disabled={step < 3}
            onClick={() => step >= 3 && setStep(3)}
          />
        </div>

        {/* Step panels */}
        <section aria-live="polite" className="min-h-72">
          {/* ── Step 1: Choose lens ── */}
          {step === 1 && (
            <LensGrid
              lenses={EXPLORER_LENSES}
              selectedId={selectedLensId}
              onSelect={handleSelectLens}
            />
          )}

          {/* ── Step 2: Pick location ── */}
          {step === 2 && selectedLens && (
            <div className="flex max-w-2xl flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="location-input"
                  className="text-lg font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Where should we analyze?
                </label>
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Address, place name, lat/long, or drop a KML/GeoJSON. For the{" "}
                  <strong>{selectedLens.label}</strong> lens.
                </span>
              </div>

              <div className="relative flex gap-2.5">
                <div
                  className="flex min-h-12 flex-1 items-center gap-2.5 rounded-xl border px-4 transition focus-within:ring-2"
                  style={{
                    background: "var(--surface-panel)",
                    borderColor: "var(--border-soft)",
                    ["--tw-ring-color" as string]: "var(--accent-soft)",
                  }}
                >
                  <Navigation className="h-4 w-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  <input
                    id="location-input"
                    ref={inputRef}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={locationQuery}
                    onChange={(e) => { setLocationQuery(e.target.value); setLocationError(null); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => { window.setTimeout(() => setShowSuggestions(false), 120); }}
                    onKeyDown={(e) => {
                      const dropdownOpen = showSuggestions && (suggestionsLoading || suggestions.length > 0);
                      if (e.key === "ArrowDown" && dropdownOpen) {
                        e.preventDefault();
                        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                      } else if (e.key === "ArrowUp" && dropdownOpen) {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(i - 1, -1));
                      } else if (e.key === "Escape" && dropdownOpen) {
                        e.preventDefault();
                        setShowSuggestions(false);
                        setActiveIndex(-1);
                      } else if (e.key === "Enter") {
                        if (activeIndex >= 0 && suggestions[activeIndex]) {
                          e.preventDefault();
                          handleSelectSuggestion(suggestions[activeIndex]);
                        } else {
                          handleSubmitLocation();
                        }
                      }
                    }}
                    placeholder={`e.g. ${selectedLens.tagline.split(".")[0]}`}
                    role="combobox"
                    aria-controls="landing-location-suggestions"
                    aria-describedby={locationError ? "location-error" : undefined}
                    aria-invalid={!!locationError}
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions && (suggestionsLoading || suggestions.length > 0)}
                    aria-activedescendant={activeIndex >= 0 ? `landing-sug-${activeIndex}` : undefined}
                    className="flex-1 bg-transparent py-3 text-[15px] outline-none"
                    style={{ color: "var(--foreground)" }}
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    title="Use my current location"
                    aria-label="Use my current location"
                    className="flex h-8 w-8 items-center justify-center rounded-md transition hover:opacity-80 disabled:opacity-40"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitLocation}
                  className="h-12 rounded-xl px-5"
                >
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>

                {/* Autocomplete dropdown */}
                {showSuggestions && (suggestionsLoading || suggestions.length > 0) && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-[color:var(--border-soft)] p-3 shadow-[var(--shadow-panel)]"
                    style={{ background: "var(--surface-panel)" }}
                    id="landing-location-suggestions"
                    role="listbox"
                    aria-label="Location suggestions"
                  >
                    <div className="mb-2 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-foreground)" }}>
                      Suggested matches
                    </div>
                    {suggestionsLoading ? (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finding place matches...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.name}-${suggestion.coordinates.lat}-${suggestion.coordinates.lng}`}
                            id={`landing-sug-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full rounded-xl border px-4 py-3 text-left transition"
                            style={{
                              background: index === activeIndex ? "var(--accent-soft)" : "var(--surface-raised)",
                              borderColor: index === activeIndex ? "var(--accent-strong)" : "var(--border-soft)",
                              color: index === activeIndex ? "var(--accent-foreground)" : "var(--foreground)",
                            }}
                          >
                            <div className="text-sm font-medium">{suggestion.name}</div>
                            <div className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                              {suggestion.coordinates.lat.toFixed(4)}, {suggestion.coordinates.lng.toFixed(4)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {locationError && (
                <div
                  id="location-error"
                  role="alert"
                  className="flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    color: "var(--danger-foreground)",
                    background: "var(--danger-soft)",
                    borderColor: "var(--danger-border)",
                  }}
                >
                  {locationError}
                </div>
              )}

              {/* Suggestions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="eyebrow mr-1">
                  Try one ·{" "}
                  <span style={{ color: "var(--accent)" }}>✦ great for demo</span>
                </span>
                {getStartersForLens(selectedLens?.id).map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => { setLocationQuery(s.label); setLocationError(null); }}
                    className="rounded-full border px-2.5 py-1 text-xs transition"
                    style={{
                      background: "var(--surface-panel)",
                      borderColor: s.demo ? "var(--accent)" : "var(--border-soft)",
                      color: "var(--foreground)",
                    }}
                  >
                    {s.demo && (
                      <span style={{ color: "var(--accent)", marginRight: "3px" }}>✦</span>
                    )}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to lenses
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & launch ── */}
          {step === 3 && selectedLens && (
            <div className="flex max-w-2xl flex-col gap-5">
              <div
                className="flex flex-col gap-4 rounded-2xl border p-6"
                style={{ background: "var(--surface-panel)", borderColor: "var(--border-soft)" }}
              >
                {/* Lens row */}
                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow">Lens</span>
                  <div className="flex items-center gap-2.5 text-[15px]" style={{ color: "var(--foreground)" }}>
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{ color: lensColor, background: `color-mix(in srgb, ${lensColor} 15%, transparent)` }}
                    >
                      <SelectedLensIcon size={13} />
                    </span>
                    <strong>{selectedLens.label}</strong>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="ml-auto text-xs font-medium hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Location row */}
                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow">Location</span>
                  <div className="flex items-center gap-2 text-[15px]" style={{ color: "var(--foreground)" }}>
                    <Pin className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                    <strong>{locationQuery.trim()}</strong>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-auto text-xs font-medium hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Factors row */}
                {selectedLens.factors && selectedLens.factors.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="eyebrow">You&apos;ll get</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLens.factors.map((f) => (
                        <span
                          key={f}
                          className="rounded-full border px-2.5 py-1 text-xs"
                          style={{
                            background: "var(--surface-soft)",
                            borderColor: "var(--border-soft)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blurb */}
                <p
                  className="border-t pt-4 text-sm leading-relaxed"
                  style={{ borderColor: "var(--border-soft)", color: "var(--muted-foreground)" }}
                >
                  {selectedLens.whyItMatters}
                </p>
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleLaunch}
                  disabled={submitting}
                  size="lg"
                  className="rounded-xl px-6"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Launch workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Trust strip */}
        <TrustStrip />

        {/* Pro link */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/explore?mode=pro")}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition"
            style={{
              background: "var(--surface-soft)",
              borderColor: "var(--border-soft)",
              color: "var(--muted-foreground)",
            }}
          >
            Open Pro workspace <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <Footer />
      </main>

      <WalkthroughOverlay
        open={walkthroughOpen}
        steps={LANDING_WALKTHROUGH_STEPS}
        onClose={dismissWalkthrough}
      />

      {/* Demo picker modal */}
      {demoPickerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(4,10,18,0.72)] p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close demo picker"
            onClick={() => setDemoPickerOpen(false)}
          />
          <section
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--background-elevated)] shadow-[var(--shadow-panel)]"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a demo"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4">
              <div>
                <div className="eyebrow">Interactive</div>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  <Sparkles className="mr-2 inline h-4 w-4 text-[var(--accent)]" />
                  Choose a demo
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Close"
                onClick={() => setDemoPickerOpen(false)}
              >
                <span className="text-base">✕</span>
              </Button>
            </div>
            <div className="space-y-2 p-4">
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
                    className="group flex w-full items-start gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4 text-left transition hover:border-[color:var(--accent-strong)] hover:bg-[var(--accent-soft)]"
                  >
                    <span className="mt-0.5 text-2xl">{scenario.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
                        {scenario.label}
                      </div>
                      <div className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
                        {scenario.tagline}
                      </div>
                      <div className="mt-2 text-xs text-[var(--accent)]">
                        {scenario.steps.length} guided steps →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
