# GeoSight — Agent Handoff Document

Last updated: 2026-04-11 (post GIS analyst tools batch — layer manager, identify, go-to, measurements)

This document is written for agents (CODEX, Claude Code, or human devs) picking up the project cold. It covers the exact state of the codebase after the most recent session, what was shipped, what's next, and critical conventions to avoid breaking existing work.

---

## 2026-04-11 Checkpoint (GIS Analyst Tools)

This checkpoint ships four connected GIS analyst features that bring the workspace closer to ArcGIS/QGIS parity:

- **Layer Manager**: full rewrite of `DataLayers` with drag-reorder, per-layer opacity, and user-added WMS/WMTS/XYZ layer support
- **Feature Inspector / Identify tool**: click any feature on the globe in identify mode → see structured attributes in a floating panel
- **Go-to Coordinates dialog**: `Ctrl+G` opens a coordinate input that parses decimal, DMS, DDM, and auto-detects swapped lng/lat
- **Enhanced measurements**: bearing/azimuth on lines, multi-unit area (acres/ha/km²/mi²), perimeter for polygons/circles

### Files changed

New files:
- `src/components/Globe/FeatureInspectorPanel.tsx`
- `src/components/Globe/GoToCoordinateDialog.tsx`

Modified files:
- `src/types/index.ts` — added `CustomLayer`, `CustomLayerType`, `IdentifyHit`, `IdentifyResult`, `MeasurementUnitSystem`; extended `DrawnMeasurement` with dual-unit fields + bearing; extended `LayerState` with `customLayers`
- `src/lib/map-layers.ts` — added `createCustomLayer` factory; `getActiveLayerLabels` includes custom layers; `createLayerState` defaults `customLayers: []`
- `src/lib/analysis-geometry.ts` — added `computeBearing`, `computePerimeter`; `measurementFromShape` now returns `distanceKm/Mi`, `areaAcres/Ha/Km2/Mi2`, `perimeterKm/Mi`, `bearingDeg/Display`
- `src/hooks/useExploreState.ts` — added `identifyMode`, `setIdentifyMode`, `identifyResult`, `setIdentifyResult`
- `src/components/Globe/DataLayers.tsx` — full rewrite: compact `BuiltinLayerRow` with eye toggle + drag-reorder; `CustomLayerRow` with up/down/visibility/opacity/remove; `AddLayerForm` for WMS/WMTS/XYZ; active layer count badge on button
- `src/components/Globe/CesiumGlobe.tsx` — added `WebMapServiceImageryProvider`, `WebMapTileServiceImageryProvider` imports; new `useEffect` for custom layer rendering; identify mode click handler with entity pick + `pickImageryLayerFeatures`; crosshair cursor in identify mode; FEMA flood layer `enablePickFeatures: true`
- `src/components/Globe/AoiDrawingToolbar.tsx` — added `MeasurementDetail` component showing dual-unit distance/area, bearing with compass icon, perimeter
- `src/components/Explore/ExploreWorkspace.tsx` — added Identify button, Go-to dialog, `FeatureInspectorPanel`, keyboard shortcuts (`I` for identify, `Ctrl+G` for go-to)

### Keyboard shortcuts added

| Key | Action |
|---|---|
| `L` | Toggle layer manager (existing) |
| `I` | Toggle identify mode |
| `Ctrl+G` / `Cmd+G` | Open Go-to coordinates dialog |
| `Ctrl+K` / `Cmd+K` | Command palette (existing) |

### Verification

- `npx tsc --noEmit` — zero project errors
- `npm run build` — clean production build

### Known caveats

- Identify mode imagery picks depend on WMS servers supporting GetFeatureInfo; some servers return empty results
- Custom WMS layers require the user to know the service URL and layer name — no GetCapabilities browser yet
- Drag-reorder on built-in overlays uses HTML5 drag API (same as board chip reorder); touch drag requires press-and-hold
- Bearing is computed from first to last point of a line (initial bearing), not segment-by-segment

### Recommended next pickup from here

