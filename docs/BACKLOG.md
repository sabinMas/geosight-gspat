# GeoSight Backlog

This document is the living roadmap source of truth for GeoSight. It is grounded in the current repository state and organized around three buckets:

- **Shipped foundation**: capabilities that are already live
- **Current gaps**: visible weaknesses or partial systems
- **Next highest-value milestones**: work that most directly improves trust, usefulness, or user value

Priority lens: `user-value-first`

## Validation Basis

This backlog was reconciled against:

- `README.md`
- `agents.md`
- `CLAUDE.md`
- `src/app/api/geodata/route.ts`
- `src/lib/profiles.ts`
- `src/lib/scoring.ts`
- `src/lib/scoring-methodology.ts`
- `src/lib/workspace-cards.ts`
- `src/lib/source-registry.ts`
- `src/lib/demos/registry.ts`
- `src/lib/agents/agent-config.ts`

Last updated: 2026-04-03 — post Userbrain rounds 1 & 2, minimalist UX audits (3 passes), drive mode camera, and lens overflow fixes.

## Shipped Foundation

### Core product shell

- **User question**: Can a user open GeoSight, choose a use case, search a place, and explore it on a live 3D globe?
- **Current implementation**: Next.js App Router app with a landing page, routed explore workspace, Cesium/Resium globe, demo entry paths, search, coordinate entry, and current-location flows.

### Mission architecture

- **User question**: Can the same place be evaluated through different mission lenses instead of a single demo-only workflow?
- **Current implementation**: Four wired mission profiles: data center, hiking, residential, and commercial. The landing page also exposes a General Exploration entry that is honestly labeled as using the residential lens today.

### Live geodata and trust stack

- **User question**: Can GeoSight assemble a meaningful live location bundle and explain where it came from?
- **Current implementation**: `api/geodata` now aggregates elevation, infrastructure, amenities, climate, demographics, hazards, school context, broadband, flood zones, stream gauges, groundwater wells, soil profile, seismic design values, climate history, air quality, contamination screening, and derived land classification, plus source metadata and registry-aware notes.

### Scoring, evidence, and comparison

- **User question**: Can users compare places and understand why one site scores better than another?
- **Current implementation**: Deterministic scoring engine, methodology notes, factor evidence labels, saved sites, and comparison table.

### Card and board substrate

- **User question**: Can the workspace feel configurable and card-based instead of like a fixed stack of panels?
- **Current implementation**: Registry-driven workspace cards with profile defaults, board and library behavior, local persistence, and card metadata such as question answered, region coverage, failure mode, and next actions.

### Agent and report layer

- **User question**: Can GeoSight produce both conversational analysis and a structured written deliverable from the same live context?
- **Current implementation**: GeoAnalyst powers mission-aware analysis; GeoScribe generates structured site assessment reports in-product.

### Demo hardening

- **User question**: Can the product tell a strong live story and still stay demo-safe when providers are slow?
- **Current implementation**: Demo registry, fallback screenshot fields, and a dismissible live-loading banner for slower demo loads.

### Userbrain UX round 1 & 2

- **User question**: Can first-time users correctly read unavailable signals, find the search bar and compare feature, see nearby context prominently, and avoid clicking static labels?
- **Current implementation**: Five confirmed issues fixed across 9 files. Unavailable data now filtered from strengths/watchouts into a collapsible `dataGaps` row. Search is always visible (dimmed until a lens is chosen) with STEP 1 / STEP 2 labels. Default results tab changed to Nearby. Compare button added to workspace. Static labels (`confidenceLabel`, `coverageLabel`, mode badges) marked `cursor-default pointer-events-none select-none`. Source: `src/lib/analysis-summary.ts`, `AnalysisOverviewBanner.tsx`, `ActiveLocationCard.tsx`, `LandingPage.tsx`, `ExploreWorkspace.tsx`, `NearbyPlacesList.tsx`.

### Minimalist UX audit (three passes)

