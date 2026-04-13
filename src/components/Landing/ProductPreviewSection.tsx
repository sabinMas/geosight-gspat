// Maps ScoreEvidenceKind keys to Tailwind class strings using the same
// --evidence-* tokens as FactorBreakdown / ScoreCard.
const EVIDENCE_TONE: Record<string, string> = {
  direct_live:
    "border-[color:var(--evidence-direct-border)] bg-[var(--evidence-direct-bg)] text-[var(--evidence-direct-fg)]",
  derived_live:
    "border-[color:var(--evidence-derived-border)] bg-[var(--evidence-derived-bg)] text-[var(--evidence-derived-fg)]",
  proxy:
    "border-[color:var(--evidence-proxy-border)] bg-[var(--evidence-proxy-bg)] text-[var(--evidence-proxy-fg)]",
};

// Display labels match the ScoreCard summary convention ("direct live", "derived live", "proxy heuristic").
const FACTORS = [
  {
    name: "Flood Risk",
    score: 88,
    evidenceKind: "direct_live",
    evidenceLabel: "direct live",
    source: "FEMA NFHL",
  },
  {
    name: "Terrain Stability",
    score: 76,
    evidenceKind: "derived_live",
    evidenceLabel: "derived live",
    source: "USGS 3DEP",
  },
  {
    name: "Climate Comfort",
    score: 79,
    evidenceKind: "proxy",
    evidenceLabel: "proxy heuristic",
    source: "NOAA PRISM",
  },
  {
    name: "School Quality",
    score: 84,
    evidenceKind: "direct_live",
    evidenceLabel: "direct live",
    source: "GreatSchools",
  },
] as const;

export function ProductPreviewSection() {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "var(--surface-panel)",
        borderColor: "var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Eyebrow */}
      <div className="eyebrow mb-4">SAMPLE OUTPUT — BELLEVUE, WA</div>

      {/* Score gauge */}
      <div className="mb-5 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border"
          style={{
            background: "var(--accent-soft)",
            borderColor: "var(--accent-strong)",
          }}
        >
          <span
            className="text-xl font-bold leading-none"
            style={{ color: "var(--accent)" }}
          >
            81
          </span>
        </div>
        <div>
          <div
            className="text-xs uppercase tracking-[0.18em] cursor-default pointer-events-none select-none"
            style={{ color: "var(--muted-foreground)" }}
          >
            Overall Site Score
          </div>
          <div
            className="mt-0.5 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Home Buying Analysis
          </div>
        </div>
      </div>

      {/* Factor rows */}
      <div className="space-y-3">
        {FACTORS.map((factor) => (
          <div key={factor.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {factor.name}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs cursor-default pointer-events-none select-none ${EVIDENCE_TONE[factor.evidenceKind]}`}
                >
                  {factor.evidenceLabel}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="text-xs cursor-default pointer-events-none select-none"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {factor.source}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {factor.score}
                </span>
              </div>
            </div>
            <div
              className="h-1.5 w-full rounded-full"
              style={{ background: "var(--surface-soft)" }}
            >
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${factor.score}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
