"use client";

import { createContext, useContext } from "react";

interface CardDisplayContextValue {
  defaultCollapsed: boolean;
}

const CardDisplayContext = createContext<CardDisplayContextValue>({
  defaultCollapsed: false,
});

export const CardDisplayProvider = CardDisplayContext.Provider;

export function useCardDisplay() {
  return useContext(CardDisplayContext);
}
