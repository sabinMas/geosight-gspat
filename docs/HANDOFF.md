# GeoSight — Agent Handoff Document

Last updated: 2026-04-09 (post-Userbrain audit fixes)

This document is written for agents (CODEX, Claude Code, or human devs) picking up the project cold. It covers the exact state of the codebase after the most recent session, what was shipped, what's next, and critical conventions to avoid breaking existing work.

---

## State of the Codebase

The app is fully deployed and functional at `https://geosight-gspat.vercel.app`. The main branch auto-deploys to Vercel on every push. No CI is broken.

### What's in the current build

**Workspace cards (23 total, all in `src/components/Explore/`):**

| Card ID | Component | Profile(s) | Note |
|---|---|---|---|
| `active-location` | `ActiveLocationCard` | All | Primary card, always visible |
| `chat` | `ChatPanel` | All | GeoAnalyst AI |
| `results` | `AnalysisTrendsPanel` / `NearbyPlacesList` | All | Tab-switched |
| `score` | `ScoreCard` | All | Deterministic scoring |
| `factor-breakdown` | `FactorBreakdown` | All | Score details |
| `compare` | `CompareTable` | All | Multi-site |
| `hazard-context` | `HazardCard` | All | Earthquake/fire/weather |
| `climate-history` | `ClimateHistoryCard` | All | ERA5 10-yr trend |
| `weather-forecast` | `WeatherForecastCard` | All | 7-day Open-Meteo |
| `flood-risk` | `FloodRiskCard` | All | FEMA (US only) |
| `air-quality` | `AirQualityCard` | hiking, residential | OpenAQ + Open-Meteo |
| `contamination-risk` | `ContaminationRiskCard` | All | EPA Envirofacts (US only) |
| `broadband-context` | `BroadbandCard` | All | FCC + Eurostat |
| `cooling-water` | `CoolingWaterCard` | data-center | Nearest waterway + USGS gauge |
| `groundwater` | `GroundwaterCard` | All | USGS WaterWatch (US) |
| `soil-profile` | `SoilProfileCard` | All | NRCS SSURGO (US) |
| `seismic-design` | `SeismicDesignCard` | data-center, residential, commercial | USGS ASCE 7-22 (US) |
| `drought-risk` | `DroughtRiskCard` | All | ERA5 precip deficit → 4-tier |
| `disaster-alerts` | `DisasterAlertsCard` | All | GDACS global feed |
| `wildfire-risk` | `WildfireRiskCard` | All | FIRMS + ERA5 + OSM land cover |
| `thermal-load` | `ThermalLoadCard` | All | Open-Meteo temp + wind + CDD |
| `stream-gauges` | `StreamGaugeCard` | data-center, site-dev, commercial | USGS NWIS all gauges ✨ new |
| `solar-resource` | `SolarResourceCard` | data-center, site-dev, commercial, residential | NASA POWER GHI global ✨ new |

Plus specialized cards: `demographics-context`, `housing-market`, `outdoor-fit`, `trip-summary`, `local-access`, `site-readiness`, `infrastructure-access`, `multi-hazard-resilience`, `resilience-score`, `hazard-details`, `earthquake-history`, `fire-history`, `school-context`, `source-awareness`, `terrain-viewer`, `elevation-profile`, `image-upload`, `land-classifier`.

**Board mode:** Multi-card. `openCardIds: WorkspaceCardId[]` — chips toggle open/close. Multiple cards stack. Old single-card `activeCardId` deprecated and backward-compat migrated.

---

## What Was Shipped This Session (Batches 10–17)

### Batch 10 — Universal card contract + DroughtRiskCard
- All 17 workspace cards migrated to `WorkspaceCardShell` (`src/components/Explore/WorkspaceCardShell.tsx`)
- `DroughtRiskCard` (`src/components/Explore/DroughtRiskCard.tsx`): ERA5 2015–2024 precip deficit (baseline 2015–2019 vs recent 2020–2024) + aridity class + heat amplification → Low/Moderate/High/Severe tier

### Batch 11 — DisasterAlertsCard
- `DisasterAlertsCard` (`src/components/Explore/DisasterAlertsCard.tsx`): GDACS global disaster feed with per-event rows (eventType icon, alert level badge, country + distance, date range, report link); green empty state when feed live but zero events