- **User question**: Does the interface feel calm and focused or cluttered and noisy?
- **Current implementation**: Three full audits against minimalist principles across all major surfaces.
  - Pass 1 & 2: Hero subtitle removed, step labels added to landing, "Trust and next steps" collapsed by default, grounding sources panel collapsed, card header boilerplate descriptions removed, heading density reduced (`text-[11px]` → `text-xs`), trend signals in responsive 2/3/4-col grid, OSM boilerplate removed from NearbyPlacesList, ChatPanel title shortened.
  - Pass 3: Duplicate "Lens" sidebar heading removed; duplicate "Guided demos" eyebrow removed; NearbyPlacesList eyebrow "Discovery board" → "Nearby places"; AnalysisTrendsPanel eyebrow "Analysis board" → "Data signals"; ChatPanel location name promoted into CardTitle, grounding toggle elevated to pill button; board empty state collapsed to a single centered button; emoji icons (🚗, ⊕) replaced with Lucide `Car`/`Globe`/`Plus`; ActiveLocationCard toggle copy simplified.

### 3D drive mode

- **User question**: Can a user drive across the terrain in first-person view with W/up moving forward?
- **Current implementation**: Drive mode added to `CesiumGlobe.tsx`. Camera placed behind the vehicle using Cesium's `HeadingPitchRange` (heading=0 is south-of-target in Cesium, so no `+Math.PI` offset needed). Vehicle orientation corrected with `heading - Math.PI / 2` to align the box long-axis with the direction of travel.

### Lens carousel overflow fix

- **User question**: Can the lens profile selector fit cleanly inside the sidebar card without overflowing?
- **Current implementation**: Removed hardcoded `style={{ width: "271px" }}` from the carousel container in `ProfileSelector.tsx`. Replaced with `w-full`. Added `overflow-hidden` to the Lens card in `Sidebar.tsx`. The carousel now adapts to the ~200px content area inside the 280px sidebar.

## Current Gaps

### Inline provenance is not universal yet

- Source-awareness is strong at the signal and source-awareness-panel level. Headline analysis text in `AnalysisOverviewBanner` and AI/report outputs still do not consistently surface provider name, freshness, and confidence inline.

### Hazard stack is still early

- GeoSight has earthquakes, fire detections, FEMA flood zones, and weather risk summary, but not yet a mature multi-hazard resilience stack. No compound risk scoring across domains.

### Regional provider switching is scaffolded more than fully operational

- The source registry knows about regional candidates, but most non-US alternatives are still cataloged rather than actively wired into live routes.

### User-authored dashboard composition is still limited

- Registry-driven cards and local persistence exist. No named saved workspaces, drag-and-drop layout editing, or multi-board composition flows yet.

### Proxy-heavy factors still need stronger direct replacements

- Commercial demand, land-cost indicators, remoteness, and similar factors still rely on proxy heuristics even though labeled honestly in the UI.

### Global coverage is still uneven by domain

- Broadband, flood zones, EPA screening, groundwater, soil profile, seismic design values, and school intelligence remain mostly US-first.

### Drive mode lacks full terrain interaction

- Drive mode moves across the Cesium terrain visually, but the vehicle does not yet snap to the actual terrain elevation — it moves at a fixed altitude reference.

## Next Highest-Value Milestones

### P0: Trust + Wow

- Richer live hazard and resilience layers
- Inline provenance in headline outputs
- Standardized `direct live` / `derived live` / `proxy heuristic` language across score, cards, chat, and reports

### P1: Card Platform

- Formal universal card contract
- Saved dashboard layouts and multi-workspace composition

### P1: Global Coverage

- Live non-US provider integrations
- Regional provider selection in reasoning and UI

### P1: High-Value Domain Expansion

- Travel and trip-planning cards
- Development and infrastructure card families
- Research-grade hazard and resilience cards

### P2: Advanced Spatial Tools

- Polygon drawing and spatial editing
- LiDAR and National Map layers
- Deeper subsurface and geology overlays
- Stronger export and share workflows beyond the current GeoScribe panel

## Definition Of Ready For New Backlog Items

Before adding a new item to this backlog, capture:

- the exact user question
- the live or derived source
- region coverage
- freshness and update cadence
- failure states
- confidence communication
- whether it can become a reusable card
- why it helps GeoSight stand out
