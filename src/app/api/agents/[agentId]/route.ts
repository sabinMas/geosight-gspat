import { NextResponse } from "next/server";
import {
  AGENT_CONFIGS,
  AgentConfig,
  GeoSightContext,
  GeoSightUiContext,
  getAgentConfig,
  isAgentId,
} from "@/lib/agents/agent-config";
import { injectRagIntoMessages } from "@/lib/rag/inject";
import { CoreMessage } from "@/lib/rag/types";
import { formatUiAuditResult, runDeterministicUiAudit } from "@/lib/ux-audit";
import { WorkspaceCardId, WorkspaceShellMode } from "@/types";

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

function parseOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
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
    judgeMode: parseOptionalBoolean(value.judgeMode),
    locationSelected: parseOptionalBoolean(value.locationSelected),
    geodataLoading: parseOptionalBoolean(value.geodataLoading),
    geodataLoaded: parseOptionalBoolean(value.geodataLoaded),
    reportOpen: parseOptionalBoolean(value.reportOpen),
    demoOpen: parseOptionalBoolean(value.demoOpen),
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
    missionId: parseOptionalString(value.missionId),
    score: parseOptionalNumber(value.score),
    dataBundle: isRecord(value.dataBundle) ? value.dataBundle : undefined,
    uiContext: parseUiContext(value.uiContext),
  };

  return Object.values(context).some((entry) => entry !== undefined) ? context : undefined;
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
): Promise<CoreMessage[]> {
  return injectRagIntoMessages(
    [
      {
        role: "system",
        content: buildSystemMessage(config, context),
      },
      {
        role: "user",
        content: message,
      },
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
) {
  const messages = await buildCompletionMessages(config, message, context);

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
      messages: messages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    }),
  });
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

  const requestContext = parseGeoSightContext(rawBody.context);
  const agentConfig = getAgentConfig(rawAgentId);

  if (rawAgentId === "geo-usability") {
    const audit = runDeterministicUiAudit(requestContext?.uiContext);
    const deterministicAudit = formatUiAuditResult(audit);
    const apiKey = process.env[agentConfig.apiKeyEnv]?.trim();

    if (!apiKey) {
      return new Response(deterministicAudit, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    try {
      const response = await requestGroqCompletion(
        agentConfig,
        apiKey,
        [
          `User request: ${message}`,
          "",
          "Deterministic UI audit findings:",
          deterministicAudit,
          "",
          "Rewrite these findings into a concise internal UX review. Keep the same issues and recommendations. Do not add new findings.",
        ].join("\n"),
        requestContext,
      );

      if (!response.ok || !response.body) {
        return new Response(deterministicAudit, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      return new Response(createTextStream(response.body), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("[agents-route] agent=geo-usability request_failed", error);

      return new Response(deterministicAudit, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const apiKey = process.env[agentConfig.apiKeyEnv]?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "This agent is not configured right now." },
      { status: 500 },
    );
  }

  try {
    const response = await requestGroqCompletion(
      agentConfig,
      apiKey,
      message,
      requestContext,
    );

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "The agent could not respond right now." },
        { status: 502 },
      );
    }

    return new Response(createTextStream(response.body), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      `[agents-route] agent=${AGENT_CONFIGS[rawAgentId].id} request_failed`,
      error,
    );

    return NextResponse.json(
      { error: "The agent could not respond right now." },
      { status: 502 },
    );
  }
}
