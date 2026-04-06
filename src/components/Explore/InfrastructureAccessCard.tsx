"use client";

import { Zap, Droplets, Wifi, Route } from "lucide-react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult } from "@/types";

interface UtilityRow {
  label: string;
  icon: React.ReactNode;
  primary: string;
  secondary: string | null;
  available: boolean;
}

function buildRows(geodata: GeodataResult): UtilityRow[] {
  const rows: UtilityRow[] = [];

  // Road
  const roadKm = geodata.nearestRoad.distanceKm;
  rows.push({
    label: "Nearest road",
    icon: <Route aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />,
    primary: roadKm === null ? "No data" : `${roadKm < 1 ? roadKm.toFixed(2) : roadKm.toFixed(1)} km`,
    secondary: roadKm === null ? null : geodata.nearestRoad.name || null,
    available: roadKm !== null,
  });

  // Power
  const powerKm = geodata.nearestPower.distanceKm;
  rows.push({
    label: "Nearest power line",
    icon: <Zap aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />,
    primary: powerKm === null ? "No data" : `${powerKm < 1 ? powerKm.toFixed(2) : powerKm.toFixed(1)} km`,
    secondary: powerKm === null ? null : geodata.nearestPower.name || null,
    available: powerKm !== null,
  });

  // Water
  const waterKm = geodata.nearestWaterBody.distanceKm;
  rows.push({
    label: "Nearest water body",
    icon: <Droplets aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />,
    primary: waterKm === null ? "No data" : `${waterKm < 1 ? waterKm.toFixed(2) : waterKm.toFixed(1)} km`,
    secondary: waterKm === null ? null : geodata.nearestWaterBody.name || null,
    available: waterKm !== null,
  });

  // Broadband
  const bb = geodata.broadband;
  let bbPrimary: string;
  let bbSecondary: string | null = null;
  let bbAvailable = true;
  if (!bb) {
    bbPrimary = "No data";
    bbAvailable = false;
  } else if (bb.kind === "regional_household_baseline") {
    const pct = bb.fixedBroadbandCoveragePercent;
    bbPrimary = pct === null ? "Regional baseline — coverage unknown" : `${pct.toFixed(0)}% regional fixed-broadband`;
    bbSecondary = `${bb.regionLabel ?? "Country"} Eurostat baseline — address-level data unavailable`;
  } else {
    bbPrimary =
      bb.maxDownloadSpeed > 0
        ? `${bb.maxDownloadSpeed.toLocaleString()} Mbps max download`
        : "No broadband providers mapped";
    bbSecondary =
      bb.maxDownloadSpeed > 0
        ? `${bb.providerCount} provider${bb.providerCount === 1 ? "" : "s"} · ${bb.maxUploadSpeed.toLocaleString()} Mbps up`
        : "FCC mapping shows no broadband at this location";
  }
  rows.push({
    label: "Broadband",
    icon: <Wifi aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />,
    primary: bbPrimary,
    secondary: bbSecondary,
    available: bbAvailable,
  });

  return rows;
}

export function InfrastructureAccessCard({ geodata }: { geodata: GeodataResult | null }) {
  if (!geodata) return null;

  const rows = buildRows(geodata);
  const sources = [
    geodata.sources.infrastructure,
    geodata.sources.broadband,
  ];
  const trustSummary = summarizeSourceTrust(sources, "Infrastructure access");

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Site development</div>
        <CardTitle>Infrastructure access</CardTitle>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          Raw proximity measurements to the four infrastructure inputs most relevant to site development: road access, power grid, water, and broadband. No thresholds applied — interpret against your project requirements.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5">{row.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {row.label}
                </div>
                <div
                  className={`mt-0.5 text-sm font-semibold leading-5 ${row.available ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
                >
                  {row.primary}
                </div>
                {row.secondary && (
                  <div className="text-xs leading-5 text-[var(--muted-foreground)]">{row.secondary}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--muted-foreground)]">
          Road and power distances from OSM infrastructure layer. Water from OSM hydrology layer. Broadband from FCC BroadbandMap (US) or Eurostat household baseline (non-US). Distances are straight-line, not routed.
        </div>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={sources}
          note="Road and power from OpenStreetMap. Water body from OpenStreetMap hydrology. Broadband from FCC BroadbandMap API (US) or Eurostat NUTS-2 household baseline (non-US)."
        />
      </CardContent>
    </Card>
  );
}
