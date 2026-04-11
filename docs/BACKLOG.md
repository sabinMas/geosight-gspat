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

Last updated: 2026-04-10 - Batch 19 shipped: **Production build hardening for the GIS workbench batch** - Vercel production deploy failure after commit `76f9d4b` was fixed and pushed in `2200dcb`; `src/components/Explore/WorkspaceCommandPalette.tsx` fixed the `react/no-unescaped-entities` empty-state lint error; `src/components/agent-panel/AgentChat.tsx` stabilized queued auto-submit/send flow with callback-safe ordering so lint and production build pass; warning cleanup landed in `src/components/Explore/ExploreWorkspace.tsx`, `src/components/Explore/WorkspaceCardShell.tsx`, `src/components/Globe/MapCallout.tsx`, `src/components/Shell/ProfileSelector.tsx`, `src/hooks/useExploreState.ts`, and `src/lib/overpass.ts`; release rule now confirmed: always run `npm run build` locally before pushing because Vercel runs lint during `next build`.

Last updated: 2026-04-10 - Batch 18 shipped: **GIS analyst workbench + capture/export workflow** - the explore shell now reads as a tool-first spatial workbench rather than a dashboard: `src/components/Explore/WorkspaceToolRail.tsx` adds a left analyst tool rail, `src/components/Explore/PersistentAiBar.tsx` adds an always-available AI prompt bar, and `src/components/Explore/WorkspaceCommandPalette.tsx` adds `Cmd/Ctrl+K` command access; `src/components/Explore/TopographicCaptureOverlay.tsx`, `src/components/Globe/CesiumGlobe.tsx`, and `src/hooks/useGlobeDrawing.ts` added analyst-ready capture mode with figure title/subtitle, scale reference, north reference, active-layer legend, AOI emphasis, and capture-safe globe rendering; `src/lib/analysis-export.ts` now produces structured analyst handoff artifacts including polygonized GeoJSON for drawn circles, analysis-table ZIP exports, and an analyst bundle containing `manifest.json`, `drawn-shapes.geojson`, `site-summary.csv`, `quick-regions.csv`, `drawn-shapes.csv`, and `topographic-capture.png`; supporting shell language and evidence-tray framing were updated across `src/components/Explore/ExploreWorkspace.tsx`, `src/components/Explore/AddViewTray.tsx`, `src/components/Explore/WorkspaceBoard.tsx`, `src/components/Explore/WorkspaceLibrary.tsx`, and `src/app/api/agents/[agentId]/route.ts`.

Last updated: 2026-04-09 — Batch 17 shipped: **SolarResourceCard** — new workspace card at `src/components/Explore/SolarResourceCard.tsx`; new data source `src/lib/solar-resource.ts` fetching NASA POWER climatology API (free, global, no API key); fetches `ALLSKY_SFC_SW_DWN` (GHI), `CLRSKY_SFC_SW_DWN` (clear-sky GHI), `ALLSKY_KT` (clearness index) for any global coordinate; 22-year averages (2001–2022) cached 7 days; 4-tier solar classification: Excellent(≥5.5 kWh/m²/day), Good(≥4.0), Moderate(≥2.5), Poor(<2.5); renders: tier badge with Sun icon in `headerExtra`, 3-col stat row (annual GHI, peak sun hours, clearness %), monthly GHI bar chart (Recharts, accent fill) with best/worst month callout, cloud-impact panel with actual/clear-sky ratio progress bar; `SolarResourceResult` type added to `src/types/index.ts`; `solarResource` field added to `GeodataResult` and `sources`; wired into `Promise.allSettled` in `route.ts` with 10s soft timeout; registered in `WorkspaceCardId`, `workspace-cards.ts` (order 133, data-center/site-development/commercial/residential profiles, wide, icon "Sun", reveal trigger `"ask_climate"`), `ExploreWorkspacePanels.tsx` (geodataCards + switch case).

