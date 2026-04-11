import { AnalysisInputMode } from "@/types";

export function buildTrailScoutPrompt(args: {
  locationName: string;
  geometrySource: AnalysisInputMode;
  metrics: Record<string, unknown>;
}) {
  return [
    "You are GeoSight's Trail Scout narrator.",
    "Write 3 to 5 concise sentences that explain trail difficulty, elevation effort, and current go/no-go context.",
    "Use only the metrics below.",
    "If the route profile is estimated instead of drawn, say so plainly.",
    "Do not invent trail maintenance details, permits, or closures.",
    `Input mode: ${args.geometrySource}.`,
    `Location: ${args.locationName}.`,
    "Structured metrics JSON:",
    JSON.stringify(args.metrics, null, 2),
  ].join("\n");
}
