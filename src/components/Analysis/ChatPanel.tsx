"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { SourceInlineSummary } from "@/components/Source/SourceInlineSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithTimeout } from "@/lib/network";
import {
  ChatMessage,
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Ask about this place in whatever way is useful: siting, schools, trails, neighborhoods, hazards, land use, or infrastructure.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const submitQuestion = useCallback(async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: trimmedQuestion },
    ];
    onQuestionAsked?.(trimmedQuestion);
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetchWithTimeout(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            question: trimmedQuestion,
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
        },
        20_000,
      );
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "GeoSight couldn't analyze this request right now.");
      }

      setMessages([
        ...nextMessages,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer },
      ]);
    } catch (error) {
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
      setLoading(false);
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
        <CardTitle>Ask a question about this place</CardTitle>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Active location: <span className="font-medium text-[var(--foreground)]">{locationName}</span>
        </p>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          {profile.name} profile / {resultsMode === "analysis" ? "Analysis" : "Nearby places"}
        </p>
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

        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
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

          <details className="mt-4 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Inspect grounding inputs
            </summary>
            {groundingSources.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {groundingSources.map((source) => (
                  <SourceInlineSummary key={source.id} source={source} compact />
                ))}
              </div>
            ) : groundingFallbackSources.length ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-[1rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning-foreground)]">
              Live grounding is still loading, so GeoSight is showing the current source cards while deeper context catches up.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {groundingFallbackSources.map((source) => (
                    <SourceInlineSummary key={source.id} source={source} compact />
                  ))}
                </div>
              </div>
            ) : geodataLoading ? (
              <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                GeoSight is still assembling the live and derived context for this place.
              </div>
            ) : geodata ? (
              <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                This location is loaded, but the current view does not have enough source-rich inputs to show a grounding strip yet.
              </div>
            ) : (
              <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                Select a place or wait for live context to finish loading before GeoSight can show grounding inputs.
              </div>
            )}
          </details>
        </div>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-[1.5rem] px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-6 border border-[color:var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-foreground)]"
                  : "mr-6 border border-[color:var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)]"
              }`}
            >
              {message.role === "assistant" ? (
                <MarkdownContent content={message.content} />
              ) : (
                message.content
              )}
            </div>
          ))}
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
