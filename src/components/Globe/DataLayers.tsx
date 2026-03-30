"use client";

import { LayerToggle } from "@/components/Shell/LayerToggle";

export interface LayerState {
  water: boolean;
  power: boolean;
  roads: boolean;
  heatmap: boolean;
}

interface DataLayersProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
}

export function DataLayers({ layers, onChange }: DataLayersProps) {
  return (
    <div className="glass-panel absolute bottom-4 left-4 z-10 grid w-[300px] grid-cols-2 gap-2 rounded-3xl p-3">
      <LayerToggle
        label="Water bodies"
        enabled={layers.water}
        onToggle={() => onChange({ ...layers, water: !layers.water })}
        accentClassName="text-cyan-300"
      />
      <LayerToggle
        label="Power"
        enabled={layers.power}
        onToggle={() => onChange({ ...layers, power: !layers.power })}
        accentClassName="text-amber-300"
      />
      <LayerToggle
        label="Roads"
        enabled={layers.roads}
        onToggle={() => onChange({ ...layers, roads: !layers.roads })}
        accentClassName="text-[var(--foreground-soft)]"
      />
      <LayerToggle
        label="Elevation heat"
        enabled={layers.heatmap}
        onToggle={() => onChange({ ...layers, heatmap: !layers.heatmap })}
        accentClassName="text-rose-300"
      />
    </div>
  );
}
