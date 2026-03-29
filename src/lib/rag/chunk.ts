/**
 * Reads the GeoSight knowledge markdown files and turns them into retrieval chunks.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { RagChunk } from "./types";

const KNOWLEDGE_DIRECTORY = path.join(process.cwd(), "src", "lib", "rag", "knowledge");
const KNOWLEDGE_FILES = [
  "scoring-methodology.md",
  "profile-definitions.md",
  "data-sources.md",
  "geospatial-concepts.md",
  "agent-behaviors.md",
  "glossary.md",
] as const;
const MAX_CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

type MarkdownSection = {
  heading: string;
  content: string;
};

function slugifyHeading(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitIntoSections(markdown: string): MarkdownSection[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const sections = normalized.split(/^##\s+/m);

  if (sections.length === 1) {
    return [{ heading: "Overview", content: normalized }];
  }

  const [preamble, ...rest] = sections;
  const parsedSections: MarkdownSection[] = [];

  if (preamble.trim()) {
    parsedSections.push({
      heading: "Overview",
      content: preamble.trim(),
    });
  }

  for (const rawSection of rest) {
    const [rawHeading, ...contentLines] = rawSection.split("\n");
    const heading = rawHeading?.trim();
    const content = contentLines.join("\n").trim();

    if (!heading || !content) {
      continue;
    }

    parsedSections.push({ heading, content });
  }

  return parsedSections;
}

function splitLargeSection(source: string, section: MarkdownSection): RagChunk[] {
  const slug = slugifyHeading(section.heading) || "section";
  const content = section.content.trim();

  if (!content) {
    return [];
  }

  if (content.length <= MAX_CHUNK_SIZE) {
    return [
      {
        id: `${source}::${slug}`,
        source,
        heading: section.heading,
        content,
      },
    ];
  }

  const chunks: RagChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 1;

  while (startIndex < content.length) {
    const slice = content.slice(startIndex, startIndex + MAX_CHUNK_SIZE).trim();
    if (!slice) {
      break;
    }

    chunks.push({
      id: chunkIndex === 1 ? `${source}::${slug}` : `${source}::${slug}-${chunkIndex}`,
      source,
      heading: section.heading,
      content: slice,
    });

    if (startIndex + MAX_CHUNK_SIZE >= content.length) {
      break;
    }

    startIndex += MAX_CHUNK_SIZE - CHUNK_OVERLAP;
    chunkIndex += 1;
  }

  return chunks;
}

export function chunkMarkdown(filePath: string, source: string): RagChunk[] {
  const markdown = readFileSync(filePath, "utf8");
  const sections = splitIntoSections(markdown);

  return sections.flatMap((section) => splitLargeSection(source, section));
}

export function chunkAllKnowledge(): RagChunk[] {
  return KNOWLEDGE_FILES.flatMap((fileName) => {
    const filePath = path.join(KNOWLEDGE_DIRECTORY, fileName);
    const source = fileName.replace(/\.md$/i, "");
    return chunkMarkdown(filePath, source);
  });
}
