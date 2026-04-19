# GeoSight — Agent Handoff Document

Last updated: 2026-04-18 (competition submission polish — 9-lens landing, layout fixes, bug fixes)

This document is written for agents (CODEX, Claude Code, or human devs) picking up the project cold. It covers the exact state of the codebase after the most recent session, what was shipped, what's next, and critical conventions to avoid breaking existing work.

---

## State of the Codebase

The app is fully deployed and functional at `https://geosight-gspat.vercel.app`. Main branch auto-deploys to Vercel on every push. TypeScript strict mode, zero src/ type errors as of last commit.

### Most Recent Production Handoff

This is the current place to pick up work. The latest production-facing commits are:

- `797604a` - `fix: source details column layout + legend button overlap`
- `586c24e` - `fix: 6 usability bugs from pre-submission test report`
- `aa17a84` - `docs: strengthen README for competition submission`
- `74c7271` - `feat: competition release polish — demo CTA, how-it-works strip, loading panel`
- `773fc16` - `feat(design): 3-step landing flow, 4 new lenses, MapLibre 2D toggle, rail sidebar`

Start from `origin/main` at `797604a` or later.

### What shipped in the latest batch

#### 1. Tool-first GIS workspace shell

The workspace now reads as a spatial workbench instead of a dashboard shell.

- New left-side tool rail: `src/components/Explore/WorkspaceToolRail.tsx`
- Workspace wiring: `src/components/Explore/ExploreWorkspace.tsx`
- Shell language updated from "views/cards/board" toward "workbench/panels/evidence" across:
  - `src/components/Explore/AddViewTray.tsx`
  - `src/components/Explore/WorkspaceBoard.tsx`
  - `src/components/Explore/WorkspaceLibrary.tsx`
  - `src/components/Explore/WorkspaceCommandPalette.tsx`
  - `src/app/api/agents/[agentId]/route.ts`

Desktop layout now emphasizes:

- left workbench rail for shell mode, drawing tools, and export controls
- center globe as the primary workspace
- right evidence tray for supporting panels
- bottom persistent AI/report action strip

#### 2. Persistent AI + command workflow

Two workflow surfaces now reduce friction for analysts:

- `src/components/Explore/PersistentAiBar.tsx` - always-available AI question input in the bottom bar
- `src/components/Explore/WorkspaceCommandPalette.tsx` - command palette opened by `Cmd/Ctrl+K`

Agent wiring for one-shot prompt routing and auto-submit lives in:

- `src/context/AgentPanelContext.tsx`
- `src/components/agent-panel/AgentChat.tsx`

#### 3. Analyst-ready topographic capture

Topographic capture mode is now a real figure workflow, not just a screenshot toggle.

- Capture overlay: `src/components/Explore/TopographicCaptureOverlay.tsx`
- Globe metrics + capture-aware rendering: `src/components/Globe/CesiumGlobe.tsx`
- Drawn geometry rendering polish for captures: `src/hooks/useGlobeDrawing.ts`

Current figure overlay includes:

- figure title and subtitle
- north reference with heading/pitch readout
- scale reference using `metersPerPixel`
- active-layer legend
- AOI emphasis
- analyst notes block
- drawn-shape and saved-site counts

Important implementation detail:

- `CesiumGlobe` now exposes `GlobeViewSnapshot` metadata including viewport size and approximate `metersPerPixel`
- `preserveDrawingBuffer` is enabled for reliable map capture
- headless/browser QA showed expected WebGL `ReadPixels` performance warnings during capture; these are noisy but not currently breaking

#### 4. Stronger analyst export package

Exports are now structured for GIS handoff rather than just ad hoc downloads.

Core export logic lives in:

- `src/lib/analysis-export.ts`

Current exports:

- GeoJSON export of drawn shapes
- analysis tables ZIP containing:
  - `site-summary.csv`
  - `quick-regions.csv`
  - `drawn-shapes.csv`
- analyst ZIP bundle containing:
  - `manifest.json`
  - `drawn-shapes.geojson`
  - `site-summary.csv`
  - `quick-regions.csv`
  - `drawn-shapes.csv`
  - `topographic-capture.png`

