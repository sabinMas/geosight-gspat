/**
 * Scores GeoSight knowledge chunks against an embedded query and returns the best matches.
 */
import { embedText } from "./embed";
import { getStore } from "./store";
import { RetrievalResult } from "./types";

const MINIMUM_SIMILARITY = 0.65;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < a.length; index += 1) {
    dotProduct += a[index] * b[index];
    aMagnitude += a[index] * a[index];
    bMagnitude += b[index] * b[index];
  }

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

export async function retrieve(
  query: string,
  topK: number = 4,
): Promise<RetrievalResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  try {
    const [queryEmbedding, store] = await Promise.all([
      embedText(normalizedQuery),
      getStore(),
    ]);

    if (!queryEmbedding.length || !store.length) {
      return [];
    }

    return store
      .map((chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter((chunk) => chunk.similarity >= MINIMUM_SIMILARITY)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, topK);
  } catch (error) {
    console.warn("[RAG] Retrieval failed.", error);
    return [];
  }
}
