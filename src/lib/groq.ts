import {
  AnalysisProviderError,
  AnalysisResult,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { buildGroqAnalysisMessages } from "@/lib/geosight-assistant";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_REFERER = "https://geosight-gspat.vercel.app";

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";

const PROFILE_MODEL_MAP: Record<string, string> = {
  "data-center": DEFAULT_MODEL,
  hiking: "meta-llama/llama-3.1-8b-instruct",
  "home-buying": DEFAULT_MODEL,
  "site-development": DEFAULT_MODEL,
  commercial: "meta-llama/llama-3.1-8b-instruct",
};

function getOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AnalysisProviderError("groq", "missing_config");
  }
  return key;
}

function resolveModel(profileId: string) {
  return PROFILE_MODEL_MAP[profileId] ?? DEFAULT_MODEL;
}

function buildHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": OPENROUTER_REFERER,
    "X-Title": "GeoSight",
  };
}

export async function runGroqAnalysis(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<AnalysisResult> {
  const apiKey = getOpenRouterKey();
  const model = resolveModel(profile.id);
  const messages = await buildGroqAnalysisMessages(payload, profile);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    throw normalizeProviderError(error, "groq");
  }

  if (!response.ok) {
    throw normalizeProviderError({ status: response.status }, "groq");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw normalizeProviderError(error, "groq");
  }

  const content =
    (json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AnalysisProviderError("groq", "empty_response");
  }

  return {
    response: content,
    model: (json as { model?: string }).model ?? model,
  };
}

export async function runGroqAnalysisStream(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getOpenRouterKey();
  const model = resolveModel(profile.id);
  const messages = await buildGroqAnalysisMessages(payload, profile);

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok || !response.body) {
    throw normalizeProviderError({ status: response.status }, "groq");
  }

  const encoder = new TextEncoder();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
