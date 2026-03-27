import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedSite } from "@/types";

interface CompareTableProps {
  sites: SavedSite[];
}

export function CompareTable({ sites }: CompareTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cooling demo site comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-300">
            Load the demo showcase or save a current site to compare cooling candidates here.
          </div>
        ) : null}

        {sites.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/6 text-slate-300">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Water</th>
                <th className="px-4 py-3">Power</th>
                <th className="px-4 py-3">Terrain</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-t border-white/6 bg-slate-950/20 text-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{site.name}</div>
                    <div className="text-xs text-slate-400">{site.regionName}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{site.score.total}</td>
                  <td className="px-4 py-3">{site.score.factors[0]?.score ?? "-"}</td>
                  <td className="px-4 py-3">{site.score.factors[2]?.score ?? "-"}</td>
                  <td className="px-4 py-3">{site.score.factors[1]?.score ?? "-"}</td>
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
