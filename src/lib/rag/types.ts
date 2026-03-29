/**
 * Shared types for GeoSight's retrieval-augmented generation pipeline.
 */
export type RagChunk = {
  id: string;
  source: string;
  heading: string;
  content: string;
};

export type EmbeddedChunk = RagChunk & {
  embedding: number[];
};

export type RetrievalResult = EmbeddedChunk & {
  similarity: number;
};

export type CoreMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
