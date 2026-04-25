/**
 * Formats retrieved GeoSight knowledge and injects it into model message arrays.
 */
import { retrieve } from "./retrieve";
import { CoreMessage } from "./types";

// Hard cap on assembled RAG context. Cerebras llama3.1-8b has 8K-token
// context, so we keep RAG to ~750 tokens (~3000 chars). Each chunk capped
// at 800 chars; we fit as many as possible under the total budget.
const RAG_TOTAL_CHAR_BUDGET = 3000;
const RAG_CHUNK_CHAR_LIMIT = 800;

function truncateChunk(text: string): string {
  if (text.length <= RAG_CHUNK_CHAR_LIMIT) return text;
  return `${text.slice(0, RAG_CHUNK_CHAR_LIMIT - 1).trimEnd()}…`;
}

export async function buildRagContext(query: string): Promise<string> {
  const results = await retrieve(query, 4);
  if (!results.length) {
    return "";
  }

  const sections: string[] = [];
  let used = 0;
  for (const result of results) {
    const body = truncateChunk(result.content);
    const section = `[Source: ${result.source} | Section: ${result.heading}]\n${body}`;
    if (used + section.length > RAG_TOTAL_CHAR_BUDGET) break;
    sections.push(section);
    used += section.length + 2; // approx separator
  }

  if (!sections.length) return "";

  return [
    "--- GEOSIGHT KNOWLEDGE CONTEXT ---",
    ...sections,
    "--- END CONTEXT ---",
  ].join("\n\n");
}

export async function injectRagIntoMessages(
  messages: CoreMessage[],
  userQuery: string,
): Promise<CoreMessage[]> {
  const baseMessages = messages.map((message) => ({ ...message }));
  if (!userQuery.trim()) {
    return baseMessages;
  }

  try {
    const ragContext = await buildRagContext(userQuery);
    if (!ragContext) {
      return baseMessages;
    }

    const userMessageIndex = baseMessages.findIndex((message) => message.role === "user");
    const ragMessage: CoreMessage = {
      role: "system",
      content: ragContext,
    };

    if (userMessageIndex < 0) {
      return [...baseMessages, ragMessage];
    }

    return [
      ...baseMessages.slice(0, userMessageIndex),
      ragMessage,
      ...baseMessages.slice(userMessageIndex),
    ];
  } catch (error) {
    console.warn("[RAG] Message injection failed; continuing without RAG context.", error);
    return baseMessages;
  }
}
