import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";
import { ClimateYearSummary } from "@/lib/climate-history";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DroughtRiskCardProps {
  geodata: GeodataResult | null;
}

export type DroughtTier = "Low" | "Moderate" | "High" | "Severe";

interface DroughtAssessment {
  tier: DroughtTier;
  aridityClass: string;
  baselineAvgPrecipMm: number | null;
  recentAvgPrecipMm: number | null;
  deficitPercent: number | null;
  heatAmplified: boolean;
  explanation: string;
}

function aridityLabel(avgMm: number): string {
  if (avgMm < 250) return "Arid";
  if (avgMm < 500) return "Semi-arid";
  if (avgMm < 750) return "Sub-humid";
  return "Humid";
}

function buildDroughtAssessment(
  summaries: ClimateYearSummary[],
  trendDirection: string | null,
): DroughtAssessment {
  const baseline = summaries.filter((s) => s.year >= 2015 && s.year <= 2019);
  const recent = summaries.filter((s) => s.year >= 2020 && s.year <= 2024);

  const avg = (arr: ClimateYearSummary[]) =>
    arr.length > 0 ? arr.reduce((sum, s) => sum + s.totalPrecipitationMm, 0) / arr.length : null;

  const baselineAvgPrecipMm = avg(baseline);
  const recentAvgPrecipMm = avg(recent.length >= 2 ? recent : summaries.slice(-3));
  const overallAvgMm = avg(summaries);
  const heatAmplified = trendDirection === "warming";

  const deficitPercent =
    baselineAvgPrecipMm !== null && recentAvgPrecipMm !== null && baselineAvgPrecipMm > 0
      ? ((recentAvgPrecipMm - baselineAvgPrecipMm) / baselineAvgPrecipMm) * 100
      : null;

  const aridityClass = overallAvgMm !== null ? aridityLabel(overallAvgMm) : "Unknown";

  // Score the tier
  let tierScore = 0;

  // Aridity contribution (0-40 pts)
  if (overallAvgMm !== null) {
    if (overallAvgMm < 250) tierScore += 40;
    else if (overallAvgMm < 500) tierScore += 25;
    else if (overallAvgMm < 750) tierScore += 10;
    else tierScore += 0;
  }

  // Deficit contribution (0-40 pts)
  if (deficitPercent !== null) {
    if (deficitPercent < -20) tierScore += 40;
    else if (deficitPercent < -10) tierScore += 25;
    else if (deficitPercent < -5) tierScore += 10;
    else tierScore += 0;
  }

  // Heat amplification (0-20 pts)
  if (heatAmplified) tierScore += 20;

  let tier: DroughtTier;
  if (tierScore >= 70) tier = "Severe";
  else if (tierScore >= 45) tier = "High";
  else if (tierScore >= 20) tier = "Moderate";
  else tier = "Low";

  const deficitNote =
    deficitPercent !== null
      ? deficitPercent < 0
        ? `precipitation is down ${Math.abs(deficitPercent).toFixed(0)}% vs the 2015–2019 baseline`
        : `precipitation is up ${deficitPercent.toFixed(0)}% vs the 2015–2019 baseline`
      : "no deficit trend could be calculated";

  const explanation =
    tier === "Severe"
      ? `Severe drought pressure — ${aridityClass.toLowerCase()} baseline with ${deficitNote}${heatAmplified ? " and a warming temperature trend" : ""}.`
      : tier === "High"
        ? `Elevated drought risk — ${deficitNote}${heatAmplified ? ", compounded by a warming trend" : ""}.`
        : tier === "Moderate"
          ? `Moderate drought signal — ${deficitNote}. Monitor long-term trends.`
          : `Low drought pressure — ${aridityClass.toLowerCase()} conditions and no significant precipitation deficit.`;

  return {
    tier,
    aridityClass,
    baselineAvgPrecipMm,
    recentAvgPrecipMm,
    deficitPercent,
    heatAmplified,
    explanation,
  };
}

function tierColors(tier: DroughtTier) {
  switch (tier) {
    case "Severe":
      return {
        bg: "bg-[var(--danger-soft)]",
        border: "border-[color:var(--danger-border)]",
        text: "text-[var(--danger-foreground)]",
        bar: "var(--danger-border)",
      };
    case "High":
      return {
        bg: "bg-[var(--warning-soft)]",
        border: "border-[color:var(--warning-border)]",
        text: "text-[var(--warning-foreground)]",
        bar: "var(--warning-border)",
      };
    case "Moderate":
      return {
        bg: "bg-[var(--accent-soft)]",
        border: "border-[color:var(--accent-strong)]",
        text: "text-[var(--accent-foreground)]",
        bar: "var(--accent-strong)",
      };
    case "Low":
    default:
      return {
        bg: "bg-[var(--success-soft)]",
        border: "border-[color:var(--success-border)]",
        text: "text-[var(--foreground)]",
        bar: "var(--success-border)",
      };
  }
}

