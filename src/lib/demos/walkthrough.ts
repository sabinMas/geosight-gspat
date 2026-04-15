export type WalkthroughStep = {
  target: string;
  title: string;
  description: string;
};

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
