import type { AppMode, WorkspaceCardDefinition } from "@/types";

export function isExplorerMode(mode: AppMode): boolean {
  return mode === "explorer";
}

export function isProMode(mode: AppMode): boolean {
  return mode === "pro";
}

export function parseAppMode(param: string | null): AppMode {
  if (param === "pro") return "pro";
  return "explorer";
}

export function getVisibleCardsForMode(
  mode: AppMode,
  cards: WorkspaceCardDefinition[],
): WorkspaceCardDefinition[] {
  return cards.filter((card) => card.modeVisibility[mode]);
}

export function getAIStyleForMode(mode: AppMode): "explorer" | "pro" {
  return mode;
}

export const EXPLORER_SYSTEM_PROMPT_SUFFIX =
  " Keep your response short, practical, and in plain English — no technical jargon. Lead with the most useful thing to know, then 2-3 supporting points. Use a friendly, discovery-focused tone as if talking to someone exploring a place for the first time.";

export const PRO_SYSTEM_PROMPT_SUFFIX = "";