Current manifest details:

- `schemaVersion: 2`
- location + AOI metadata
- active profile
- capture settings and active layer labels
- globe camera snapshot
- source summary and source notes
- counts for quick regions, saved sites, and drawn shapes

Circle exports were upgraded from center-point placeholders to polygonized GeoJSON rings.

### Verification status

This batch was verified with:

- `npx tsc --noEmit`
- `npm run build`
- browser automation against `/` and `/explore`
- real download verification for:
  - PNG capture
  - analysis tables ZIP
  - analyst ZIP bundle

Important build note:

- Vercel production builds run lint during `next build`, so do not rely on TypeScript alone before pushing
- use `npm run build` locally before production pushes

Expected non-blocking build/runtime warnings still present:

- Sentry deprecation/config warnings during build
- missing Sentry auth token warnings for release/source-map upload
- headless WebGL `ReadPixels` warnings during screenshot capture

### Start here if you are the next engineer

Open these files first:

- `src/components/Explore/ExploreWorkspace.tsx`
- `src/components/Explore/WorkspaceToolRail.tsx`
- `src/components/Explore/TopographicCaptureOverlay.tsx`
- `src/lib/analysis-export.ts`
- `src/components/Globe/CesiumGlobe.tsx`
- `src/hooks/useGlobeDrawing.ts`

If you need to reason about AI workflow or command dispatch:

- `src/components/Explore/PersistentAiBar.tsx`
- `src/components/Explore/WorkspaceCommandPalette.tsx`
- `src/context/AgentPanelContext.tsx`
- `src/components/agent-panel/AgentChat.tsx`

### Recommended next implementation order

This is the highest-leverage continuation path from the current state:

1. Georeferenced export
   - Add world-file style export for capture images
   - Add stronger extent/bounds metadata for downstream GIS use
   - Add `KML/KMZ` export after the georeferenced PNG workflow is stable
2. Saved analyst layouts
   - Move from simple saved layouts toward true analyst-authored workspace composition
   - Drag/resize/reopen workflows should become first-class, not just persisted visibility/order
3. Inline provenance on headline outputs
   - Push source/freshness/confidence into top-level results, compare output, and GeoAnalyst answers
4. Deeper live hazard stack
   - Expand wildfire, flood, drought, weather, and resilience signals so the new workbench has more expert-grade substance

### What's in the current build

**Workspace cards (23 registered, all using `WorkspaceCardShell`):**

| Card ID | Component | Profile(s) | Data source |
|---|---|---|---|
| `active-location` | `ActiveLocationCard` | All | Aggregated |
| `chat` | `ChatPanel` | All | Groq / Gemini |
| `results` | `AnalysisTrendsPanel` / `NearbyPlacesList` | All | Open-Meteo, OSM |
| `score` | `ScoreCard` | All | Deterministic |
| `factor-breakdown` | `FactorBreakdown` | All | Deterministic |
| `compare` | `CompareTable` | All | Local state |
| `hazard-context` | `HazardCard` | All | USGS, FEMA, FIRMS |
| `climate-history` | `ClimateHistoryCard` | All | ERA5 (Open-Meteo) |
| `weather-forecast` | `WeatherForecastCard` | All | Open-Meteo |
| `flood-risk` | `FloodRiskCard` | All | FEMA NFHL (US only) |
| `air-quality` | `AirQualityCard` | hiking, residential | OpenAQ |
| `contamination-risk` | `ContaminationRiskCard` | All | EPA Envirofacts (US) |
| `broadband-context` | `BroadbandCard` | All | FCC + Eurostat |
| `cooling-water` | `CoolingWaterCard` | data-center | USGS / OSM |
| `groundwater` | `GroundwaterCard` | All | USGS WaterWatch (US) |
| `soil-profile` | `SoilProfileCard` | All | NRCS SSURGO (US) |
| `seismic-design` | `SeismicDesignCard` | data-center, residential, commercial | USGS ASCE 7-22 (US) |
| `drought-risk` | `DroughtRiskCard` | All | ERA5 (Open-Meteo) |
| `disaster-alerts` | `DisasterAlertsCard` | All | GDACS global |
| `wildfire-risk` | `WildfireRiskCard` | All | FIRMS + ERA5 + OSM |
| `thermal-load` | `ThermalLoadCard` | All | Open-Meteo |
| `stream-gauges` | `StreamGaugeCard` | data-center, site-dev, commercial | USGS NWIS |
| `solar-resource` | `SolarResourceCard` | data-center, site-dev, commercial, residential | NASA POWER (global) |

