import { MissionRunPreset, WorkspaceCardId } from "@/types";

const PRESET_STORY_CARDS: Record<string, WorkspaceCardId[]> = {
  "competition-columbia": ["mission-run", "score", "compare", "source-awareness"],
  "competition-tokyo": ["mission-run", "score", "source-awareness", "results"],
  "competition-residential": ["mission-run", "score", "school-context", "source-awareness"],
};

export const MISSION_RUN_PRESETS: MissionRunPreset[] = [
  {
    id: "competition-columbia",
    title: "Columbia River infrastructure siting",
    profileId: "data-center",
    demoId: "pnw-cooling",
    locationQuery: "The Dalles, OR",
    missionObjective:
      "Shortlist Columbia River cooling candidates, explain the biggest tradeoffs, and recommend the strongest next site to defend in a judge demo.",
    summary:
      "A live-demo-first mission run for the original GeoSight infrastructure story: cooling, utilities, access, and trust signals around Columbia River siting.",
    steps: [
      {
        id: "screen",
        title: "Screen the current site",
        objective: "Establish whether the active Columbia River site is a strong first-pass candidate.",
        question:
          "Screen this Columbia River data-center site and give a first-pass siting read for cooling, water, power, access, and terrain. Keep it grounded in the provided geodata.",
      },
      {
        id: "tradeoffs",
        title: "Name the decisive tradeoffs",
        objective: "Explain what would make a skeptical judge trust or reject this site.",
        question:
          "Name the top tradeoffs for this site, separating direct live signals from derived or proxy reasoning. Be explicit about what still needs diligence.",
      },
      {
        id: "recommendation",
        title: "Recommend the next move",
        objective: "State the best recommendation and which GeoSight cards should be opened next.",
        question:
          "Give a concise recommendation for whether this Columbia River site should stay on the shortlist, and tell the operator what to inspect next inside GeoSight.",
      },
    ],
    successSignals: [
      "Clear shortlist language",
      "Trustworthy tradeoff framing",
      "Specific next cards to open",
    ],
    fallbackNarrative:
      "Even without the LLM layer, GeoSight can still explain why Columbia River cooling candidates rise or fall using live water, power, access, climate, and land-cover evidence.",
    recommendedCards: PRESET_STORY_CARDS["competition-columbia"],
  },
  {
    id: "competition-tokyo",
    title: "Tokyo global market scan",
    profileId: "commercial",
    demoId: "tokyo-commercial",
    locationQuery: "Tokyo, Japan",
    missionObjective:
      "Prove GeoSight works outside the Pacific Northwest by reading a Tokyo corridor through a commercial/logistics lens and clearly separating direct data from inference.",
    summary:
      "A global proof story built around Tokyo commercial context, access, and market activity without pretending that all US-only sources travel globally.",
    steps: [
      {
        id: "fit",
        title: "Define corridor fit",
        objective: "Explain what this Tokyo area appears best suited for.",
        question:
          "Using the commercial profile, explain what this Tokyo corridor seems best suited for and why, grounded in the current live data and mapped activity.",
      },
      {
        id: "evidence",
        title: "Separate direct versus inferred signals",
        objective: "Make GeoSight's trust model explicit for judges.",
        question:
          "Separate the direct live signals from the derived or proxy signals in this Tokyo commercial read. Do not overclaim unsupported demographics or school coverage.",
      },
      {
        id: "coverage",
        title: "Expose global limitations honestly",
        objective: "Demonstrate global-mindedness without pretending coverage is perfect.",
        question:
          "Explain the most important global data strengths and current coverage limits for this Tokyo commercial analysis, and say what GeoSight can still do well here today.",
      },
    ],
    successSignals: [
      "Shows global applicability",
      "Calls out unsupported coverage honestly",
      "Demonstrates trust-aware AI behavior",
    ],
    fallbackNarrative:
      "The Tokyo story still works in fallback mode because GeoSight can surface direct mapped access, activity, utilities, and land-cover evidence while openly labeling missing US-first datasets.",
    recommendedCards: PRESET_STORY_CARDS["competition-tokyo"],
  },
  {
    id: "competition-residential",
    title: "Washington residential due diligence",
    profileId: "residential",
    locationQuery: "Bellevue, WA",
    missionObjective:
      "Run an early residential due-diligence briefing that covers neighborhood fit, school context, access, and risk signals in a way that feels useful to everyday people and researchers.",
    summary:
      "A residential story designed to show everyday relevance, defensible school context, and early development-risk framing in Washington.",
    steps: [
      {
        id: "fit",
        title: "Assess neighborhood fit",
        objective: "Summarize whether this area looks promising for residential use.",
        question:
          "Assess this location for residential development or home-search style neighborhood fit, grounded in access, amenities, terrain, and land-cover context.",
      },
      {
        id: "schools",
        title: "Explain school context carefully",
        objective: "Show how GeoSight distinguishes official and derived school signals.",
        question:
          "Explain the school context here, clearly separating official Washington metrics from GeoSight's derived school-context score and coverage limitations.",
      },
      {
        id: "risk",
        title: "Flag early risks and next checks",
        objective: "Turn the assessment into a useful due-diligence next step.",
        question:
          "Flag the strongest early risk signals for this residential location and recommend the next GeoSight checks a buyer or planner should run.",
      },
    ],
    successSignals: [
      "Everyday usefulness",
      "Strong school-context trust story",
      "Actionable next steps",
    ],
    fallbackNarrative:
      "Washington residential due diligence remains useful in fallback mode because GeoSight still exposes school context, access, hazard proxies, and source provenance without inventing unsupported detail.",
    recommendedCards: PRESET_STORY_CARDS["competition-residential"],
  },
];

export const MISSION_RUN_PRESET_MAP = Object.fromEntries(
  MISSION_RUN_PRESETS.map((preset) => [preset.id, preset]),
) as Record<string, MissionRunPreset>;

export function getMissionRunPreset(presetId?: string | null) {
  if (!presetId) {
    return null;
  }

  return MISSION_RUN_PRESET_MAP[presetId] ?? null;
}
