"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

interface SeismicDesignCardProps {
  geodata: GeodataResult | null;
}

function hasSeismicData(geodata: GeodataResult) {
  return Boolean(
    geodata.seismicDesign &&
      [geodata.seismicDesign.ss, geodata.seismicDesign.s1, geodata.seismicDesign.pga].some(
        (value) => value !== null,
      ),
  );
}

function hasCatalogData(geodata: GeodataResult) {
  const h = geodata.hazards;
  return (
    h.earthquakeCount30d !== null ||
    h.strongestEarthquakeMagnitude30d !== null ||
    h.nearestEarthquakeKm !== null
  );
}

function riskBadge(pga: number | null) {
  if (pga === null) {
    return {
      label: "Unavailable",
      tone: "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
    };
  }
  if (pga < 0.1) return { label: "Low", tone: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]" };
  if (pga <= 0.4) return { label: "Moderate", tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]" };
  if (pga <= 0.8) return { label: "High", tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--foreground)]" };
  return { label: "Very High", tone: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--foreground)]" };
}

function catalogSeismicBadge(hazards: GeodataResult["hazards"]) {
  const mag = hazards.strongestEarthquakeMagnitude30d;
  const count = hazards.earthquakeCount30d ?? 0;
  if (mag !== null && mag >= 6.5)
    return { label: "Very High activity", tone: "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)]" };
  if ((mag !== null && mag >= 5.5) || count >= 30)
    return { label: "High activity", tone: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]" };
  if ((mag !== null && mag >= 4.5) || count >= 10)
    return { label: "Moderate activity", tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]" };
  if ((mag !== null && mag >= 3.0) || count >= 3)
    return { label: "Low-moderate activity", tone: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]" };
  return { label: "Low activity", tone: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]" };
}

export function SeismicDesignCard({ geodata }: SeismicDesignCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Structural hazard" title="Seismic risk profile" loading={true} />
    );
  }

  const trustSummary = summarizeSourceTrust(
    [geodata.sources.seismicDesign, geodata.sources.hazards],
    "Seismic design screening",
  );

  const seismic = geodata.seismicDesign;
  const badge = riskBadge(seismic?.pga ?? null);
  const hasDesign = hasSeismicData(geodata);
  const hasCatalog = hasCatalogData(geodata);

  return (
    <WorkspaceCardShell eyebrow="Structural hazard" title="Seismic risk profile">
      {hasDesign && seismic ? (
        <>
          <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${badge.tone}`}>
            Earthquake risk: {badge.label}
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            GeoSight leads with a simple earthquake-risk badge for this location. Raw USGS design values remain available below for technical review.
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Peak ground acceleration</div>
              <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {seismic.pga === null ? "--" : `${seismic.pga.toFixed(2)} g`}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Site class</div>
              <div className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {seismic.siteClass ?? "--"}
              </div>
            </div>
          </div>

          {seismic.pga !== null ? (
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Probabilistic hazard levels</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">Peak ground acceleration (g) by return period</div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "MCE\u1D63 (2,475 yr)", pga: seismic.pga, returnPeriod: "2% / 50 yr" },
                      { name: "Design (475 yr)", pga: parseFloat((seismic.pga * (2 / 3)).toFixed(3)), returnPeriod: "10% / 50 yr" },
                    ]}
                    margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v.toFixed(2)}g`}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-raised)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as { name: string; pga: number; returnPeriod: string };
                        return (
                          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-2 text-xs shadow-lg">
                            <div className="font-semibold text-[var(--foreground)]">{d.name}</div>
                            <div className="mt-1 text-[var(--muted-foreground)]">{d.returnPeriod}</div>
                            <div className="mt-1 text-[var(--foreground)]">{d.pga.toFixed(3)} g PGA</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pga" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      <Cell fill="var(--danger-soft)" stroke="var(--danger-border)" strokeWidth={1} />
                      <Cell fill="var(--warning-soft)" stroke="var(--warning-border)" strokeWidth={1} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
                MCE<sub>R</sub> = Maximum Considered Earthquake (risk-targeted). Design level ≈ ²⁄₃ × MCE<sub>R</sub> per ASCE 7-22.
              </div>
            </div>
          ) : null}

          <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Technical details
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Short-period Ss</div>
                <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                  {seismic.ss === null ? "Unavailable" : `${seismic.ss.toFixed(2)} g`}
                </div>
              </div>
              <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">1-second S1</div>
                <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                  {seismic.s1 === null ? "Unavailable" : `${seismic.s1.toFixed(2)} g`}
                </div>
              </div>
            </div>
          </details>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Source: {seismic.dataSource}
          </div>

          <TrustSummaryPanel
            summary={trustSummary}
            sources={[geodata.sources.seismicDesign, geodata.sources.hazards]}
            note="Peak ground acceleration, Ss, and S1 come from USGS design maps. They are screening inputs for engineering diligence, not a substitute for structural design."
          />
        </>
      ) : hasCatalog ? (
        <>
          {(() => {
            const catBadge = catalogSeismicBadge(geodata.hazards);
            const h = geodata.hazards;
            return (
              <>
                <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${catBadge.tone}`}>
                  Recent seismicity: {catBadge.label}
                </div>

                <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                  <div className="eyebrow">30-day earthquake catalog (USGS)</div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Events (30d)</div>
                      <div className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {h.earthquakeCount30d ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Strongest</div>
                      <div className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {h.strongestEarthquakeMagnitude30d != null
                          ? `M ${h.strongestEarthquakeMagnitude30d.toFixed(1)}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Nearest</div>
                      <div className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {h.nearestEarthquakeKm != null
                          ? `${h.nearestEarthquakeKm.toFixed(0)} km`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
                    USGS ASCE 7-22 design parameters are US-only. This card shows recent seismic
                    activity from the USGS global earthquake catalog as a proxy signal.
                  </p>
                </div>

                <TrustSummaryPanel
                  summary={trustSummary}
                  sources={[geodata.sources.seismicDesign, geodata.sources.hazards]}
                  note="USGS seismic design maps (ASCE 7-22) are only available for US locations. Outside the US, GeoSight falls back to recent earthquake activity from the USGS global catalog as a qualitative seismicity proxy."
                />
              </>
            );
          })()}
        </>
      ) : (
        <>
          <StatePanel
            tone="partial"
            eyebrow="Structural hazard"
            title="Seismic design parameters are not available for this point"
            description={geodata.sources.seismicDesign.note ?? "GeoSight could not assemble the design-map shaking values needed for a structural screening read here."}
            compact
          />
          <TrustSummaryPanel
            summary={trustSummary}
            sources={[geodata.sources.seismicDesign, geodata.sources.hazards]}
            note="This card pairs mapped seismic design values with recent earthquake activity so you can distinguish engineering context from short-term event history."
          />
        </>
      )}
    </WorkspaceCardShell>
  );
}
