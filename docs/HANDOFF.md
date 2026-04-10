# GeoSight — Agent Handoff Document

Last updated: 2026-04-10 (post GIS-layout refactor + UX audit fixes)

This document is written for agents (CODEX, Claude Code, or human devs) picking up the project cold. It covers the exact state of the codebase after the most recent session, what was shipped, what's next, and critical conventions to avoid breaking existing work.

---

## State of the Codebase

The app is fully deployed and functional at `https://geosight-gspat.vercel.app`. Main branch auto-deploys to Vercel on every push. TypeScript strict mode, zero type errors as of last commit.

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
      LandingPage.tsx               # Landing — Explorer (5 lenses) + Pro (analyst) flows
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
| Fix 13 (nextSteps) not implemented | LOW | `buildAnalysisOverview` returns `nextSteps[]` but no component renders them — deferred |
| Fix 8 (tab active state) not changed | LOW | `ResultsModeToggle` uses `variant="default"` vs `variant="secondary"` which is already visually distinct; not changed |
| Zoom button overlap risk | LOW | Zoom at `bottom-24 right-4` in CesiumGlobe; DataLayers at `bottom-10 right-4` in ExploreWorkspace — 20px gap; may need adjustment if DataLayers panel height changes |
