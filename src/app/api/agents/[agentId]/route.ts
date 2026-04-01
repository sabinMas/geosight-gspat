import { NextResponse } from "next/server";
import {
  AGENT_CONFIGS,
  AgentConfig,
  GeoSightContext,
  GeoSightUiContext,
  getAgentConfig,
  isAgentId,
} from "@/lib/agents/agent-config";
import { buildFallbackAssessment, formatLocationLabel } from "@/lib/geosight-assistant";
import { getProfileById } from "@/lib/profiles";
import { injectRagIntoMessages } from "@/lib/rag/inject";
import { CoreMessage } from "@/lib/rag/types";
import { formatUiAuditResult, runDeterministicUiAudit } from "@/lib/ux-audit";
import {
  AnalyzeRequestBody,
  AgentConversationMessage,
  DataTrend,
  GeodataResult,
  LandCoverBucket,
  NearbyPlace,
  ResultsMode,
  WorkspaceCardId,
  WorkspaceShellMode,
} from "@/types";

type GroqStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseConversationMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: AgentConversationMessage[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const role = entry.role;
    const content = normalizeMessage(entry.content);
    if (
      !content ||
      (role !== "system" && role !== "user" && role !== "assistant")
    ) {
      continue;
    }

    normalized.push({
      role,
      content,
      createdAt: parseOptionalString(entry.createdAt),
    });
  }

  return normalized.slice(-16);
}

function parseOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseResultsMode(value: unknown): ResultsMode | undefined {
  return value === "analysis" || value === "nearby_places" ? value : undefined;
}

function parseWorkspaceCardIds(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((entry): entry is WorkspaceCardId => typeof entry === "string") as WorkspaceCardId[];
}

function parseShellMode(value: unknown) {
  if (value === "minimal" || value === "guided" || value === "board") {
    return value satisfies WorkspaceShellMode;
  }

  return undefined;
}

function parseUiContext(value: unknown): GeoSightUiContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const context: GeoSightUiContext = {
    currentRoute: parseOptionalString(value.currentRoute),
    viewportClass:
      value.viewportClass === "mobile" ||
      value.viewportClass === "tablet" ||
      value.viewportClass === "desktop"
        ? value.viewportClass
        : undefined,
    activeProfile: parseOptionalString(value.activeProfile),
    visiblePrimaryCardId:
      typeof value.visiblePrimaryCardId === "string"
        ? (value.visiblePrimaryCardId as WorkspaceCardId)
        : undefined,
    visibleWorkspaceCardIds: parseWorkspaceCardIds(value.visibleWorkspaceCardIds),
    visibleControlCount: parseOptionalNumber(value.visibleControlCount),
    visibleTextBlockCount: parseOptionalNumber(value.visibleTextBlockCount),
    shellMode: parseShellMode(value.shellMode),
    locationSelected: parseOptionalBoolean(value.locationSelected),
    geodataLoading: parseOptionalBoolean(value.geodataLoading),
    geodataLoaded: parseOptionalBoolean(value.geodataLoaded),
    reportOpen: parseOptionalBoolean(value.reportOpen),
  };

  return Object.values(context).some((entry) => entry !== undefined) ? context : undefined;
}

function parseGeoSightContext(value: unknown): GeoSightContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const context: GeoSightContext = {
    lat: parseOptionalNumber(value.lat),
    lng: parseOptionalNumber(value.lng),
    profile: parseOptionalString(value.profile),
    score: parseOptionalNumber(value.score),
    dataBundle: isRecord(value.dataBundle) ? value.dataBundle : undefined,
    uiContext: parseUiContext(value.uiContext),
  };

  return Object.values(context).some((entry) => entry !== undefined) ? context : undefined;
}

function getDataBundle(context?: GeoSightContext) {
  return context?.dataBundle && isRecord(context.dataBundle) ? context.dataBundle : undefined;
}

