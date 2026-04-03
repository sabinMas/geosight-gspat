# GeoSight — Claude Code Instructions

This file is read at the start of every Claude Code session. Keep it current.

---

## What This Project Is

GeoSight is a geospatial intelligence app for first-pass location decisions. Users pick a lens (Home Buying, Site Development, Data Center Cooling, Commercial/Warehouse, Hiking/Recreation), search a real place, and get a live analysis bundle: terrain, climate, hazards, nearby places, source trust, and an AI-assisted narrative.

It is **not** a map plus chatbot. The core product promise is: search a place → understand what stands out → see why the score moved → inspect evidence trustworthiness — without needing GIS software.

Deployed at: `https://geosight-gspat.vercel.app`

---

## Stack

- **Framework**: Next.js 15 App Router, React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 — design tokens only (see Design System below)
- **Globe**: Cesium + Resium (3D terrain, satellite/road/hillshade basemaps)
- **Charts**: Recharts
- **AI**: Groq (primary) + Gemini Flash (fallback) for reasoning and report generation
- **Deployment**: Vercel, single `main` branch → auto-deploy

---

## Key File Map

```
src/
  app/
    page.tsx                        # Landing page route
    explore/page.tsx                # Explore workspace route
    api/
      geodata/route.ts              # Main data aggregation — most complexity lives here
      analyze/route.ts              # AI chat endpoint
      agents/route.ts               # Agent panel endpoint
      nearby-places/route.ts        # OSM Overpass nearby lookup
      geocode/route.ts              # Place search / coordinate resolution
      score/route.ts                # Deterministic scoring endpoint
      ai-status/route.ts            # Liveness check for AI keys

  components/
    Landing/LandingPage.tsx         # Landing page — Explorer (simple) + Pro (analyst) flows
    Explore/
      ExploreWorkspace.tsx          # Main workspace shell — state wiring, layout
      ExploreWorkspacePanels.tsx    # Routes cardId → primary or workspace panel component
      ExploreProvider.tsx           # Init params context
      ActiveLocationCard.tsx        # Location summary + signal cards + overview
      AnalysisOverviewBanner.tsx    # Strengths / tradeoffs / trust banner
      AddViewTray.tsx               # Suggested-card tray in guided mode
      WorkspaceBoard.tsx            # Board mode card grid
      WorkspaceLibrary.tsx          # Card library browser
    Results/
      AnalysisTrendsPanel.tsx       # Live context signal grid
      NearbyPlacesList.tsx          # OSM nearby places
      ResultsModeToggle.tsx         # Analysis / Nearby tab switcher
    Analysis/
      ChatPanel.tsx                 # GeoAnalyst chat
      CapabilityLauncher.tsx        # Structured capability analysis
    Globe/
      CesiumGlobe.tsx               # Globe + drive mode
      DataLayers.tsx                # Layer toggles (heatmap, etc.)
    Shell/
      Sidebar.tsx                   # Left sidebar — lens selector + quick regions
      ProfileSelector.tsx           # Carousel of mission profiles
      SearchBar.tsx                 # Location search input
      ModeSwitcher.tsx              # Explorer ↔ Pro toggle
    Source/
      SourceInfoButton.tsx          # Source detail popover trigger
      SourceInlineSummary.tsx       # Inline source freshness card
      SourceStatusBadge.tsx         # Live / limited / unavailable badge
      TrustSummaryPanel.tsx         # Trust summary with source list

  hooks/
    useExploreState.ts              # All globe/UI state (mode, point, layers, etc.)
    useExploreData.ts               # Geodata fetch, scoring, cards, sites, report
    useSiteAnalysis.ts              # Scoring orchestration
    useWorkspaceCards.ts            # Card registry, visibility, board layout
    useNearbyPlaces.ts              # OSM nearby fetch
    useHousingMarket.ts             # Housing market data fetch

  lib/
    profiles.ts                     # Mission profiles — factors, weights, card defaults
    scoring.ts                      # Deterministic scoring engine
    scoring-methodology.ts          # Score factor methodology copy
    workspace-cards.ts              # Card registry — all available cards
    source-registry.ts              # Source metadata + regional fallback guidance
    source-metadata.ts              # Per-source freshness / coverage metadata
    analysis-summary.ts             # buildAnalysisOverview — strengths/watchouts/dataGaps
    explorer-lenses.ts              # 5 Explorer mode lenses (simpler first-run)
    lenses.ts                       # Lens ID ↔ profile ID mapping + public labels
    landing.ts                      # Use cases, surprise locations, buildExploreHref
    demos/registry.ts               # Demo registry (guided stories)
    cesium-search.ts                # Geocoding + coordinate resolution
    geospatial.ts                   # Spatial helpers
    stream-gauges.ts                # formatDistanceKm and USGS gauge helpers
    app-mode.ts                     # isExplorerMode helper
    groq.ts                         # Groq client + model selection
    gemini.ts                       # Gemini client
    network.ts                      # fetchWithTimeout
    request-guards.ts               # API route rate limiting and guards
```

