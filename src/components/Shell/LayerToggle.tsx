interface LayerToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  accentClassName: string;
}

export function LayerToggle({
  label,
  enabled,
  onToggle,
  accentClassName,
}: LayerToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
        enabled ? `${accentClassName} border-current/30 bg-current/10` : "border-white/10 bg-white/5"
      }`}
    >
      <span>{label}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-current" : "bg-slate-500"}`} />
    </button>
  );
}
