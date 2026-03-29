import { buildGeoSightSystemPrompt } from "@/lib/geosight-assistant";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

export type AnalysisResult = {
  response: string;
  model: string;
};

export type AnalysisProviderName = "groq" | "gemini";

export class AnalysisProviderError extends Error {
  readonly provider: AnalysisProviderName;
  readonly category: string;
  readonly status?: number;

  constructor(provider: AnalysisProviderName, category: string, status?: number) {
    super(`${provider} analysis failed: ${category}`);
    this.name = "AnalysisProviderError";
    this.provider = provider;
    this.category = category;
    this.status = status;
  }
}

export function buildAnalysisProviderInput(payload: AnalyzeRequestBody, profile: MissionProfile) {
  const { prompt } = buildGeoSightSystemPrompt(payload, profile);
  const serializedPayload = JSON.stringify(
    {
      missionProfile: profile.name,
      missionProfileId: profile.id,
      ...payload,
    },
    null,
    2,
  );

  return { prompt, serializedPayload };
}

export function normalizeProviderError(
  error: unknown,
  provider: AnalysisProviderName,
) {
  if (error instanceof AnalysisProviderError) {
    return error;
  }

  const status = getErrorStatus(error);
  if (status === 429) {
    return new AnalysisProviderError(provider, "rate_limited", status);
  }

  if (typeof status === "number") {
    return new AnalysisProviderError(provider, "api_error", status);
  }

  return new AnalysisProviderError(provider, "request_failed");
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}
