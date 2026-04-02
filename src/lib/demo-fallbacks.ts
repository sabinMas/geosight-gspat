import { buildSourceMeta } from "@/lib/source-metadata";
import {
  DataSourceMeta,
} from "@/types";

function getGroundingFallbackCatalog(locationName: string) {
  return {
    "pnw-cooling": [
      buildSourceMeta({
        id: "demo-grounding-water",
        label: "Cooling water context",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Columbia River infrastructure story",
        confidence:
          "Shows the cooling-water and stream-gauge story while live hydrology finishes loading.",
        note: `Anchored on ${locationName} and the Columbia River cooling workflow.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-power",
        label: "Power and access",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Columbia River infrastructure story",
        confidence:
          "Keeps the infrastructure, power, and logistics narrative visible when live utility layers are delayed.",
      }),
      buildSourceMeta({
        id: "demo-grounding-trust",
        label: "Trust framing",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Columbia River infrastructure story",
        confidence:
          "Highlights the direct-live versus derived-live distinction used in the source walkthrough.",
      }),
    ],
    "tokyo-commercial": [
      buildSourceMeta({
        id: "demo-grounding-tokyo-access",
        label: "Corridor access",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Keeps the rail, logistics, and urban-access narrative visible while global live providers resolve.",
        note: `Framed around ${locationName} and Tokyo commercial district benchmarks.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-tokyo-coverage",
        label: "Global coverage limits",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Makes the non-US trust model explicit instead of leaving the grounding panel stuck in a pending state.",
      }),
      buildSourceMeta({
        id: "demo-grounding-tokyo-activity",
        label: "Mapped activity pattern",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Tokyo commercial corridor story",
        confidence:
          "Represents district-scale commercial activity and access framing without inventing unsupported parcel or census detail.",
      }),
    ],
    "wa-residential": [
      buildSourceMeta({
        id: "demo-grounding-wa-neighborhood",
        label: "Neighborhood fit",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Keeps the neighborhood, amenities, and buildability story visible while live context finishes loading.",
        note: `Anchored on ${locationName} and Washington residential due-diligence flow.`,
      }),
      buildSourceMeta({
        id: "demo-grounding-wa-schools",
        label: "School context",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Represents the Washington-first school context trust story when official metrics are still loading.",
      }),
      buildSourceMeta({
        id: "demo-grounding-wa-risk",
        label: "Early risk framing",
        provider: "GeoSight demo fallback",
        status: "demo",
        freshness: "Demo-safe fallback",
        coverage: "Washington residential story",
        confidence:
          "Keeps hazard and diligence framing visible without fabricating unsupported risk detail.",
      }),
    ],
  } as const;
}

export function buildDemoGroundingSources(
  demoId: string | null | undefined,
  locationName: string,
): DataSourceMeta[] {
  if (!demoId) {
    return [];
  }

  const catalog = getGroundingFallbackCatalog(locationName);
  return [...(catalog[demoId as keyof typeof catalog] ?? [])];
}

