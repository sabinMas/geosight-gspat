/**
 * Builds and caches the embedded GeoSight knowledge store for retrieval.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { chunkAllKnowledge } from "./chunk";
import { embedChunks } from "./embed";
import { EmbeddedChunk } from "./types";

const CACHE_PATH = path.join(process.cwd(), "src", "lib", "rag", "embeddings-cache.json");

let storeCache: EmbeddedChunk[] | null = null;
let storePromise: Promise<EmbeddedChunk[]> | null = null;

function isEmbeddedChunk(value: unknown): value is EmbeddedChunk {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EmbeddedChunk>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.heading === "string" &&
    typeof candidate.content === "string" &&
    Array.isArray(candidate.embedding) &&
    candidate.embedding.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

async function loadCachedStore(): Promise<EmbeddedChunk[] | null> {
  try {
    await access(CACHE_PATH);
  } catch {
    return null;
  }

  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((entry) => isEmbeddedChunk(entry))) {
      console.warn("[RAG] Embeddings cache is invalid and will be ignored.");
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("[RAG] Failed to load embeddings cache.", error);
    return null;
  }
}

export async function buildStore(): Promise<EmbeddedChunk[]> {
  const chunks = chunkAllKnowledge();
  const embeddedChunks = await embedChunks(chunks);

  if (!embeddedChunks.length) {
    console.warn("[RAG] Knowledge store build returned no embedded chunks.");
  }

  return embeddedChunks;
}

export async function getStore(): Promise<EmbeddedChunk[]> {
  if (storeCache) {
    return storeCache;
  }

  if (!storePromise) {
    console.warn("[RAG] Building knowledge store...");
    storePromise = (async () => {
      const cachedStore = await loadCachedStore();
      if (cachedStore?.length) {
        storeCache = cachedStore;
        return cachedStore;
      }

      const builtStore = await buildStore();
      storeCache = builtStore;
      return builtStore;
    })();
  }

  try {
    return await storePromise;
  } finally {
    if (storeCache) {
      storePromise = null;
    }
  }
}
