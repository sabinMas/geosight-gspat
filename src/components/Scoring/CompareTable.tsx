import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedSite } from "@/types";

interface CompareTableProps {
  sites: SavedSite[];
  title?: string;
  emptyMessage?: string;
}

export function CompareTable({
  sites,
  title = "Site comparison",
  emptyMessage = "Save sites to compare them here.",
}: CompareTableProps) {
  const factorColumns = sites[0]?.score.factors.slice(0, 3) ?? [];
  const evidenceTone: Record<string, string> = {
    direct_live: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
    derived_live: "border-cyan-300/20 bg-cyan-400/10 text-cyan-50",
    proxy: "border-amber-300/20 bg-amber-400/10 text-amber-50",
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Comparison board</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {factorColumns.length ? (
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-[11px] ${evidenceTone.direct_live}`}>
              Direct live
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] ${evidenceTone.derived_live}`}>
              Derived live
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] ${evidenceTone.proxy}`}>
              Proxy heuristic
            </span>
          </div>
        ) : null}

        {sites.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-6 text-sm leading-6 text-[var(--muted-foreground)]">
            {emptyMessage}
          </div>
        ) : null}

        {sites.length > 0 ? (
          <div className="overflow-x-auto rounded-[1.5rem] border border-[color:var(--border-soft)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Score</th>
                  {factorColumns.map((factor) => (
                    <th key={factor.key} className="px-4 py-3">
                      <div className="space-y-2">
                        <div>{factor.label}</div>
                        {factor.evidenceLabel ? (
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                              evidenceTone[factor.evidenceKind ?? "derived_live"]
                            }`}
                          >
                            {factor.evidenceLabel}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className="border-t border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--foreground-soft)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--foreground)]">{site.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{site.regionName}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{site.score.total}</td>
                    {factorColumns.map((factor) => {
                      const match = site.score.factors.find((candidate) => candidate.key === factor.key);
                      return (
                        <td key={factor.key} className="px-4 py-3 align-top">
                          <div className="font-semibold text-[var(--foreground)]">{match?.score ?? "-"}</div>
                          {match?.detail ? (
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
                              {match.detail}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
