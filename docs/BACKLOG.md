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

Last updated: 2026-04-06 — Batch 6 shipped: (1) per-shape deletion — each drawn shape chip has an X button wired to `removeDrawnShape(id)` in `useExploreState`; (2) `WorkspaceCardShell` standardises Card/CardHeader/CardContent/loading/error/empty across all workspace cards — BroadbandCard, GroundwaterCard, ClimateHistoryCard, FloodRiskCard, AirQualityCard, ContaminationRiskCard all migrated; (3) multi-board tabs — `activeBoardId` tracked in localStorage, board chips are click-to-switch tabs with ring highlight, "Update active" saves current state, inline Pencil rename; (4) domain coverage matrix in SourceAwarenessCard showing integrated providers per domain with regional status; (5) snap-to-vertex in drawing tools (16px screen-space radius, white ring indicator); (6) Eurostat NUTS2 demographics — GISCO reverse geocode resolves NUTS2 region code for European coordinates; `fetchEurostatDemographics` tries `demo_pjan` at NUTS2 level before falling back to country level; `geographicGranularity: "nuts2_region"` propagated through to DemographicsCard label.

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
- **Current implementation**: GeoAnalyst powers mission-aware analysis; GeoScribe generates structured site assessment reports in-product. Both ChatPanel and GeoScribeReportPanel now stream — content renders as chunks arrive with a blinking accent cursor; no blocking wait for full response.

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

### AnalysisOverviewBanner deduplication

- **User question**: Why does the user see the same strength/tradeoff grid twice when a detail card is open?
- **Current implementation**: `compact` prop removed entirely; dead code stripped; data gaps now surface as an inline info pill in the compact header. Signal grid lives only in `ActiveLocationCard`.

### Inline trust provenance + badge token alignment

- **User question**: Can users tell who produced a signal and how trustworthy it is without opening a separate panel?
- **Current implementation**: `source.provider` (e.g. "USGS", "Open-Meteo") renders inline in every `TrendSignalCard` and `LocationSignalCard`. `getSourceStatusTone()` uses CSS design tokens (`--success-border/soft`, `--warning-border/soft/foreground`, `--danger-border/soft/foreground`) instead of raw Tailwind palette values. `evidenceTag()` in `analysis-summary.ts` appends `· direct live / · derived live / · proxy heuristic` to each strength and watchout item. `limited` is visually distinct from `unavailable` — warning-amber vs danger-red.

### QGIS-style drawing tools

- **User question**: Can users draw on the map, measure distances, and define custom areas — in a way that doesn't require GIS expertise?
- **Current implementation**: Four tools in `DrawingToolbar`: Draw area (polygon), Drop pin (marker), Measure distance, Radius circle. Inline editable pin labels. GeoJSON export. Undo/redo stack (`addDrawnShape` / `undoDrawing` / `redoDrawing` in `useExploreState`). Vertex drag-editing: white handle entities per vertex (polygon + measure), ScreenSpaceEventHandler drag, `updateDrawnShapeVertex` in `useExploreState`. Normal globe click-to-analyze gated on `drawingTool === "none"`.

### Deployment hardening

- **User question**: Is GeoSight production-ready for national traffic with proper error monitoring, metadata, and mobile support?
- **Current implementation**: Dynamic OG image via `ImageResponse` edge function; Sentry error monitoring wired with `withSentryConfig`; `robots.txt` + dynamic `sitemap.ts`; Groq SDK calls capped at 25s with `AbortSignal.timeout`; mobile layout pass (globe 320px min, header collapses, mode buttons scroll, drive/3D controls hidden on xs); geocode route rate-limited.

### Backend persistence + auth

