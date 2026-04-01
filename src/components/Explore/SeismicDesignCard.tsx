"use client";

import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

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

function riskBadge(pga: number | null) {
  if (pga === null) {
    return {
      label: "Unavailable",
      tone: "border-slate-300/15 bg-slate-400/10 text-[var(--foreground)]",
    };
  }
  if (pga < 0.1) {
    return { label: "Low", tone: "border-emerald-300/20 bg-emerald-400/10 text-[var(--foreground)]" };
  }
  if (pga <= 0.4) {
    return { label: "Moderate", tone: "border-cyan-300/20 bg-cyan-400/10 text-[var(--foreground)]" };
  }
  if (pga <= 0.8) {
    return { label: "High", tone: "border-amber-300/20 bg-amber-400/10 text-[var(--foreground)]" };
  }

  return { label: "Very High", tone: "border-rose-300/20 bg-rose-400/10 text-[var(--foreground)]" };
}

export function SeismicDesignCard({ geodata }: SeismicDesignCardProps) {
  if (!geodata) {
    return null;
  }

  if (!hasSeismicData(geodata)) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Structural hazard</div>
          <CardTitle>Seismic risk profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            Seismic design parameters unavailable for this location.
          </div>
        </CardContent>
      </Card>
    );
  }

  const seismic = geodata.seismicDesign!;
  const badge = riskBadge(seismic.pga);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Structural hazard</div>
        <CardTitle>Seismic risk profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>USGS design maps</span>
            <SourceStatusBadge source={geodata.sources.seismicDesign} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