Last updated: 2026-04-07 — Batch 16 shipped: **StreamGaugeCard** — new workspace card at `src/components/Explore/StreamGaugeCard.tsx`; surfaces all USGS NWIS stream gauges from `geodata.streamGauges[]` (previously only nearest gauge was surfaced anywhere); flow classification uses normalized runoff index (CFS per sq mi of drainage area) when `drainageAreaSqMi` is available, falls back to raw CFS thresholds otherwise; 4 flow labels: High flow (>2.0 cfs/sqmi), Normal flow (>0.5), Low flow (>0.1), Very low flow (<0.1); `buildAvailabilityRating()` synthesizes all gauges into Good/Moderate/Limited/Uncertain availability tier based on nearest distance (≤5km=Good, ≤20km=Moderate, >20km=Limited); renders: availability badge in `headerExtra`, summary sentence, 3-col stat row (active gauge count, nearest distance, peak flow), full gauge list up to 8 with per-gauge flow badge and drainage area context, overflow count, `TrustSummaryPanel` with `sources.water`; US-only coverage note in empty state; wired into `WorkspaceCardId`, `geodataCards`, switch case, registry (order 132, data-center/site-development/commercial profiles, wide, icon "Waves", reveal trigger `"ask_hazard"`).

Last updated: 2026-04-07 — Batch 15 shipped: **Intent routing for new cards** — `workspace-intent.ts` gains 3 new `WorkspaceIntent` values (`"wildfire"`, `"alerts"`, `"climate"`) with corresponding regex patterns; `WILDFIRE_PATTERN` matches "wildfire / fire risk / fire danger / structural fire" → routes to `wildfire-risk`; `ALERTS_PATTERN` matches "disaster / alert / emergency / cyclone / tsunami / GDACS" → routes to `disaster-alerts`; `CLIMATE_PATTERN` matches "drought / precipitation / aridity / cooling load / thermal / heat load / warming trend / CDD" → routes to `drought-risk`; `WILDFIRE_PATTERN` and `ALERTS_PATTERN` checked before generic `HAZARD_PATTERN` so fire-specific and disaster-specific questions get the richer cards; `getSuggestedCardIdForIntent` wired for all 3 new intents; `WorkspaceRevealTrigger` union extended with `"ask_climate"`, `"ask_wildfire"`, `"ask_alerts"`; `getRevealTriggers` in `workspace-cards.ts` updated for `wildfire-risk`, `disaster-alerts`, `drought-risk`, `thermal-load` with appropriate trigger lists.

Last updated: 2026-04-07 — Batch 14 shipped: **ThermalLoadCard** — cooling load and thermal efficiency card at `src/components/Explore/ThermalLoadCard.tsx`; surfaces `geodata.climate.coolingDegreeDays` (previously computed but never displayed anywhere); 4-driver efficiency scoring: (1) ambient temperature `averageTempC` → 0–40 pts (cooler=better; ≤10°C≈40, ≥35°C=0); (2) wind cooling `windSpeedKph` → 0–25 pts (≥40 kph=25, still air=0); (3) climate trajectory `climateHistory.trendDirection` → 0–20 pts (cooling=20, stable=10, warming=0); (4) cooling degree days proxy → 0–15 pts (lower CDD=better); normalized to 100 → 4 tiers: Excellent(≥70), Favorable(≥45), Moderate(≥25), Challenging(<25); UI: tier badge in headerExtra (green/cyan/amber/red), explanation sentence, 3-col stat row (avg temp, CDD, wind), 4-driver progress bars (color-coded: green=efficient, red=burden), warming trend callout with delta when trendDelta>0, TrustSummaryPanel with `sources.climate`+`sources.climateHistory`; wired into `WorkspaceCardId`, `geodataCards`, switch case, registry (order 131, all 5 profiles, wide, icon "Thermometer").

Last updated: 2026-04-07 — Batch 13 shipped: **Multi-card board mode** — board now supports multiple cards open simultaneously; `activeCardId: WorkspaceCardId | null` replaced with `openCardIds: WorkspaceCardId[]` throughout; `useWorkspacePresentation` now exports `openCard`, `closeCard`, `toggleOpenCard`; `StoredWorkspacePresentation` adds `openBoardCardIds: Record<string, WorkspaceCardId[]>` (backward compat: reads legacy `activeBoardCards` single-card key and migrates on first write); `SavedBoard` adds `openCardIds?: WorkspaceCardId[]` (deprecated `activeCardId` kept for old saved boards); `useExploreData` computes `openBoardCards: WorkspaceCardDefinition[]` from `openCardIds`; `WorkspaceBoard` chips now toggle open/close with accent ring when open (aria-pressed) — drag reorder unchanged; `ExploreWorkspace` board children loop over `openBoardCards` rendering one `ExploreWorkspacePanel` per open card in a `space-y-4` stack; guided mode also stacks all open cards.

