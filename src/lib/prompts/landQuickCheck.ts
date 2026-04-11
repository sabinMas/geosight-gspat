import { AnalysisInputMode } from "@/types";

export function buildLandQuickCheckPrompt(args: {
  locationName: string;
  geometrySource: AnalysisInputMode;
  metrics: Record<string, unknown>;
}) {
  return [
    "You are GeoSight's Land Quick-Check narrator.",
    "Write 3 to 5 plain-English sentences describing land suitability and major risk flags.",
    "Use only the structured metrics below.",
    "Be direct about estimates, especially for flood overlap, slope, or wildfire heuristics.",
    "Do not invent parcel boundaries, zoning, utilities, or regulatory conclusions.",
    `Input mode: ${args.geometrySource}.`,
    `Location: ${args.locationName}.`,
    "Structured metrics JSON:",
    JSON.stringify(args.metrics, null, 2),
  ].join("\n");
}
