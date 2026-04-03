---
name: GeoSight Component Design Status
description: Per-component design issues found during 2026-04-03 audit, with priority rankings
type: project
---

## ExploreWorkspace.tsx

- DONE: Description paragraph removed from header
- DONE: Feature-bullet chips grid removed from header
- DONE: "Choose your next view" section/card collapsed to bare button row
- DONE: All workspace notice strings trimmed to minimal form
- P1: Two separate mode hierarchies (AppMode + ShellMode) shown at same visual level in toolbar
- P2: "Current story context" demo banner is 4 layers of copy for a dismissible banner
- P2: Globe overlay buttons use Unicode ⊕ symbol and emoji car — replace with Lucide icons

## ActiveLocationCard.tsx

- DONE: Duplicate "Save site" button removed (kept in CardHeader only)
- DONE: Inner overview wrapper flattened from rounded/bordered surface to plain div
- DONE: CardTitle changed to locationName; eyebrow "Location summary" removed
- DONE: Description paragraph ("Ask what matters here...") removed from CardHeader
- DONE: overview.statusDetail paragraph removed — summary is sufficient
- DONE: border-neutral-200 dark:border-neutral-700 token bypass fixed to border-[color:var(--border-soft)]
- P2: coverageLabel chip and SourceStatusBadge list both appear twice (overview badges and provenance section)
- P2: Success-green "Strongest signals" box renders with placeholder copy during loading state

## AnalysisOverviewBanner.tsx

- DONE: CardTitle changed from sentence to {locationName}
- DONE: overview.statusDetail paragraph removed
- DONE: overview.nextSteps removed from expanded trust section — trustNotes only
- P1: Structurally duplicates ActiveLocationCard's three-column grid — should not both be visible at once
- P2: ⚠ Unicode character in data gaps banner — replace with Lucide AlertTriangle + aria-label
- P2: Success-green box renders with placeholder copy during loading state

## LandingPage.tsx

- DONE: h1 trimmed to "See any place clearly." — "in plain English" qualifier removed
- DONE: Hero subtitle paragraph removed
- DONE: Pro section description shortened
- DONE: Demos section h2 changed to "Guided demos"
- DONE: Demos section description paragraph removed
- P1: Three parallel onboarding flows on one screen (Explorer, Pro, Guided Demos)
- P2: Active state on use-case cards uses 4 simultaneous signals (border + bg + shadow + check) — reduce to 2
- P2: opacity-50 disable treatment on Step 2 causes low-contrast readability issue for placeholder
- P2: Duplicate eyebrow style variants — inline `text-xs uppercase tracking-widest` vs `.eyebrow` class

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

- DONE: Permanent source-disclosure box removed
- DONE: CardTitle and description paragraph removed
- DONE: Status chip text colour changed from foreground to muted-foreground; cursor-default select-none added
- P2: Two separate status chips still communicate one combined status — could consolidate further to single chip

## AnalysisTrendsPanel.tsx

- DONE: border-neutral-200 dark:border-neutral-700 token bypass fixed to border-[color:var(--border-soft)]
- DONE: Panel description (summaryText) and CardTitle removed
- DONE: StatePanel in unavailable section replaced with minimal inline `<p>` text
- DONE: StatePanel import removed (no longer used in file)

## ChatPanel.tsx

- DONE: Grounding block collapsed by default behind "View grounding sources" text toggle
- DONE: Orphaned "What's nearby?" hardcoded button removed
- DONE: CardTitle changed to "Ask"
- DONE: profile.name + resultsMode status line removed from CardHeader
- DONE: Textarea placeholder shortened to "Ask anything about this place…"

## Why: Full audit conducted 2026-04-03 across 11 primary UI files.
## How to apply: Use this as a checklist when working on any of these components. P1 items are bugs or usability blockers. P2 are high-impact improvements. P3 are polish.