1. **GetCapabilities browser for WMS**: when a user enters a WMS URL, fetch `?service=WMS&request=GetCapabilities`, parse the XML, and let them pick layers from a list instead of typing layer names manually
2. **Attribute table**: tabular browsing of drawn features + nearby places; select row → highlight on globe; sort/filter columns
3. **Layer legend panel**: auto-generate legend entries from visible layers; show WMS `GetLegendGraphic` images
4. **Extend deterministic analyzers** to `road-trip`, `general-explore`, and Pro lenses (deferred from prior handoff)
5. **Viewport-based overlay refresh**: debounced zoom gating so roads/fires/flood layers don't over-fetch while panning

---

## Previous Checkpoint (2026-04-11, pre-analyst-tools)

The prior local checkpoint covered three connected batches on top of the AOI drawing foundation:

- Batch A: live location controls with `Locate once`, `Follow me`, and `Record route`
- Batch B: the first real deterministic lens pipeline for:
  - `hunt-planner`
  - `trail-scout`
  - `land-quick-check`
- Batch C: unified map layers + basemap control, visible-layer context wiring, and legacy AOI cleanup

Prior local commits:

- `cca87b7` - `feat: add live location tracking controls`
- `edc576d` - `feat: add deterministic explorer lens analysis`
- `0f9a2f6` - `feat: unify map layers and retire legacy AOI controls`

### What changed in this checkpoint

#### Live location and route capture

New files:

- `src/hooks/useLocationTracking.ts`
- `src/components/Globe/LocationTrackingControls.tsx`

Key wiring updates:

- `src/components/Explore/ExploreWorkspace.tsx`
- `src/components/Globe/CesiumGlobe.tsx`
- `src/components/Shell/SearchBar.tsx`
- `src/lib/cesium-search.ts`
- `src/types/index.ts`

Behavior now implemented:

- one-shot GPS locate with a persisted last-known fix in `sessionStorage`
- continuous follow mode using browser geolocation watch
- live breadcrumb route recording that converts into the same AOI GeoJSON path used by drawing tools
- pulsing user marker plus heading arrow on the Cesium globe
- inline error UI for permissions/timeouts instead of browser alerts

#### First real lens-analysis route

New server/client analysis pieces:

- `src/app/api/lens-analysis/route.ts`
- `src/hooks/useLensAnalysis.ts`
- `src/lib/analysis/shared.ts`
- `src/lib/analysis/huntPlanner.ts`
- `src/lib/analysis/trailScout.ts`
- `src/lib/analysis/landQuickCheck.ts`
- `src/lib/prompts/huntPlanner.ts`
- `src/lib/prompts/trailScout.ts`
- `src/lib/prompts/landQuickCheck.ts`

UI updates:

- `src/components/Results/AnalysisPanel.tsx`

Current behavior:

- supported lenses now auto-run deterministic metrics when a valid place or drawn AOI is active
- AI is used only for the short explanatory narrative; raw metrics are computed directly from source data or clearly labeled heuristics
- Trail Scout now renders a compact elevation profile chart
- unsupported lenses show a non-breaking "queued next" state instead of a blank panel

#### Unified layer control and AOI cleanup

New files:

- `src/lib/map-layers.ts`
- `src/app/api/map-overlays/route.ts`

Key wiring updates:

- `src/components/Globe/DataLayers.tsx`
- `src/components/Globe/CesiumGlobe.tsx`
- `src/components/Explore/ExploreWorkspace.tsx`
- `src/hooks/useExploreData.ts`
- `src/hooks/useLensAnalysis.ts`
- `src/context/AnalysisContext.tsx`
- `src/lib/nasa-firms.ts`
- `src/lib/profiles.ts`
- `src/types/index.ts`

Behavior now implemented:

- the old split between `Map Style` and `Layers` controls is gone; basemap and overlays now live in one floating panel
- shared layer state now tracks:
  - `roads`
  - `fires`
  - `floodZones`
  - `contours`
  - `aoi`
  - per-layer opacity values
- Cesium now renders:
  - OSM roads overlay
  - NASA FIRMS fire detections through the new `/api/map-overlays` route
  - FEMA flood imagery overlay
  - topo/contour imagery overlay
  - AOI visibility as a first-class toggle
- visible layer labels now flow into:
  - capture/export manifests
  - `GeoSightContext.dataBundle`
  - deterministic lens prompts
- legacy pre-AOI files were removed:
  - `src/hooks/useGlobeDrawing.ts`
  - `src/components/Globe/DrawingToolbar.tsx`
  - `src/components/Globe/GlobeViewSelector.tsx`
  - `src/components/Shell/LayerToggle.tsx`

