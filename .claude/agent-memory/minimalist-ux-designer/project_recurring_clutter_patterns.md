---
name: GeoSight Recurring Clutter Patterns
description: Anti-patterns that appear repeatedly across multiple components — use this to identify systemic issues vs one-off fixes
type: project
---

## Pattern 1: Card-in-card-in-card nesting

Components regularly exceed the 4-level surface token hierarchy. `ActiveLocationCard` reaches 5 levels: Card > CardContent > rounded surface > grid > colored sub-card. This adds visual weight without adding hierarchy clarity.

**Threshold to flag:** Any component with more than 3 bordered, background-differentiated surfaces nested inside each other.

## Pattern 2: Marketing copy inside the app shell

`ExploreWorkspace` has a full `<h1>` and description paragraph that describe the mode the user already chose. `LandingPage` guided demos section has a heading that reads like internal design rationale ("Three strong stories, kept secondary to the main flow"). Copy that explains "what this section does" belongs in onboarding, not repeated on every load.

**Rule:** Section headings should name the data/content, not explain the design intent.

## Pattern 3: Duplicate primary actions

`ActiveLocationCard` renders "Save site" in `CardHeader` and again inside a nested `CardContent` panel — both always visible simultaneously. When reviewing any component with a primary CTA, check for duplicate renders.

## Pattern 4: Permanent disclaimers above results

`NearbyPlacesList` has a fixed source-disclosure box that stays visible even when live results are showing. `ChatPanel` has "Current grounding" and "Suggested questions" boxes that render before the message thread. Content that explains what the section will do should only appear in the absence of data (empty state), not as a persistent header above populated results.

## Pattern 5: Summary text above the summary

`AnalysisTrendsPanel` generates a text summary of its first 3 trend cards and renders it as the card description above the grid. The grid already shows that information visually. Avoid text summaries of the visual content sitting directly above that content.

## Pattern 6: Token bypass — hard-coded border neutrals

`LocationSignalCard` (ActiveLocationCard.tsx line 74) and `TrendSignalCard` (AnalysisTrendsPanel.tsx line 33) both use `border-neutral-200 dark:border-neutral-700` instead of `border-[color:var(--border-soft)]`. This is a copy-paste error. Affects light mode most visibly (neutral-200 is grey, --border-soft is blue-tinted).

## Pattern 7: Dual mode hierarchies at same visual level

The workspace header shows both `ModeSwitcher` (Explorer/Pro toggle) and the Guided/Board/Library/Compare pill group side by side. These are different levels of mode hierarchy (app mode vs shell mode) but appear at equal visual weight with no relationship indicated between them.

## Pattern 8: Overly verbose empty-state copy inside colored semantic boxes

The "Strongest signals" success-green box shows placeholder text while loading: "GeoSight will list the strongest verified signals here once the live bundle is ready." This puts a green (success-colored) box on screen before any success data exists. Empty state boxes should use neutral surface tokens until data is confirmed.

## Pattern 9: Missing min-w-0 / overflow-hidden on flex children with large text

Across multiple card components, large-value display divs (`text-3xl`, `text-4xl`) inside flex children lack `min-w-0` and `overflow-hidden`/`break-words`. The specific pattern: a flex container with a score/value on the left and a badge/button on the right — if the value string is long (currency, AQI, compound words) it will push the right element out of the card. Affected files as of 2026-04-13 (all fixed): AnalysisTrendsPanel (TrendSignalCard), HousingMarketPulse (MarketStat), MultiHazardResilienceCard, LocalAccessCard, ScoreCard factor rows.

**Rule:** Any `text-2xl` or larger inside a flex child must have `min-w-0 break-words` on its immediate container. If the value can be arbitrarily long (user location names, financial data), also add `overflow-hidden` to the card.

## Pattern 10: Flex rows with long place/location names missing min-w-0 + truncate on the left child

`NearbyPlacesList` place rows use `flex items-start justify-between` — the left column holding the place name had no `min-w-0`, and the right column (distance) had no `shrink-0`. Long OSM place names would push the distance readout off-screen or cause overflow. The fix is `min-w-0 + truncate` on the left, `shrink-0` on the right.

**Rule:** Every `flex justify-between` row holding user-facing strings must have `min-w-0` + appropriate truncation on the text child and `shrink-0` on the badge/action child.

## Why: Pattern 9 and 10 identified during text overflow audit on 2026-04-13.
## How to apply: Before proposing changes, check whether the issue is a one-off or one of these patterns. Systemic patterns need architectural decisions, not line-by-line patches.