Last updated: 2026-04-07 — Batch 12 shipped: **WildfireRiskCard** — structural fire risk synthesis card at `src/components/Explore/WildfireRiskCard.tsx`; uses 4 existing data sources: (1) `geodata.hazards.activeFireCount7d` + `nearestFireKm` → fire proximity score 0–40 pts (40=active fire <25km, 25=active fire >25km, 15=FIRMS unavailable, 0=no fires); (2) `geodata.climateHistory.summaries` avg annual precip → aridity score 0–35 pts (<250mm=35, 250-500=22, 500-750=10, >750=0); (3) `geodata.landClassification` Vegetation bucket % → fuel load score 0–15 pts (≥60%=15, ≥40%=10, ≥20%=5, <20%=0); (4) `geodata.climateHistory.trendDirection` → heat amplification 0–10 pts (warming=10, other=0); normalized to 100 → 4 tiers (Severe≥70, High≥45, Moderate≥20, Low<20); renders: tier badge in headerExtra, explanation sentence, score+driver breakdown panel with per-factor progress bars (color-coded by intensity), FIRMS data gap warning when unavailable, TrustSummaryPanel with 4 sources; wired into WorkspaceCardId, geodataCards, switch case, registry (order 130, all profiles, wide).

Last updated: 2026-04-07 — Batch 11 shipped: **DisasterAlertsCard** — new workspace card at `src/components/Explore/DisasterAlertsCard.tsx`; uses `geodata.hazardAlerts` (GDACS UN/EU global disaster feed, live); renders: (1) status badge in `headerExtra` (green=no alerts, amber=orange-level elevated, red=red-level critical); (2) 3-column stat row (total / elevated / critical counts) when alerts exist; (3) full alert list from `featuredAlerts[]` — each row has event-type icon (Activity/CloudRain/Wind/Flame/Droplets/AlertTriangle mapped by GDACS eventType code), event label, level badge (Red/Orange/Green token-colored), country + distance from search point, date range, ExternalLink button to GDACS report URL; (4) nearest alert callout when nearest alert isn't already in featured list; (5) green success empty state when feed is live but no active events; (6) `TrustSummaryPanel` with `geodata.sources.hazardAlerts`; wired into `WorkspaceCardId`, `geodataCards` set in `ExploreWorkspacePanels.tsx`, switch case, and `workspace-cards.ts` registry (order 129, all profiles, defaultSize wide).

Last updated: 2026-04-07 — Batch 10 shipped: (1) **Universal card contract completed** — all 17 workspace cards (`HazardCard`, `TripSummaryCard`, `OutdoorFitCard`, `SchoolContextCard`, `WeatherForecastCard`, `DemographicsCard`, `HousingMarketCard`, `CoolingWaterCard`, `SourceAwarenessCard`, `HazardDetailsCard`, `InfrastructureAccessCard`, `SeismicDesignCard`, `SoilProfileCard`, `FireHistoryCard`, `EarthquakeHistoryCard`, `MultiHazardResilienceCard`, `LocalAccessCard`, `SiteReadinessCard`) migrated from raw `Card/CardHeader/CardContent/CardTitle` to `WorkspaceCardShell`; `loading`/`error`/`empty` props used where applicable; `headerExtra` used for score badges and toggle buttons; `subtitle` used for descriptive sub-headlines; direct `Card` imports eliminated from `src/components/Explore/`; (2) **DroughtRiskCard** — new workspace card at `src/components/Explore/DroughtRiskCard.tsx`; uses `geodata.climateHistory.summaries` (Open-Meteo ERA5 2015–2024, global); computes precipitation deficit (baseline 2015–2019 avg vs recent 2020–2024 avg), aridity class (Arid/Semi-arid/Sub-humid/Humid), and heat amplification flag (`trendDirection === "warming"`); scores into 4 tiers (Low/Moderate/High/Severe) with weighted point system (aridity 40pts, deficit 40pts, heat 20pts); renders tier badge in `headerExtra`, 3-column stat row, Recharts `BarChart` with dashed baseline reference line, warning callout when warming trend detected, `TrustSummaryPanel` sourced from `geodata.sources.climateHistory`; registered in `WorkspaceCardId`, `workspace-cards.ts` (order 128, `supportedProfiles: data-center/hiking/residential/commercial/site-development`), `ExploreWorkspacePanels.tsx` (geodataCards set + switch case); both BACKLOG.md and CLAUDE.md updated.

