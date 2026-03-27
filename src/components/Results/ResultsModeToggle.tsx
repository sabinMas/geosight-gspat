import { Button } from "@/components/ui/button";
import { ResultsMode } from "@/types";

interface ResultsModeToggleProps {
  mode: ResultsMode;
  onChange: (mode: ResultsMode) => void;
}

const MODES: Array<{ value: ResultsMode; label: string; detail: string }> = [
  {
    value: "analysis",
    label: "Analysis",
    detail: "Signals, trends, and map context",
  },
  {
    value: "nearby_places",
    label: "Nearby places",
    detail: "Lists of trails, hikes, restaurants, and more",
  },
];

export function ResultsModeToggle({ mode, onChange }: ResultsModeToggleProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MODES.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={mode === option.value ? "default" : "secondary"}
          className="h-auto flex-col items-start rounded-2xl px-4 py-3 text-left"
          onClick={() => onChange(option.value)}
        >
          <span className="text-sm font-semibold">{option.label}</span>
          <span className="mt-1 text-xs text-slate-300/80">{option.detail}</span>
        </Button>
      ))}
    </div>
  );
}
