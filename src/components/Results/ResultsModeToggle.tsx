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
    <div className="flex flex-wrap gap-2">
      {MODES.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={mode === option.value ? "default" : "secondary"}
          className="h-auto rounded-full px-4 py-2.5 text-left"
          onClick={() => onChange(option.value)}
        >
          <span className="text-sm font-semibold">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}
