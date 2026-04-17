import { AnalysisInputMode } from "@/types";

export function buildRoadTripPrompt(args: {
  locationName: string;
  geometrySource: AnalysisInputMode;
  metrics: Record<string, unknown>;
  activeLayerLabels?: string[];
}) {
  return [
    "You are GeoSight's Road Trip narrator.",
    "Write 3 to 5 concise sentences about whether this stop looks scenic, convenient, and worth pulling over for.",
    "Use only the structured metrics below.",
    "Call out uncertainty clearly when the stop-worthiness score is estimated.",
    "Do not invent opening hours, crowd levels, ticketing, closures, or local reputation.",
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