### Verification for this checkpoint

Verified successfully with:

- `npm run typecheck`
- `npm run build`
- live smoke test against `/api/lens-analysis` using:
  - location-mode Hunt Planner request for `Okanogan Highlands, WA`
  - geometry-mode Trail Scout request for a drawn `Mailbox Peak, WA` route
- live smoke test for the new layer path using:
  - a real flood-context lookup at `29.9511, -90.0715`
  - a polygon AOI converted through `buildDrawnShapesGeoJson`
  - active layer label generation from the shared `LayerState`

Smoke-test note:

- because local AI keys were missing, both requests fell back to deterministic narrative text
- the important part is that the route returned real metric payloads and completed without runtime errors after the centroid fix in `src/lib/analysis/shared.ts`
- local shell env did not include `NASA_FIRMS_MAP_KEY`, so the fire overlay UI path was validated structurally through build/typecheck while the live smoke test focused on flood context + AOI serialization

### Known caveats after this checkpoint

- existing `react-hooks/exhaustive-deps` warnings in `src/components/Explore/ExploreWorkspace.tsx` are still present and unchanged from prior work
- Trail Scout distance/gain quality depends heavily on the fidelity of the drawn route; the current smoke-test geometry was intentionally short
- live location modes are wired for the globe and AOI flow, but there is not yet a broader saved-session/history surface for tracks
- unsupported explorer lenses still need real deterministic analyzers
- fire overlays require `NASA_FIRMS_MAP_KEY`; without it the layer stays empty instead of fabricating detections

### Recommended next pickup from here

1. Extend deterministic analyzers to `road-trip`, `general-explore`, and the Pro lenses.
2. Add debounced viewport-based overlay refresh and zoom gating so roads / fires / flood layers do not over-fetch while panning.
3. Start the save/share/export batch using the now-stable shared contracts:
   - `LayerState`
   - AOI GeoJSON
   - deterministic lens results

---

## State of the Codebase

The app is fully deployed and functional at `https://geosight-gspat.vercel.app`. Main branch auto-deploys to Vercel on every push. TypeScript strict mode, zero type errors as of last commit.

### Most Recent Production Handoff

This is the current place to pick up work. The latest production-facing commits are:

- `ae06db5` - `feat: add geojson AOI drawing workflow`
- `76f9d4b` - `Ship GIS workbench capture and export workflow`
- `2200dcb` - `Fix production build lint blockers`

The latest feature batch layers the AOI workflow on top of the GIS workbench/export foundation. If you are continuing immediately after this handoff, start from `origin/main` at or after `ae06db5` once the branch is pushed.

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
- Drawn geometry rendering polish for captures: `src/hooks/useAoiDrawing.ts`

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
- `src/hooks/useAoiDrawing.ts`

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

## What Was Shipped This Session

### Priority 1 checkpoint - GeoJSON AOI drawing workflow

Files changed:

- `src/components/Explore/ExploreWorkspace.tsx`
- `src/components/Globe/CesiumGlobe.tsx`
- `src/components/Globe/AoiDrawingToolbar.tsx` (new)
- `src/components/Results/AnalysisPanel.tsx` (new shell for lens-specific output)
- `src/context/AnalysisContext.tsx` (new)
- `src/hooks/useAoiDrawing.ts` (new)
- `src/hooks/useExploreState.ts`
- `src/lib/analysis-geometry.ts` (new)
- `src/types/index.ts`

What landed:

- GeoJSON is now a first-class analysis contract instead of an export-only afterthought.
- Added a dedicated `AnalysisContext` that exposes the active lens, active place, AOI `FeatureCollection`, selected geometry id, layer state, draft drawing state, and analysis mode (`location` vs `geometry`).
- Reworked drawing around a new Cesium AOI hook with support for:
  - point marker
  - polyline / route drawing
  - polygon area drawing
  - rectangle quick select
  - circle / radius buffer
- Added a new floating map-native drawing toolbar:
  - vertical pill layout
  - active cyan / teal state
  - hover tooltips
  - draft-aware undo / finish controls
  - export, clear, and selected-geometry actions