- **User question**: Can users save sites and have them sync across devices without requiring a backend database?
- **Current implementation**: Optional Auth.js v5 OAuth (Google + GitHub) with JWT sessions (no DB). Upstash Redis stores `StoredSite[]` (geodata stripped) keyed by `gs:user:{email}:sites`. `useSavedSites` fetches cloud sites on sign-in (cloud wins) and fires-and-forgets `PUT /api/user-data` on every mutation. `AuthButton` in workspace header. Gracefully degrades to localStorage-only when not signed in or Upstash not configured. Redis also caches full geodata bundles for 1 hour (`gs:geodata:{lat}:{lng}`) — repeated hits return with `X-Cache: HIT` and skip all provider calls.

## Current Gaps

### ~~Inline provenance is not universal yet~~ — fully shipped

- ~~Source-awareness signals~~ — shipped: provider name inline in TrendSignalCard and LocationSignalCard; badge colors token-aligned.
- ~~Chat/report provenance~~ — shipped: all 17 `buildSupportedFacts` lines now carry `(provider, evidence kind)` tags; GeoScribe prompt updated to use `direct live / derived live / proxy heuristic` vocabulary.
- ~~Strengths/watchouts provenance~~ — shipped: `evidenceTag()` appends `· direct live / · derived live / · proxy heuristic` to each item; `buildSummaryFromScore` tags top factors in prose.
- GeoAnalyst free-form responses: system prompt already instructs explicit tier distinction; runtime enforcement is not feasible beyond prompt guidance.

### Hazard stack is still early

- ~~No compound risk scoring~~ — shipped: `MultiHazardResilienceCard` with 6-domain compound score (`buildHazardResilienceSummary`).
- ~~Research-grade parameters~~ — shipped: `HazardDetailsCard` with raw seismic ASCE 7-22 values, 30-day earthquake history, FEMA flood zone, NASA FIRMS fire counts, GDACS alert list, and air quality readings. Visible in pro data-center mode.

### Regional provider switching is scaffolded more than fully operational

- The source registry knows about regional candidates, but most non-US alternatives are still cataloged rather than actively wired into live routes.

### User-authored dashboard composition is still limited

- ~~Named saved workspaces~~ — shipped: inline name input + restore/delete chip UI in `WorkspaceBoard.tsx`; layouts persist in localStorage.
- ~~Drag-and-drop card reordering~~ — shipped: HTML5 drag API on board chip row, `GripVertical` handle, order written to `globalOrder` in localStorage.
- ~~Multi-board composition~~ — **shipped**: `activeBoardId` tracked in localStorage; board chips are click-to-switch tabs with `ring-2 ring-[var(--accent)]` highlight; "Update active" saves current card set to the active board; inline Pencil rename via `onRenameBoard`.

### Proxy-heavy factors still need stronger direct replacements

- Commercial demand, land-cost indicators, remoteness, and similar factors still rely on proxy heuristics even though labeled honestly in the UI.

### Global coverage is still uneven by domain

- Broadband, flood zones, EPA screening, groundwater, soil profile, seismic design values, and school intelligence remain mostly US-first.

### Drive mode lacks terrain elevation snapping

- ~~Fixed-altitude fallback~~ — shipped: `sampleTerrainMostDetailed` async sampler fires every 12 frames; `cachedTerrainH` used as fallback when GPU tile cache misses; last resort holds current altitude instead of snapping to sea level.
- ~~Terrain collision~~ — shipped: hard-floor clamp (`height = Math.max(height, terrainH + VEHICLE_CLEARANCE)`) + urgent async sample when height delta >15m.

### Drawing tools lack snap-to-grid

- ~~Banner/card grid duplication~~ — **shipped**: `compact` prop removed entirely; dead code stripped; data gaps now surface as an inline info pill in the compact header.
- ~~Vertex drag-editing~~ — **shipped**: white handle entities, ScreenSpaceEventHandler drag, `updateDrawnShapeVertex` in state.
- ~~GeoJSON export~~ — **shipped**.
- ~~Undo/redo~~ — **shipped**.
- ~~Snap-to-existing-vertices~~ — **shipped**: `findSnapTarget` in `useGlobeDrawing` projects vertex positions to screen space via `cartesianToCanvasCoordinates`, snaps within 16px; white ring snap indicator via `CallbackProperty`; polygon and measure tools use snap-first pattern.
- ~~Per-shape deletion~~ — **shipped**: X button on each shape chip in `DrawingToolbar` calls `onDeleteShape(id)` → `removeDrawnShape` in `useExploreState`.

