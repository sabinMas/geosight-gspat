import Groq from "groq-sdk";
import {
  AnalysisProviderError,
  AnalysisResult,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { buildGroqAnalysisMessages } from "@/lib/geosight-assistant";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const PROFILE_MODEL_MAP: Record<string, string> = {
  "data-center": DEFAULT_GROQ_MODEL,
  hiking: "llama-3.1-8b-instant",
  "home-buying": DEFAULT_GROQ_MODEL,
  "site-development": DEFAULT_GROQ_MODEL,
  commercial: "llama-3.1-8b-instant",
};

function getGroqKeys() {
  return Array.from(
    new Set(
      [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function pickGroqKey() {
  const keys = getGroqKeys();

  if (!keys.length) {
    throw new AnalysisProviderError("groq", "missing_config");
  }

  return keys[Math.floor(Math.random() * keys.length)];
}

function resolveModel(profileId: string) {
  return PROFILE_MODEL_MAP[profileId] ?? DEFAULT_GROQ_MODEL;
}

export async function runGroqAnalysis(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
) : Promise<AnalysisResult> {
  const apiKey = pickGroqKey();
  const model = resolveModel(profile.id);
  const messages = await buildGroqAnalysisMessages(payload, profile);
  const groq = new Groq({ apiKey });
  const signal = AbortSignal.timeout(25_000);
  let completion;
  try {
    completion = await groq.chat.completions.create(
      {
        model,
        temperature: 0.2,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      },
      { signal },
    );
  } catch (error) {
    throw normalizeProviderError(error, "groq");
  }
  const response = completion.choices[0]?.message?.content?.trim();
  if (!response) {
    throw new AnalysisProviderError("groq", "empty_response");
  }
  return {
    response,
    model: completion.model ?? model,
  };
}

export async function runGroqAnalysisStream(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = pickGroqKey();
  const model = resolveModel(profile.id);
  const messages = await buildGroqAnalysisMessages(payload, profile);
  const groq = new Groq({ apiKey });
  const signal = AbortSignal.timeout(25_000);
  const completion = await groq.chat.completions.create(
    {
      model,
      temperature: 0.2,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal },
  );
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