- Added vertex editing for selected geometry on the globe.
- Added live measurement feedback while drawing:
  - miles for lines
  - acres for polygon / rectangle / circle tools
- Completed shapes now auto-fit the Cesium camera to their bounds.
- AOI export now downloads the shared GeoJSON store directly, rather than rebuilding an ad hoc export payload.
- Added the first lens-side handoff shell in `AnalysisPanel.tsx`, including the required `Use drawn area` button so downstream analysis can explicitly switch to geometry mode before the richer per-lens results land.

Important implementation notes:

- The canonical AOI store is `state.drawnGeometry`, not `state.drawnShapes`. Shapes remain as the Cesium-friendly editing model, but every change flows through `drawnGeometry` for export and future analysis.
- `src/hooks/useAoiDrawing.ts` is now the active Cesium drawing implementation.
- the AOI stack is now single-path: `src/hooks/useAoiDrawing.ts` + `src/components/Globe/AoiDrawingToolbar.tsx` are the active drawing implementation.
- The new analysis shell is intentionally thin. It is there to make the AOI handoff visible now and will be expanded in Priority 3 into the full per-lens metric panel.

Validation completed:

- `npm run typecheck`
- `npm run build`

Immediate next recommended work:

1. Extend deterministic analysis coverage to the remaining explorer and Pro lenses.
2. Add viewport-aware overlay refresh and zoom gating for the new map-layer stack.
3. Build save/share/export on top of the now-stable AOI + layer + lens-analysis contracts.

### GIS-style full-viewport layout

**Files changed:** `src/components/Explore/ExploreWorkspace.tsx` (full rewrite), new `src/context/CardDisplayContext.tsx`

The workspace is now a true GIS tool layout on `xl:` breakpoints:

- **Topbar (52px):** hamburger (mobile) | GeoSight wordmark (â†’ home link) | profile pill | SearchBar (flex-1) | ModeSwitcher | Share button
- **Body:** `xl:flex-row xl:overflow-hidden`
  - Left panel (256px, desktop only): Sidebar + AddViewTray + mode buttons (Focused / Workspace / Cards / Compare)
  - Globe: `xl:flex-1 xl:min-h-0` â€” fills all remaining space; `min-h-[55vw] max-h-[55vh]` on mobile
  - Right panel (380px, desktop): `xl:border-l xl:overflow-y-auto` â€” only visible when `rightPanelOpen`
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
- Footer: "Open full analysis" button â†’ `setActivePrimaryCardId(primaryCards[0].id)`
- Dismissed by X button; resets on new globe click or search

### Draggable analysis pin

**File:** `src/components/Globe/CesiumGlobe.tsx`

Pin position uses `CallbackProperty(() => dragPositionRef.current ?? basePosition, false)` â€” polls a ref per frame, no React re-renders during drag. Cesium's `LEFT_DOWN` â†’ `MOUSE_MOVE` â†’ `LEFT_UP` handler sequence:
1. Picks the pin entity on `LEFT_DOWN` (compared by identity to `pinEntityRef.current`)
2. Locks camera (`enableRotate = enableTranslate = false`) and sets cursor to `"grabbing"`
3. `MOUSE_MOVE` calls `scene.pickPosition` â†’ `dragPositionRef.current = Cartesian3`
4. `LEFT_UP` unlocks camera, calls `onPointSelect` with final cartographic coords
5. `LEFT_CLICK` (unaffected when mouse moved >3px â€” Cesium suppresses) still handles click-to-analyze

Hover: `MOUSE_MOVE` with no drag in progress checks `scene.pick() === pinEntityRef.current` and sets cursor to `"grab"`.

### Demo system fully removed

The entire demo system was removed (registry, data, fallbacks). **Deleted files:**
- `src/lib/demo-data.ts`
- `src/lib/demo-fallbacks.ts`
- `src/lib/demos/registry.ts`

**Modified files:**
- `src/types/index.ts` â€” removed `DemoOverlayLayerKey`, `DemoOverlay`, `DemoMapOverlay`, `DemoSiteSeed`; `ExploreEntrySource` â†’ `"landing" | "direct"` (was `"landing" | "direct" | "demo"`)
- `src/app/explore/page.tsx` â€” removed `demoId` param
- `src/hooks/useExploreState.ts` â€” removed all demo memos, effects, and state
- `src/hooks/useExploreData.ts` â€” removed `activeDemo` fetch condition
- `src/components/Landing/LandingPage.tsx` â€” removed guided demos section (~60 lines)
- `src/lib/landing.ts` â€” removed `demoId` from URL building

