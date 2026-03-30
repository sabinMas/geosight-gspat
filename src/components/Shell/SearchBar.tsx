"use client";

import { FormEvent, useEffect, useState } from "react";
import { Crosshair, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentCoordinates, parseCoordinates } from "@/lib/cesium-search";
import { ExternalRequestTimeoutError, fetchWithTimeout } from "@/lib/network";
import { LocationSearchResult } from "@/types";

const MIN_SUGGESTION_LENGTH = 3;
const SUGGESTION_LIMIT = 5;

async function readGeocodeError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Unable to search this place.";
}

async function resolveLocationFromQuery(query: string) {
  const response = await fetchWithTimeout(
    `/api/geocode?q=${encodeURIComponent(query)}`,
    {},
    10_000,
  );

  if (!response.ok) {
    throw new Error(await readGeocodeError(response));
  }

  return (await response.json()) as LocationSearchResult;
}

interface SearchBarProps {
  activeLocationName: string;
  onLocate: (result: LocationSearchResult) => void;
}

export function SearchBar({ activeLocationName, onLocate }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolvedLocationName, setResolvedLocationName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();

    if (parseCoordinates(query) || query.length < MIN_SUGGESTION_LENGTH) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);

      try {
        const response = await fetchWithTimeout(
          `/api/geocode?q=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}`,
          {
            signal: controller.signal,
          },
          8_000,
        );

        if (!response.ok) {
          throw new Error(await readGeocodeError(response));
        }

        const results = (await response.json()) as LocationSearchResult[];
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

  const handleSelectSuggestion = (suggestion: LocationSearchResult) => {
    setResolvedLocationName(suggestion.name);
    setValue(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    onLocate(suggestion);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!value.trim()) {
      setError("Enter a place, ZIP code, address, country, or coordinates to begin.");
      return;
    }

    const coordinates = parseCoordinates(value);
    if (coordinates) {
      const name = `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
      setResolvedLocationName(name);
      onLocate({
        name,
        coordinates,
        kind: "coordinates",
      });
      return;
    }

    setLoading(true);
    try {
      const resolved = await resolveLocationFromQuery(value);
      handleSelectSuggestion(resolved);
    } catch (err) {
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
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setLocating(true);

    try {
      const coordinates = await getCurrentCoordinates();
      let result: LocationSearchResult = {
        name: "Current location",
        coordinates,
        kind: "current_location",
      };

      try {
        const response = await fetchWithTimeout(
          `/api/geocode?lat=${coordinates.lat}&lng=${coordinates.lng}`,
          {},
          8_000,
        );
        if (response.ok) {
          result = (await response.json()) as LocationSearchResult;
        }
      } catch {
        // Fall back to the plain current-location label if reverse geocoding fails.
      }

      setResolvedLocationName(result.name);
      setValue(result.name);
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
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <Badge>Search any place</Badge>
        <CardTitle className="text-2xl sm:text-3xl">Find a place and start asking better questions</CardTitle>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Search by place name, address, ZIP, country, or coordinates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              placeholder="Seattle, WA or 45.523,-122.676"
              className="h-12 border-[color:var(--border-soft)] bg-[var(--background)]/50 text-sm"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" className="h-12 min-w-[160px] rounded-2xl" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Find location
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-2xl"
                onClick={handleUseCurrentLocation}
                disabled={locating}
              >
                {locating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="mr-2 h-4 w-4" />
                )}
                Use my current location
              </Button>
            </div>
          </div>
        </form>

        {showSuggestions && (suggestionsLoading || suggestions.length) ? (
          <div className="rounded-[1.35rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Suggested matches
            </div>
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding nearby place matches...
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.name}-${suggestion.coordinates.lat}-${suggestion.coordinates.lng}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-soft)]"
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="eyebrow text-[var(--accent)]">Active location</span>
          <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[var(--foreground)]">
            {activeLocationName}
          </span>
        </div>

        {resolvedLocationName ? (
          <div className="rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]">
            Locked to {resolvedLocationName}
          </div>
        ) : null}

        {error ? <div className="text-sm text-[var(--danger-foreground)]">{error}</div> : null}
      </CardContent>
    </Card>
  );
}
