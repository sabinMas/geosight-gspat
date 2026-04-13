"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (syncValue === undefined) {
      return;
    }

    setValue(syncValue);
  }, [syncValue]);

  useEffect(() => {
    const query = value.trim();

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
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      } catch (suggestionError) {
        if (!controller.signal.aborted) {
          console.warn("[search-bar] suggestion lookup failed", suggestionError);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false);
        }
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
    setError(null);
    onLocate(suggestion);
  }, [onLocate]);

  /**
   * Validates coordinate-shaped input before dispatch.
   * Returns false and sets an error if the input is a bare number or has
   * out-of-bounds lat/lng values. Returns true for valid coordinates or
   * non-coordinate input (place names proceed to geocode unchanged).
   */
  const validateCoordinateInput = useCallback((query: string): boolean => {
    // Bare number — hint the user to enter a full lat, lng pair
    if (BARE_NUMBER_RE.test(query)) {
      setError("Enter coordinates as lat, lng — e.g. 47.61, -122.33");
      return false;
    }

    // parseCoordinates already validates bounds and returns null for out-of-range values.
    // Detect a coordinate-shaped pair without bounds by checking for a comma/space separator.
    const looksLikeCoordPair = /^-?\d/.test(query) && /[,\s]/.test(query);
    if (looksLikeCoordPair && !parseCoordinates(query)) {
      // Extract the two numbers to surface a specific bound error message
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
      // Malformed coordinate pair — let geocode attempt handle it
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

    if (!validateCoordinateInput(trimmed)) {
      return;
    }

    const coordinates = parseCoordinates(trimmed);
    if (coordinates) {
      const name = `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
      onLocate({
        name,
        coordinates,
        kind: "coordinates",
      });
      return;
    }

    setLoading(true);
    try {
      const resolved = await resolveLocationFromQuery(trimmed);
      handleSelectSuggestion(resolved);
    } catch (err) {
      if (onSearchFallback) {
        const fallbackResult = await onSearchFallback(trimmed);
        if (fallbackResult.handled) {
          setError(null);
          return;
        }

        if (fallbackResult.error) {
          setError(fallbackResult.error);
          return;
        }
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
    await executeSearch();
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
        if (reversed) {
          result = reversed;
        }
      } catch {
        // Fall back to the plain current-location label if reverse geocoding fails.
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

  return (
    <div className={cn("space-y-3", className)}>
      <form onSubmit={handleSubmit} className="space-y-3" role="search" aria-label="Location search">
        <div className="flex flex-col gap-3 lg:flex-row">
          {leadingControl ? <div className="lg:w-[190px]">{leadingControl}</div> : null}
          <div className="min-w-0 flex-1">
            <Input
              value={value}
              onChange={(event) => { setValue(event.target.value); setError(null); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              placeholder={placeholder}
              aria-label="Search for a place, address, or coordinates"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="location-search-suggestions"
              className="h-12 rounded-2xl border-[color:var(--border-soft)] bg-[var(--background)]/50 text-sm"
            />
            {error && (
              <p className="mt-1 px-1 text-xs text-[var(--danger-foreground)]">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-12 min-w-[144px] rounded-2xl"
              disabled={loading}
              aria-label="Search selected location"
              onClick={() => {
                void executeSearch();
              }}
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
        </div>
      </form>

      {showSuggestions && (suggestionsLoading || suggestions.length) ? (
        <div
          id="location-search-suggestions"
          className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3"
          role="region"
          aria-label="Location suggestions"
        >
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Suggested matches
          </div>
          {suggestionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding place matches...
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.name}-${suggestion.coordinates.lat}-${suggestion.coordinates.lng}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  aria-label={`Select ${suggestion.name}`}
                  className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                >
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    {suggestion.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {suggestion.coordinates.lat.toFixed(4)}, {suggestion.coordinates.lng.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
}
