# GeoSight Backlog & Roadmap

**Last updated:** 2026-05-07
**Active branch convention:** `phase-N-<short-name>` — one branch per phase, no nested worktrees.
**Live target domain:** [geosight.earth](https://geosight.earth) (deployment in Phase 6)

---

## Status snapshot

| Track | Status |
|---|---|
| Phase 0 — Global datasets plumbing | ✅ Shipped (merged 2026-05-07 in PR #4) |
| Phase 1A–1D — Terrain / SoilGrids / population / land cover | ✅ Shipped (PR #4) |
| Phase 2A–2C — Global hazards (flood, drought, seismic) | ✅ Shipped (PR #4) |
| Phase 2B — WFS Data Discovery card | ✅ Shipped (PR #4) |
| **Phase 3 — Country data packs** | 🟡 **Next up** |
| Phase 4 — Production hardening | ⏳ Planned |
| Phase 5 — Mobile + in-field UX | ⏳ Planned |
| Phase 6 — Launch on geosight.earth | ⏳ Planned |

---

## Phase 3 — Country Data Packs

**Goal:** Move from "global signals exist but spotty outside US" → "if a country has open geo data, GeoSight knows about it and uses it." Catalog tracked in [`docs/DATASETS_GLOBAL.md`](DATASETS_GLOBAL.md).

### Region packs (one PR per pack)

Priority order, scoped to top-demand markets per AGENTS.md:

1. **EU pack** — Copernicus CLC + Tree Cover Density, EFFIS active fires, GLoFAS flood, expanded Eurostat regional layers
2. **Canada / Greenland / Nordic** — NRCan base data, Statistics Norway/Sweden regional layers, Greenland geomatics
3. **Japan** — GSI topographic + hazard layers, J-SHIS seismic
4. **India** — Bhuvan ISRO platform, IMD weather, Census of India
5. **Australia / NZ** — Geoscience Australia, LINZ
6. **South America** (Amazon focus) — MapBiomas, INPE deforestation, IBGE
7. **Middle East / UAE** — Dubai Pulse, UAE National Atlas
8. **China** — GADM admin boundaries, RESDC land cover (license-permitting only)

### Per-pack acceptance criteria

- Trust labels degrade gracefully (`live` → `derived` → `limited` → `unavailable`) — never silent gaps.
- New providers registered in `src/lib/source-registry.ts` with accurate coverage metadata.
- 10 representative coordinates per region tested end-to-end.
- A click on Tokyo, Mumbai, Berlin, São Paulo, Auckland, or Reykjavik produces a scored briefing with **≥ 60% of factors as `live` or `derived`**. Dubai and Lagos minimum 40%.
- README "Data Sources" table updated.
- Region detection logic in geodata route picks best-available providers per coordinate.

### Implementation method

1. **Dataset Scout pass** for each region — produce ingestion specs in `docs/DATASETS_GLOBAL.md` (URL, license, coverage, resolution, access method, integration notes).
2. **Country-aware geodata routing** in `src/app/api/geodata/route.ts` — detect bounding country/region from coordinates; pick best providers; pass through trust labels.
3. **Iterative integration** — one PR per region pack. Branch name: `phase-3-<region>-pack` (e.g., `phase-3-eu-pack`).
4. **Test matrix** — sample coordinates per region committed to `tests/regional-coverage.test.ts`.

---

## Phase 4 — Production Hardening

**Goal:** Survive launch traffic without burning Cerebras spend or shipping bugs to real users.

| Track | File(s) | Notes |
|---|---|---|
| Scoring tests (TECH_DEBT #1) | `tests/unit/scoring.test.ts` | Jest setup + ~50 cases covering all 15 scoring functions |
| Error boundaries | `src/app/api/geodata/route.ts`, workspace shell | Wrap route assembly in try/catch returning structured partials; React error boundaries on `ExploreWorkspace` |
| Sentry integration | `src/hooks/useExploreData.ts` and elsewhere | Replace `console.warn`; capture geodata + AI failures; tag by region |
| Cerebras cost guards | `src/app/api/lens-analysis/route.ts` | Per-session token budget; cache by `(location, lensId, factor-hash)`; Upstash rate limit |
| Observability | `src/app/api/health/route.ts` (new) | Per-provider status check; timing instrumentation in geodata route |
| Memory leak (TECH_DEBT #5) | `src/components/Globe/CesiumGlobe.tsx` | Fix `setInterval` cleanup ordering |

**Acceptance:** `npm test` passes 50+ unit tests. Sentry receives errors in staging. `/api/health` returns per-provider status. Cerebras spend per analysis < $0.005.

---

## Phase 5 — Mobile & In-Field UX

**Goal:** Galaxy Note 9 / iPhone 14 are first-class. Field researchers can use it on a trail without a stylus.

| Track | Notes |
|---|---|
| Touch-first drawing | Polygon vertex grab targets ≥ 44px; pinch-zoom doesn't fight drawing |
| Responsive workspace | Collapsible sidebar/right-panel on `< 768px`; bottom-sheet for cards on mobile |
| Offline-ready map tiles | Cesium offline tile cache for active region (background prefetch on slow network) |
| Field Research lens upgrades | Photo capture with EXIF geotag → drop pin; quick-note text card |
| Hunt Planner mobile | Wind/elevation widget with one-tap add to saved sites |

**Acceptance:** Lighthouse mobile ≥ 85. All 9 lenses pass on iPhone 14 Safari + Galaxy Note 9 Chrome.

---

## Phase 6 — Launch on geosight.earth

**Goal:** Press the button.

| Track | Notes |
|---|---|
| DNS / Vercel | Point geosight.earth at Vercel project; canonical domain in `vercel.json` |
| SEO | OpenGraph cards per lens; sitemap.xml; structured data; canonical to geosight.earth |
| Landing polish | Hero copy reflecting "global by design"; stat chips with live dataset counts |
| Demo content | 6 curated demo locations (one per continent) at `/explore?demo=<id>` |
| Privacy / Terms | Review for global launch (GDPR, CCPA mentions) |
| Status page | Public uptime + provider status at `/status` reading `/api/health` |
| Launch announcement | Draft post + dataset coverage README update |

**Acceptance:** geosight.earth resolves. Lighthouse desktop ≥ 95. All 6 demo locations work end-to-end. Status page green.

---

## Working protocol

1. **Branch hygiene** — one phase = one branch named `phase-N-<short-name>`. Merge cleanly. No nested worktrees, no `claude/*` or `worktree-agent-*` proliferation.
2. **Tests + docs as part of done** — every phase ends with `npm test` green, this BACKLOG.md updated, `AGENTS.md` still accurate.
3. **AI backbone is Cerebras** (GeoAnalyst) + Gemini (GeoScribe). Tune them — don't replace.
4. **Trust over fluency** — never fabricate data. Trust labels (`live` / `derived` / `limited` / `unavailable` / `cached`) are non-negotiable; gaps are honest UX.
5. **One PR = one primary agent domain** (per `AGENTS.md`).

---

## Completed phases — historical reference

- **2026-05-07** — PR #4: Phases 0 / 1A–D / 2A–C / 2B shipped (35 files, +5,283 lines). See `PHASE_2B_COMPLETION.md` for Phase 2B detail.
- **2026-04-17** — Lens design system overhaul, MapLibre 2D, 4 new mission lenses, GIS analyst tools (Phase 5/6 of prior audit-driven work).
- **2026-04-15** — Audit response Phases 7/8/9 (legend panel, project save/load, symbology editor) shipped.
- **2026-04-02** — Explorer/Pro mode split landed.

The two prior audit docs (`docs/AUDIT_RESPONSE_PLAN.md`, `docs/TECH_DEBT_AUDIT.md`) are **superseded** by this BACKLOG and removed in this commit.
