import { buildGeoSightMessagesWithRag } from "@/lib/geosight-assistant";
import { CoreMessage } from "@/lib/rag/types";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

export type AnalysisResult = {
  response: string;
  model: string;
};

export type AnalysisProviderName = "groq" | "gemini";
export type AnalysisProviderErrorCategory =
  | "missing_config"
  | "timeout"
  | "rate_limited"
  | "api_error"
  | "request_failed"
  | "invalid_response"
  | "empty_response";

export class AnalysisProviderError extends Error {
  readonly provider: AnalysisProviderName;
  readonly category: AnalysisProviderErrorCategory;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    provider: AnalysisProviderName,
    category: AnalysisProviderErrorCategory,
    status?: number,
    retryable = category === "timeout",
  ) {
    super(`${provider} analysis failed: ${category}`);
    this.name = "AnalysisProviderError";
    this.provider = provider;
    this.category = category;
    this.status = status;
    this.retryable = retryable;
  }
}

export async function buildAnalysisProviderMessages(
  payload: AnalyzeRequestBody,
  profile: MissionProfile,
): Promise<CoreMessage[]> {
  return buildGeoSightMessagesWithRag(payload, profile);
}

export function normalizeProviderError(
  error: unknown,
  provider: AnalysisProviderName,
) {
  if (error instanceof AnalysisProviderError) {
    return error;
  }

  const status = getErrorStatus(error);
  if (status === 408 || status === 504 || isTimeoutLikeError(error)) {
    return new AnalysisProviderError(provider, "timeout", status, true);
  }

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

function isTimeoutLikeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name =
    "name" in error && typeof (error as { name?: unknown }).name === "string"
      ? (error as { name: string }).name
      : "";
  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  return (
    name === "TimeoutError" ||
    name === "AbortError" ||
    /timed out|timeout|aborted due to timeout/i.test(message)
  );
}

export function isProviderTimeoutError(error: unknown): error is AnalysisProviderError {
  return error instanceof AnalysisProviderError && error.category === "timeout";
}
