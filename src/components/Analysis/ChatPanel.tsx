"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StateBadge } from "@/components/Status/StatePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithTimeout } from "@/lib/network";
import { summarizeGeneratedTrust } from "@/lib/source-trust";
import {
  ConversationMessage,
  Coordinates,
  DataTrend,
  DataSourceMeta,
  GeodataResult,
  LandCoverBucket,
  MissionProfile,
  NearbyPlace,
  NearbyPlacesSource,
  ResultsMode,
} from "@/types";

const STARTER_PROMPTS = [
  "Give me a quick overview of this place.",
  "What are some good hikes near this location?",
  "Are there interesting restaurants in this area?",
  "Would this work for a new neighborhood?",
  "What risks or constraints stand out at this location?",
] as const;

interface ChatPanelProps {
  profile: MissionProfile;
  location: Coordinates;
  locationName: string;
  resultsMode: ResultsMode;
  geodata: GeodataResult | null;
  geodataLoading: boolean;
  groundingFallbackSources: DataSourceMeta[];
  nearbyPlaces: NearbyPlace[];
  nearbySource: NearbyPlacesSource;
  dataTrends: DataTrend[];
  imageSummary: string;
  classification: LandCoverBucket[];
  onQuestionAsked?: (question: string) => void;
}

type ChatReplyMode = "live" | "fallback";

