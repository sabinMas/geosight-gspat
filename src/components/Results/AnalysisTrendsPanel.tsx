import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSourceTimestamp,
  formatSourceStatusLabel,
  getSourceStatusTone,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import { DataTrend } from "@/types";

interface AnalysisTrendsPanelProps {
  trends: DataTrend[];
}

const TONE_CLASSES: Record<DataTrend["direction"], string> = {
  positive: "border-emerald-300/20 bg-emerald-400/8 text-emerald-50",
  neutral: "border-white/10 bg-white/5 text-slate-100",
  watch: "border-amber-300/20 bg-amber-400/8 text-amber-50",
};

export function AnalysisTrendsPanel({ trends }: AnalysisTrendsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Area analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-slate-300">
          Use this mode for terrain, access, weather, hazards, land-cover, and demographic context
          tied to the active place.
        </p>

        <div className="grid gap-3">
          {trends.map((trend) => (
            <div
              key={trend.id}
              className={`rounded-2xl border p-4 ${TONE_CLASSES[trend.direction]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-current/70">
                    {trend.label}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">{trend.value}</div>
                </div>
                <div
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${getSourceStatusTone(
                    trend.source.status,
                  )}`}
                >
                  {formatSourceStatusLabel(trend.source.status)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-current/85">{trend.detail}</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-300">
                <div className="font-medium text-white">{trend.source.label}</div>
                <div className="mt-1">{summarizeSourceMeta(trend.source)}</div>
                <div className="mt-1 text-slate-400">{formatSourceTimestamp(trend.source.lastUpdated)}</div>
                <div className="mt-1 text-slate-400">{trend.source.confidence}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
