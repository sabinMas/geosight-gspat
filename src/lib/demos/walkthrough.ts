export type WalkthroughStep = {
  target: string;
  title: string;
  description: string;
};

export const LANDING_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    target: "landing-lenses",
    title: "Pick a Lens",
    description:
      "Each lens focuses the analysis on what matters for that decision — homes, sites, trips, or hazards.",
  },
  {
    target: "landing-search",
    title: "Enter a Location",
    description:
      "Type a city, address, or coordinates. The arrow button fills in your current location automatically.",
  },
  {
    target: "landing-pro",
    title: "Need the Full Workspace?",
    description:
      "Analysts can jump straight to the Pro workspace for layers, drawing tools, and side-by-side comparisons.",
  },
];

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    target: "lens-selector",
    title: "Choose Your Mission",
    description: "Select a lens to focus the analysis on what matters to you.",
  },
  {
    target: "search-bar",
    title: "Search Any Location",
    description: "Enter an address, landmark, or coordinates.",
  },
  {
    target: "globe",
    title: "Explore in 3D",
    description: "Click anywhere on the globe to analyze that location.",
  },
  {
    target: "score-card",
    title: "See Your Score",
    description: "Every location gets a mission-specific score based on 35+ data sources.",
  },
  {
    target: "drawing-tools",
    title: "Draw & Measure",
    description: "Mark areas of interest, measure distances, and export GeoJSON.",
  },
  {
    target: "card-library",
    title: "Deep Dive",
    description: "Open specialized cards for hazards, climate, infrastructure, and more.",
  },
];
