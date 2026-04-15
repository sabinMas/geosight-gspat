"use client";

import { Button } from "@/components/ui/button";

const STYLE_SWATCHES = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#f7b731",
  "#a29bfe",
  "#fd79a8",
  "#00b894",
  "#e17055",
  "#74b9ff",
  "#55efc4",
  "#fdcb6e",
] as const;

interface LayerStyleEditorProps {
  style: {
    color: string;
    opacity: number;
    weight: number;
    fillOpacity: number;
    filled: boolean;
  };
  onChange: (stylePatch: {
    color?: string;
    opacity?: number;
    weight?: number;
    fillOpacity?: number;
    filled?: boolean;
  }) => void;
}

export function LayerStyleEditor({ style, onChange }: LayerStyleEditorProps) {
  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-3">
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Color
        </div>
        <div className="grid grid-cols-6 gap-2">
          {STYLE_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className="h-7 w-7 rounded-full border-2 transition"
              style={{
                backgroundColor: swatch,
                borderColor:
                  style.color === swatch ? "var(--foreground)" : "rgba(255,255,255,0.14)",
              }}
              aria-label={`Set layer color to ${swatch}`}
              aria-pressed={style.color === swatch}
              onClick={() => onChange({ color: swatch })}
            />
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="layer-opacity"
          className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
        >
          Opacity {Math.round(style.opacity * 100)}%
        </label>
        <input
          id="layer-opacity"
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(style.opacity * 100)}
          className="h-2 w-full cursor-pointer accent-[var(--accent)]"
          aria-label="Set layer opacity"
          onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })}
        />
      </div>

      <div>
        <label
          htmlFor="layer-stroke-width"
          className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
        >
          Stroke width {style.weight}px
        </label>
        <input
          id="layer-stroke-width"
          type="range"
          min="1"
          max="5"
          step="1"
          value={style.weight}
          className="h-2 w-full cursor-pointer accent-[var(--accent)]"
          aria-label="Set layer stroke width"
          onChange={(event) => onChange({ weight: Number(event.target.value) })}
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2">
        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">Polygon fill</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Toggle between filled polygons and outline-only.
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={style.filled ? "default" : "secondary"}
          className="rounded-full"
          aria-label={style.filled ? "Switch to outline-only polygons" : "Switch to filled polygons"}
          aria-pressed={style.filled}
          onClick={() => onChange({ filled: !style.filled })}
        >
          {style.filled ? "Filled" : "Outline only"}
        </Button>
      </div>

      {style.filled ? (
        <div>
          <label
            htmlFor="layer-fill-opacity"
            className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
          >
            Fill opacity {Math.round(style.fillOpacity * 100)}%
          </label>
          <input
            id="layer-fill-opacity"
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(style.fillOpacity * 100)}
            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
            aria-label="Set polygon fill opacity"
            onChange={(event) => onChange({ fillOpacity: Number(event.target.value) / 100 })}
          />
        </div>
      ) : null}
    </div>
  );
}
