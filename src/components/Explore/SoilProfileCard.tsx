"use client";

import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeodataResult } from "@/types";

interface SoilProfileCardProps {
  geodata: GeodataResult | null;
}

function hasSoilData(geodata: GeodataResult) {
  return Boolean(
    geodata.soilProfile &&
      Object.values(geodata.soilProfile).some((value) => value !== null),
  );
}

function formatDepth(cm: number | null) {
  if (cm === null) {
    return "Not reported";
  }

  return `${(cm / 30.48).toFixed(1)} ft below surface`;
}

function drainageTone(drainageClass: string | null) {
  const value = drainageClass?.toLowerCase() ?? "";
  if (value.includes("well")) {
    return "border-emerald-300/20 bg-emerald-400/10 text-emerald-50";
  }
  if (value.includes("moderately")) {
    return "border-cyan-300/20 bg-cyan-400/10 text-cyan-50";
  }
  if (value.includes("poor")) {
    return "border-rose-300/20 bg-rose-400/10 text-rose-50";
  }

  return "border-slate-300/15 bg-slate-400/10 text-slate-100";
}

function hydrologicExplanation(hydrologicGroup: string | null) {
  const group = hydrologicGroup?.toUpperCase() ?? "";
  if (group.startsWith("A")) {
    return "High infiltration and low runoff potential.";
  }
  if (group.startsWith("B")) {
    return "Moderate infiltration and moderate runoff potential.";
  }
  if (group.startsWith("C")) {
    return "Slow infiltration and elevated runoff potential.";
  }
  if (group.startsWith("D")) {
    return "Very slow infiltration and highest runoff potential.";
  }

  return "Hydrologic group explanation unavailable.";
}

export function SoilProfileCard({ geodata }: SoilProfileCardProps) {
  if (!geodata) {
    return null;
  }

  if (!hasSoilData(geodata)) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="eyebrow">Subsurface geology</div>
          <CardTitle>Soil profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-foreground)]">
            USDA soil survey data unavailable for this location.
          </div>
        </CardContent>
      </Card>
    );
  }

  const soil = geodata.soilProfile!;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Subsurface geology</div>
        <CardTitle>Soil profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Map unit</div>
          <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
            {soil.mapUnitName ?? "Unavailable"}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Drainage class</div>
            <div
              className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${drainageTone(
                soil.drainageClass,
              )}`}
            >
              {soil.drainageClass ?? "Unavailable"}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Hydrologic group</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {soil.hydrologicGroup ?? "Unavailable"}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {hydrologicExplanation(soil.hydrologicGroup)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">Depth to water table</div>
            <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
              {formatDepth(soil.depthToWaterTableCm)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">Depth to bedrock</div>
            <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
              {formatDepth(soil.depthToBedrockCm)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">Dominant texture</div>
            <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
              {soil.dominantTexture ?? "Unavailable"}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
            <div className="eyebrow">K factor / water storage</div>
            <div className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              K factor:{" "}
              <span className="text-[var(--foreground)]">
                {soil.kFactor === null ? "Unavailable" : soil.kFactor.toFixed(2)}
              </span>
              <br />
              Available water storage:{" "}
              <span className="text-[var(--foreground)]">
                {soil.availableWaterStorageCm === null
                  ? "Unavailable"
                  : `${soil.availableWaterStorageCm.toFixed(1)} cm`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>NRCS SSURGO</span>
            <SourceStatusBadge source={geodata.sources.soilProfile} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