## Next Highest-Value Milestones

### P0: Trust + Wow

- Richer live hazard and resilience layers
- ~~Inline provenance in headline outputs~~ — **shipped**: provider name now inline in TrendSignalCard and LocationSignalCard; badge colors use design tokens
- ~~Standardized provenance labeling~~ — **shipped**: `direct live` / `derived live` / `proxy heuristic` now in score cards, trend signals, all `buildSupportedFacts` lines, GeoScribe prompt, and GeoAnalyst prompt.

### P1: Card Platform

- Formal universal card contract
- ~~Saved named dashboard layouts~~ — **shipped**: inline name + restore/delete in `WorkspaceBoard.tsx`; cloud sync via `useSavedSites` + Redis when signed in
- ~~Drag-and-drop card reordering in board mode~~ — **shipped**: HTML5 drag API on board chip row, `GripVertical` handle, `ring-2 ring-accent` on drag target, order written to `globalOrder` in localStorage

### P1: Global Coverage

- ~~Eurostat NUTS2 demographics~~ — **shipped**: GISCO reverse geocode resolves NUTS2 region code for European coordinates; `fetchEurostatDemographics` tries `demo_pjan` at NUTS2 level before falling back to country level; `geographicGranularity: "nuts2_region"` shown in DemographicsCard as "Regional (NUTS2)".
- ~~Domain coverage matrix~~ — **shipped**: `SourceAwarenessCard` now includes a grid showing integrated providers per domain with live/limited/unavailable status derived from `SOURCE_PROVIDER_REGISTRY`.
- ~~WorkspaceCardShell~~ — **shipped**: standard `WorkspaceCardShell` component wraps Card/CardHeader/CardContent with built-in loading/error/empty states; BroadbandCard, GroundwaterCard, ClimateHistoryCard, FloodRiskCard, AirQualityCard, ContaminationRiskCard all migrated.
- Live non-US provider integrations (flood, soil, seismic, school beyond Eurostat)
- Regional provider selection in reasoning and UI

### P1: High-Value Domain Expansion

- ~~Travel and trip-planning cards~~ — **shipped**: `TripSummaryCard` overhauled (structured conditions + amenity chips); `LocalAccessCard` added (derived walkability proxy score, 4-domain breakdown, OSM-sourced)
- ~~Development and infrastructure card families~~ — **shipped**: `SiteReadinessCard` (6-signal go/caution/risk screen: road, power, broadband, flood, soil, seismic) + `InfrastructureAccessCard` (raw proximity measurements, no thresholds). Both wired for site-development and data-center pro mode.
- Research-grade hazard and resilience cards

### P2: Advanced Spatial Tools

- ~~Polygon drawing~~ — **shipped**: Draw area, Drop pin, Measure distance, Radius circle tools live on the globe (`DrawingToolbar`, `useGlobeDrawing`, `useGlobeDrawnShapes`)
- ~~Named pin labels~~ — **shipped**: inline editable label editor per marker in `DrawingToolbar`
- ~~GeoJSON export~~ — **shipped**: Export button downloads `geosight-shapes.geojson` with correct geometry types
- ~~Undo/redo stack~~ — **shipped**: `addDrawnShape` / `undoDrawing` / `redoDrawing` in `useExploreState`; Undo/Redo buttons in toolbar
- ~~Vertex drag-editing~~ — **shipped**: white handle entities per vertex (polygon + measure), ScreenSpaceEventHandler drag interaction, `updateDrawnShapeVertex` in `useExploreState`.
- Remaining drawing gaps: snap-to-grid
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
