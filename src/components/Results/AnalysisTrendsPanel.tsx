import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <div className="rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-current/70">
                  {trend.source}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-current/85">{trend.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
