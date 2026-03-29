import {
  AnalysisProviderError,
  AnalysisResult,
  buildAnalysisProviderInput,
  normalizeProviderError,
} from "@/lib/analysis-provider";
import { DEFAULT_PROFILE } from "@/lib/profiles";
import { AnalyzeRequestBody, MissionProfile } from "@/types";

const GEMINI_MODEL = "gemini-1.5-flash";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function runGeminiAnalysis(
  payload: AnalyzeRequestBody,
  profile: MissionProfile = DEFAULT_PROFILE,
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisProviderError("gemini", "missing_config");
  }

  const { prompt, serializedPayload } = buildAnalysisProviderInput(payload, profile);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: serializedPayload }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      },
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