### Batch 12 — WildfireRiskCard
- `WildfireRiskCard` (`src/components/Explore/WildfireRiskCard.tsx`): 4 drivers scored from existing data (NASA FIRMS fire proximity 0–40 pts, ERA5 aridity 0–35 pts, OSM vegetation fuel load 0–15 pts, heat trend 0–10 pts) → normalized to 100 → 4-tier

### Batch 13 — Multi-card board mode
- `src/hooks/useWorkspacePresentation.ts` — rewritten: `openCardIds: WorkspaceCardId[]` replaces `activeCardId: WorkspaceCardId | null`; `StoredWorkspacePresentation` adds `openBoardCardIds: Record<string, WorkspaceCardId[]>`; old `activeBoardCards` read for backward compat
- `src/components/Explore/WorkspaceBoard.tsx` — chips use `openCardIds.includes(card.id)`; accent ring when open; `aria-pressed`

### Batch 14 — ThermalLoadCard
- `ThermalLoadCard` (`src/components/Explore/ThermalLoadCard.tsx`): first card to surface `geodata.climate.coolingDegreeDays` (computed since the climate API was built, never previously displayed)
- 4 drivers: ambient temp (0–40 pts), wind cooling (0–25 pts), climate trajectory (0–20 pts), CDD (0–15 pts) → normalized → Excellent/Favorable/Moderate/Challenging

### Batch 15 — Intent routing
- `src/lib/workspace-intent.ts` — 3 new `WorkspaceIntent` values: `"wildfire"` → `wildfire-risk`, `"alerts"` → `disaster-alerts`, `"climate"` → `drought-risk`
- `src/types/index.ts` — `WorkspaceRevealTrigger` extended: `"ask_climate"`, `"ask_wildfire"`, `"ask_alerts"`

### Batch 16 — StreamGaugeCard
- `StreamGaugeCard` (`src/components/Explore/StreamGaugeCard.tsx`): surfaces the full `geodata.streamGauges[]` array (previously only the nearest gauge appeared anywhere in the UI)
- `classifyFlow()`: normalized runoff index (CFS/sq mi) when `drainageAreaSqMi` available, raw CFS fallback
- `buildAvailabilityRating()`: Good (≤5 km, adequate flow) / Moderate (≤20 km) / Limited (>20 km flowing) / Uncertain / No gauge data
- Shows up to 8 gauges sorted by distance; overflow count; 3-col stat row (count, nearest, peak flow)

### Userbrain audit fixes (post-Batch 17)
Three code-only fixes from a full usability test against the production build:

- **Drive mode altitude accuracy** (`src/components/Globe/CesiumGlobe.tsx`): Added `terrainExaggerationRef` that stays in sync with the `terrainExaggeration` prop. The HUD now divides `height` by the exaggeration factor before display, so the altitude readout shows real-world elevation rather than the vertically-scaled camera position. At 1× exaggeration there is no change; at higher exaggerations the value is corrected back to MSL.
- **Compare button active state** (`src/components/Explore/ExploreWorkspace.tsx`): Compare button now uses `variant="default"` (active style) when the compare card is open, matching the Board/Library buttons. `title` tooltip changes based on `data.sites.length` — explains the 2-site requirement when not enough sites are saved.
- **Explorer form silent failure** (`src/components/Landing/LandingPage.tsx`): The input row stays `pointer-events-none` until a lens is chosen, but the button row is now always interactive. Clicking "Explore this place" or "Use my location" before selecting a lens now shows an inline error ("Choose a lens above before searching") instead of silently doing nothing.

