import { NextRequest, NextResponse } from "next/server";
import { runAnalysisWithFallback } from "@/lib/analysis-runner";
import {
  buildMissionFallbackAnswer,
  buildMissionRunSummary,
  buildMissionStepPayload,
} from "@/lib/mission-runs";
import { getMissionRunPreset } from "@/lib/mission-run-presets";
import { getProfileById } from "@/lib/profiles";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import { MissionRunRequestBody, MissionRunStepResult } from "@/types";

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "mission-run", {
    windowMs: 60_000,
    maxRequests: 8,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const body = rawBody as MissionRunRequestBody;
  const presetId = normalizeTextInput(body.presetId, 120);
  if (!presetId) {
    return NextResponse.json({ error: "Mission run preset is required." }, { status: 400 });
  }

  const preset = getMissionRunPreset(presetId);
  if (!preset) {
    return NextResponse.json({ error: "Unknown mission run preset." }, { status: 400 });
  }

  const profile = getProfileById(body.profileId || preset.profileId);
  const payload: MissionRunRequestBody = {
    ...body,
    presetId,
    profileId: profile.id,
  };

  if (!payload.location || !payload.geodata) {
    return NextResponse.json(
      { error: "Mission runs require an active location and geodata payload." },
      { status: 400 },
    );
  }

  const stepResults: MissionRunStepResult[] = [];
  for (const step of preset.steps) {
    const stepPayload = buildMissionStepPayload(payload, profile, step);
    const result = await runAnalysisWithFallback(stepPayload, profile, {
      fallbackAnswer: buildMissionFallbackAnswer(payload, preset, step),
      onProviderFailure(provider, error) {
        const prefix = `[mission-run:${preset.id}] provider=${provider}`;
        if (error && typeof error === "object" && "category" in error) {
          const category = String((error as { category?: unknown }).category ?? "unknown");
          const status =
            typeof (error as { status?: unknown }).status === "number"
              ? ` status=${String((error as { status?: number }).status)}`
              : "";
          console.warn(`${prefix} category=${category}${status}`);
          return;
        }

        console.warn(`${prefix} category=unexpected_error`);
      },
    });

    stepResults.push({
      id: step.id,
      title: step.title,
      objective: step.objective,
      answer: result.response,
      model: result.model,
    });
  }

  const missionRun = buildMissionRunSummary({
    preset,
    profile,
    payload,
    stepResults,
  });

  return NextResponse.json(missionRun, {
    headers: rateLimitHeaders(rateLimit),
  });
}
