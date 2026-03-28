"use client";

import { LayoutGrid, PanelsTopLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceViewMode } from "@/types";

interface WorkspaceViewToggleProps {
  mode: WorkspaceViewMode;
  onChange: (mode: WorkspaceViewMode) => void;
}

export function WorkspaceViewToggle({
  mode,
  onChange,
}: WorkspaceViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1 shadow-[var(--shadow-soft)]">
      <Button
        type="button"
        size="sm"
        variant={mode === "board" ? "default" : "ghost"}
        className="rounded-full"
        onClick={() => onChange("board")}
      >
        <PanelsTopLeft className="mr-2 h-4 w-4" />
        Board
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === "library" ? "default" : "ghost"}
        className="rounded-full"
        onClick={() => onChange("library")}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Library
      </Button>
    </div>
  );
}