### Batch 17 — SolarResourceCard + NASA POWER data source
- **New lib:** `src/lib/solar-resource.ts` — fetches NASA POWER climatology API (`ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `ALLSKY_KT`); free, no API key, global; 22-year averages (2001–2022), cached 7 days
- **New type:** `SolarResourceResult` imported into `src/types/index.ts` from the lib
- **New field:** `geodata.solarResource` and `geodata.sources.solarResource` added to `GeodataResult`
- **New card:** `SolarResourceCard` (`src/components/Explore/SolarResourceCard.tsx`)
  - 4-tier: Excellent (≥5.5 kWh/m²/day), Good (≥4.0), Moderate (≥2.5), Poor (<2.5)
  - Stat row: annual GHI, peak sun hours, clearness %
  - Monthly Recharts bar chart with best/worst month annotation
  - Cloud-impact panel: actual vs clear-sky GHI ratio with progress bar
- Wired into `Promise.allSettled` in `route.ts` (10s soft timeout); `WorkspaceCardId`; `workspace-cards.ts` (order 133); `ExploreWorkspacePanels.tsx`

### Usability fixes (between Batch 15 and 16)
- `src/hooks/useExploreState.ts` — added missing demo fly-to `useEffect`: when `activeDemo` changes, calls `selectPoint(activeDemo.coordinates, activeDemo.locationName)` — was a bug where Tokyo/WA demos didn't fly to their coordinates
- `src/components/Landing/LandingPage.tsx` — Explorer form validates `locationQuery.trim()` before navigating; demo card "Open demo →" now `opacity-60` (was `opacity-0`) so link is always faintly visible
- `src/app/api/geodata/route.ts` — FEMA soft timeout raised from 6.5s → 12s
- `src/lib/overpass.ts` — Overpass fallback mirror added (`overpass.kumi.systems`) in `fetchOverpass()` helper
- `src/app/layout.tsx` — blocking inline script in `<head>` prevents theme FOUC for light-mode users

---

## Next Highest-Value Work

### P1 — Live non-US provider integrations (recommended next)

The US-first data gap is the most visible weakness for international users. The coverage matrix in `SourceAwarenessCard` explicitly shows users what's missing. Eurostat NUTS2 demographics and Eurostat broadband are already wired. The pattern for adding a new regional provider is:

1. Create a lib file under `src/lib/` with a fetch function returning a typed result
2. Add result type import and field to `GeodataResult` in `src/types/index.ts`
3. Add source metadata key to `GeodataResult.sources`
4. Wire fetch into `Promise.allSettled` in `src/app/api/geodata/route.ts` with a `withSoftTimeout` call
5. Add source metadata block in the `sources:` object in `route.ts`
6. Update the relevant card component to consume the new field

| Domain | Current gap | Best global target |
|---|---|---|
| Flood zones | FEMA US-only | JRC Global Flood Awareness System (Copernicus) |
| Seismic hazard | USGS ASCE 7-22 US-only | USGS Unified Hazard Tool has global API; GEM OpenQuake for probabilistic |
| Soil profile | NRCS SSURGO US-only | ISRIC World Soil Information (free REST API, global) |
| Contamination | EPA US-only | EEA (European Environment Agency) industrial site data |

### P1 — Research-grade hazard cards

- **Seismic probabilistic hazard:** USGS hazard curves API returns annual exceedance probability at multiple spectral periods — much more useful than a single design value. Would add a chart to `SeismicDesignCard` or a new `SeismicHazardCard`.
- **Flood depth mapping:** FEMA NFHL depth-grid data at the current point rather than just the zone label. Significant upgrade to `FloodRiskCard`.

### P2 — Advanced spatial and export
- LiDAR / National Map layer overlays on the globe
- Stronger share/export flows beyond the current GeoScribe panel

---

## Critical Conventions (do not break)

### Design tokens
Never use raw Tailwind palette classes (`bg-blue-500`, `border-gray-200`). Always use CSS custom properties:
- `var(--accent)` — cyan #00e5ff, primary interactive
- `var(--success-soft)` / `var(--success-border)` — green signals
- `var(--warning-soft)` / `var(--warning-border)` / `var(--warning-foreground)` — amber signals
- `var(--danger-soft)` / `var(--danger-border)` / `var(--danger-foreground)` — red/error signals
- Full token list in `src/app/globals.css`

### Card pattern
Every workspace card must use `WorkspaceCardShell` from `src/components/Explore/WorkspaceCardShell.tsx`. Direct `Card/CardHeader/CardContent` imports in `src/components/Explore/` are not allowed (except `WorkspaceCardShell.tsx` itself and `ExploreWorkspacePanels.tsx` for placeholder states).

**New card checklist:**
1. Add `"your-card-id"` to `WorkspaceCardId` union in `src/types/index.ts`
2. Register in `src/lib/workspace-cards.ts` with all required fields (`id`, `title`, `summary`, `questionAnswered`, `regionCoverage`, `failureMode`, `freshnessWindow`, `nextActions`, `icon`, `category`, `zone`, `emphasis`, `defaultSize`, `defaultVisibility`, `defaultOrder`, `requiredData`, `supportedProfiles`, `emptyState`)
3. Add import + `geodataCards` set entry + `switch` case in `src/components/Explore/ExploreWorkspacePanels.tsx`
4. Add reveal trigger case in `getRevealTriggers()` in `workspace-cards.ts`
5. If the card answers a new kind of question, add an intent in `src/lib/workspace-intent.ts` and extend `WorkspaceRevealTrigger` in `src/types/index.ts`
6. Run `npx tsc --noEmit` — must be clean before committing

### Board mode storage schema
`StoredWorkspacePresentation` in `src/hooks/useWorkspacePresentation.ts`:
- Current key: `openBoardCardIds: Record<string, WorkspaceCardId[]>` — keyed by `normalizedProfileId`
- Legacy key: `activeBoardCards: Record<string, WorkspaceCardId>` — read-only for backward compat; never written
- `SavedBoard.openCardIds?: WorkspaceCardId[]` is the current array; `activeCardId` is deprecated but kept for old saved boards

### Drawing tools
Never add drawing entities to `viewer.entities` — they will be wiped by `viewer.entities.removeAll()` on every state update. Always use a named `CustomDataSource`.

### Button variants
`variant="outline"` does not exist. Use `"secondary"` for secondary actions.

### Typecheck
Run `npx tsc --noEmit` from the project root before every commit. The CI will catch failures but a wasted deploy is expensive. All recent batches have shipped with zero type errors.

---

## Key File Map (recent additions)

```
src/
  components/Explore/
    DroughtRiskCard.tsx         # ERA5 precip deficit → drought tier
    DisasterAlertsCard.tsx      # GDACS global disaster feed
    WildfireRiskCard.tsx        # FIRMS + ERA5 + OSM → fire tier
    ThermalLoadCard.tsx         # Open-Meteo temp/wind/CDD → cooling tier
    StreamGaugeCard.tsx         # USGS NWIS all gauges — availability + flow rating
    SolarResourceCard.tsx       # NASA POWER GHI → 4-tier solar resource (✨ latest)
    WorkspaceCardShell.tsx      # Universal card wrapper (all cards use this)
    ExploreWorkspacePanels.tsx  # Routes cardId → component

  hooks/
    useWorkspacePresentation.ts # openCardIds[] — multi-card board state
    useExploreData.ts           # openBoardCards derived from openCardIds

  lib/
    solar-resource.ts           # NASA POWER fetch + SolarResourceResult type (✨ latest)
    workspace-intent.ts         # Question → card intent detection
    workspace-cards.ts          # Card registry — all metadata + triggers
    stream-gauges.ts            # sanitizeStreamGauges + formatDistanceKm helpers
    open-meteo.ts               # fetchClimateSnapshot — coolingDegreeDays lives here
    climate-history.ts          # fetchClimateHistory — ERA5 archive

  types/index.ts                # WorkspaceCardId union, WorkspaceRevealTrigger union, GeodataResult
  app/api/geodata/route.ts      # Main data aggregation — all provider fetches
```

---

## Data Sources Reference

| Source | Where used | Coverage | Key fields |
|---|---|---|---|
| Open-Meteo forecast | `climate.*` | Global | `averageTempC`, `windSpeedKph`, `coolingDegreeDays`, `weatherRiskSummary` |
| Open-Meteo ERA5 archive | `climateHistory.*` | Global | `summaries[].totalPrecipitationMm`, `summaries[].maxTempC`, `trendDirection` |
| NASA POWER | `solarResource.*` | Global (no key needed) | `annualGhiKwhM2Day`, `clearSkyGhiKwhM2Day`, `clearnessIndex`, `monthlyGhi[12]` |
| NASA FIRMS | `hazards.activeFireCount7d`, `nearestFireKm` | Global (requires `NASA_FIRMS_MAP_KEY`) | Fire detection 7-day |
| GDACS | `hazardAlerts.*` | Global | `featuredAlerts[]`, `totalCurrentAlerts`, `elevatedCurrentAlerts`, `redCurrentAlerts` |
| USGS earthquake | `hazards.earthquakeCount30d` | Global | 30-day counts + magnitude |
| FEMA NFHL | `floodZone.*` | US only | `floodZone`, `isSpecialFloodHazard` |
| USGS NWIS | `streamGauges[]` | US only | `dischargeCfs`, `drainageAreaSqMi`, `distanceKm`, `siteName` |
| OpenAQ | `airQuality.*` | Global where stations exist | PM2.5/PM10 readings |
| OSM Overpass | `landClassification[]`, `amenities.*`, `nearestWaterBody`, `nearestRoad` | Global | Land cover buckets, amenity counts |
| FCC Broadband | `broadband.*` | US only | Technology availability by address |
| Eurostat | `broadband.*`, `demographics.*` | EU NUTS2 | Household connectivity, population, income |
| EPA Envirofacts | `epaHazards.*` | US only | Superfund + TRI sites |
| NRCS SSURGO | `soilProfile.*` | US only | Soil type, drainage, AWC |
| USGS seismic | `seismicDesign.*` | US only | Ss, S1, PGA (ASCE 7-22) |

---

## Environment Variables

All env vars are set in the **Vercel project dashboard** (Settings → Environment Variables). Do not commit keys to the repo. See `.env.example` for key names.

### Required — app is broken without these

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | cesium.com/ion → Access Tokens | Globe does not render at all |
| `GROQ_API_KEY` | console.groq.com → API Keys | All AI features fall back to deterministic mode |

### AI key pool — add all keys you have

The chat, analysis, and agent endpoints use a random-key rotation pool across these three vars. Adding all your keys maximises throughput before Groq rate-limits kick in.

| Variable | Used by | Notes |
|---|---|---|
| `GROQ_API_KEY` | Chat, analysis fallback pool | **Required** — pool needs at least one key |
| `GROQ_API_KEY_2` | Rotation pool | Optional but recommended if you have extra keys |
| `GROQ_API_KEY_3` | Rotation pool | Optional |

### Per-agent keys — dedicated lanes for each GeoSight AI agent

Each agent (`geo-analyst`, `geo-scribe`, `geo-guide`, `geo-usability`) has its own key env var so one agent can't starve another on rate limits. If a per-agent key is missing, the agent falls back to the pool above.

| Variable | Agent | Notes |
|---|---|---|
| `GROQ_ANALYSIS_KEY` | GeoAnalyst (site analysis) | Highest token usage — give it a dedicated key |
| `GROQ_WRITER_KEY` | GeoScribe (report generation) | High token usage — give it a dedicated key |
| `GROQ_UX_KEY` | GeoGuide + GeoUsability (UX help) | Low token usage — can share one key for both |

**Recommended setup with multiple Groq keys:** Put your highest-quota key in `GROQ_ANALYSIS_KEY`, a second key in `GROQ_WRITER_KEY`, a third in `GROQ_API_KEY` (pool), and optionally a fourth in `GROQ_UX_KEY`. Leave `GROQ_API_KEY_2` and `GROQ_API_KEY_3` empty unless you have more keys — the pool only helps if the keys have separate rate-limit buckets (i.e. different accounts).

### Optional but improves coverage

| Variable | Where to get it | What it enables |
|---|---|---|
| `GEMINI_API_KEY` | aistudio.google.com | Fallback LLM when Groq is down; text-embedding-004 RAG |
| `NASA_FIRMS_MAP_KEY` | firms.modaps.eosdis.nasa.gov → API key | `WildfireRiskCard` fire proximity data — without it, fire proximity score = 0 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | upstash.com → create Redis database | Shared rate limiting + geodata cache (1hr TTL) + cloud site sync across devices |
| `AUTH_SECRET` | run `npx auth secret` locally | Required if using OAuth sign-in |
| `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` | console.cloud.google.com → OAuth credentials | Google sign-in |
| `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` | github.com → Settings → Developer Apps | GitHub sign-in |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | sentry.io | Error monitoring + source map uploads |

### No API key needed

These data sources used by GeoSight are completely free with no authentication:
- **NASA POWER** (`SolarResourceCard`) — global solar irradiance
- **Open-Meteo** — weather forecast + ERA5 climate history
- **USGS** — earthquakes, stream gauges, groundwater, elevation, seismic design values
- **OpenStreetMap / Overpass** — infrastructure, amenities, land cover
- **GDACS** — global disaster alerts
- **OpenAQ** — air quality stations
