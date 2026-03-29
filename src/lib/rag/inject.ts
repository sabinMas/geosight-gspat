/**
 * Formats retrieved GeoSight knowledge and injects it into model message arrays.
 */
import { retrieve } from "./retrieve";
import { CoreMessage } from "./types";

export async function buildRagContext(query: string): Promise<string> {
  const results = await retrieve(query, 4);
  if (!results.length) {
    return "";
  }

  const sections = results.map((result) => {
    return `[Source: ${result.source} | Section: ${result.heading}]\n${result.content}`;
  });

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
