"use client";

import { createContext, useContext } from "react";
import { ExploreInitState } from "@/types";

const ExploreInitContext = createContext<ExploreInitState>({
  entrySource: "direct",
});

export function ExploreProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: ExploreInitState;
}) {
  return (
    <ExploreInitContext.Provider value={initialState}>
      {children}
    </ExploreInitContext.Provider>
  );
}

export function useExploreInit() {
  return useContext(ExploreInitContext);
}