interface ChatUiMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  mode?: ChatReplyMode;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function ChatPanel({
  profile,
  location,
  locationName,
  resultsMode,
  geodata,
  geodataLoading,
  groundingFallbackSources,
  nearbyPlaces,
  nearbySource,
  dataTrends,
  imageSummary,
  classification,
  onQuestionAsked,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatUiMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Ask about this place in whatever way is useful: siting, schools, trails, neighborhoods, hazards, land use, or infrastructure.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    liveAnalysisAvailable: boolean;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showGrounding, setShowGrounding] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const analyzeRequestIdRef = useRef(0);
  const analyzeAbortControllerRef = useRef<AbortController | null>(null);
  const suggestionPrompts = profile.exampleQuestions.length
    ? profile.exampleQuestions
    : [...STARTER_PROMPTS];
  const groundingSources = useMemo(() => {
    const uniqueSources = (
      candidates: Array<DataSourceMeta | null | undefined>,
    ) =>
      candidates.reduce<DataSourceMeta[]>((acc, source) => {
        if (!source || acc.some((existing) => existing.id === source.id)) {
          return acc;
        }

        acc.push(source);
        return acc;
      }, []);

    if (resultsMode === "nearby_places") {
      return uniqueSources([
        geodata?.sources.amenities,
        geodata?.sources.infrastructure,
        geodata?.sources.climate,
        geodata?.sources.school,
      ]).slice(0, 4);
    }

    if (dataTrends.length) {
      return uniqueSources(dataTrends.map((trend) => trend.source)).slice(0, 4);
    }

    return uniqueSources([
      geodata?.sources.elevation,
      geodata?.sources.climate,
      geodata?.sources.hazards,
      geodata?.sources.demographics,
    ]).slice(0, 4);
  }, [dataTrends, geodata, resultsMode]);
  const groundingNote =
    resultsMode === "nearby_places"
      ? "Nearby answers should stay inside live mapped place results plus the local access and amenity context."
      : "Analysis answers should stay inside these live and derived inputs and call out any important gaps.";
  const reasoningSources = groundingSources.length
    ? groundingSources
    : groundingFallbackSources;
  const reasoningSubject =
    resultsMode === "nearby_places" ? "Nearby-place answers" : "GeoAnalyst answers";
  const panelTrustSummary = useMemo(
    () =>
      summarizeGeneratedTrust(
        aiStatus?.liveAnalysisAvailable === false ? "fallback" : "live",
        reasoningSources,
        reasoningSubject,
      ),
    [aiStatus?.liveAnalysisAvailable, reasoningSources, reasoningSubject],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAiStatus() {
      try {
        const response = await fetchWithTimeout("/api/ai-status", {}, 10_000);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          liveAnalysisAvailable?: boolean;
        };

        if (!cancelled) {
          setAiStatus({
            liveAnalysisAvailable: Boolean(payload.liveAnalysisAvailable),
          });
        }
      } catch {
        if (!cancelled) {
          setAiStatus(null);
        }
      }
    }

    void loadAiStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto",
    });
  }, [loading, messages]);

  useEffect(() => {
    analyzeRequestIdRef.current += 1;
    analyzeAbortControllerRef.current?.abort();
    analyzeAbortControllerRef.current = null;
    setLoading(false);
  }, [location.lat, location.lng, locationName, profile.id, resultsMode]);

  useEffect(() => {
    return () => {
      analyzeRequestIdRef.current += 1;
      analyzeAbortControllerRef.current?.abort();
      analyzeAbortControllerRef.current = null;
    };
  }, []);

  const submitQuestion = useCallback(async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    const nextMessages: ChatUiMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: trimmedQuestion },
    ];
    const requestId = analyzeRequestIdRef.current + 1;
    const controller = new AbortController();

    analyzeRequestIdRef.current = requestId;
    analyzeAbortControllerRef.current?.abort();
    analyzeAbortControllerRef.current = controller;
    onQuestionAsked?.(trimmedQuestion);
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const conversationMessages: ConversationMessage[] = nextMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const response = await fetchWithTimeout(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            question: trimmedQuestion,
            messages: conversationMessages,
            location,
            locationName,
            resultsMode,
            geodata,
            nearbyPlaces,
            nearbySource,
            dataTrends,
            imageSummary,
            classification,
          }),
          signal: controller.signal,
        },
        20_000,
      );
      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        fallbackMode?: boolean;
      };
      if (requestId !== analyzeRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "GeoSight couldn't analyze this request right now.");
      }

      const assistantMode: ChatReplyMode = data.fallbackMode ? "fallback" : "live";

      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          mode: assistantMode,
        },
      ]);
    } catch (error) {
      if (
        requestId !== analyzeRequestIdRef.current ||
        controller.signal.aborted ||
        isAbortError(error)
      ) {
        return;
      }

      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "GeoSight couldn't analyze this request right now.",
        },
      ]);
    } finally {
      if (requestId === analyzeRequestIdRef.current) {
        setLoading(false);
        if (analyzeAbortControllerRef.current === controller) {
          analyzeAbortControllerRef.current = null;
        }
      }
    }
  }, [
    classification,
    dataTrends,
    geodata,
    imageSummary,
    location,
    locationName,
    messages,
    nearbyPlaces,
    nearbySource,
    onQuestionAsked,
    profile.id,
    resultsMode,
    loading,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    await submitQuestion(draft);
  };

  return (
    <Card className="flex min-h-[420px] flex-col">
      <CardHeader className="space-y-3">
        <div className="eyebrow">Reasoning board</div>
        <CardTitle>Ask</CardTitle>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Active location: <span className="font-medium text-[var(--foreground)]">{locationName}</span>
        </p>
        {aiStatus?.liveAnalysisAvailable === false ? (
          <div className="inline-flex w-fit rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--warning-foreground)]">
            Fallback mode
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={() => setShowSuggestions((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="eyebrow">Suggested questions</div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                Start here or ask in your own words.
              </div>
            </div>
            {showSuggestions ? (
              <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
            )}
          </button>

          {showSuggestions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestionPrompts.map((prompt) => (
                <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitQuestion(prompt)}
                    className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground-soft)] transition hover:bg-[var(--surface-soft)]"
                  >
                    {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowGrounding((current) => !current)}
            className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            {showGrounding ? "Hide grounding sources" : "View grounding sources"}
          </button>
          {showGrounding ? (
            <div className="mt-3 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="eyebrow">Current grounding</div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {groundingNote}
                  </p>
                </div>
                {resultsMode === "nearby_places" ? (
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground-soft)]">
                    {nearbySource === "live" ? "Nearby places: live OSM" : "Nearby places: live data unavailable"}
                  </span>
                ) : null}
              </div>
              <TrustSummaryPanel
                className="mt-4"
                eyebrow="Reasoning trust"
                summary={panelTrustSummary}
                sources={reasoningSources}
                initialVisibleCount={2}
                note={
                  groundingSources.length
                    ? "These are the main sources currently grounding the answer surface."
                    : groundingFallbackSources.length
                      ? "Live grounding is still catching up, so GeoSight is showing the currently loaded source cards instead."
                      : geodataLoading
                        ? "GeoSight is still assembling the live and derived context for this place."
                        : geodata
                          ? "This location is loaded, but the current view does not yet have enough source-rich inputs to show a broader grounding set."
                          : "Select a place or wait for live context to finish loading before GeoSight can show grounding inputs."
                }
              />
            </div>
          ) : null}
        </div>

        <div
          ref={messagesViewportRef}
          className="scrollbar-thin flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
        >
          {messages.map((message) => {
            const messageTrust = message.mode
              ? summarizeGeneratedTrust(
                  message.mode,
                  reasoningSources,
                  reasoningSubject,
                )
              : null;

            return (
              <div
                key={message.id}
                className={`rounded-[1.5rem] px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-6 border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                    : "mr-6 border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)]"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="space-y-3">
                    <MarkdownContent content={message.content} />
                    {messageTrust ? (
                      <div className="border-t border-[color:var(--border-soft)] pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StateBadge
                            tone={messageTrust.tone}
                            label={messageTrust.badgeLabel}
                          />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                          {messageTrust.description}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  message.content
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a question about this location (schools, trails, neighborhoods, freight, hazards, and more)..."
          />
          <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Analyzing" : "Ask GeoSight"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