### UX audit fixes (shipped in final commit)

**Files changed:** `ExploreWorkspace.tsx`, `CesiumGlobe.tsx`, `AnalysisOverviewBanner.tsx`, `WorkspaceCardShell.tsx`, `DataLayers.tsx`, new `src/components/ui/skeleton.tsx`

| Fix | File | Change |
|---|---|---|
| GeoSight wordmark â†’ home Link | `ExploreWorkspace.tsx` | `<span>` â†’ `<Link href="/">` |
| Hamburger touch target | `ExploreWorkspace.tsx` | Added `h-11 w-11` to Button |
| ESC closes mobile sidebar | `ExploreWorkspace.tsx` | `useEffect` on `sidebarOpen` |
| Drive mode tooltip | `ExploreWorkspace.tsx` | Added `title` prop to drive Button |
| DataLayers always visible | `ExploreWorkspace.tsx` | Removed `shellMode === "board"` gate |
| Coord readout â†’ copy button | `ExploreWorkspace.tsx` | `<div>` â†’ `<button>` with clipboard + `copiedCoords` state; Copy/Check icons |
| Zoom +/âˆ’ controls | `CesiumGlobe.tsx` | Two buttons at `bottom-24 right-4 z-10`; call `viewerRef.current?.camera.zoomIn/Out(0.5)` |
| Bottom bar truncation | `AnalysisOverviewBanner.tsx` | Profile/summary hide until `xl:` breakpoint; Why score buttons always visible |
| Loading skeleton | `WorkspaceCardShell.tsx` | 3 skeleton lines replace full `StatePanel` for loading state |
| Layer control accessibility | `DataLayers.tsx` | The unified basemap/overlay panel now owns layer toggles and mobile-safe touch targets |
| Skeleton component | `src/components/ui/skeleton.tsx` | New `<Skeleton>` utility |

---

## Next Highest-Value Work

### P1 â€” Live non-US provider integrations (recommended next)

The US-first data gap is the most visible product weakness for non-US users. The `SourceAwarenessCard` coverage matrix already shows users exactly what's missing. Each integration follows the same pattern:

1. `src/lib/<provider>.ts` â€” fetch function with typed return
2. Add field to `GeodataResult` in `src/types/index.ts`
3. Add `sources.<key>` field to `GeodataResult.sources`
4. Wire into `Promise.allSettled` in `src/app/api/geodata/route.ts` with `withSoftTimeout`
5. Add source metadata in `route.ts` sources object
6. Update the relevant card component

**Priority targets:**

| Domain | Current gap | Best global replacement |
|---|---|---|
| Flood zones | FEMA US-only | JRC Global Flood Awareness System (GloFAS) â€” Copernicus, free REST API |
| Seismic hazard | USGS ASCE 7-22 US-only | USGS Unified Hazard Tool has a global API; GEM OpenQuake for probabilistic |
| Soil profile | NRCS SSURGO US-only | ISRIC World Soil Information â€” free REST API, global |
| Contamination | EPA Envirofacts US-only | EEA European industrial sites data |
| School quality | US Greatschools-based | Global school density via OSM + UNESCO data |

### P1 â€” Research-grade hazard cards

- **Seismic probabilistic hazard curves:** The USGS hazard curves API returns annual exceedance probability at multiple spectral periods (much more useful than a single design value). Would upgrade `SeismicDesignCard` or become `SeismicHazardCard` with a probability-vs-acceleration Recharts chart.
- **Flood depth mapping:** FEMA NFHL depth-grid data at the searched point, not just the zone label. Current `FloodRiskCard` shows zone (AE, X, etc.) but not inundation depth. FEMA's OGC services expose this.

### P1 â€” AI quality improvements

- **GeoAnalyst context completeness:** The system prompt in `src/app/api/analyze/route.ts` includes a geodata summary. The summary currently omits several newer fields (`solarResource`, `streamGauges`, `thermalLoad`). Audit the system prompt and ensure every `GeodataResult` field that has been added in the last 6 batches is represented in the AI context bundle.
- **Structured analysis output:** GeoScribe currently generates markdown prose. A structured JSON report (section headers + confidence labels + data gap flags) would make the output parseable and enable downstream features (PDF export, section-level regeneration).

