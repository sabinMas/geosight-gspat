import Groq from "groq-sdk";
import { AnalyzeRequestBody } from "@/types";
import { buildGeoSightSystemPrompt } from "@/lib/geosight-assistant";

export async function runGroqAnalysis(payload: AnalyzeRequestBody) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      response:
        "Groq is not configured yet. Add GROQ_API_KEY to analyze uploaded imagery and ask geospatial questions with the LLM.",
      model: "fallback",
    };
  }

  const { prompt } = buildGeoSightSystemPrompt(payload.question);
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [
      { role: "system", content: prompt },
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
