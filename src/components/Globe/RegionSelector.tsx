import { Button } from "@/components/ui/button";
import { DrawnShape, RegionSelection } from "@/types";

interface RegionSelectorProps {
  region: RegionSelection;
  locationTooltip?: string;
  drawnShapes?: DrawnShape[];
  onReset: () => void;
}

export function RegionSelector({
  region,
  locationTooltip,
  drawnShapes = [],
  onReset,
}: RegionSelectorProps) {
  const selectionPolygon =
    [...drawnShapes].reverse().find((shape) => shape.type === "polygon") ?? null;

  return (
    <div className="glass-panel absolute bottom-4 right-4 z-10 max-w-[320px] rounded-3xl p-4 text-sm text-[var(--foreground-soft)]">
      <div className="text-xs uppercase tracking-[0.24em] text-cyan-200">Selection area</div>
      <div
        className="mt-2 text-base font-semibold text-[var(--foreground)]"
        title={locationTooltip}
      >
        {region.name}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs text-[var(--foreground-soft)]">
        <div>W {region.bbox.west.toFixed(3)}</div>
        <div>E {region.bbox.east.toFixed(3)}</div>
        <div>S {region.bbox.south.toFixed(3)}</div>
        <div>N {region.bbox.north.toFixed(3)}</div>
      </div>
      {selectionPolygon?.metrics ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 text-xs text-[var(--foreground-soft)]">
          <div className="grid grid-cols-2 gap-2">
            <div>Area (ac)</div>
            <div className="text-right font-mono">
              {selectionPolygon.metrics.areaAcres?.toFixed(1) ?? "--"}
            </div>
            <div>Area (km²)</div>
            <div className="text-right font-mono">
              {selectionPolygon.metrics.areaSqKm?.toFixed(2) ?? "--"}
            </div>
            <div>Perimeter (mi)</div>
            <div className="text-right font-mono">
              {selectionPolygon.metrics.perimeterMiles?.toFixed(2) ?? "--"}
            </div>
            <div>Perimeter (km)</div>
            <div className="text-right font-mono">
              {selectionPolygon.metrics.perimeterKm?.toFixed(2) ?? "--"}
            </div>
          </div>
        </div>
      ) : null}
      <Button variant="secondary" className="mt-4 w-full rounded-2xl" onClick={onReset}>
        Reset to default region
      </Button>
    </div>
  );
}
