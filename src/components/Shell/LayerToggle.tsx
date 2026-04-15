interface LayerToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  accentClassName: string;
  ariaLabel?: string;
}

export function LayerToggle({
  label,
  enabled,
  onToggle,
  accentClassName,
  ariaLabel,
}: LayerToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${label}: ${enabled ? "on" : "off"}`}
      aria-label={ariaLabel ?? `${enabled ? "Hide" : "Show"} ${label} layer`}
      aria-pressed={enabled}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
        enabled ? `${accentClassName} border-current/30 bg-current/10` : "border-[color:var(--border-soft)] bg-[var(--surface-soft)]"
      }`}
    >
      <span>{label}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-current" : "bg-[var(--muted-foreground)]"}`} />
    </button>
  );
}