Last updated: 2026-04-07 — Batch 9 shipped: (1) heat stress domain added to `buildResilienceScore` — 7th domain using average of recent years' annual peak temperature from `climateHistory.summaries.maxTempC` (Open-Meteo, global); thresholds: ≥42°C risk, ≥36°C caution, ≥30°C moderate caution, <30°C good; weights rebalanced (flood 20%, seismic 16%, fire 16%, contamination 14%, air 11%, alerts 12%, heat 11%); (2) `ClimateHistoryCard` precipitation overhaul — added `precipTrendDirection` helper computing baseline (2015–2019) vs recent (2020–2024) avg precipitation with ±13% threshold; new precipitation trend badge; precipitation bar chart now always visible (removed toggle); both temperature and precipitation sections show baseline-to-recent summary lines.

Last updated: 2026-04-07 — Batch 8 shipped: (1) GDACS disaster alerts domain added to `buildResilienceScore` in `resilience-score.ts` — `ResilienceScoreCard` now has 6 domains (flood 22%, seismic 18%, fire 18%, contamination 18%, air quality 12%, disaster alerts 12%), matching parity with `buildHazardResilienceSummary`; globally sourced GDACS feed improves non-US location coverage; (2) snap-to-grid drawing toggle — `snapToGrid` state in `useExploreState`; `applyGridSnap` helper in `useGlobeDrawing` snaps cursor to nearest 0.001° (~100m) grid intersection when no vertex snap matches; `Grid2x2` toggle button in `DrawingToolbar` (active only when a drawing tool is selected); wired through `CesiumGlobe` → `useGlobeDrawing` via `snapToGrid` prop.

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

- ~~Richer live hazard and resilience layers~~ — **shipped**: `ResilienceScoreCard` now has 7 domains (flood, seismic, fire, contamination, air quality, disaster alerts, heat stress); heat stress uses Open-Meteo historical archive (global); `ClimateHistoryCard` adds precipitation trend badge + always-visible precip chart
- ~~Inline provenance in headline outputs~~ — **shipped**: provider name now inline in TrendSignalCard and LocationSignalCard; badge colors use design tokens
- ~~Standardized provenance labeling~~ — **shipped**: `direct live` / `derived live` / `proxy heuristic` now in score cards, trend signals, all `buildSupportedFacts` lines, GeoScribe prompt, and GeoAnalyst prompt.

### P1: Card Platform

- ~~Formal universal card contract~~ — **shipped**: all 17 workspace cards migrated to `WorkspaceCardShell`; `Card/CardHeader/CardContent/CardTitle` imports eliminated from `src/components/Explore/`
- ~~Saved named dashboard layouts~~ — **shipped**: inline name + restore/delete in `WorkspaceBoard.tsx`; cloud sync via `useSavedSites` + Redis when signed in
- ~~Drag-and-drop card reordering in board mode~~ — **shipped**: HTML5 drag API on board chip row, `GripVertical` handle, `ring-2 ring-accent` on drag target, order written to `globalOrder` in localStorage
- ~~Multi-card board mode~~ — **shipped**: board chips now toggle cards open/closed; multiple cards render simultaneously in a stacked column; `openCardIds[]` replaces single `activeCardId`; backward-compat storage migration

### P1: Global Coverage

