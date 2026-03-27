"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { STARTER_PROMPTS } from "@/lib/geosight-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage, Coordinates, GeodataResult, LandCoverBucket } from "@/types";

interface ChatPanelProps {
  location: Coordinates;
  locationName: string;
  geodata: GeodataResult | null;
  imageSummary: string;
  classification: LandCoverBucket[];
}

export function ChatPanel({
  location,
  locationName,
  geodata,
  imageSummary,
  classification,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Ask about this place in whatever way is useful: cooling infrastructure, hiking, housing, retail, warehouse access, or general location intelligence.",
    },
  ]);
  const [draft, setDraft] = useState("Would this location work for a data center cooling facility?");
  const [loading, setLoading] = useState(false);

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
          question,
          location,
          locationName,
          geodata,
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
    <Card className="flex min-h-[360px] flex-col">
      <CardHeader>
        <CardTitle>AI geospatial Q&A</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-6 bg-cyan-400/12 text-cyan-50"
                  : "mr-6 bg-white/6 text-slate-200"
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
            placeholder="Ask about hiking, housing, retail, warehouse access, cooling, land cover, or another place-based question."
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
