/**
 * Wraps Gemini text embeddings so GeoSight can embed knowledge chunks and user queries.
 */
import {
  GoogleGenerativeAI,
  TaskType,
} from "@google/generative-ai";
import { EmbeddedChunk, RagChunk } from "./types";

const EMBEDDING_MODELS = ["text-embedding-004", "gemini-embedding-001"] as const;
const EMBEDDING_BATCH_SIZE = 10;
const EMBEDDING_BATCH_DELAY_MS = 200;

let resolvedEmbeddingModelName: (typeof EMBEDDING_MODELS)[number] | null = null;
const warnedUnavailableModels = new Set<string>();

function getEmbeddingClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[RAG] GEMINI_API_KEY is missing. Embeddings are unavailable.");
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function buildDocumentRequest(chunk: RagChunk) {
  return {
    content: {
      role: "user",
      parts: [{ text: chunk.content }],
    },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: chunk.heading,
  };
}

function isUnsupportedModelError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status =
    "status" in error && typeof error.status === "number" ? error.status : undefined;
  const message = error instanceof Error ? error.message : "";

  return status === 404 || /not found|not supported/i.test(message);
}

async function runEmbeddingWithFallback<T>(
  runner: (model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>) => Promise<T>,
): Promise<T | null> {
  const client = getEmbeddingClient();
  if (!client) {
    return null;
  }

  const candidateNames = resolvedEmbeddingModelName
    ? [resolvedEmbeddingModelName]
    : [...EMBEDDING_MODELS];

  for (const modelName of candidateNames) {
    const model = client.getGenerativeModel({ model: modelName });

    try {
      const result = await runner(model);
      resolvedEmbeddingModelName = modelName;
      return result;
    } catch (error) {
      if (isUnsupportedModelError(error) && modelName !== EMBEDDING_MODELS.at(-1)) {
        if (!warnedUnavailableModels.has(modelName)) {
          warnedUnavailableModels.add(modelName);
          console.warn(
            `[RAG] Embedding model ${modelName} is unavailable; falling back to the next supported Gemini embedding model.`,
          );
        }
        continue;
      }

      throw error;
    }
  }

  return null;
}

async function embedDocument(
  chunk: RagChunk,
): Promise<EmbeddedChunk | null> {
  try {
    const response = await runEmbeddingWithFallback((model) =>
      model.embedContent(buildDocumentRequest(chunk)),
    );
    if (!response) {
      return null;
    }
    const embedding = normalizeEmbedding(response.embedding.values);

    if (!embedding.length) {
      return null;
    }

    return {
      ...chunk,
      embedding,
    };
  } catch (error) {
    console.warn(`[RAG] Failed to embed chunk ${chunk.id}.`, error);
    return null;
  }
}

function normalizeEmbedding(values: number[] | undefined) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value) => typeof value === "number" && Number.isFinite(value));
}

export async function embedText(text: string): Promise<number[]> {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return [];
  }

  try {
    const response = await runEmbeddingWithFallback((model) =>
      model.embedContent({
        content: {
          role: "user",
          parts: [{ text: normalizedText }],
        },
        taskType: TaskType.RETRIEVAL_QUERY,
      }),
    );
    if (!response) {
      return [];
    }

    return normalizeEmbedding(response.embedding.values);
  } catch (error) {
    console.warn("[RAG] Failed to embed query text.", error);
    return [];
  }
}

export async function embedChunks(chunks: RagChunk[]): Promise<EmbeddedChunk[]> {
  if (!chunks.length) {
    return [];
  }

  try {
    const embeddedChunks: EmbeddedChunk[] = [];

    for (let startIndex = 0; startIndex < chunks.length; startIndex += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(startIndex, startIndex + EMBEDDING_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((chunk) => embedDocument(chunk)));

      embeddedChunks.push(
        ...batchResults.filter((result): result is EmbeddedChunk => result !== null),
      );

      if (startIndex + EMBEDDING_BATCH_SIZE < chunks.length) {
        await delay(EMBEDDING_BATCH_DELAY_MS);
      }
    }

    return embeddedChunks;
  } catch (error) {
    console.warn("[RAG] Failed to embed knowledge chunks.", error);
    return [];
  }
}
