import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSourceTimestamp,
  summarizeSourceMeta,
} from "@/lib/source-metadata";
import { GeodataResult } from "@/types";

interface SourceAwarenessCardProps {
  geodata: GeodataResult | null;
}

export function SourceAwarenessCard({ geodata }: SourceAwarenessCardProps) {
  if (!geodata) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-slate-300">
          Review what is direct, what is derived, and where regional coverage or freshness limits
          apply before acting on the analysis.
        </p>
        <div className="grid gap-3">
          {Object.values(geodata.sources).map((source) => (
            <div key={source.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{source.label}</div>
                  <div className="mt-1 text-xs text-slate-400">{summarizeSourceMeta(source)}</div>
                </div>
                <SourceStatusBadge source={source} />
              </div>
              <div className="mt-3 text-xs leading-5 text-slate-300">{source.confidence}</div>
              <div className="mt-2 text-xs text-slate-500">{formatSourceTimestamp(source.lastUpdated)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
