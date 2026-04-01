"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { AgentId, AGENT_IDS } from "@/lib/agents/agent-config";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithTimeout } from "@/lib/network";
import { cn } from "@/lib/utils";

type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
};

type AgentErrorState = {
  message: string;
  prompt: string;
};

type AgentResponseMode = "live" | "fallback" | "deterministic" | null;

function createAgentRecord<T>(factory: (agentId: AgentId) => T) {
  return AGENT_IDS.reduce<Record<AgentId, T>>((acc, agentId) => {
    acc[agentId] = factory(agentId);
    return acc;
  }, {} as Record<AgentId, T>);
}

const DEFAULT_ERROR_MESSAGE = "This agent could not respond right now.";
const MAX_TEXTAREA_ROWS = 4;
const AGENT_CONNECT_TIMEOUT_MS = 20_000;
const AGENT_STREAM_IDLE_TIMEOUT_MS = 12_000;
const ASSISTANT_ACCENT = "var(--accent)";
const ASSISTANT_AVATAR_LABEL = "GS";
const ASSISTANT_LABEL = "GeoSight";
const WELCOME_MESSAGE =
  "Ask about the active place, request a report, interpret source confidence, or get help using the current workspace.";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function resizeTextarea(node: HTMLTextAreaElement) {
  const computedStyle = window.getComputedStyle(node);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
  const padding =
    Number.parseFloat(computedStyle.paddingTop) +
    Number.parseFloat(computedStyle.paddingBottom);
  const border =
    Number.parseFloat(computedStyle.borderTopWidth) +
    Number.parseFloat(computedStyle.borderBottomWidth);
  const maxHeight = lineHeight * MAX_TEXTAREA_ROWS + padding + border;

  node.style.height = "auto";
  node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
  node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
}

function updateThreadMessage(
  threads: Record<AgentId, AgentChatMessage[]>,
  agentId: AgentId,
  messageId: string,
  updater: (message: AgentChatMessage) => AgentChatMessage,
) {
  const nextThread = threads[agentId].map((message) =>
    message.id === messageId ? updater(message) : message,
  );

  return {
    ...threads,
    [agentId]: nextThread,
  };
}

function removeThreadMessage(
  threads: Record<AgentId, AgentChatMessage[]>,
  agentId: AgentId,
  messageId: string,
) {
  return {
    ...threads,
    [agentId]: threads[agentId].filter((message) => message.id !== messageId),
  };
}

function finalizeAssistantMessage(
  threads: Record<AgentId, AgentChatMessage[]>,
  agentId: AgentId,
  messageId: string,
) {
  const message = threads[agentId].find((entry) => entry.id === messageId);
  if (!message) {
    return threads;
  }

  if (!message.content.trim()) {
    return {
      ...threads,
      [agentId]: threads[agentId].filter((entry) => entry.id !== messageId),
    };
  }

  return updateThreadMessage(threads, agentId, messageId, (entry) => ({
    ...entry,
    isStreaming: false,
  }));
}

