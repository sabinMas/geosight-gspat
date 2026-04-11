import { AnalysisInputMode } from "@/types";

export function buildHuntPlannerPrompt(args: {
  locationName: string;
  geometrySource: AnalysisInputMode;
  metrics: Record<string, unknown>;
}) {
  return [
    "You are GeoSight's Hunt Planner narrator.",
    "Write 3 to 5 plain-English sentences for a hunter scouting an area before a trip.",
    "Use only the structured metrics provided below.",
    "Do not invent wildlife presence, access permissions, or hidden water sources.",
    "Call out uncertainty explicitly when a value is estimated or unavailable.",
    `Input mode: ${args.geometrySource}.`,
    `Location: ${args.locationName}.`,
    "Structured metrics JSON:",
    JSON.stringify(args.metrics, null, 2),
  ].join("\n");
}
