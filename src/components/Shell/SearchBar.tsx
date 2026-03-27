"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coordinates } from "@/types";

interface SearchBarProps {
  onLocate: (coords: Coordinates) => void;
}

export function SearchBar({ onLocate }: SearchBarProps) {
  const [value, setValue] = useState("45.7, -121.8");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = value.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);

    if (match) {
      onLocate({ lat: Number(match[1]), lng: Number(match[3]) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-2xl p-2 lg:left-[390px] lg:right-[420px]">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by address or lat,lng"
        className="border-none bg-transparent"
      />
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
