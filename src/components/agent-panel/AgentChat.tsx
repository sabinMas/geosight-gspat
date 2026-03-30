"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { AgentId, AGENT_CONFIGS, AGENT_IDS } from "@/lib/agents/agent-config";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Textarea } from "@/components/ui/textarea";
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

function createAgentRecord<T>(factory: (agentId: AgentId) => T) {
  return AGENT_IDS.reduce<Record<AgentId, T>>((acc, agentId) => {
    acc[agentId] = factory(agentId);
    return acc;
  }, {} as Record<AgentId, T>);
}

const WELCOME_MESSAGES: Record<AgentId, string> = {
  "geo-analyst":
    "I read the active location through GeoSight's live terrain, infrastructure, hazard, and demographic context. Ask for a grounded site assessment once the map analysis has finished loading.",
  "geo-guide":
    "I only explain how GeoSight works: cards, panels, scores, filters, and mission profiles. Ask how to use the interface or how to interpret something already on screen.",
  "geo-scribe":
    "I turn GeoSight findings into polished, investor-grade writing. Run an analysis first, then ask me for a report, summary, memo, or export-ready narrative.",
  "geo-usability":
    "I audit the current GeoSight UI for clutter, overflow, reveal timing, and mobile risk. Ask me to review what is on screen and I will respond with structured findings grounded in the visible interface state.",
};

const DEFAULT_ERROR_MESSAGE = "This agent could not respond right now.";
const MAX_TEXTAREA_ROWS = 4;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAgentInitials(agentId: AgentId) {
  return AGENT_CONFIGS[agentId].name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
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
  const [ellipsisStep, setEllipsisStep] = useState(0);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeThread = threads[activeAgentId];
  const activeDraft = drafts[activeAgentId];
  const activeError = errors[activeAgentId];
  const isLoading = loadingByAgent[activeAgentId];
  const activeAgent = AGENT_CONFIGS[activeAgentId];
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

    setAgentError(agentId, null);
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
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedPrompt,
          context:
            geoContext || uiContext
              ? {
                  ...(geoContext ?? {}),
                  uiContext: uiContext ?? geoContext?.uiContext,
                }
              : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(await readResponseError(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
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
      setAgentError(agentId, {
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : DEFAULT_ERROR_MESSAGE,
        prompt: trimmedPrompt,
      });
    } finally {
      setThreads((current) =>
        finalizeAssistantMessage(current, agentId, assistantMessageId),
      );
      setLoadingState(agentId, false);
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
      <div className="scrollbar-thin h-[148px] overflow-y-auto rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3 sm:h-[162px]">
        {activeThread.length ? (
          <div className="space-y-3">
            {activeThread.map((message) => {
              const isAssistant = message.role === "assistant";
              const accentColor = isAssistant
                ? activeAgent.accentColor
                : "var(--border-strong)";
              const avatarLabel = isAssistant ? getAgentInitials(activeAgentId) : "YU";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isAssistant ? "items-start" : "flex-row-reverse items-start",
                  )}
                >
                  <div
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold uppercase"
                    style={{
                      borderColor: isAssistant ? accentColor : "var(--border-soft)",
                      background: isAssistant
                        ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
                        : "var(--surface-raised)",
                      color: isAssistant ? accentColor : "var(--foreground)",
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
                          className="rounded-full border px-2 py-1 text-[10px]"
                          style={{
                            borderColor: activeAgent.accentColor,
                            background: `color-mix(in srgb, ${activeAgent.accentColor} 10%, transparent)`,
                            color: activeAgent.accentColor,
                          }}
                        >
                          {activeAgent.name}
                        </span>
                      ) : (
                        <span>You</span>
                      )}
                      <span>{formatTime(message.createdAt)}</span>
                    </div>

                    <div
                      className={cn(
                        "mt-2 rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
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
            <div className="max-w-xl rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-sm leading-6 text-[var(--foreground-soft)]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeAgent.accentColor }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-[var(--foreground)]">
                  {activeAgent.name}
                </span>
              </div>
              <p className="mt-3">{WELCOME_MESSAGES[activeAgentId]}</p>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {activeError ? (
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
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
          placeholder={`Message ${activeAgent.name}`}
          className="min-h-[54px] resize-none"
          rows={1}
        />
        <Button
          type="submit"
          className="h-[54px] shrink-0 rounded-[1.25rem] px-5"
          disabled={isLoading || !activeDraft.trim()}
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
