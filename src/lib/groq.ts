import Groq from "groq-sdk";
import { AnalyzeRequestBody } from "@/types";

const SYSTEM_PROMPT =
  "You are a geospatial analysis expert. When given coordinates, elevation data, land classification results, and proximity data, provide actionable insights about land use potential, resource availability, environmental constraints, and site viability. Be specific, data-driven, and explicit about uncertainty.";

export async function runGroqAnalysis(payload: AnalyzeRequestBody) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      response:
        "Groq is not configured yet. Add GROQ_API_KEY to analyze uploaded imagery and ask geospatial questions with the LLM.",
      model: "fallback",
    };
  }

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
  });

  return {
    response: completion.choices[0]?.message?.content ?? "No response returned.",
    model: completion.model,
  };
}
