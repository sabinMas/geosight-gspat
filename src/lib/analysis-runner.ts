import { AnalysisProviderError, AnalysisProviderName, AnalysisResult } from "@/lib/analysis-provider";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGroqAnalysis } from "@/lib/groq";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

type AnalysisRunnerOptions = {
  fallbackAnswer?: string;
  onProviderFailure?: (provider: AnalysisProviderName, error: unknown) => void;
};

export function logAnalysisProviderFailure(
  context: string,
  provider: AnalysisProviderName,
  error: unknown,
) {
  if (error instanceof AnalysisProviderError) {
    const statusSuffix = typeof error.status === "number" ? ` status=${error.status}` : "";
    console.warn(`[${context}] provider=${provider} category=${error.category}${statusSuffix}`);
    return;
  }

  console.warn(`[${context}] provider=${provider} category=unexpected_error`);
}

export async function runAnalysisWithFallback(
  payload: AnalyzeRequestBody,
  profile: MissionProfile,
  options: AnalysisRunnerOptions = {},
): Promise<AnalysisResult> {
  const handleFailure =
    options.onProviderFailure ??
    ((provider: AnalysisProviderName, error: unknown) =>
      logAnalysisProviderFailure("analyze", provider, error));

  try {
    return await runGroqAnalysis(payload, profile);
  } catch (groqError) {
    handleFailure("groq", groqError);
  }

  return {
    response: options.fallbackAnswer ?? buildFallbackAssessment(payload, profile),
    model: "fallback",
  };
}
