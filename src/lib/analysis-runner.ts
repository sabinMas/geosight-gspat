import {
  AnalysisProviderError,
  AnalysisResult,
  isProviderTimeoutError,
} from "@/lib/analysis-provider";
import { runGeminiAnalysis } from "@/lib/gemini";
import { buildFallbackAssessment } from "@/lib/geosight-assistant";
import { runGroqAnalysis } from "@/lib/groq";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

type AnalysisRunnerOptions = {
  fallbackAnswer?: string;
  onProviderFailure?: (provider: "groq" | "gemini", error: unknown) => void;
};

export function logAnalysisProviderFailure(
  context: string,
  provider: "groq" | "gemini",
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
    ((provider: "groq" | "gemini", error: unknown) =>
      logAnalysisProviderFailure("analyze", provider, error));

  const failures: unknown[] = [];

  try {
    return await runGroqAnalysis(payload, profile);
  } catch (groqError) {
    failures.push(groqError);
    handleFailure("groq", groqError);
  }

  try {
    return await runGeminiAnalysis(payload, profile);
  } catch (geminiError) {
    failures.push(geminiError);
    handleFailure("gemini", geminiError);
  }

  const timeoutFailure = failures.find(isProviderTimeoutError);
  if (timeoutFailure) {
    throw timeoutFailure;
  }

  return {
    response: options.fallbackAnswer ?? buildFallbackAssessment(payload, profile),
    model: "fallback",
  };
}