### P2 â€” Advanced spatial and export

- **LiDAR / National Map overlays:** USGS 3DEP LiDAR tiles as an imagery layer on the globe. The unified `DataLayers` panel now owns basemap selection, so any future LiDAR mode should plug into that panel rather than reintroducing a separate switcher.
- **Shareable analysis snapshots:** Beyond the current "Share" button (which copies the URL), export a self-contained HTML or PDF snapshot of the current analysis bundle. GeoScribe already generates the prose â€” the missing piece is a layout wrapper and a server-side render.
- **Comparison export:** `CompareTable` currently shows a live side-by-side grid. A CSV or PDF export of the comparison would make the feature usable for decision reporting.

### P2 â€” Workspace UX

- **Command palette:** `Cmd+K` / `Ctrl+K` opens a search over card names, quick regions, and actions. The card registry (`src/lib/workspace-cards.ts`) already has all the metadata needed to power this.
- **Persistent AI input bar:** A fixed input field in the bottom bar (or right panel) that always routes to GeoAnalyst, instead of requiring the user to open the Chat card first. This dramatically reduces friction for conversational analysis.
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

When referencing border tokens in a `className`, use `border-[color:var(--border-soft)]` (not `border-[var(--border-soft)]`) â€” the `color:` prefix is required for Tailwind v4 to treat it as a color value.

### Card pattern

Every workspace card must use `WorkspaceCardShell` from `src/components/Explore/WorkspaceCardShell.tsx`. Direct `Card/CardHeader/CardContent` imports in `src/components/Explore/` are not allowed except in `WorkspaceCardShell.tsx` itself.

**New card checklist:**
1. Add `"your-card-id"` to `WorkspaceCardId` union in `src/types/index.ts`
2. Register in `src/lib/workspace-cards.ts` with all required fields
3. Add import + `geodataCards` set entry + `switch` case in `src/components/Explore/ExploreWorkspacePanels.tsx`
4. Add profile visibility defaults in `src/lib/profiles.ts`
5. Add reveal trigger case in `getRevealTriggers()` in `workspace-cards.ts`
6. If the card answers a new kind of question, add an intent in `src/lib/workspace-intent.ts` and extend `WorkspaceRevealTrigger` in `src/types/index.ts`
7. Run `npx tsc --noEmit` â€” must be clean

### Cesium conventions

- **Drawing entities belong in named `CustomDataSource`s, never `viewer.entities`** â€” `viewer.entities.removeAll()` is called on every state update and will wipe anything placed there. Use `CustomDataSource("drawing-preview")` for in-progress geometry and `CustomDataSource("drawing-shapes")` for persisted shapes.
- **Do not use Resium JSX components** (`<Viewer>`, `<Entity>`, etc.). The codebase uses the direct Cesium imperative API via `viewerRef`.
- **Drive mode camera:** `HeadingPitchRange` heading=0 places the camera **south** of target (not north) â€” do not add `Math.PI` to the heading. Vehicle box uses `heading - Math.PI/2` in `HeadingPitchRollQuaternion` to align the box long axis with movement direction.
- **Zoom controls:** `viewerRef.current?.camera.zoomIn(factor)` / `zoomOut(factor)` with `factor = 0.5`. Currently rendered above the lower-right floating layer button inside `CesiumGlobe.tsx`.

### Sidebar and layout

