import Groq from "groq-sdk";
import {
  AnalysisProviderError,
  AnalysisResult,
  buildAnalysisProviderMessages,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const PROFILE_MODEL_MAP: Record<string, string> = {
  "data-center": DEFAULT_GROQ_MODEL,
  hiking: "llama-3.1-8b-instant",
  residential: DEFAULT_GROQ_MODEL,
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
  const messages = await buildAnalysisProviderMessages(payload, profile);
  const groq = new Groq({ apiKey });

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
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
