import {
  AnalysisProviderError,
  AnalysisResult,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { buildGroqAnalysisMessages } from "@/lib/geosight-assistant";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { CoreMessage } from "@/lib/rag/types";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1/chat/completions";

// llama3.1-8b is a confirmed production model on Cerebras free tier.
// Override with CEREBRAS_MODEL env var (e.g. gpt-oss-120b) for higher quality.
const DEFAULT_MODEL = process.env.CEREBRAS_MODEL?.trim() || "llama3.1-8b";

// 8K-token context window = ~32K chars total. We target ~22K chars for
// input messages, leaving ~2.5K tokens headroom for the response.
const MAX_INPUT_CHARS = 22_000;
// Cap response length. 600 tokens ≈ 4-5 short paragraphs — plenty for a
// chat reply, and keeps output costs predictable. Override via env.
const MAX_RESPONSE_TOKENS = Number(process.env.CEREBRAS_MAX_TOKENS) || 600;
// Per-message hard ceiling so a single huge message can't dominate.
const PER_MESSAGE_HARD_CAP = 8_000;

const PROFILE_MODEL_MAP: Record<string, string> = {
  "data-center": DEFAULT_MODEL,
  hiking: DEFAULT_MODEL,
  "home-buying": DEFAULT_MODEL,
  "site-development": DEFAULT_MODEL,
  commercial: DEFAULT_MODEL,
};

// Key pool — add CEREBRAS_API_KEY_2 / _3 in Vercel for higher throughput.
// Each key has its own rate-limit bucket, so pooling multiplies TPM capacity.
const CEREBRAS_KEY_VARS = ["CEREBRAS_API_KEY", "CEREBRAS_API_KEY_2", "CEREBRAS_API_KEY_3"] as const;

function getAvailableCerebrasKeys(): string[] {
  return CEREBRAS_KEY_VARS
    .map((v) => process.env[v]?.trim())
    .filter((k): k is string => Boolean(k));
}

// Random selection distributes load across keys; safe for serverless (no shared state).
// Pass `exclude` on retry to avoid reusing the same key that just returned 429.
function pickCerebrasKey(exclude?: string): string {
  const all = getAvailableCerebrasKeys();
  const pool = exclude ? all.filter((k) => k !== exclude) : all;
  const candidates = pool.length > 0 ? pool : all;
  if (candidates.length === 0) throw new AnalysisProviderError("groq", "missing_config");
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function resolveModel(profileId: string) {
  return PROFILE_MODEL_MAP[profileId] ?? DEFAULT_MODEL;
}

function totalChars(messages: CoreMessage[]) {
  return messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
}

/**
 * Final safety net before sending to Cerebras. Builders already trim
 * aggressively; this catches edge cases where total still exceeds the
 * 8K-token window. Strategy:
 *  1. Hard-cap any single message at PER_MESSAGE_HARD_CAP.
 *  2. If still over budget, drop conversation history (non-system) from
 *     the oldest end until we fit.
 *  3. If still over, truncate the largest non-system message.
 */
function compactToBudget(messages: CoreMessage[]): CoreMessage[] {
  const capped = messages.map((m) =>
    m.content && m.content.length > PER_MESSAGE_HARD_CAP
      ? { ...m, content: `${m.content.slice(0, PER_MESSAGE_HARD_CAP - 1)}…` }
      : m,
  );

  if (totalChars(capped) <= MAX_INPUT_CHARS) return capped;

  // Drop oldest non-system messages first.
  const result = [...capped];
  while (totalChars(result) > MAX_INPUT_CHARS) {
    const dropIdx = result.findIndex((m) => m.role !== "system");
    if (dropIdx === -1) break;
    result.splice(dropIdx, 1);
  }

  if (totalChars(result) <= MAX_INPUT_CHARS) {
    if (result.length !== capped.length) {
      console.warn(
        `[cerebras] compacted history: dropped ${capped.length - result.length} message(s) to fit context window`,
      );
    }
    return result;
  }

  // Last resort: truncate the largest message.
  const largestIdx = result.reduce(
    (best, m, i) => (m.content.length > result[best].content.length ? i : best),
    0,
  );
  const overflow = totalChars(result) - MAX_INPUT_CHARS;
  const target = result[largestIdx];
  result[largestIdx] = {
    ...target,
    content: `${target.content.slice(0, Math.max(500, target.content.length - overflow - 16))}\n…[truncated]`,
  };
  console.warn(
    `[cerebras] truncated message ${largestIdx} by ~${overflow} chars to fit context window`,
  );
  return result;
}

export async function runGroqAnalysis(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<AnalysisResult> {
  let apiKey = pickCerebrasKey();
  const model = resolveModel(profile.id);
  const rawMessages = await buildGroqAnalysisMessages(payload, profile);
  const messages = compactToBudget(rawMessages);

  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: MAX_RESPONSE_TOKENS,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let response: Response;
  try {
    response = await fetch(CEREBRAS_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: requestBody,
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    throw normalizeProviderError(error, "groq");
  }

  // Retry once on rate-limit with a different key from the pool.
  if (response.status === 429) {
    apiKey = pickCerebrasKey(apiKey);
    try {
      response = await fetch(CEREBRAS_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: requestBody,
        signal: AbortSignal.timeout(25_000),
      });
    } catch (error) {
      throw normalizeProviderError(error, "groq");
    }
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    console.warn(
      `[cerebras json] status=${response.status} model=${model} body=${bodyText.slice(0, 400)}`,
    );
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
  let apiKey = pickCerebrasKey();
  const model = resolveModel(profile.id);
  const rawMessages = await buildGroqAnalysisMessages(payload, profile);
  const messages = compactToBudget(rawMessages);

  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: MAX_RESPONSE_TOKENS,
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let response = await fetch(CEREBRAS_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: requestBody,
    signal: AbortSignal.timeout(25_000),
  });

  // Retry once on rate-limit with a different key from the pool.
  if (response.status === 429) {
    apiKey = pickCerebrasKey(apiKey);
    response = await fetch(CEREBRAS_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: requestBody,
      signal: AbortSignal.timeout(25_000),
    });
  }

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => "");
    console.error(
      `[cerebras stream] FAILED status=${response.status} model=${model} key_prefix=${apiKey.slice(0, 8)}... body=${bodyText.slice(0, 400)}`,
    );
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