---

## Design System

**Never use raw Tailwind color classes** (`bg-blue-500`, `border-gray-200`, `text-neutral-700`). Always use CSS custom property tokens defined in `src/app/globals.css`.

Core tokens:
```
--foreground              Main text
--foreground-soft         Secondary text
--muted-foreground        Tertiary / metadata text
--background              Page background
--surface-panel           Card / panel background
--surface-raised          Slightly elevated surface
--surface-soft            Subtle fill
--surface-overlay         Overlay background
--border-soft             Default border
--border-strong           Emphasis border
--accent                  Cyan (#00e5ff) — primary action / active state
--accent-soft             Accent background tint
--accent-strong           Accent border
--accent-foreground       Text on accent background
--success-soft            Green signal background
--success-border          Green signal border
--warning-soft            Amber signal background
--warning-border          Amber signal border
--warning-foreground      Text on warning background
--danger-soft             Red error background
--danger-border           Red error border
--danger-foreground       Text on danger background
--shadow-soft             Subtle shadow
--shadow-panel            Panel shadow
```

If you find `border-neutral-*` or `dark:border-neutral-*` in existing code, replace with `border-[color:var(--border-soft)]`.

**Typography conventions:**
- Eyebrow labels: `<div className="eyebrow">` (defined in globals.css)
- Card titles: `<CardTitle>` — should be a **name**, not a sentence
- Section headings inside cards: `text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]`
- Body: `text-sm leading-6` or `text-sm leading-7`
- Metadata / muted: `text-xs text-[var(--muted-foreground)]`
- Never use raw pixel font sizes like `text-[9px]` — minimum readable is `text-xs` (12px)

**Radius / rounding conventions:**
- Full cards: `rounded-2xl`
- Inner panels / signal cards: `rounded-xl`
- Pill badges: `rounded-full`
- Inner sub-cards: `rounded-[1.25rem]` or `rounded-[1.5rem]`

**Interactive elements:**
- Static labels that look like pills must have `cursor-default pointer-events-none select-none`
- Buttons use `variant="default" | "secondary" | "ghost" | "amber"` — no `"outline"`
- All action buttons: `className="rounded-full"`

---

## Architecture Decisions

### Explorer vs Pro mode
- **Explorer** (`appMode === "explorer"`): simpler, consumer-facing. 5 lenses. Guided first-run. Fewer cards visible.
- **Pro** (`appMode === "pro"`): full analyst workspace. Board mode, library, all cards, comparison table, report generation.
- `isExplorerMode(appMode)` in `src/lib/app-mode.ts` is the single truth.
- The landing page routes Explorer entries with `appMode: "explorer"` and a `lensId` param.

### Data flow
```
useExploreState (UI state)
  + useExploreData (data fetching, scoring, cards)
    → /api/geodata (live aggregation)
    → useSiteAnalysis (deterministic score)
    → useWorkspaceCards (card registry, visibility)
    → useNearbyPlaces (OSM)
    → useHousingMarket (housing data)
```

### Analysis overview
`buildAnalysisOverview()` in `src/lib/analysis-summary.ts` takes `{geodata, score, profile, locationName, loading, error}` and returns:
- `strengths[]` — top-impact factors, filtered to exclude unavailable data
- `watchouts[]` — highest-gap factors, filtered to exclude unavailable data
- `dataGaps[]` — items filtered out because they contain "unavailable", "not available", "no data", or "limited"
- `trustNotes[]` — source count and proxy weight notes
- `nextSteps[]` — generic action prompts (currently only shown in collapsed trust section)
- `confidenceLabel`, `tone`, `summary`, `statusDetail`

### Source trust model
Sources have `status: "live" | "derived" | "limited" | "unavailable" | "cached"`. The UI must always distinguish these — never show a gap as if it were a real result.

### Card registry
`src/lib/workspace-cards.ts` defines all available cards. Each card has:
- `id: WorkspaceCardId`
- `zone: "primary" | "workspace"`
- `defaultSize: "normal" | "wide"`
- Profile `visibility` defaults
- `questionAnswered`, `coverageNote`, `failureMode`, `nextActions` metadata

### Drive mode
Implemented in `CesiumGlobe.tsx`. WASD + arrow keys. Important conventions:
- Camera offset uses `heading` (not `heading + Math.PI`) because Cesium's `HeadingPitchRange` heading=0 places the camera **south** of target (not north)
- Vehicle box uses `heading - Math.PI/2` in `HeadingPitchRollQuaternion` to align the box's long axis (local X) with the movement direction

---

## UX Conventions (from Userbrain + audit)

These are decisions that have been tested and should not be undone:

1. **Unavailable data must never appear in green/amber signal boxes.** `buildAnalysisOverview` filters these to `dataGaps[]`. The UI renders them only in a collapsible "⚠ N signals could not be confirmed" row.