function buildAnalyzePayload(
  message: string,
  context?: GeoSightContext,
  messages?: AgentConversationMessage[],
): AnalyzeRequestBody {
  const dataBundle = getDataBundle(context);

  return {
    profileId: context?.profile ?? "data-center",
    question: message,
    messages: messages?.map(({ role, content }) => ({ role, content })),
    location:
      typeof context?.lat === "number" && typeof context?.lng === "number"
        ? { lat: context.lat, lng: context.lng }
        : undefined,
    locationName: parseOptionalString(dataBundle?.locationName),
    resultsMode: parseResultsMode(dataBundle?.resultsMode),
    geodata: isRecord(dataBundle?.geodata)
      ? (dataBundle.geodata as unknown as GeodataResult)
      : undefined,
    nearbyPlaces: Array.isArray(dataBundle?.nearbyPlaces)
      ? (dataBundle.nearbyPlaces as NearbyPlace[])
      : undefined,
    dataTrends: Array.isArray(dataBundle?.dataTrends)
      ? (dataBundle.dataTrends as DataTrend[])
      : undefined,
    imageSummary: parseOptionalString(dataBundle?.imageSummary),
    classification: Array.isArray(dataBundle?.classification)
      ? (dataBundle.classification as LandCoverBucket[])
      : undefined,
  };
}

function buildGeoGuideFallback(message: string, context?: GeoSightContext) {
  const normalized = message.toLowerCase();
  const uiContext = context?.uiContext;
  const dataBundle = getDataBundle(context);
  const profile = getProfileById(context?.profile ?? "data-center");
  const supportingViews = uiContext?.visibleWorkspaceCardIds?.length
    ? uiContext.visibleWorkspaceCardIds.join(", ")
    : "none open yet";
  const hasLoadedLocationContext = Boolean(
    uiContext?.locationSelected ||
      uiContext?.geodataLoaded ||
      context?.lat !== undefined ||
      context?.lng !== undefined ||
      parseOptionalString(dataBundle?.locationName),
  );

  if (!hasLoadedLocationContext) {
    return `Start by focusing a place on the globe or with the search bar, then ask your question through the ${profile.name} lens. GeoSight stays in a calmer ${uiContext?.shellMode ?? "minimal"} shell until a location is selected, so the next useful step is to choose a place first.`;
  }

  if (
    normalized.includes("source") ||
    normalized.includes("trust") ||
    normalized.includes("ground") ||
    normalized.includes("provenance")
  ) {
    return "Open the Source awareness view to inspect live providers, freshness, coverage, and fallback notes for the current place. That is the fastest way to understand what is directly grounded versus still limited in the current analysis.";
  }

  if (
    normalized.includes("score") ||
    normalized.includes("factor") ||
    normalized.includes("breakdown")
  ) {
    return "Use Mission score for the headline fit and Factor breakdown for the weighted reasoning behind it. If those cards are not already open, use Add view to reveal them one at a time instead of switching the whole workspace into board mode.";
  }

  if (normalized.includes("compare")) {
    return "Use the Compare view after you have saved at least two candidate sites from the current mission profile. GeoSight keeps comparison tucked away until you need it so the default workspace stays focused on one place first.";
  }

  return `You are currently in ${uiContext?.shellMode ?? "minimal"} mode with ${uiContext?.visiblePrimaryCardId ?? "the main location view"} as the primary panel and supporting views ${supportingViews}. Stay in the current shell for one-place reasoning, or open Add view if you want to reveal a specific supporting card without cluttering the board.`;
}

function buildGeoScribeFallback(message: string, context?: GeoSightContext) {
  const payload = buildAnalyzePayload(message, context);
  const profile = getProfileById(payload.profileId);
  const locationLabel = formatLocationLabel(payload);
  const scoreLine =
    typeof context?.score === "number"
      ? `Current mission score: ${context.score}/100.`
      : "Current mission score is unavailable in the active context.";
  const assessment = buildFallbackAssessment(payload, profile);

  return [
    "# Site Assessment Report",
    "## Executive Summary",
    `This fallback report covers ${locationLabel} through the ${profile.name} mission profile. It was assembled from the live GeoSight context bundle because the external report model is unavailable right now.`,
    "",
    "## Data Status And Coverage",
    "- Report mode: GeoSight grounded fallback writer",
    "- Method: structured synthesis from the currently loaded source bundle, scores, and supporting evidence",
    "- Use posture: screening and briefing depth, not final engineering or regulatory diligence",
    "",
    "## Location Context",
    `- Mission profile: ${profile.name}`,
    `- Location: ${locationLabel}`,
    `- Route context: ${context?.uiContext?.currentRoute ?? "Unknown route"}`,
    `- Shell mode: ${context?.uiContext?.shellMode ?? "Unknown shell mode"}`,
    "",
    "## Current Score Signal",
    `- ${scoreLine}`,
    "",
    "## Structured Assessment",
    assessment,
    "",
    "## Report Status",
    "- Generated from GeoSight's structured fallback writer.",
    "- The external report-writing model is currently unavailable or not configured.",
    "- Review the Source awareness card before treating this as a final export.",
  ].join("\n");
}

