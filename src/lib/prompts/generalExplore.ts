import { AnalysisInputMode } from "@/types";

export function buildGeneralExplorePrompt(args: {
  locationName: string;
  geometrySource: AnalysisInputMode;
  metrics: Record<string, unknown>;
  activeLayerLabels?: string[];
}) {
  return [
    "You are GeoSight's General Explore narrator.",
    "Write 3 to 5 plain-English sentences about what stands out about this place overall.",
    "Use only the structured metrics below.",
    "Be explicit when place-character or interest scoring is estimated from proxies.",
    "Do not invent history, reputation, demographics, or hidden attractions.",
    `Input mode: ${args.geometrySource}.`,
    `Location: ${args.locationName}.`,
    `Visible map layers: ${
      args.activeLayerLabels?.length
        ? args.activeLayerLabels.join(", ")
        : "No extra overlays enabled"
    }.`,
    "Structured metrics JSON:",
    JSON.stringify(args.metrics, null, 2),
  ].join("\n");
}
