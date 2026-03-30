import { Button } from "@/components/ui/button";
import { RegionSelection } from "@/types";

interface RegionSelectorProps {
  region: RegionSelection;
  onReset: () => void;
}

export function RegionSelector({ region, onReset }: RegionSelectorProps) {
  return (
    <div className="glass-panel absolute bottom-4 right-4 z-10 max-w-[320px] rounded-3xl p-4 text-sm text-[var(--foreground-soft)]">
      <div className="text-xs uppercase tracking-[0.24em] text-cyan-200">Selection area</div>
      <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{region.name}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs text-[var(--foreground-soft)]">
        <div>W {region.bbox.west.toFixed(3)}</div>
        <div>E {region.bbox.east.toFixed(3)}</div>
        <div>S {region.bbox.south.toFixed(3)}</div>
        <div>N {region.bbox.north.toFixed(3)}</div>
      </div>
      <Button variant="secondary" className="mt-4 w-full rounded-2xl" onClick={onReset}>
        Reset to default region
      </Button>
    </div>
  );
}