function buildAgentFallback(agentId: string, message: string, context?: GeoSightContext) {
  if (agentId === "geo-guide") {
    return buildGeoGuideFallback(message, context);
  }

  const payload = buildAnalyzePayload(message, context);
  const profile = getProfileById(payload.profileId);

  if (agentId === "geo-scribe") {
    return buildGeoScribeFallback(message, context);
  }

  return [
    "# GeoAnalyst",
    "GeoAnalyst is currently using GeoSight's structured fallback analysis because a live model provider is unavailable.",
    "",
    buildFallbackAssessment(payload, profile),
  ].join("\n\n");
}

function buildSystemMessage(config: AgentConfig, context?: GeoSightContext) {
  if (!context) {
    return config.systemPrompt;
  }

  return `${config.systemPrompt}\n\nCurrent analysis context: ${JSON.stringify(
    context,
    null,
    2,
  )}`;
}

async function buildCompletionMessages(
  config: AgentConfig,
  message: string,
  context?: GeoSightContext,
  messages: AgentConversationMessage[] = [],
): Promise<CoreMessage[]> {
  return injectRagIntoMessages(
    [
      {
        role: "system",
        content: buildSystemMessage(config, context),
      },
      ...messages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    ],
    message,
  );
}

function parseGroqChunk(value: string) {
  try {
    return JSON.parse(value) as GroqStreamChunk;
  } catch {
    return null;
  }
}

function enqueueStreamEvent(
  rawEvent: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const lines = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice("data:".length).trim();
    if (!payload) {
      continue;
    }

    if (payload === "[DONE]") {
      return true;
    }

    const chunk = parseGroqChunk(payload);
    const content = chunk?.choices?.[0]?.delta?.content;
    if (content) {
      controller.enqueue(encoder.encode(content));
    }

    if (chunk?.choices?.[0]?.finish_reason) {
      return true;
    }
  }

  return false;
}

function createTextStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              enqueueStreamEvent(buffer, controller, encoder);
            }
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            const shouldClose = enqueueStreamEvent(event, controller, encoder);
            if (shouldClose) {
              await reader.cancel();
              controller.close();
              return;
            }
          }
        }
      } catch (error) {
        controller.error(
          error instanceof Error ? error : new Error("Unable to stream agent response."),
        );
      } finally {
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

async function requestGroqCompletion(
  config: AgentConfig,
  apiKey: string,
  message: string,
  context?: GeoSightContext,
  messages: AgentConversationMessage[] = [],
) {
  const completionMessages = await buildCompletionMessages(config, message, context, messages);

  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
      messages: completionMessages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    }),
  });
}

function getGroqApiKeyCandidates(config: AgentConfig) {
  const candidates = [
    process.env[config.apiKeyEnv],
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId: rawAgentId } = await context.params;
  if (!isAgentId(rawAgentId)) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(rawBody)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = normalizeMessage(rawBody.message);
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const messages = parseConversationMessages(rawBody.messages);

  const requestContext = parseGeoSightContext(rawBody.context);
  const agentConfig = getAgentConfig(rawAgentId);

  if (rawAgentId === "geo-usability") {
    const audit = runDeterministicUiAudit(requestContext?.uiContext);
    const deterministicAudit = formatUiAuditResult(audit);
    return new Response(deterministicAudit, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-GeoSight-Mode": "deterministic",
      },
    });
  }

  const apiKeys = getGroqApiKeyCandidates(agentConfig);
  if (apiKeys.length === 0) {
    return new Response(buildAgentFallback(rawAgentId, message, requestContext), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-GeoSight-Mode": "fallback",
      },
    });
  }

  try {
    for (const apiKey of apiKeys) {
      const response = await requestGroqCompletion(
        agentConfig,
        apiKey,
        message,
        requestContext,
        messages,
      );

      if (!response.ok || !response.body) {
        console.warn(
          `[agents-route] agent=${AGENT_CONFIGS[rawAgentId].id} provider_failed status=${response.status}`,
        );
        continue;
      }

      return new Response(createTextStream(response.body), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-GeoSight-Mode": "live",
        },
      });
    }
  } catch (error) {
    console.error(
      `[agents-route] agent=${AGENT_CONFIGS[rawAgentId].id} request_failed`,
      error,
    );

  }

  return new Response(buildAgentFallback(rawAgentId, message, requestContext), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GeoSight-Mode": "fallback",
    },
  });
}
