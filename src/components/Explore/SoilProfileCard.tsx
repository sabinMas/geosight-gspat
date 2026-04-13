"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
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
    return "border-[color:var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]";
  }
  if (value.includes("moderately")) {
    return "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]";
  }
  if (value.includes("poor")) {
    return "border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[var(--foreground)]";
  }

  return "border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]";
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

function getBuildabilitySummary(soil: NonNullable<GeodataResult["soilProfile"]>) {
  const drainage = soil.drainageClass?.toLowerCase() ?? "";
  const group = soil.hydrologicGroup?.toUpperCase() ?? "";

  if (drainage.includes("well") && (group.startsWith("A") || group.startsWith("B"))) {
    return "Good";
  }

  if (drainage.includes("moderately") || group.startsWith("B") || group.startsWith("C")) {
    return "Fair";
  }

  if (drainage.includes("poor") || group.startsWith("D")) {
    return "Poor";
  }

  return "Review details";
}

export function SoilProfileCard({ geodata }: SoilProfileCardProps) {
  if (!geodata) {
    return (
      <WorkspaceCardShell eyebrow="Subsurface geology" title="Soil profile" loading={true} />
    );
  }

  const trustSummary = summarizeSourceTrust(
    [geodata.sources.soilProfile],
    "Soil profile screening",
  );

  const soil = geodata.soilProfile;

  return (
    <WorkspaceCardShell eyebrow="Subsurface geology" title="Soil profile">
      {!hasSoilData(geodata) ? (
        <>
          <StatePanel
            tone="partial"
            eyebrow="Subsurface coverage"
            title="Soil data unavailable for this point"
            description={geodata.sources.soilProfile.note ?? "GeoSight could not retrieve soil profile data for this location. US points use USDA SSURGO; global points use SoilGrids (ISRIC)."}
            compact
          />
          <TrustSummaryPanel
            summary={trustSummary}
            sources={[geodata.sources.soilProfile]}
            note="US points use USDA SSURGO mapped soil-survey data. Non-US points use SoilGrids (ISRIC) 250 m global rasters — texture, drainage class, and hydrologic group are derived from clay/silt/sand means at 0–30 cm depth. Neither source replaces a geotechnical report."
          />
        </>
      ) : soil ? (
        <>
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${drainageTone(soil.drainageClass)}`}>
          Building suitability: {getBuildabilitySummary(soil)}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="eyebrow">Plain-language summary</div>
          <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
            {getBuildabilitySummary(soil)} building suitability
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            GeoSight summarizes drainage and runoff behavior first, then keeps the mapped soil engineering details below.
          </div>
        </div>

        <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            Technical details
          </summary>
          <div className="mt-3 rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="eyebrow">Map unit</div>
            <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {soil.mapUnitName ?? "Unavailable"}
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Drainage class</div>
              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${drainageTone(
                  soil.drainageClass,
                )}`}
              >
                {soil.drainageClass ?? "Unavailable"}
              </div>
            </div>

            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Hydrologic group</div>
              <div className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                {soil.hydrologicGroup ?? "Unavailable"}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {hydrologicExplanation(soil.hydrologicGroup)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Depth to water table</div>
              <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {formatDepth(soil.depthToWaterTableCm)}
              </div>
            </div>
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Depth to bedrock</div>
              <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {formatDepth(soil.depthToBedrockCm)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">Dominant texture</div>
              <div className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {soil.dominantTexture ?? "Unavailable"}
              </div>
            </div>
            <div className="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
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
        </details>

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.soilProfile]}
          note="The suitability headline is GeoSight's plain-language interpretation of drainage, hydrologic group, water table, and bedrock depth from the mapped soil unit."
        />
        </>
      ) : null}
    </WorkspaceCardShell>
  );
}
