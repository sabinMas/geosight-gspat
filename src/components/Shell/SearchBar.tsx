"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useState } from "react";
import { Crosshair, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentCoordinates, parseCoordinates } from "@/lib/cesium-search";
import {
  fetchLocationSuggestions,
  MIN_LOCATION_SUGGESTION_LENGTH,
  resolveLocationFromQuery,
  reverseGeocodeCoordinates,
} from "@/lib/location-search";
import { ExternalRequestTimeoutError } from "@/lib/network";
import { cn } from "@/lib/utils";
import { LocationSearchResult } from "@/types";

/** Matches a bare number that looks like a lone coordinate value — e.g. "47.61" */
const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;

interface SearchBarProps {
  className?: string;
  /** Compact mode: h-9 pill layout, icon-only location button, fits in the workspace topbar */
  compact?: boolean;
  leadingControl?: React.ReactNode;
  locationButtonLabel?: string;
  onLocate: (result: LocationSearchResult) => void;
  onSearchFallback?: (query: string) => Promise<{ handled: boolean; error?: string }>;
  placeholder?: string;
  submitLabel?: string;
  syncValue?: string;
}

export function SearchBar({
  className,
  compact = false,
  leadingControl,
  locationButtonLabel = "Use my location",
  onLocate,
  onSearchFallback,
  placeholder = "Search a place",
  submitLabel = "Explore",
  syncValue,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (syncValue === undefined) return;
    setValue(syncValue);
  }, [syncValue]);

  useEffect(() => {
    const query = value.trim();
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
      } catch (suggestionError) {
        if (!controller.signal.aborted) {
          console.warn("[search-bar] suggestion lookup failed", suggestionError);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [value]);

  const handleSelectSuggestion = useCallback((suggestion: LocationSearchResult) => {
    setValue(suggestion.shortName ?? suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setError(null);
    onLocate(suggestion);
  }, [onLocate]);

  const validateCoordinateInput = useCallback((query: string): boolean => {
    if (BARE_NUMBER_RE.test(query)) {
      setError("Enter coordinates as lat, lng — e.g. 47.61, -122.33");
      return false;
    }

    const looksLikeCoordPair = /^-?\d/.test(query) && /[,\s]/.test(query);
    if (looksLikeCoordPair && !parseCoordinates(query)) {
      const parts = query.split(/[\s,]+/).filter(Boolean);
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (Number.isFinite(lat) && (lat < -90 || lat > 90)) {
          setError(`Latitude must be between -90 and 90 (got ${lat})`);
          return false;
        }
        if (Number.isFinite(lng) && (lng < -180 || lng > 180)) {
          setError(`Longitude must be between -180 and 180 (got ${lng})`);
          return false;
        }
      }
    }

    return true;
  }, []);

  const executeSearch = useCallback(async () => {
    setError(null);
    const trimmed = value.trim();

    if (!trimmed) {
      setError("Enter a place, ZIP code, address, country, or coordinates to continue.");
      return;
    }

    if (!validateCoordinateInput(trimmed)) return;

    const coordinates = parseCoordinates(trimmed);
    if (coordinates) {
      const name = `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
      onLocate({ name, coordinates, kind: "coordinates" });
      return;
    }

    setLoading(true);
    try {
      const resolved = await resolveLocationFromQuery(trimmed);
      handleSelectSuggestion(resolved);
    } catch (err) {
      if (onSearchFallback) {
        const fallbackResult = await onSearchFallback(trimmed);
        if (fallbackResult.handled) { setError(null); return; }
        if (fallbackResult.error) { setError(fallbackResult.error); return; }
      }
      setError(
        err instanceof ExternalRequestTimeoutError
          ? "Place lookup timed out. Try a shorter query or retry in a moment."
          : err instanceof Error
            ? err.message
            : "Unable to search this place.",
      );
    } finally {
      setLoading(false);
    }
  }, [handleSelectSuggestion, onLocate, onSearchFallback, validateCoordinateInput, value]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelectSuggestion(suggestions[activeIndex]);
      return;
    }
    await executeSearch();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const dropdownOpen = showSuggestions && (suggestionsLoading || suggestions.length > 0);
    if (!dropdownOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setLocating(true);
    try {
      const coordinates = await getCurrentCoordinates();
      let result: LocationSearchResult = {
        name: "Current location",
        shortName: "Current location",
        fullName: "Current location",
        coordinates,
        kind: "current_location",
      };
      try {
        const reversed = await reverseGeocodeCoordinates(coordinates.lat, coordinates.lng);
        if (reversed) result = reversed;
      } catch {
        // Fall back to plain current-location label
      }
      setValue(result.shortName ?? result.name);
      setSuggestions([]);
      setShowSuggestions(false);
      onLocate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to use your current location.");
    } finally {
      setLocating(false);
    }
  };

  const dropdownOpen = showSuggestions && (suggestionsLoading || suggestions.length > 0);

  const suggestionsList = (
    <>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        Suggested matches
      </div>
      {suggestionsLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding place matches...
        </div>
      ) : (
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.name}-${suggestion.coordinates.lat}-${suggestion.coordinates.lng}`}
              id={`lsug-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelectSuggestion(suggestion)}
              aria-label={`Select ${suggestion.name}`}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
                index === activeIndex
                  ? "border-[color:var(--accent-strong)] bg-[var(--accent-soft)]"
                  : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)]",
              )}
            >
              <div className={cn(
                "text-sm font-medium",
                index === activeIndex ? "text-[var(--accent-foreground)]" : "text-[var(--foreground)]",
              )}>
                {suggestion.name}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {suggestion.coordinates.lat.toFixed(4)}, {suggestion.coordinates.lng.toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <form onSubmit={handleSubmit} role="search" aria-label="Location search">
          <div className="flex items-center gap-1.5">
            {leadingControl ? <div>{leadingControl}</div> : null}
            <div className="relative min-w-0 flex-1">
              <Input
                value={value}
                onChange={(event) => { setValue(event.target.value); setError(null); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => { window.setTimeout(() => setShowSuggestions(false), 120); }}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                role="combobox"
                aria-label="Search for a place, address, or coordinates"
                aria-autocomplete="list"
                aria-expanded={dropdownOpen}
                aria-controls="location-search-suggestions"
                aria-activedescendant={activeIndex >= 0 ? `lsug-${activeIndex}` : undefined}
                className="h-9 rounded-full border-[color:var(--border-soft)] bg-[var(--background-elevated)] text-sm"
              />
              {dropdownOpen && (
                <div
                  id="location-search-suggestions"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--background-elevated)] p-3 shadow-[var(--shadow-panel)]"
                  role="listbox"
                  aria-label="Location suggestions"
                >
                  {suggestionsList}
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 rounded-full px-4"
              disabled={loading}
              aria-label="Search selected location"
              onClick={() => { void executeSearch(); }}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span className="ml-1.5">{submitLabel}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full p-0"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              title={locationButtonLabel}
              aria-label={locationButtonLabel}
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {error && (
            <p className="mt-1 px-1 text-xs text-[var(--danger-foreground)]">{error}</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 lg:flex-row"
        role="search"
        aria-label="Location search"
      >
        {leadingControl ? <div className="lg:w-[190px]">{leadingControl}</div> : null}

        {/* Input wrapper — relative so the dropdown can anchor to it */}
        <div className="relative min-w-0 flex-1">
          <Input
            value={value}
            onChange={(event) => { setValue(event.target.value); setError(null); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => { window.setTimeout(() => setShowSuggestions(false), 120); }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-label="Search for a place, address, or coordinates"
            aria-autocomplete="list"
            aria-expanded={dropdownOpen}
            aria-controls="location-search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `lsug-${activeIndex}` : undefined}
            className="h-12 rounded-2xl border-[color:var(--border-soft)] bg-[var(--background)]/50 text-sm"
          />
          {error && (
            <p className="mt-1 px-1 text-xs text-[var(--danger-foreground)]">{error}</p>
          )}

          {/* Autocomplete dropdown — absolute so it overlays globe/panel content */}
          {dropdownOpen && (
            <div
              id="location-search-suggestions"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3 shadow-[var(--shadow-panel)]"
              role="listbox"
              aria-label="Location suggestions"
            >
              {suggestionsList}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="h-12 min-w-[144px] rounded-2xl"
            disabled={loading}
            aria-label="Search selected location"
            onClick={() => { void executeSearch(); }}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            aria-label={locationButtonLabel}
          >
            {locating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="mr-2 h-4 w-4" />
            )}
            {locationButtonLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
