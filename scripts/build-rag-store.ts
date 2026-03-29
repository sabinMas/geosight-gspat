/**
 * Precomputes Gemini embeddings for the GeoSight knowledge base and writes a local cache file.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { chunkAllKnowledge } from "../src/lib/rag/chunk";
import { embedChunks } from "../src/lib/rag/embed";

const CACHE_PATH = path.join(process.cwd(), "src", "lib", "rag", "embeddings-cache.json");

async function main() {
  loadEnvConfig(process.cwd());

  const chunks = chunkAllKnowledge();
  const embeddedChunks = await embedChunks(chunks);

  if (!embeddedChunks.length || embeddedChunks.length !== chunks.length) {
    console.error(
      `[RAG] Failed to build a complete embeddings cache (${embeddedChunks.length}/${chunks.length} chunks embedded).`,
    );
    process.exitCode = 1;
    return;
  }

  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(embeddedChunks, null, 2)}\n`, "utf8");
  console.log(`[RAG] Wrote ${embeddedChunks.length} embedded chunks to ${CACHE_PATH}.`);
}

main().catch((error) => {
  console.error("[RAG] Unexpected failure while building the embeddings cache.", error);
  process.exitCode = 1;
});