async function readResponseError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? DEFAULT_ERROR_MESSAGE;
  }

  const text = (await response.text()).trim();
  return text || DEFAULT_ERROR_MESSAGE;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("The agent response stalled before it finished streaming."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export default function AgentChat() {
  const {
    activeAgentId,
    geoContext,
    uiContext,
    queuedDrafts,
    clearQueuedDraft,
  } = useAgentPanel();
  const [threads, setThreads] = useState<Record<AgentId, AgentChatMessage[]>>(() =>
    createAgentRecord(() => []),
  );
  const [drafts, setDrafts] = useState<Record<AgentId, string>>(() =>
    createAgentRecord(() => ""),
  );
  const [loadingByAgent, setLoadingByAgent] = useState<Record<AgentId, boolean>>(() =>
    createAgentRecord(() => false),
  );
  const [errors, setErrors] = useState<Record<AgentId, AgentErrorState | null>>(() =>
    createAgentRecord(() => null),
  );
  const [responseModeByAgent, setResponseModeByAgent] = useState<Record<AgentId, AgentResponseMode>>(
    () => createAgentRecord(() => null),
  );
  const [ellipsisStep, setEllipsisStep] = useState(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastReportDraftTemplateRef = useRef<string | null>(null);
  const requestIdsRef = useRef<Record<AgentId, number>>(createAgentRecord(() => 0));
  const abortControllersRef = useRef<Record<AgentId, AbortController | null>>(
    createAgentRecord(() => null),
  );

  const activeThread = threads[activeAgentId];
  const activeDraft = drafts[activeAgentId];
  const activeError = errors[activeAgentId];
  const isLoading = loadingByAgent[activeAgentId];
  const activeResponseMode = responseModeByAgent[activeAgentId];
  const loadingEllipsis = [".", "..", "..."][ellipsisStep] ?? "...";

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeAgentId, activeThread, activeError, isLoading]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }

    resizeTextarea(node);
  }, [activeAgentId, activeDraft]);

  useEffect(() => {
    if (!isLoading) {
      setEllipsisStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setEllipsisStep((current) => (current + 1) % 3);
    }, 320);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  const setDraftForAgent = useCallback((agentId: AgentId, value: string) => {
    setDrafts((current) => ({
      ...current,
      [agentId]: value,
    }));
  }, []);

  useEffect(() => {
    const queuedDraft = queuedDrafts[activeAgentId];
    if (!queuedDraft) {
      return;
    }

    setDraftForAgent(activeAgentId, queuedDraft);
    clearQueuedDraft(activeAgentId);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [activeAgentId, clearQueuedDraft, queuedDrafts, setDraftForAgent]);

  useEffect(() => {
    const nextTemplate = uiContext?.reportDraftTemplate?.trim();
    if (!nextTemplate) {
      lastReportDraftTemplateRef.current = null;
      return;
    }

    setDrafts((current) => {
      const currentDraft = current["geo-scribe"];
      const previousTemplate = lastReportDraftTemplateRef.current;
      const shouldSync =
        !currentDraft.trim() || (previousTemplate !== null && currentDraft === previousTemplate);

      if (!shouldSync) {
        return current;
      }

      return {
        ...current,
        "geo-scribe": nextTemplate,
      };
    });

    lastReportDraftTemplateRef.current = nextTemplate;
  }, [uiContext?.reportDraftTemplate]);

  useEffect(() => {
    const requestIds = requestIdsRef.current;
    const abortControllers = abortControllersRef.current;
    return () => {
      for (const agentId of AGENT_IDS) {
        requestIds[agentId] += 1;
        abortControllers[agentId]?.abort();
        abortControllers[agentId] = null;
      }
    };
  }, []);

  const setLoadingState = (agentId: AgentId, value: boolean) => {
    setLoadingByAgent((current) => ({
      ...current,
      [agentId]: value,
    }));
  };

  const setAgentError = (agentId: AgentId, value: AgentErrorState | null) => {
    setErrors((current) => ({
      ...current,
      [agentId]: value,
    }));
  };

  const setResponseMode = (agentId: AgentId, value: AgentResponseMode) => {
    setResponseModeByAgent((current) => ({
      ...current,
      [agentId]: value,
    }));
  };

  const sendMessage = async (
    prompt: string,
    options?: {
      appendUserMessage?: boolean;
    },
  ) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    const agentId = activeAgentId;
    const appendUserMessage = options?.appendUserMessage ?? true;
    const assistantMessageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const requestId = requestIdsRef.current[agentId] + 1;
    const controller = new AbortController();

    requestIdsRef.current[agentId] = requestId;
    abortControllersRef.current[agentId]?.abort();
    abortControllersRef.current[agentId] = controller;

    setAgentError(agentId, null);
    setResponseMode(agentId, null);
    if (appendUserMessage) {
      setDraftForAgent(agentId, "");
    }

    setThreads((current) => ({
      ...current,
      [agentId]: [
        ...current[agentId],
        ...(appendUserMessage
          ? [
              {
                id: crypto.randomUUID(),
                role: "user" as const,
                content: trimmedPrompt,
                createdAt,
              },
            ]
          : []),
        {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "",
          createdAt,
          isStreaming: true,
        },
      ],
    }));
    setLoadingState(agentId, true);

    try {
      const response = await fetchWithTimeout(
        `/api/agents/${agentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedPrompt,
            messages: [
              ...activeThread.map(({ role, content, createdAt }) => ({ role, content, createdAt })),
              ...(appendUserMessage
                ? [{ role: "user" as const, content: trimmedPrompt, createdAt }]
                : []),
            ],
            context:
              geoContext || uiContext
                ? {
                    ...(geoContext ?? {}),
                    uiContext: uiContext ?? geoContext?.uiContext,
                  }
                : undefined,
          }),
          signal: controller.signal,
        },
        AGENT_CONNECT_TIMEOUT_MS,
      );

      if (requestId !== requestIdsRef.current[agentId] || controller.signal.aborted) {
        return;
      }

      setResponseMode(
        agentId,
        (response.headers.get("X-GeoSight-Mode") as AgentResponseMode) ?? null,
      );

      if (!response.ok || !response.body) {
        throw new Error(await readResponseError(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedContent = false;

      while (true) {
        const { done, value } = await readStreamChunk(reader, AGENT_STREAM_IDLE_TIMEOUT_MS);
        if (done) {
          break;
        }

        if (requestId !== requestIdsRef.current[agentId] || controller.signal.aborted) {
          await reader.cancel();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) {
          continue;
        }

        receivedContent = true;
        setThreads((current) =>
          updateThreadMessage(current, agentId, assistantMessageId, (message) => ({
            ...message,
            content: `${message.content}${chunk}`,
          })),
        );
      }

      const trailingChunk = decoder.decode();
      if (trailingChunk) {
        if (requestId !== requestIdsRef.current[agentId] || controller.signal.aborted) {
          await reader.cancel();
          return;
        }

        receivedContent = true;
        setThreads((current) =>
          updateThreadMessage(current, agentId, assistantMessageId, (message) => ({
            ...message,
            content: `${message.content}${trailingChunk}`,
          })),
        );
      }

      if (!receivedContent) {
        throw new Error(DEFAULT_ERROR_MESSAGE);
      }
    } catch (error) {
      if (
        requestId !== requestIdsRef.current[agentId] ||
        controller.signal.aborted ||
        isAbortError(error)
      ) {
        return;
      }

      setAgentError(agentId, {
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : DEFAULT_ERROR_MESSAGE,
        prompt: trimmedPrompt,
      });
    } finally {
      setThreads((current) =>
        requestId === requestIdsRef.current[agentId] && !controller.signal.aborted
          ? finalizeAssistantMessage(current, agentId, assistantMessageId)
          : removeThreadMessage(current, agentId, assistantMessageId),
      );
      if (requestId === requestIdsRef.current[agentId]) {
        setLoadingState(agentId, false);
        if (abortControllersRef.current[agentId] === controller) {
          abortControllersRef.current[agentId] = null;
        }
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    await sendMessage(activeDraft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (isLoading || !activeDraft.trim()) {
      return;
    }

    void sendMessage(activeDraft);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {activeResponseMode === "fallback" ? (
        <div className="rounded-xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-foreground)]">
          Fallback mode is active. This reply used GeoSight&apos;s built-in deterministic backup instead of a live model.
        </div>
      ) : null}

      {activeResponseMode === "deterministic" ? (
        <div className="rounded-xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-foreground)]">
          Deterministic mode is active for this agent.
        </div>
      ) : null}

      <div className="scrollbar-thin flex-1 min-h-[120px] overflow-y-auto rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
        {activeThread.length ? (
          <div className="space-y-3">
            {activeThread.map((message) => {
              const isAssistant = message.role === "assistant";
              const accentColor = isAssistant ? ASSISTANT_ACCENT : "var(--border-strong)";
              const avatarLabel = isAssistant ? ASSISTANT_AVATAR_LABEL : "YU";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isAssistant ? "items-start" : "flex-row-reverse items-start",
                  )}
                >
                  <div
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold uppercase",
                      isAssistant
                        ? "agent-avatar agent-avatar--assistant"
                        : "border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--foreground)]",
                    )}
                    style={{
                      ...(isAssistant ? { color: accentColor } : {}),
                    }}
                  >
                    {avatarLabel}
                    <span
                      className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-[var(--surface-soft)]"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className={cn("min-w-0 flex-1", isAssistant ? "" : "text-right")}>
                    <div
                      className={cn(
                        "flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]",
                        isAssistant ? "" : "justify-end",
                      )}
                    >
                      {isAssistant ? (
                        <span
                          className="agent-chip agent-chip--assistant rounded-full border px-2 py-1 text-[10px]"
                          style={{
                            color: ASSISTANT_ACCENT,
                          }}
                        >
                          {ASSISTANT_LABEL}
                        </span>
                      ) : (
                        <span>You</span>
                      )}
                      <span>{formatTime(message.createdAt)}</span>
                    </div>

                    <div
                      className={cn(
                        "mt-2 rounded-xl border px-4 py-3 text-sm leading-6",
                        isAssistant
                          ? "border-[color:var(--border-soft)] bg-[var(--surface-raised)] text-[var(--foreground-soft)]"
                          : "border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
                      )}
                    >
                      {isAssistant ? (
                        <MarkdownContent
                          content={message.content || (message.isStreaming ? loadingEllipsis : "")}
                        />
                      ) : (
                        message.content || (message.isStreaming ? loadingEllipsis : "")
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-xl rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-sm leading-6 text-[var(--foreground-soft)]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ASSISTANT_ACCENT }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-[var(--foreground)]">
                  {ASSISTANT_LABEL}
                </span>
              </div>
              <p className="mt-3">{WELCOME_MESSAGE}</p>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {activeError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
          <span>{activeError.message}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              if (isLoading) {
                return;
              }

              void sendMessage(activeError.prompt, { appendUserMessage: false });
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex min-h-0 items-end gap-3">
        <Textarea
          ref={textareaRef}
          value={activeDraft}
          onChange={(event) => setDraftForAgent(activeAgentId, event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask GeoSight about this place"
          className="min-h-[54px] resize-none"
          rows={1}
        />
        <Button
          type="submit"
          className="h-[54px] shrink-0 rounded-xl px-5"
          disabled={isLoading || !activeDraft.trim()}
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
