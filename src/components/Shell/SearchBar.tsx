"use client";

import { FormEvent, useState } from "react";
import { Crosshair, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Coordinates, LocationSearchResult } from "@/types";

interface SearchBarProps {
  activeLocationName: string;
  onLocate: (result: LocationSearchResult) => void;
}

function parseCoordinates(value: string): Coordinates | null {
  const match = value.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if (!match) {
    return null;
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[3]),
  };
}

function getCurrentCoordinates() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => reject(new Error("Unable to read your current location.")),
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
}

export function SearchBar({ activeLocationName, onLocate }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!value.trim()) {
      setError("Enter a place, ZIP code, landmark, or coordinates to begin.");
      return;
    }

    const coordinates = parseCoordinates(value);
    if (coordinates) {
      onLocate({
        name: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
        coordinates,
        kind: "coordinates",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Search failed.");
      }

      const result = (await response.json()) as LocationSearchResult;
      setValue(result.name);
      onLocate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search this place.");
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
        const response = await fetch(
          `/api/geocode?lat=${coordinates.lat}&lng=${coordinates.lng}`,
        );
        if (response.ok) {
          result = (await response.json()) as LocationSearchResult;
        }
      } catch {
        // Fall back to the plain current-location label if reverse geocoding fails.
      }

      setValue(result.name);
      onLocate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to use your current location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <Badge>Start with a place</Badge>
        <CardTitle className="text-2xl sm:text-3xl">Ask questions about any place on Earth</CardTitle>
        <p className="text-sm leading-6 text-slate-300">
          Search a city, ZIP, country, landmark, or coordinates, then ask GeoSight anything about
          that location.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Seattle, WA · 98101 · Japan · Columbia River Gorge · 45.523,-122.676"
              className="h-12 border-white/10 bg-slate-950/50 text-sm"
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="uppercase tracking-[0.18em] text-cyan-200">Active location</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
            {activeLocationName}
          </span>
        </div>

        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      </CardContent>
    </Card>
  );
}