2. **Card titles are names, not sentences.** `ActiveLocationCard` title = location name. `AnalysisOverviewBanner` title = location name. `ChatPanel` title = "Ask".

3. **Trust / grounding is collapsed by default.** The "View grounding sources" toggle in ChatPanel defaults to `false`. "Trust details & next steps" in the banner defaults to `false`.

4. **The workspace has one orientation layer.** The "Choose your next view" section title/description has been removed — the button row sits directly in the flow.

5. **Default results tab is Nearby** (`resultsMode` defaults to `"nearby_places"` in `useExploreState`).

6. **No permanent boilerplate.** OSM coverage disclaimers, "GeoSight won't fabricate" paragraphs, and similar copy belong only in empty states — not as always-visible furniture on full-data views.

7. **Step labels on landing.** The Explorer hero section shows "STEP 1 — CHOOSE A LENS" and "STEP 2 — ENTER A LOCATION". The search form is always rendered but `opacity-50 pointer-events-none` until a lens is selected.

---

## Common Patterns

### Adding a new workspace card
1. Add the card ID to `WorkspaceCardId` union in `src/types/index.ts`
2. Register the card in `src/lib/workspace-cards.ts` with full metadata
3. Add the render case in `src/components/Explore/ExploreWorkspacePanels.tsx`
4. Add profile visibility defaults in `src/lib/profiles.ts`

### Adding a new mission profile
1. Add to `PROFILES` array in `src/lib/profiles.ts` with factors, weights, and `defaultLayers`
2. Add lens label to `LENS_LABELS` in `src/lib/lenses.ts`
3. Update `PUBLIC_TO_PROFILE_ID` and `PROFILE_TO_PUBLIC_LENS_ID` in `src/lib/lenses.ts`
4. Add to `LANDING_USE_CASES` / `EXAMPLE_STARTERS` in `src/lib/landing.ts`
5. Add icon mapping to `PROFILE_ICON_BY_ID` in `src/components/Shell/ProfileSelector.tsx`

### Adding a new data source
1. Create the API route under `src/app/api/`
2. Add source metadata to `src/lib/source-metadata.ts`
3. Register in `src/lib/source-registry.ts` with regional variants if applicable
4. Wire into `src/app/api/geodata/route.ts`
5. Add the `DataSourceMeta` key to `GeodataResult.sources` in `src/types/index.ts`

---

## Environment Variables

See `.env.example` for all keys. Minimum for local development:
- `NEXT_PUBLIC_CESIUM_ION_TOKEN` — globe will not render without this
- `GROQ_API_KEY` — chat and analysis will fall back to deterministic mode without this

Optional:
- `GROQ_API_KEY_2`, `GROQ_API_KEY_3` — rotation pool for rate limits
- `GROQ_ANALYSIS_KEY`, `GROQ_UX_KEY`, `GROQ_WRITER_KEY` — per-agent keys
- `GEMINI_API_KEY` — fallback reasoning + RAG embeddings
- `NASA_FIRMS_MAP_KEY` — fire detection coverage
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — shared rate limiting

---

## Dev Workflow

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # starts on :3000

npm run typecheck            # tsc --noEmit (run before every commit)
npm run lint                 # eslint
npm run test:ui              # Playwright E2E
```

Vercel preview deploys automatically on every push to `main`.

---

## What Not To Do

- Do not add `overflow-x: hidden` to the body or root — it breaks sticky/fixed elements
- Do not use `border-neutral-*` or hardcoded hex colors — use CSS tokens
- Do not render unavailable/missing data strings inside the green strengths or amber watchouts columns
- Do not skip `npx tsc --noEmit` before committing — the CI will catch it but it wastes a deploy
- Do not add boilerplate "GeoSight doesn't fabricate results" copy to views that have live data — put it in empty states only
- Do not make static label spans look interactive — add `cursor-default pointer-events-none select-none`
- Do not set `variant="outline"` on `<Button>` — it is not in the variant list; use `"secondary"`

---

## Current Backlog Priority

See `docs/BACKLOG.md` for full detail. Short version:

**P0 — trust and data quality**
- Inline provenance in every headline output (not just dedicated trust panels)
- Standardise `direct live` / `derived live` / `proxy heuristic` labeling throughout

**P1 — card platform**
- Saved named dashboard layouts
- Drag-and-drop card composition in board mode

**P1 — global coverage**
- Live non-US provider integrations (flood, broadband, school, contamination)
- Regional provider selection exposed in UI

**P1 — domain expansion**
- Travel / trip-planning card family
- Richer multi-hazard resilience stack

**P2 — spatial tools**
- Polygon drawing
- LiDAR / National Map layers
- Export and share beyond GeoScribe panel

---

## References

- `README.md` — user-facing product overview and quick start
- `docs/BACKLOG.md` — full milestone inventory
- `docs/RELEASE_RUNBOOK.md` — deploy checklist and AI environment validation
- `agents.md` — product north star and agent system description