Plus specialized: `demographics-context`, `housing-market`, `outdoor-fit`, `trip-summary`, `local-access`, `site-readiness`, `infrastructure-access`, `multi-hazard-resilience`, `resilience-score`, `hazard-details`, `earthquake-history`, `fire-history`, `school-context`, `source-awareness`, `terrain-viewer`, `elevation-profile`, `image-upload`, `land-classifier`.

---

## What Shipped After the GIS Workbench Batch (2026-04-18)

### 9-lens landing flow + 4 new lenses

Commit `773fc16`. `src/lib/explorer-lenses.ts` now exports 9 lenses: the original 5 (Hunt Planner, Trail Scout, Road Trip, Land Quick-Check, General Explore) plus Energy & Solar, Agriculture & Land, Emergency Response, and Field Research. Each has its own `profileId`, `defaultCards`, `summaryQuestion`, `whyItMatters`, and `factors[]`. The landing page shows a 3-step chooser (lens → location → confirm). `factors[]` arrays were backfilled for all original 5 lenses in `586c24e` so all 9 cards display factor chips consistently.

### MapLibre 2D flat-map toggle

Commit `773fc16`. `src/components/Globe/MapLibreMap.tsx` (new) uses `maplibre-gl` with OSM raster tiles as a 2D flat-map alternative to the Cesium globe. `ExploreWorkspace` dynamically imports it and switches on `state.mapEngine === "maplibre"`. A pill button at the bottom-right of the globe area toggles between Cesium and MapLibre.

### Rail sidebar

Commit `773fc16`. Left sidebar is now a narrower rail layout — the lens carousel adapts to the content area without hardcoded widths.

### Competition polish

Commit `74c7271`. Added a how-it-works strip and demo CTA to the landing page. Loading panel improvements.

### Pre-submission usability fixes

Commit `586c24e` (6 bugs):
1. Factor chips on all 9 lenses — `factors[]` backfilled
2. Ctrl+Z / Ctrl+Shift+Z undo/redo keyboard shortcut wired in `ExploreWorkspace`
3. Water/terrain basemap crash fixed — `HILLSHADE` replaced with `OCEANS` enum value
4. Additional layout overlap fixes

Commit `797604a` (layout):
- `TrustSummaryPanel` source grid collapsed to single stacked list — eliminates cramped columns in the provenance view
- `LegendPanel` trigger moved to `bottom-12 right-16` to clear the globe/map/drive pill cluster

---

## What Was Shipped This Session (GIS Workbench Batch)

### GIS-style full-viewport layout

**Files changed:** `src/components/Explore/ExploreWorkspace.tsx` (full rewrite), new `src/context/CardDisplayContext.tsx`

The workspace is now a true GIS tool layout on `xl:` breakpoints:

- **Topbar (52px):** hamburger (mobile) | GeoSight wordmark (→ home link) | profile pill | SearchBar (flex-1) | ModeSwitcher | Share button
- **Body:** `xl:flex-row xl:overflow-hidden`
  - Left panel (256px, desktop only): Sidebar + AddViewTray + mode buttons (Focused / Workspace / Cards / Compare)
  - Globe: `xl:flex-1 xl:min-h-0` — fills all remaining space; `min-h-[55vw] max-h-[55vh]` on mobile
  - Right panel (380px, desktop): `xl:border-l xl:overflow-y-auto` — only visible when `rightPanelOpen`
- **Bottom bar (64px):** compact AnalysisOverviewBanner | Compare | Generate Report (primary CTA)
- Mobile: vertical stack, scrollable, sidebar as overlay

