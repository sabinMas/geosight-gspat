import {
  AnalysisProviderError,
  AnalysisResult,
  buildAnalysisProviderMessages,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { CoreMessage } from "@/lib/rag/types";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const GEMINI_MODEL = "gemini-2.0-flash";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function buildGeminiMessagePayload(messages: CoreMessage[]) {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const conversationalMessages = messages.filter((message) => message.role !== "system");

  return {
    systemInstruction: systemMessages.length
      ? {
          parts: [{ text: systemMessages.join("\n\n") }],
        }
      : undefined,
    contents: conversationalMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
  };
}

export async function runGeminiAnalysis(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisProviderError("gemini", "missing_config");
  }

  const messages = await buildAnalysisProviderMessages(payload, profile);
  const geminiMessages = buildGeminiMessagePayload(messages);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: geminiMessages.systemInstruction,
          contents: geminiMessages.contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      },
      EXTERNAL_TIMEOUTS.standard,
    );
  } catch (error) {
    throw normalizeProviderError(error, "gemini");
  }

  if (!response.ok) {
    const category = response.status === 429 ? "rate_limited" : "api_error";
    throw new AnalysisProviderError("gemini", category, response.status);
  }

  let data: GeminiGenerateContentResponse;
  try {
    data = (await response.json()) as GeminiGenerateContentResponse;
  } catch {
    throw new AnalysisProviderError("gemini", "invalid_response");
  }

  const answer = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    throw new AnalysisProviderError("gemini", "empty_response");
  }

  return {
    response: answer,
    model: GEMINI_MODEL,
  };
}