- ~~Eurostat NUTS2 demographics~~ — **shipped**: GISCO reverse geocode resolves NUTS2 region code for European coordinates; `fetchEurostatDemographics` tries `demo_pjan` at NUTS2 level before falling back to country level; `geographicGranularity: "nuts2_region"` shown in DemographicsCard as "Regional (NUTS2)".
- ~~Domain coverage matrix~~ — **shipped**: `SourceAwarenessCard` now includes a grid showing integrated providers per domain with live/limited/unavailable status derived from `SOURCE_PROVIDER_REGISTRY`.
- ~~WorkspaceCardShell~~ — **shipped**: standard `WorkspaceCardShell` component wraps Card/CardHeader/CardContent with built-in loading/error/empty states; BroadbandCard, GroundwaterCard, ClimateHistoryCard, FloodRiskCard, AirQualityCard, ContaminationRiskCard all migrated.
- Live non-US provider integrations (flood, soil, seismic, school beyond Eurostat)
- Regional provider selection in reasoning and UI

### P1: High-Value Domain Expansion

- ~~Travel and trip-planning cards~~ — **shipped**: `TripSummaryCard` overhauled (structured conditions + amenity chips); `LocalAccessCard` added (derived walkability proxy score, 4-domain breakdown, OSM-sourced)
- ~~Development and infrastructure card families~~ — **shipped**: `SiteReadinessCard` (6-signal go/caution/risk screen: road, power, broadband, flood, soil, seismic) + `InfrastructureAccessCard` (raw proximity measurements, no thresholds). Both wired for site-development and data-center pro mode.
- ~~Drought risk card~~ — **shipped**: `DroughtRiskCard` uses Open-Meteo ERA5 archive (2015–2024) to compute precipitation deficit (baseline 2015–2019 vs recent 2020–2024), aridity class, and heat amplification into a 4-tier rating (Low / Moderate / High / Severe) with annual precip bar chart
- ~~Live disaster alerts card~~ — **shipped**: `DisasterAlertsCard` surfaces GDACS global feed with per-event detail rows, alert-level badges, distance context, date ranges, and external report links; global coverage across all event types (TC/EQ/FL/DR/WF/VO)
- ~~Wildfire risk index card~~ — **shipped**: `WildfireRiskCard` synthesizes fire proximity + aridity + vegetation fuel load + heat trend into a 4-tier structural risk rating with per-factor progress-bar breakdown
- ~~Thermal load card~~ — **shipped**: `ThermalLoadCard` surfaces `coolingDegreeDays` (previously fetched but never displayed); 4-driver efficiency score (ambient temp, wind cooling, climate trajectory, CDD) → Excellent/Favorable/Moderate/Challenging tier; relevant for data centers, site development, and any cooling-dependent use case
- Research-grade hazard and resilience cards (seismic probabilistic hazard curves, flood depth mapping)

### P2: Advanced Spatial Tools

- ~~Polygon drawing~~ — **shipped**: Draw area, Drop pin, Measure distance, Radius circle tools live on the globe (`DrawingToolbar`, `useGlobeDrawing`, `useGlobeDrawnShapes`)
- ~~Named pin labels~~ — **shipped**: inline editable label editor per marker in `DrawingToolbar`
- ~~GeoJSON export~~ — **shipped**: Export button downloads `geosight-shapes.geojson` with correct geometry types
- ~~Undo/redo stack~~ — **shipped**: `addDrawnShape` / `undoDrawing` / `redoDrawing` in `useExploreState`; Undo/Redo buttons in toolbar
- ~~Vertex drag-editing~~ — **shipped**: white handle entities per vertex (polygon + measure), ScreenSpaceEventHandler drag interaction, `updateDrawnShapeVertex` in `useExploreState`.
- ~~Snap-to-grid~~ — **shipped**: `applyGridSnap` snaps cursor to 0.001° (~100m) grid when enabled; toggle button in `DrawingToolbar`; vertex snap takes priority over grid snap
- LiDAR and National Map layers
- Deeper subsurface and geology overlays
- ~~Share link for current location~~ — **shipped**: `lat`/`lng`/`location` pushed to URL on every `selectPoint`; `explore/page.tsx` reads them; direct-coord init skips geocoding; "Share" button in workspace header copies `window.location.href` with 2s "Copied!" feedback; only visible when a location is loaded
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
