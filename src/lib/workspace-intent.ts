import { WorkspaceCardDefinition, WorkspaceCardId } from "@/types";

export type WorkspaceIntent =
  | "reasoning"
  | "summary"
  | "trust"
  | "comparison"
  | "hazard"
  | "terrain"
  | "imagery"
  | "schools";

const SUMMARY_PATTERN =
  /\b(summary|summarize|overview|what stands out|headline|snapshot|key signals?)\b/i;
const TRUST_PATTERN =
  /\b(source|sources|trust|provenance|confidence|freshness|coverage|where did this come from)\b/i;
const COMPARISON_PATTERN = /\b(compare|comparison|versus|vs\.?|side by side|better than)\b/i;
const HAZARD_PATTERN = /\b(risk|hazard|fire|earthquake|flood|danger|resilience)\b/i;
const TERRAIN_PATTERN = /\b(terrain|slope|elevation|topography|grade|profile)\b/i;
const IMAGERY_PATTERN = /\b(image|imagery|photo|satellite|land cover|classification)\b/i;
const SCHOOL_PATTERN = /\b(school|district|student|education|ospi|nces)\b/i;

export function detectWorkspaceIntent(question: string): WorkspaceIntent {
  const normalized = question.trim();
  if (!normalized) {
    return "reasoning";
  }

  if (COMPARISON_PATTERN.test(normalized)) {
    return "comparison";
  }
  if (TRUST_PATTERN.test(normalized)) {
    return "trust";
  }
  if (HAZARD_PATTERN.test(normalized)) {
    return "hazard";
  }
  if (TERRAIN_PATTERN.test(normalized)) {
    return "terrain";
  }
  if (IMAGERY_PATTERN.test(normalized)) {
    return "imagery";
  }
  if (SCHOOL_PATTERN.test(normalized)) {
    return "schools";
  }
  if (SUMMARY_PATTERN.test(normalized)) {
    return "summary";
  }

  return "reasoning";
}

export function getPrimaryCardForIntent(intent: WorkspaceIntent): WorkspaceCardId {
  switch (intent) {
    case "summary":
      return "results";
    default:
      return "chat";
  }
}

export function getSuggestedCardIdForIntent(intent: WorkspaceIntent): WorkspaceCardId | null {
  switch (intent) {
    case "trust":
      return "source-awareness";
    case "comparison":
      return "compare";
    case "hazard":
      return "hazard-context";
    case "terrain":
      return "terrain-viewer";
    case "imagery":
      return "land-classifier";
    case "schools":
      return "school-context";
    default:
      return "score";
  }
}

export function getSuggestedCardsForShell(args: {
  cards: WorkspaceCardDefinition[];
  intent: WorkspaceIntent | null;
  geodataReady: boolean;
  hasComparison: boolean;
  hasImagery: boolean;
}) {
  const { cards, geodataReady, hasComparison, hasImagery, intent } = args;
  const suggestions: WorkspaceCardDefinition[] = [];

  if (intent) {
    const intentCardId = getSuggestedCardIdForIntent(intent);
    const intentCard = cards.find((card) => card.id === intentCardId);

    if (
      intentCard &&
      (intentCard.id !== "compare" || hasComparison) &&
      (intentCard.id !== "land-classifier" || hasImagery)
    ) {
      suggestions.push(intentCard);
    }
  }

  if (geodataReady) {
    for (const cardId of ["score", "source-awareness", "hazard-context"] as const) {
      if (
        (cardId === "hazard-context" && !geodataReady) ||
        suggestions.some((candidate) => candidate.id === cardId)
      ) {
        continue;
      }

      const card = cards.find((candidate) => candidate.id === cardId);
      if (card) {
        suggestions.push(card);
      }
    }
  }

  return suggestions.slice(0, 4);
}
