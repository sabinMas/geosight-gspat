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
      <CardHeader className="space-y-3">
        <div className="eyebrow">Trust and provenance</div>
        <CardTitle>Source awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Review what is direct, what is derived, and where regional coverage or freshness limits
          apply before acting on the analysis.
        </p>
        <div className="grid gap-3">
          {Object.values(geodata.sources).map((source) => (
            <div
              key={source.id}
              className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{source.label}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {summarizeSourceMeta(source)}
                  </div>
                </div>
                <SourceStatusBadge source={source} />
              </div>
              <div className="mt-3 text-xs leading-5 text-[var(--foreground-soft)]">
                {source.confidence}
              </div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                {formatSourceTimestamp(source.lastUpdated)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
