"use client";

import { FormEvent, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coordinates, LocationSearchResult } from "@/types";

interface SearchBarProps {
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

export function SearchBar({ onLocate }: SearchBarProps) {
  const [value, setValue] = useState("Columbia River Gorge");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

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

  return (
    <form onSubmit={handleSubmit} className="glass-panel absolute left-4 right-4 top-4 z-10 rounded-2xl p-2 lg:left-[390px] lg:right-[420px]">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search by city, state, ZIP, country, landmark, or lat,lng"
          className="border-none bg-transparent"
        />
        <Button type="submit" size="icon" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      <div className="px-2 pt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
        Search any place on Earth
      </div>
      {error ? <div className="px-2 pt-1 text-xs text-rose-300">{error}</div> : null}
    </form>
  );
}