- `xl:fixed xl:inset-0 xl:overflow-hidden` on the root â€” do not add `overflow-x: hidden` to the body or this breaks fixed/sticky elements
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
      geodata/route.ts              # Main data aggregation â€” Promise.allSettled for all providers
      analyze/route.ts              # GeoAnalyst chat endpoint
      agents/route.ts               # Agent panel endpoint
      map-overlays/route.ts         # Live map overlay helpers (currently FIRMS detections)
      nearby-places/route.ts        # OSM Overpass nearby lookup
      geocode/route.ts              # Place search / coordinate resolution
      score/route.ts                # Deterministic scoring endpoint
      ai-status/route.ts            # Groq/Gemini liveness check

  components/
    Explore/
      ExploreWorkspace.tsx          # Full workspace shell â€” GIS layout, all state wiring
      ExploreWorkspacePanels.tsx    # Routes cardId â†’ primary or workspace panel component
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
      DataLayers.tsx                # Unified basemap + overlay panel (keyboard shortcut L)
      AoiDrawingToolbar.tsx         # Drawing tools toolbar
      RegionSelector.tsx            # Active region display + reset
    Landing/
      LandingPage.tsx               # Landing â€” Explorer (5 lenses) + Pro (analyst) flows
    Shell/
      Sidebar.tsx                   # Left sidebar â€” profiles + quick regions
      SearchBar.tsx                 # Location search
      ModeSwitcher.tsx              # Explorer â†” Pro toggle
    Status/
      StatePanel.tsx                # Loading / error / empty / unavailable states
    ui/
      skeleton.tsx                  # Skeleton loading component (NEW â€” animate-pulse lines)

  context/
    CardDisplayContext.tsx          # defaultCollapsed context â€” wraps right panel with true

  hooks/
    useExploreState.ts              # All globe/UI state â€” mode, point, layers, drawing, etc.
    useExploreData.ts               # Geodata fetch, scoring, cards, sites, report
    useSiteAnalysis.ts              # Scoring orchestration
    useWorkspaceCards.ts            # Card registry, visibility, board layout
    useAoiDrawing.ts                # Drawing tools â€” active interaction + persisted shapes
    useNearbyPlaces.ts              # OSM nearby fetch
    useHousingMarket.ts             # Housing market data fetch

  lib/
    profiles.ts                     # Mission profiles â€” factors, weights, card defaults
    scoring.ts                      # Deterministic scoring engine
    workspace-cards.ts              # Card registry â€” all metadata + reveal triggers
    workspace-intent.ts             # Question â†’ card intent detection (regex patterns)
    source-registry.ts              # Source metadata + regional fallback guidance
    analysis-summary.ts             # buildAnalysisOverview â€” strengths/watchouts/dataGaps
    explorer-lenses.ts              # 5 Explorer mode lenses
    lenses.ts                       # Lens ID â†” profile ID mapping
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

All set in the **Vercel project dashboard** (Settings â†’ Environment Variables). See `.env.example` for names.

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
| `GROQ_ANALYSIS_KEY` | GeoAnalyst dedicated lane (highest token usage â€” give it your best key) |
| `GROQ_WRITER_KEY` | GeoScribe dedicated lane |
| `GROQ_UX_KEY` | GeoGuide + GeoUsability shared lane |

**Recommended with 3 Groq accounts:** `GROQ_ANALYSIS_KEY` â†’ key 1 (highest quota), `GROQ_WRITER_KEY` â†’ key 2, `GROQ_API_KEY` â†’ key 3. Leave pool rotation vars empty.

### Optional

| Variable | What it enables |
|---|---|
| `GEMINI_API_KEY` | LLM fallback when Groq is down |
| `NASA_FIRMS_MAP_KEY` | WildfireRiskCard fire proximity â€” without it, fire proximity score = 0 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Geodata cache (1hr TTL) + cloud site sync |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Error monitoring |

### No key needed

NASA POWER, Open-Meteo, USGS, OSM Overpass, GDACS, OpenAQ, FEMA NFHL, Eurostat, FCC Broadband.

---

## Known Issues / Tech Debt

| Issue | Severity | Notes |
|---|---|---|
| Groq API keys missing from Vercel | HIGH | AI falls back to deterministic mode on prod â€” user needs to add keys via Vercel dashboard |
| FEMA soft timeout 12s | LOW | Raised from 6.5s; still may time out on slow FEMA servers |
| Overpass rate limits | MEDIUM | Public `overpass-api.de` can throttle; `overpass.kumi.systems` fallback wired |
| Fix 13 (nextSteps) not implemented | LOW | `buildAnalysisOverview` returns `nextSteps[]` but no component renders them â€” deferred |
| Fix 8 (tab active state) not changed | LOW | `ResultsModeToggle` uses `variant="default"` vs `variant="secondary"` which is already visually distinct; not changed |
| Zoom button overlap risk | LOW | Zoom controls still sit above the lower-right floating layer button. Re-check spacing if the button or panel footprint changes again. |


