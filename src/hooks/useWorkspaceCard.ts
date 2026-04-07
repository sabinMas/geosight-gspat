import { useMemo } from "react";
import { WORKSPACE_CARD_REGISTRY } from "@/lib/workspace-cards";
import { WorkspaceCardDefinition, WorkspaceCardId } from "@/types";

/**
 * Returns the registry definition for a workspace card ID.
 * Cards can use this to surface their own metadata (questionAnswered,
 * regionCoverage, etc.) without coupling to the full registry import.
 */
export function useWorkspaceCard(cardId: WorkspaceCardId): WorkspaceCardDefinition | null {
  return useMemo(
    () => WORKSPACE_CARD_REGISTRY.find((c) => c.id === cardId) ?? null,
    [cardId],
  );
}
