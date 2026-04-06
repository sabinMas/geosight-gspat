"use client";

import { Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildExportFilename,
  downloadCsvFile,
  downloadJsonFile,
} from "@/lib/export";
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
  const exportFactorColumns = sites[0]?.score.factors ?? [];
  const evidenceTone: Record<string, string> = {
    direct_live: "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]",
    derived_live: "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]",
    proxy: "border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[var(--foreground)]",
  };

  const handleExportCsv = () => {
    const rows: Array<Array<string | number | null | undefined>> = [
      [
        "Site",
        "Region",
        "Profile",
        "Latitude",
        "Longitude",
        "Total score",
        "Recommendation",
        "Note",
        ...exportFactorColumns.flatMap((factor) => [
          `${factor.label} score`,
          `${factor.label} detail`,
          `${factor.label} evidence`,
        ]),
      ],
      ...sites.map((site) => [
        site.name,
        site.regionName,
        site.profileId,
        site.coordinates.lat.toFixed(6),
        site.coordinates.lng.toFixed(6),
        site.score.total,
        site.score.recommendation,
        site.note ?? "",
        ...exportFactorColumns.flatMap((factor) => {
          const match = site.score.factors.find((candidate) => candidate.key === factor.key);
          return [match?.score ?? "", match?.detail ?? "", match?.evidenceLabel ?? ""];
        }),
      ]),
    ];

    downloadCsvFile(
      rows,
      buildExportFilename(["geosight", title, "comparison"], "csv"),
    );
  };

  const handleExportJson = () => {
    downloadJsonFile(
      {
        title,
        exportedAt: new Date().toISOString(),
        siteCount: sites.length,
        sites: sites.map((site) => ({
          id: site.id,
          name: site.name,
          regionName: site.regionName,
          profileId: site.profileId,
          coordinates: site.coordinates,
          note: site.note ?? null,
          score: site.score,
        })),
      },
      buildExportFilename(["geosight", title, "comparison"], "json"),
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="eyebrow">Comparison board</div>
            <CardTitle>{title}</CardTitle>
          </div>

          {sites.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={handleExportCsv}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={handleExportJson}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {factorColumns.length ? (
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs ${evidenceTone.direct_live}`}>
              Direct live
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${evidenceTone.derived_live}`}>
              Derived live
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${evidenceTone.proxy}`}>
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
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Score</th>
                  {factorColumns.map((factor) => (
                    <th key={factor.key} className="px-4 py-3">
                      <div className="min-w-0 space-y-2">
                        <div className="line-clamp-2 min-w-0">{factor.label}</div>
                        {factor.evidenceLabel ? (
                          <span
                            className={`inline-flex whitespace-normal rounded-full border px-2 py-1 text-xs uppercase tracking-[0.16em] ${
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
                  <tr
                    key={site.id}
                    className="border-t border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--foreground-soft)]"
                  >
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