function PrecipChart({ summaries }: { summaries: ClimateYearSummary[] }) {
  const baselineAvg =
    summaries
      .filter((s) => s.year >= 2015 && s.year <= 2019)
      .reduce((sum, s, _, arr) => sum + s.totalPrecipitationMm / arr.length, 0) || null;

  const data = summaries.map((s) => ({
    year: String(s.year),
    precip: Math.round(s.totalPrecipitationMm),
  }));

  return (
    <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="eyebrow">Annual precipitation (mm)</div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={14}>
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--surface-raised)" }}
              contentStyle={{
                background: "var(--surface-panel)",
                border: "1px solid var(--border-soft)",
                borderRadius: "0.75rem",
                fontSize: 12,
              }}
              formatter={(v) => (v != null ? [`${v} mm`, "Precip"] : ["—", "Precip"])}
            />
            {baselineAvg ? (
              <ReferenceLine
                y={baselineAvg}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                label={{
                  value: `baseline ${Math.round(baselineAvg)} mm`,
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 9,
                }}
              />
            ) : null}
            <Bar dataKey="precip" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DroughtRiskCard({ geodata }: DroughtRiskCardProps) {
  if (!geodata) return null;

  const climateHistory = geodata.climateHistory;
  const sources = [geodata.sources.climateHistory];
  const trustSummary = summarizeSourceTrust(sources, "Drought risk");

  if (!climateHistory || climateHistory.summaries.length === 0) {
    return (
      <WorkspaceCardShell eyebrow="Water stress" title="Drought risk">
        <StatePanel
          tone="unavailable"
          eyebrow="Climate history"
          title="Drought assessment requires climate history"
          description="GeoSight needs at least a few years of precipitation archive data to assess drought pressure. Climate history was not available for this location."
          compact
        />
        <TrustSummaryPanel
          summary={summarizeSourceTrust(sources, "Drought risk")}
          sources={sources}
          note="Drought risk uses Open-Meteo historical archive (2015–2024) to compare baseline versus recent precipitation and flag aridity trends."
        />
      </WorkspaceCardShell>
    );
  }

  const assessment = buildDroughtAssessment(
    climateHistory.summaries,
    climateHistory.trendDirection ?? null,
  );
  const colors = tierColors(assessment.tier);

  return (
    <WorkspaceCardShell
      eyebrow="Water stress"
      title="Drought risk"
      headerExtra={
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${colors.bg} ${colors.border} ${colors.text}`}
        >
          {assessment.tier} risk
        </div>
      }
    >
      <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{assessment.explanation}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Aridity class</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {assessment.aridityClass}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            Based on long-run avg annual precipitation
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Baseline avg (2015–2019)</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {assessment.baselineAvgPrecipMm !== null
              ? `${Math.round(assessment.baselineAvgPrecipMm)} mm/yr`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            Average annual precipitation
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Recent avg (2020–2024)</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {assessment.recentAvgPrecipMm !== null
              ? `${Math.round(assessment.recentAvgPrecipMm)} mm/yr`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {assessment.deficitPercent !== null ? (
              <span
                className={
                  assessment.deficitPercent < -5
                    ? "text-[var(--warning-foreground)]"
                    : "text-[var(--foreground)]"
                }
              >
                {assessment.deficitPercent < 0
                  ? `${Math.abs(assessment.deficitPercent).toFixed(0)}% below baseline`
                  : `${assessment.deficitPercent.toFixed(0)}% above baseline`}
              </span>
            ) : (
              "Trend unavailable"
            )}
          </div>
        </div>
      </div>

      <PrecipChart summaries={climateHistory.summaries} />

      {assessment.heatAmplified && (
        <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
          A warming temperature trend was detected for this location (2015–2024), which amplifies
          evapotranspiration and increases effective drought pressure beyond what precipitation alone
          would suggest.
        </div>
      )}

      <TrustSummaryPanel
        summary={trustSummary}
        sources={sources}
        note="Drought risk uses Open-Meteo historical archive (2015–2024) to compare baseline vs recent precipitation. Aridity class uses long-run annual average. Heat amplification reflects the detected temperature trend direction."
      />
    </WorkspaceCardShell>
  );
}
