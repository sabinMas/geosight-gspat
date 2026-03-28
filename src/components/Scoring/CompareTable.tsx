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

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Comparison board</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-6 text-sm leading-6 text-[var(--muted-foreground)]">
            {emptyMessage}
          </div>
        ) : null}

        {sites.length > 0 ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Score</th>
                  {factorColumns.map((factor) => (
                    <th key={factor.key} className="px-4 py-3">
                      {factor.label}
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
                      return <td key={factor.key} className="px-4 py-3">{match?.score ?? "-"}</td>;
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
