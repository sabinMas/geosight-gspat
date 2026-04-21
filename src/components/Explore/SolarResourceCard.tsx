"use client";

import { useMemo, useState } from "react";
import { Sun } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { getSunPathForDay, shadowMultiplier } from "@/lib/sun-path";
import { GeodataResult } from "@/types";

interface SolarResourceCardProps {
  geodata: GeodataResult | null;
}

type SolarTier = "Excellent" | "Good" | "Moderate" | "Poor";

interface TierMeta {
  label: SolarTier;
  tone: "success" | "accent" | "warning" | "danger";
  description: string;
}

function classifySolar(ghiKwhM2Day: number | null): TierMeta {
  if (ghiKwhM2Day === null) {
    return { label: "Poor", tone: "danger", description: "Solar irradiance data unavailable for this location" };
  }
  if (ghiKwhM2Day >= 5.5) return { label: "Excellent", tone: "success", description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — premium sun belt resource` };
  if (ghiKwhM2Day >= 4.0) return { label: "Good", tone: "accent", description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — solid mid-latitude solar resource` };
  if (ghiKwhM2Day >= 2.5) return { label: "Moderate", tone: "warning", description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — viable but cloud-limited` };
  return { label: "Poor", tone: "danger", description: `${ghiKwhM2Day.toFixed(1)} kWh/m²/day — low solar resource, likely not cost-effective` };
}

function tierBadgeClasses(tone: TierMeta["tone"]) {
  switch (tone) {
    case "success": return "bg-[var(--success-soft)] border-[color:var(--success-border)] text-[var(--foreground)]";
    case "accent":  return "bg-[var(--accent-soft)] border-[color:var(--accent-strong)] text-[var(--accent-foreground)]";
    case "warning": return "bg-[var(--warning-soft)] border-[color:var(--warning-border)] text-[var(--warning-foreground)]";
    default:        return "bg-[var(--danger-soft)] border-[color:var(--danger-border)] text-[var(--danger-foreground)]";
  }
}

function uvLabel(uv: number): { text: string; cls: string } {
  if (uv >= 11) return { text: "Extreme", cls: "text-[var(--danger-foreground)]" };
  if (uv >= 8)  return { text: "Very High", cls: "text-[var(--danger-foreground)]" };
  if (uv >= 6)  return { text: "High", cls: "text-[var(--warning-foreground)]" };
  if (uv >= 3)  return { text: "Moderate", cls: "text-[var(--foreground)]" };
  return { text: "Low", cls: "text-[var(--muted-foreground)]" };
}

function compassLabel(az: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(az / 22.5) % 16];
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Sky dome SVG: shows today's sun arc and current position
function SkyDome({ points, currentHour }: { points: { hour: number; elevation: number; azimuth: number }[]; currentHour: number }) {
  const W = 220, H = 120, cx = W / 2, cy = H;
  const R = H - 8;

  // Map solar position to SVG coords
  // elevation 0° = horizon (cy), 90° = zenith (cy - R)
  // azimuth 90° (E) = left, 270° (W) = right, 180° (S) = center
  function toXY(pt: { elevation: number; azimuth: number }) {
    const r = R * Math.cos((pt.elevation * Math.PI) / 180);
    // az 180 = center, az 90 = left, az 270 = right
    const angle = ((pt.azimuth - 180) * Math.PI) / 180;
    const x = cx + r * Math.sin(angle);
    const y = cy - R * Math.sin((pt.elevation * Math.PI) / 180);
    return { x, y };
  }

  // Build the arc path for above-horizon points
  const aboveHorizon = points.filter((p) => p.elevation > 0);
  const arcPath = aboveHorizon.reduce((acc, pt, i) => {
    const { x, y } = toXY(pt);
    return acc + (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
  }, "");

  // Current sun position
  const closest = points.reduce((best, pt) =>
    Math.abs(pt.hour - currentHour) < Math.abs(best.hour - currentHour) ? pt : best
  );
  const sunPos = closest.elevation > 0 ? toXY(closest) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Horizon line */}
      <line x1={8} y1={cy} x2={W - 8} y2={cy} stroke="var(--border-soft)" strokeWidth={1} />
      {/* Elevation rings */}
      {[30, 60].map((deg) => {
        const ry = R * Math.sin((deg * Math.PI) / 180);
        return (
          <line
            key={deg}
            x1={8} y1={cy - ry} x2={W - 8} y2={cy - ry}
            stroke="var(--border-soft)" strokeWidth={0.5} strokeDasharray="3 4"
          />
        );
      })}
      {/* Compass labels */}
      <text x={12} y={cy - 4} fontSize={8} fill="var(--muted-foreground)">E</text>
      <text x={W - 14} y={cy - 4} fontSize={8} fill="var(--muted-foreground)">W</text>
      <text x={cx - 4} y={cy - R + 10} fontSize={8} fill="var(--muted-foreground)">S</text>
      {/* Elevation labels */}
      <text x={W - 20} y={cy - R * Math.sin((30 * Math.PI) / 180) + 3} fontSize={7} fill="var(--muted-foreground)">30°</text>
      <text x={W - 20} y={cy - R * Math.sin((60 * Math.PI) / 180) + 3} fontSize={7} fill="var(--muted-foreground)">60°</text>
      {/* Sky fill under arc */}
      {aboveHorizon.length > 1 && (
        <path
          d={`${arcPath}L${toXY(aboveHorizon[aboveHorizon.length - 1]).x.toFixed(1)},${cy}L${toXY(aboveHorizon[0]).x.toFixed(1)},${cy}Z`}
          fill="url(#skyGrad)"
        />
      )}
      {/* Sun arc */}
      {arcPath && (
        <path d={arcPath} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" />
      )}
      {/* Sun dot */}
      {sunPos && (
        <>
          <circle cx={sunPos.x} cy={sunPos.y} r={7} fill="var(--accent)" opacity={0.18} />
          <circle cx={sunPos.x} cy={sunPos.y} r={4} fill="var(--accent)" />
        </>
      )}
      {!sunPos && (
        <text x={cx} y={cy - 18} fontSize={8} fill="var(--muted-foreground)" textAnchor="middle">below horizon</text>
      )}
    </svg>
  );
}

function SunPathSection({ lat, lng }: { lat: number; lng: number }) {
  const today = useMemo(() => new Date(), []);
  const currentDecimalHour = today.getHours() + today.getMinutes() / 60;
  const [sliderHour, setSliderHour] = useState(Math.round(currentDecimalHour * 4) / 4);

  const points = useMemo(() => getSunPathForDay(lat, lng, today), [lat, lng, today]);

  const closest = points.reduce((best, pt) =>
    Math.abs(pt.hour - sliderHour) < Math.abs(best.hour - sliderHour) ? pt : best
  );

  const shadow = shadowMultiplier(closest.elevation);
  const isAbove = closest.elevation > 0;

  const chartData = points.map((p) => ({
    hour: p.hour,
    elevation: p.elevation,
  }));

  // Sunrise / sunset
  const sunrise = points.find((p, i) => i > 0 && p.elevation > 0 && points[i - 1].elevation <= 0);
  const sunset = [...points].reverse().find((p, i, arr) => i > 0 && p.elevation > 0 && arr[i - 1].elevation <= 0);

  function hhmm(h: number) {
    const hh = Math.floor(h);
    const mm = Math.round((h % 1) * 60);
    return `${hh}:${mm.toString().padStart(2, "0")}`;
  }

  return (
    <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 space-y-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        Sun path — today
      </div>

      {/* Sky dome */}
      <SkyDome points={points} currentHour={sliderHour} />

      {/* Elevation chart */}
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-soft)" strokeDasharray="3 3" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 24]}
            ticks={[0, 6, 12, 18, 24]}
            tickFormatter={(v: number) => `${v}h`}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[-30, 90]}
            ticks={[0, 30, 60, 90]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}°`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-panel)",
              border: "1px solid var(--border-soft)",
              borderRadius: "0.75rem",
              fontSize: "11px",
              color: "var(--foreground)",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}°`, "Elevation"]}
            labelFormatter={(label) => hhmm(Number(label))}
          />
          {/* Horizon reference */}
          <ReferenceLine y={0} stroke="var(--border-strong)" strokeWidth={1} />
          {/* Current time marker */}
          <ReferenceLine
            x={sliderHour}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <Line
            type="monotone"
            dataKey="elevation"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "var(--accent)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Time slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>Time of day</span>
          <span className="font-medium text-[var(--foreground)]">{hhmm(sliderHour)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={0.25}
          value={sliderHour}
          onChange={(e) => setSliderHour(Number(e.target.value))}
          className="w-full accent-[var(--accent)] h-1.5 rounded-full cursor-pointer"
        />
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Elevation</div>
          <div className={`mt-1 text-base font-semibold ${isAbove ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
            {isAbove ? `${closest.elevation.toFixed(1)}°` : "—"}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">{isAbove ? "above horizon" : "below horizon"}</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Azimuth</div>
          <div className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {isAbove ? `${closest.azimuth.toFixed(0)}°` : "—"}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">{isAbove ? compassLabel(closest.azimuth) : "—"}</div>
        </div>
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Shadow ×</div>
          <div className={`mt-1 text-base font-semibold ${shadow !== null && shadow > 3 ? "text-[var(--warning-foreground)]" : "text-[var(--foreground)]"}`}>
            {shadow !== null ? `${shadow}×` : "—"}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {shadow === null ? "no sun" : shadow > 5 ? "heavy shade" : shadow > 2 ? "moderate shade" : "low shade"}
          </div>
        </div>
      </div>

      {/* Sunrise / sunset row */}
      {(sunrise || sunset) && (
        <div className="flex gap-4 text-xs text-[var(--muted-foreground)]">
          {sunrise && (
            <span>Sunrise <span className="font-medium text-[var(--foreground)]">{hhmm(sunrise.hour)}</span></span>
          )}
          {sunset && (
            <span>Sunset <span className="font-medium text-[var(--foreground)]">{hhmm(sunset.hour)}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

export function SolarResourceCard({ geodata }: SolarResourceCardProps) {
  if (!geodata) {
    return <WorkspaceCardShell eyebrow="Energy" title="Solar resource" loading={true} />;
  }

  const solar = geodata.solarResource;
  const sources = [geodata.sources.solarResource];
  const trustSummary = summarizeSourceTrust(sources, "Solar irradiance");

  if (!solar || solar.annualGhiKwhM2Day === null) {
    return (
      <WorkspaceCardShell eyebrow="Energy" title="Solar resource">
        <StatePanel
          tone="partial"
          eyebrow="Coverage"
          title="Solar data unavailable"
          description="NASA POWER solar irradiance data could not be retrieved for this location. The service is global — this may be a transient fetch failure."
          compact
        />
        <TrustSummaryPanel
          summary={trustSummary}
          sources={sources}
          note="NASA POWER provides satellite-derived surface irradiance climatologies for any global coordinate."
        />
      </WorkspaceCardShell>
    );
  }

  const tier = classifySolar(solar.annualGhiKwhM2Day);
  const clearnessPercent = solar.clearnessIndex !== null ? Math.round(solar.clearnessIndex * 100) : null;
  const uvInfo = solar.annualUvIndex !== null ? uvLabel(solar.annualUvIndex) : null;

  const chartData =
    solar.monthlyGhi.length === 12
      ? MONTH_LABELS.map((month, i) => ({ month, ghi: solar.monthlyGhi[i] }))
      : [];

  const coords = geodata.coordinates ?? null;

  return (
    <WorkspaceCardShell
      eyebrow="Energy"
      title="Solar resource"
      headerExtra={
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${tierBadgeClasses(tier.tone)}`}>
          <Sun aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {tier.label}
        </div>
      }
    >
      {/* Summary */}
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{tier.description}</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Annual GHI</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">{solar.annualGhiKwhM2Day.toFixed(1)}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">kWh/m²/day</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Peak sun hrs</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">{solar.annualGhiKwhM2Day.toFixed(1)}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">hrs/day avg</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Clearness</div>
          <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {clearnessPercent !== null ? `${clearnessPercent}%` : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Clear-sky ratio</div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">UV Index</div>
          <div className={`mt-2 text-xl font-semibold ${uvInfo ? uvInfo.cls : "text-[var(--muted-foreground)]"}`}>
            {solar.annualUvIndex !== null ? solar.annualUvIndex.toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{uvInfo ? uvInfo.text : "avg annual"}</div>
        </div>
      </div>

      {/* Sun path interactive section */}
      {coords && <SunPathSection lat={coords.lat} lng={coords.lng} />}

      {/* Monthly GHI chart */}
      {chartData.length > 0 && (
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Monthly GHI — kWh/m²/day
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
                formatter={(value) => (value != null ? [`${Number(value).toFixed(2)} kWh/m²/day`, "GHI"] : ["—", "GHI"])}
                cursor={{ fill: "var(--surface-raised)" }}
              />
              <Bar dataKey="ghi" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {solar.bestMonth && solar.worstMonth && (
            <div className="mt-3 flex gap-4 text-xs text-[var(--muted-foreground)]">
              <span>Best: <span className="font-medium text-[var(--foreground)]">{solar.bestMonth}</span> {solar.bestMonthGhi?.toFixed(1)} kWh/m²/day</span>
              <span>Worst: <span className="font-medium text-[var(--foreground)]">{solar.worstMonth}</span> {solar.worstMonthGhi?.toFixed(1)} kWh/m²/day</span>
            </div>
          )}
        </div>
      )}

      {/* Cloud impact */}
      {solar.clearSkyGhiKwhM2Day !== null && solar.annualGhiKwhM2Day !== null && (
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Cloud impact</div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--muted-foreground)]">
              Clear-sky potential: <span className="font-medium text-[var(--foreground)]">{solar.clearSkyGhiKwhM2Day.toFixed(1)} kWh/m²/day</span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Actual / potential: <span className="font-medium text-[var(--foreground)]">
                {Math.round((solar.annualGhiKwhM2Day / solar.clearSkyGhiKwhM2Day) * 100)}%
              </span>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.min(100, Math.round((solar.annualGhiKwhM2Day / solar.clearSkyGhiKwhM2Day) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {clearnessPercent !== null && clearnessPercent >= 70
              ? "Low cloud impact — good clearness index for solar generation."
              : clearnessPercent !== null && clearnessPercent >= 55
              ? "Moderate cloud cover reduces effective solar generation from theoretical maximum."
              : "High cloud cover significantly reduces actual output relative to clear-sky potential."}
          </p>
        </div>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="GHI and UV Index values are 22-year climatological averages from NASA POWER (2001–2022), derived from satellite observations and meteorological modeling. Sun path is computed from solar geometry for today's date and the selected coordinate."
      />
    </WorkspaceCardShell>
  );
}
