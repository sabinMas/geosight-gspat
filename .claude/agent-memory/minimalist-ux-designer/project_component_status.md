---
name: GeoSight Component Design Status
description: Per-component design issues found during 2026-04-03 audit, with priority rankings
type: project
---

## ExploreWorkspace.tsx

- P1: Header section (lines 277–399) is a marketing block — remove h1, description, and feature-bullet chips
- P1: Two separate mode hierarchies (AppMode + ShellMode) shown at same visual level in toolbar
- P2: "Current story context" demo banner is 4 layers of copy for a dismissible banner
- P2: Globe overlay buttons use Unicode ⊕ symbol and emoji car — replace with Lucide icons
- P2: "Choose your next view" card is a third heading area below the globe — flatten into the toolbar

## ActiveLocationCard.tsx

- P1: "Save site" button rendered twice simultaneously (CardHeader line 223, overview panel line 268)
- P1: 5-level card nesting exceeds 4-level surface token hierarchy
- P1: border-neutral-200 dark:border-neutral-700 token bypass (line 74) — fix to border-[color:var(--border-soft)]
- P2: coverageLabel chip and SourceStatusBadge list both appear twice (lines 248-254 and 427-462)
- P2: Success-green "Strongest signals" box renders with placeholder copy during loading state
- P3: Eyebrow "Location summary" + CardTitle "Active location" — CardTitle should be the location name

## AnalysisOverviewBanner.tsx

- P1: Structurally duplicates ActiveLocationCard's three-column grid — should not both be visible at once
- P2: CardTitle "What GeoSight is seeing in {locationName}" is a sentence, not a heading — use location name only
- P2: ⚠ Unicode character in data gaps banner (line 154) — replace with Lucide AlertTriangle + aria-label
- P2: Success-green box renders with placeholder copy during loading state (same as ActiveLocationCard)

## LandingPage.tsx

- P1: Three parallel onboarding flows on one screen (Explorer, Pro, Guided Demos)
- P2: Active state on use-case cards uses 4 simultaneous signals (border + bg + shadow + check) — reduce to 2
- P2: opacity-50 disable treatment on Step 2 causes low-contrast readability issue for placeholder
- P2: Duplicate eyebrow style variants — inline `text-xs uppercase tracking-widest` vs `.eyebrow` class
- P3: Demo section heading "Three strong stories, kept secondary to the main flow" is internal design rationale

## Sidebar.tsx

- P2: Subtitle "Lens · Regions · Theme" (line 31) repeats the Card titles immediately below it — remove
- P2: Coordinate display in quick-region buttons (line 89) is noise for most users — remove or tooltip-only
- P3: Card-in-aside nesting (Card inside aside with glass-panel) adds a surface level

## ProfileSelector.tsx

- P1: text-[9px] tagline in sidebar carousel (line 139) is below legibility minimum — remove
- P2: Scroll progress bar uses bg-[var(--accent)] — looks interactive, should use --accent-strong or --border-strong

## ResultsModeToggle.tsx

- P2: Uses full Button components for a binary toggle — inconsistent with pill-group pattern used elsewhere
- P3: MODES array `detail` strings are defined but never rendered — dead copy, should be removed

## NearbyPlacesList.tsx

- P1: Permanent source-disclosure box (lines 64–67) is always visible even when results are populated — remove
- P2: Two separate status chips communicate one combined status — consolidate to single chip

## AnalysisTrendsPanel.tsx

- P1: border-neutral-200 dark:border-neutral-700 token bypass (line 33) — same bug as ActiveLocationCard
- P2: Panel description renders text summary of the grid values above the grid that already shows them — remove

## ChatPanel.tsx

- P1: 7 content sections render before the message thread — suggested questions and grounding boxes should default collapsed
- P2: Orphaned "What's nearby?" hardcoded button (lines 471–478) between thread and compose form — move into starter prompts array
- P2: CardTitle "Ask a question about this place" duplicates textarea placeholder — cut to "Ask"
- P3: profile.name + resultsMode line (344–346) is unactionable status metadata — move into grounding section

## Why: Full audit conducted 2026-04-03 across 11 primary UI files.
## How to apply: Use this as a checklist when working on any of these components. P1 items are bugs or usability blockers. P2 are high-impact improvements. P3 are polish.
