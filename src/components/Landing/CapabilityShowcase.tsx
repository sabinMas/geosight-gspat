import { BarChart2, GitCompare, Shield } from "lucide-react";

const EVIDENCE_TONE: Record<string, string> = {
  direct_live:
    "border-[color:var(--evidence-direct-border)] bg-[var(--evidence-direct-bg)] text-[var(--evidence-direct-fg)]",
  derived_live:
    "border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] text-[var(--evidence-derived-fg)]",
  proxy:
    "border-[color:var(--evidence-proxy-border)] bg-[var(--evidence-proxy-bg)] text-[var(--evidence-proxy-fg)]",
};

function EvidenceBadge({ kind }: { kind: "direct_live" | "derived_live" | "proxy" }) {
  const labels: Record<string, string> = {
    direct_live: "direct live",
    derived_live: "derived live",
    proxy: "proxy heuristic",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs cursor-default pointer-events-none select-none ${EVIDENCE_TONE[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}

export function CapabilityShowcase() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Card 1 — Factor Scoring */}
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Factor Scoring</h3>
        </div>
        <p className="text-sm leading-6 text-[var(--foreground-soft)]">
          Every location scores 17+ weighted factors — flood risk, terrain, climate, schools, and more.
        </p>
        <div className="flex flex-wrap gap-2">
          <EvidenceBadge kind="direct_live" />
          <EvidenceBadge kind="derived_live" />
          <EvidenceBadge kind="proxy" />
        </div>
      </div>

      {/* Card 2 — Source Trust */}
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Source Trust</h3>
        </div>
        <p className="text-sm leading-6 text-[var(--foreground-soft)]">
          See exactly which dataset powered each score — live feeds, derived models, or proxy estimates.
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { name: "FEMA NFHL", kind: "direct_live" as const },
            { name: "NOAA PRISM", kind: "derived_live" as const },
            { name: "USGS 3DEP", kind: "direct_live" as const },
          ].map(({ name, kind }) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">{name}</span>
              <EvidenceBadge kind={kind} />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 — Site Comparison */}
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-panel)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Site Comparison</h3>
        </div>
        <p className="text-sm leading-6 text-[var(--foreground-soft)]">
          Save locations and compare factor scores side by side across the full scoring matrix.
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
            Bellevue, WA
          </span>
          <span className="text-xs text-[var(--muted-foreground)] cursor-default pointer-events-none select-none">
            vs
          </span>
          <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground)] cursor-default pointer-events-none select-none">
            Austin, TX
          </span>
        </div>
      </div>
    </div>
  );
}
