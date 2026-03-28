"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { STARTER_PROMPTS } from "@/lib/geosight-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatMessage,
  Coordinates,
  DataTrend,
  GeodataResult,
  LandCoverBucket,
  MissionProfile,
  NearbyPlace,
  ResultsMode,
} from "@/types";

interface ChatPanelProps {
  profile: MissionProfile;
  location: Coordinates;
  locationName: string;
  resultsMode: ResultsMode;
  geodata: GeodataResult | null;
  nearbyPlaces: NearbyPlace[];
  dataTrends: DataTrend[];
  imageSummary: string;
  classification: LandCoverBucket[];
}

export function ChatPanel({
  profile,
  location,
  locationName,
  resultsMode,
  geodata,
  nearbyPlaces,
  dataTrends,
  imageSummary,
  classification,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Ask about this place in whatever way is useful: site selection, schools, trails, neighborhoods, restaurants, hazards, land use, or infrastructure.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionPrompts = profile.exampleQuestions.length
    ? profile.exampleQuestions
    : [...STARTER_PROMPTS];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    const question = draft.trim();
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: question },
    ];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          question,
          location,
          locationName,
          resultsMode,
          geodata,
          nearbyPlaces,
          dataTrends,
          imageSummary,
          classification,
        }),
      });
      const data = (await response.json()) as { answer: string };
      setMessages([
        ...nextMessages,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Analysis failed. Check your GROQ_API_KEY or try again with a shorter prompt.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
                Use these to start fast, or ask anything in your own words.
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
                  onClick={() => setDraft(prompt)}
                  className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground-soft)] transition hover:bg-[var(--surface-soft)]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
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
              {message.content}
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