`rightPanelOpen = Boolean(activePrimaryCard || openBoardCards.length > 0 || shellMode === "board")`

### Workspace cards collapsed by default in right panel

**Files changed:** `src/context/CardDisplayContext.tsx` (new), `src/components/Explore/WorkspaceCardShell.tsx`

`CardDisplayProvider value={{ defaultCollapsed: true }}` wraps the right panel in `ExploreWorkspace`. All `WorkspaceCardShell` instances read this via `useCardDisplay()` and start collapsed. Clicking the header or chevron toggles. Cards are only collapsible if they started collapsed (prevents collapsing primary analysis cards that aren't in the panel).

### Map callout on globe click

**File:** `src/components/Globe/MapCallout.tsx` (new)

- Position: `absolute bottom-14 left-4 z-20 w-72`
- Appears when `(locationReady || loading) && !rightPanelOpen && !calloutDismissed`
- Calls `buildAnalysisOverview` internally, shows: StateBadge + score/100 + location name + profile + top strength (green dot) + top watchout (amber dot)
- Footer: "Open full analysis" button → `setActivePrimaryCardId(primaryCards[0].id)`
- Dismissed by X button; resets on new globe click or search

### Draggable analysis pin

**File:** `src/components/Globe/CesiumGlobe.tsx`

Pin position uses `CallbackProperty(() => dragPositionRef.current ?? basePosition, false)` — polls a ref per frame, no React re-renders during drag. Cesium's `LEFT_DOWN` → `MOUSE_MOVE` → `LEFT_UP` handler sequence:
1. Picks the pin entity on `LEFT_DOWN` (compared by identity to `pinEntityRef.current`)
2. Locks camera (`enableRotate = enableTranslate = false`) and sets cursor to `"grabbing"`
3. `MOUSE_MOVE` calls `scene.pickPosition` → `dragPositionRef.current = Cartesian3`
4. `LEFT_UP` unlocks camera, calls `onPointSelect` with final cartographic coords
5. `LEFT_CLICK` (unaffected when mouse moved >3px — Cesium suppresses) still handles click-to-analyze

Hover: `MOUSE_MOVE` with no drag in progress checks `scene.pick() === pinEntityRef.current` and sets cursor to `"grab"`.

### Demo system fully removed

The entire demo system was removed (registry, data, fallbacks). **Deleted files:**
- `src/lib/demo-data.ts`
- `src/lib/demo-fallbacks.ts`
- `src/lib/demos/registry.ts`

**Modified files:**
- `src/types/index.ts` — removed `DemoOverlayLayerKey`, `DemoOverlay`, `DemoMapOverlay`, `DemoSiteSeed`; `ExploreEntrySource` → `"landing" | "direct"` (was `"landing" | "direct" | "demo"`)
- `src/app/explore/page.tsx` — removed `demoId` param
- `src/hooks/useExploreState.ts` — removed all demo memos, effects, and state
- `src/hooks/useExploreData.ts` — removed `activeDemo` fetch condition
- `src/components/Landing/LandingPage.tsx` — removed guided demos section (~60 lines)
- `src/lib/landing.ts` — removed `demoId` from URL building

### UX audit fixes (shipped in final commit)

**Files changed:** `ExploreWorkspace.tsx`, `CesiumGlobe.tsx`, `AnalysisOverviewBanner.tsx`, `WorkspaceCardShell.tsx`, `LayerToggle.tsx`, new `src/components/ui/skeleton.tsx`

| Fix | File | Change |
|---|---|---|
| GeoSight wordmark → home Link | `ExploreWorkspace.tsx` | `<span>` → `<Link href="/">` |
| Hamburger touch target | `ExploreWorkspace.tsx` | Added `h-11 w-11` to Button |
| ESC closes mobile sidebar | `ExploreWorkspace.tsx` | `useEffect` on `sidebarOpen` |
| Drive mode tooltip | `ExploreWorkspace.tsx` | Added `title` prop to drive Button |
| DataLayers always visible | `ExploreWorkspace.tsx` | Removed `shellMode === "board"` gate |
| Coord readout → copy button | `ExploreWorkspace.tsx` | `<div>` → `<button>` with clipboard + `copiedCoords` state; Copy/Check icons |
| Zoom +/− controls | `CesiumGlobe.tsx` | Two buttons at `bottom-24 right-4 z-10`; call `viewerRef.current?.camera.zoomIn/Out(0.5)` |
| Bottom bar truncation | `AnalysisOverviewBanner.tsx` | Profile/summary hide until `xl:` breakpoint; Why score buttons always visible |
| Loading skeleton | `WorkspaceCardShell.tsx` | 3 skeleton lines replace full `StatePanel` for loading state |
| Layer toggle accessibility | `LayerToggle.tsx` | Added `title` + `aria-pressed` to each toggle button |
| Skeleton component | `src/components/ui/skeleton.tsx` | New `<Skeleton>` utility |

---

## Next Highest-Value Work

### P1 — Live non-US provider integrations (recommended next)

The US-first data gap is the most visible product weakness for non-US users. The `SourceAwarenessCard` coverage matrix already shows users exactly what's missing. Each integration follows the same pattern:

1. `src/lib/<provider>.ts` — fetch function with typed return
2. Add field to `GeodataResult` in `src/types/index.ts`
3. Add `sources.<key>` field to `GeodataResult.sources`
4. Wire into `Promise.allSettled` in `src/app/api/geodata/route.ts` with `withSoftTimeout`
5. Add source metadata in `route.ts` sources object
6. Update the relevant card component

**Priority targets:**

| Domain | Current gap | Best global replacement |
|---|---|---|
| Flood zones | FEMA US-only | JRC Global Flood Awareness System (GloFAS) — Copernicus, free REST API |
| Seismic hazard | USGS ASCE 7-22 US-only | USGS Unified Hazard Tool has a global API; GEM OpenQuake for probabilistic |
| Soil profile | NRCS SSURGO US-only | ISRIC World Soil Information — free REST API, global |
| Contamination | EPA Envirofacts US-only | EEA European industrial sites data |
| School quality | US Greatschools-based | Global school density via OSM + UNESCO data |

### P1 — Research-grade hazard cards

- **Seismic probabilistic hazard curves:** The USGS hazard curves API returns annual exceedance probability at multiple spectral periods (much more useful than a single design value). Would upgrade `SeismicDesignCard` or become `SeismicHazardCard` with a probability-vs-acceleration Recharts chart.
- **Flood depth mapping:** FEMA NFHL depth-grid data at the searched point, not just the zone label. Current `FloodRiskCard` shows zone (AE, X, etc.) but not inundation depth. FEMA's OGC services expose this.

### P1 — AI quality improvements

- **GeoAnalyst context completeness:** The system prompt in `src/app/api/analyze/route.ts` includes a geodata summary. The summary currently omits several newer fields (`solarResource`, `streamGauges`, `thermalLoad`). Audit the system prompt and ensure every `GeodataResult` field that has been added in the last 6 batches is represented in the AI context bundle.
- **Structured analysis output:** GeoScribe currently generates markdown prose. A structured JSON report (section headers + confidence labels + data gap flags) would make the output parseable and enable downstream features (PDF export, section-level regeneration).

### P2 — Advanced spatial and export

- **LiDAR / National Map overlays:** USGS 3DEP LiDAR tiles as an imagery layer on the globe. The `GlobeViewSelector` already has a slot for additional basemap options. The challenge is tile server performance.
- **Shareable analysis snapshots:** Beyond the current "Share" button (which copies the URL), export a self-contained HTML or PDF snapshot of the current analysis bundle. GeoScribe already generates the prose — the missing piece is a layout wrapper and a server-side render.
- **Comparison export:** `CompareTable` currently shows a live side-by-side grid. A CSV or PDF export of the comparison would make the feature usable for decision reporting.

### P2 — Workspace UX

- ~~**Command palette:**~~ — **shipped**: `Cmd+K` / `Ctrl+K` opens `WorkspaceCommandPalette.tsx` with card name, quick region, and action search.
- ~~**Persistent AI input bar:**~~ — **shipped**: `PersistentAiBar.tsx` in the bottom bar always routes to GeoAnalyst.
- **Keyboard navigation:** Tab order through the workspace is currently undefined. Setting explicit `tabIndex` and adding focus-visible ring styles would make the app keyboard-navigable.

---

## Critical Conventions

### Design tokens

Never use raw Tailwind palette classes (`bg-blue-500`, `border-gray-200`). Use CSS custom property tokens from `src/app/globals.css`:

```
--foreground / --foreground-soft / --muted-foreground
--background / --surface-panel / --surface-raised / --surface-soft / --surface-overlay
--border-soft / --border-strong
--accent / --accent-soft / --accent-strong / --accent-foreground
--success-soft / --success-border
--warning-soft / --warning-border / --warning-foreground
--danger-soft / --danger-border / --danger-foreground
--shadow-soft / --shadow-panel
```

When referencing border tokens in a `className`, use `border-[color:var(--border-soft)]` (not `border-[var(--border-soft)]`) — the `color:` prefix is required for Tailwind v4 to treat it as a color value.

### Card pattern

Every workspace card must use `WorkspaceCardShell` from `src/components/Explore/WorkspaceCardShell.tsx`. Direct `Card/CardHeader/CardContent` imports in `src/components/Explore/` are not allowed except in `WorkspaceCardShell.tsx` itself.

**New card checklist:**
1. Add `"your-card-id"` to `WorkspaceCardId` union in `src/types/index.ts`
2. Register in `src/lib/workspace-cards.ts` with all required fields
3. Add import + `geodataCards` set entry + `switch` case in `src/components/Explore/ExploreWorkspacePanels.tsx`
4. Add profile visibility defaults in `src/lib/profiles.ts`
5. Add reveal trigger case in `getRevealTriggers()` in `workspace-cards.ts`
6. If the card answers a new kind of question, add an intent in `src/lib/workspace-intent.ts` and extend `WorkspaceRevealTrigger` in `src/types/index.ts`
7. Run `npx tsc --noEmit` — must be clean

### Cesium conventions

- **Drawing entities belong in named `CustomDataSource`s, never `viewer.entities`** — `viewer.entities.removeAll()` is called on every state update and will wipe anything placed there. Use `CustomDataSource("drawing-preview")` for in-progress geometry and `CustomDataSource("drawing-shapes")` for persisted shapes.
- **Do not use Resium JSX components** (`<Viewer>`, `<Entity>`, etc.). The codebase uses the direct Cesium imperative API via `viewerRef`.
- **Drive mode camera:** `HeadingPitchRange` heading=0 places the camera **south** of target (not north) — do not add `Math.PI` to the heading. Vehicle box uses `heading - Math.PI/2` in `HeadingPitchRollQuaternion` to align the box long axis with movement direction.
- **Zoom controls:** `viewerRef.current?.camera.zoomIn(factor)` / `zoomOut(factor)` with `factor = 0.5`. Currently rendered at `bottom-24 right-4` inside `CesiumGlobe.tsx` to avoid overlapping the `DataLayers` button at `bottom-10 right-4` in `ExploreWorkspace.tsx`.

### Sidebar and layout

- `xl:fixed xl:inset-0 xl:overflow-hidden` on the root — do not add `overflow-x: hidden` to the body or this breaks fixed/sticky elements
- Right panel is only rendered when `rightPanelOpen === true` (see `ExploreWorkspace.tsx` line ~325)
- `CardDisplayProvider value={{ defaultCollapsed: true }}` wraps the right panel. Any card inside the panel starts collapsed. Cards outside the panel use `defaultCollapsed: false` (context default)
- Mobile sidebar: overlay pattern (`fixed inset-0 z-50`), closed by the X button, the backdrop, or ESC key

### Button variants

`variant="outline"` does not exist. Use `"secondary"` for secondary actions. Active state should use `variant="default"`.

### Typecheck

Run `npx tsc --noEmit` from the project root before every commit. All batches have shipped with zero type errors.

---

## Key File Map

```
src/
  app/
    page.tsx                        # Landing page route
    explore/page.tsx                # Explore workspace route
    api/
      geodata/route.ts              # Main data aggregation — Promise.allSettled for all providers
      analyze/route.ts              # GeoAnalyst chat endpoint
      agents/route.ts               # Agent panel endpoint
      nearby-places/route.ts        # OSM Overpass nearby lookup
      geocode/route.ts              # Place search / coordinate resolution
      score/route.ts                # Deterministic scoring endpoint
      ai-status/route.ts            # Groq/Gemini liveness check

  components/
    Explore/
      ExploreWorkspace.tsx          # Full workspace shell — GIS layout, all state wiring
      ExploreWorkspacePanels.tsx    # Routes cardId → primary or workspace panel component
      ExploreProvider.tsx           # Init params context
      AnalysisOverviewBanner.tsx    # Score overview (full card + compact bottom-bar mode)
      WorkspaceCardShell.tsx        # Universal card wrapper (all workspace cards use this)
      WorkspaceBoard.tsx            # Board mode chip row + open card stack
      WorkspaceLibrary.tsx          # Card library browser
      AddViewTray.tsx               # Suggested-card tray in guided/focused mode
      ActiveLocationCard.tsx        # Location summary + signal cards
      GeoScribeReportPanel.tsx      # Report slide-in panel
      [Card].tsx                    # Each workspace card (23+)
    Globe/
      CesiumGlobe.tsx               # Globe + drive mode + drawing + drag pin + zoom controls
      MapCallout.tsx                # Globe click callout popup
      DataLayers.tsx                # Layer toggle panel (always visible, keyboard shortcut L)
      DrawingToolbar.tsx            # Drawing tools toolbar
      GlobeViewSelector.tsx         # Basemap switcher
      RegionSelector.tsx            # Active region display + reset
    Landing/
      LandingPage.tsx               # Landing — Explorer (9 lenses, 3-step chooser) + Pro (analyst) flows
    Shell/
      Sidebar.tsx                   # Left sidebar — profiles + quick regions
      SearchBar.tsx                 # Location search
      ModeSwitcher.tsx              # Explorer ↔ Pro toggle
      LayerToggle.tsx               # Individual layer toggle button (title + aria-pressed)
    Status/
      StatePanel.tsx                # Loading / error / empty / unavailable states
    ui/
      skeleton.tsx                  # Skeleton loading component (NEW — animate-pulse lines)

  context/
    CardDisplayContext.tsx          # defaultCollapsed context — wraps right panel with true

  hooks/
    useExploreState.ts              # All globe/UI state — mode, point, layers, drawing, etc.
    useExploreData.ts               # Geodata fetch, scoring, cards, sites, report
    useSiteAnalysis.ts              # Scoring orchestration
    useWorkspaceCards.ts            # Card registry, visibility, board layout
    useGlobeDrawing.ts              # Drawing tools — active interaction + persisted shapes
    useNearbyPlaces.ts              # OSM nearby fetch
    useHousingMarket.ts             # Housing market data fetch

  lib/
    profiles.ts                     # Mission profiles — factors, weights, card defaults
    scoring.ts                      # Deterministic scoring engine
    workspace-cards.ts              # Card registry — all metadata + reveal triggers
    workspace-intent.ts             # Question → card intent detection (regex patterns)
    source-registry.ts              # Source metadata + regional fallback guidance
    analysis-summary.ts             # buildAnalysisOverview — strengths/watchouts/dataGaps
    explorer-lenses.ts              # 5 Explorer mode lenses
    lenses.ts                       # Lens ID ↔ profile ID mapping
    landing.ts                      # Use cases, buildExploreHref
    solar-resource.ts               # NASA POWER GHI fetch (global, no key needed)
    stream-gauges.ts                # USGS NWIS gauge helpers
    overpass.ts                     # OSM Overpass with fallback mirror (overpass.kumi.systems)

  types/index.ts                    # WorkspaceCardId union, WorkspaceRevealTrigger, GeodataResult
```

---

## Data Sources Reference

| Source | Field in GeodataResult | Coverage | Key |
|---|---|---|---|
| Open-Meteo forecast | `climate.*` | Global | None |
| Open-Meteo ERA5 archive | `climateHistory.*` | Global | None |
| NASA POWER | `solarResource.*` | Global | None |
| NASA FIRMS | `hazards.activeFireCount7d`, `nearestFireKm` | Global | `NASA_FIRMS_MAP_KEY` |
| GDACS | `hazardAlerts.*` | Global | None |
| USGS earthquakes | `hazards.earthquakeCount30d` | Global | None |
| USGS NWIS gauges | `streamGauges[]` | US only | None |
| USGS groundwater | `groundwater.*` | US only | None |
| USGS seismic | `seismicDesign.*` | US only | None |
| FEMA NFHL | `floodZone.*` | US only | None (12s soft timeout) |
| OpenAQ | `airQuality.*` | Global where stations exist | None |
| OSM Overpass | `landClassification[]`, `amenities.*`, `nearestWaterBody` | Global | None (fallback mirror) |
| FCC Broadband | `broadband.*` | US only | None (public API) |
| Eurostat | `broadband.*`, `demographics.*` | EU NUTS2 | None |
| EPA Envirofacts | `epaHazards.*` | US only | None |
| NRCS SSURGO | `soilProfile.*` | US only | None |
| OpenStreetMap Nominatim | Geocoding | Global | None |

---

## Environment Variables

All set in the **Vercel project dashboard** (Settings → Environment Variables). See `.env.example` for names.

### Required

| Variable | What breaks without it |
|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Globe does not render |
| `GROQ_API_KEY` | All AI falls back to deterministic mode |

### AI key pool (add all keys you have)

| Variable | Notes |
|---|---|
| `GROQ_API_KEY` | Required. Primary pool key |
| `GROQ_API_KEY_2` | Optional rotation pool (separate account = separate rate limit) |
| `GROQ_API_KEY_3` | Optional rotation pool |
| `GROQ_ANALYSIS_KEY` | GeoAnalyst dedicated lane (highest token usage — give it your best key) |
| `GROQ_WRITER_KEY` | GeoScribe dedicated lane |
| `GROQ_UX_KEY` | GeoGuide + GeoUsability shared lane |

**Recommended with 3 Groq accounts:** `GROQ_ANALYSIS_KEY` → key 1 (highest quota), `GROQ_WRITER_KEY` → key 2, `GROQ_API_KEY` → key 3. Leave pool rotation vars empty.

### Optional

| Variable | What it enables |
|---|---|
| `GEMINI_API_KEY` | LLM fallback when Groq is down |
| `NASA_FIRMS_MAP_KEY` | WildfireRiskCard fire proximity — without it, fire proximity score = 0 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Geodata cache (1hr TTL) + cloud site sync |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Error monitoring |

### No key needed

NASA POWER, Open-Meteo, USGS, OSM Overpass, GDACS, OpenAQ, FEMA NFHL, Eurostat, FCC Broadband.

---

## Known Issues / Tech Debt

| Issue | Severity | Notes |
|---|---|---|
| Groq API keys missing from Vercel | HIGH | AI falls back to deterministic mode on prod — user needs to add keys via Vercel dashboard |
| FEMA soft timeout 12s | LOW | Raised from 6.5s; still may time out on slow FEMA servers |
| Overpass rate limits | MEDIUM | Public `overpass-api.de` can throttle; `overpass.kumi.systems` fallback wired |
| `nextSteps[]` not rendered | LOW | `buildAnalysisOverview` returns `nextSteps[]` but no component renders them — deferred |
| GeoAnalyst context gap | MEDIUM | System prompt in `analyze/route.ts` omits newer fields: `solarResource`, `streamGauges`, `thermalLoad` — AI answers about these fields are less grounded |
| Lint warnings (7 items) | LOW | All are warnings, not errors — unused imports (`HorizontalOrigin`, `cn`, `Input`, `formatRadiusLabel`, `buildFactorEvidenceLines`) and missing `useEffect` deps in `ExploreWorkspace` and `CesiumGlobe`; do not suppress without fixing |
| maplibre-gl / lz-string missing from node_modules | LOW | Packages are in `package.json` but `npm install` must be run; tsc will fail in CI if deps are not installed |
