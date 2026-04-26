# GeoSight — Submission Handoff

**Last updated:** 2026-04-26  
**Contest deadline:** HandshakeAI / Codex Creator (April 30, 2026)  
**Deployed at:** https://geosight-gspat.vercel.app  
**Branch:** `main` (auto-deploys to Vercel on push)

---

## What Was Shipped — 2026-04-25 Session

All merged to `main`. Five commits:

| Commit | What | Why |
|---|---|---|
| `81a06c6` | Switch Cerebras default model to `llama3.1-8b` | `qwen-3-235b-a22b-instruct-2507` was a preview-only model with no uptime guarantee — every chat request was silently timing out and falling back to deterministic mode |
| `81a06c6` | Add `console.error` logging on Cerebras stream failure + analyze route fallback | Failures were being swallowed — Vercel logs now surface the real error name + status + key prefix |
| `ad00fe6` | Remove Compare button from `WorkspaceToolRail` | Duplicated the bottom-bar Compare with no guard logic; bottom-bar version has count badge + disabled state |
| `ad00fe6` | Fix "Why score" button — auto-switch to board mode for workspace-zone cards | `factor-breakdown` is `zone: "workspace"` — `openCard` fell through to `openCardFromTray` which added it to `openCardIds` but right panel never opened in guided/focused mode |
| `87f7fe8` | Floating "Ask GeoSight" button now opens real Cerebras chat | The `AgentPanel` floating button was routing to `/api/agents/geo-analyst` (intentionally deterministic) — added `registerOpenChat`/`openChat` to `AgentPanelContext` so `ExploreWorkspace` can wire the button to the real ChatPanel |
| `00c5cd6` | Use `setActivePrimaryCardId` for chat card | `chat` is `zone: "primary"` — `openCard("chat")` was routing through board-mode pathway (`openWorkspaceCard` → `openCardIds`) but primary cards need `setActivePrimaryCardId` to actually display in the right panel |

### Files touched

- `src/lib/groq.ts` — model default + error logging
- `src/app/api/analyze/route.ts` — stream fallback error logging
- `src/components/Explore/WorkspaceToolRail.tsx` — Compare button removed, Panels button spans 2 cols
- `src/components/Explore/ExploreWorkspace.tsx` — `openCard` zone-aware, `registerOpenChat` wired
- `src/components/agent-panel/AgentPanel.tsx` — floating button calls `openChat()`
- `src/context/AgentPanelContext.tsx` — added `registerOpenChat` + `openChat` via `useRef`

---

## Architecture Note: `openCard` zone routing

The `openCard` callback in `ExploreWorkspace.tsx` now branches three ways:

1. **Board mode**: any card → add to `openCardIds`, set `viewMode="board"`
2. **Workspace-zone card in non-board mode**: switch to board mode, add to `openCardIds`
3. **Primary-zone card in non-board mode**: fall through to `openCardFromTray`

The chat-card path bypasses `openCard` entirely — it uses `setActivePrimaryCardId` directly because primary cards have their own state (`activePrimaryCardId`) that drives the right panel, separate from `openCardIds`.

If you add new primary-zone cards (currently `active-location`, `chat`, `results`), make sure their open flow uses `setActivePrimaryCardId`, not `openCard`.

---

## What Was Shipped — 2026-04-24 Session

All merged to `main`:

| Commit | What |
|---|---|
| Remove Gemini fallback | Analysis chain is now Cerebras → deterministic. Gemini key is optional (RAG only). |
| CSS overflow guards | `globals.css` defensive classes; `markdown-content.tsx` `whitespace-pre-wrap` removed (fixed one-word-per-line streaming bug) |
| Demo tour viewport fix | Tour callout no longer overflows the bottom of the screen; `maxHeight` clamped per placement |
| Region rectangle removal | Blue bounding box replaced with a subtle 25%-opacity thin outline; no fill |
| Agents → deterministic | **geo-scribe, geo-analyst, geo-guide** now return instant data-driven responses with zero Cerebras tokens. Only ChatPanel (`/api/analyze`) uses the API key. |
| Enhanced report builder | `buildGeoScribeFallback` now produces full markdown tables: Location, Climate, Air Quality, Hazards, Solar, Demographics, Amenities |

---

## AI Architecture (Current State)

```
ChatPanel (/api/analyze)
  → Cerebras llama3.1-8b (override via CEREBRAS_MODEL env var)
  → 3-key pool (CEREBRAS_API_KEY / _2 / _3) with 429-retry
  → 600 max_tokens, 6-turn history cap, compactToBudget safety net
  → Falls back to deterministic assessment if quota exceeded

Agent Panel (/api/agents/*)
  → geo-usability: deterministic UI audit (no API)
  → geo-guide: deterministic navigation hints (no API)
  → geo-analyst: deterministic buildFallbackAssessment (no API)
  → geo-scribe: deterministic data table report (no API)

Report Generation (Generate Report button)
  → calls /api/agents/geo-scribe (deterministic, no API)
  → returns full markdown report from live geodata bundle
```

**Key env vars required:**
- `NEXT_PUBLIC_CESIUM_ION_TOKEN` — globe rendering
- `CEREBRAS_API_KEY` / `_2` / `_3` — ChatPanel (pool of up to 3 keys; free tier: ~60 RPM, 1M TPD per key)
- `GEMINI_API_KEY` — optional, only needed if `RAG_ENABLED=true`
- `NASA_FIRMS_MAP_KEY` — fire data (optional, fallback works without it)
- `NPS_API_KEY` — national parks data
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — shared rate limiting

**Cerebras rate limits (from docs):**
- llama3.1-8b: 30 RPM, 60K TPM, 1M TPD (free tier, per key)
- With 3-key pool: ~90 RPM effective, 3M TPD — handles concurrent users comfortably
- Rate limiting at `/api/analyze`: 15 req/min per IP, 200 req/day per IP

---

## Remaining Items Before Submission

### P0 — Must fix before submitting

- [ ] **NASA_FIRMS_MAP_KEY** — flagged as "Needs Attention" in Vercel dashboard. Re-paste the key. Without it, `WildfireRiskCard` fire proximity scores 0 globally.
- [ ] **Verify chat works on live site after model swap** — we switched default to `llama3.1-8b` (`81a06c6`) and rewired the floating button (`87f7fe8`, `00c5cd6`). Test on prod: search → click floating "Ask GeoSight" button → confirm Cerebras streams a response (no "deterministic backup" badge). Optionally set `CEREBRAS_MODEL=gpt-oss-120b` in Vercel for higher-quality responses.
- [ ] **Demo end-to-end test** — run all 4 demos (Home Buyer, Data Center, Trail Scout, Solar Site) on the deployed preview. Verify callout positions and "Next" button is always visible.
- [x] ~~Verify ChatPanel routes to Cerebras~~ — fixed in this session (was routing to deterministic geo-analyst agent)

### P1 — High value, tight effort

- [ ] **Remove "Generate report" loading spinner** — report assembles instantly (deterministic), the spinner is misleading.
- [ ] **Mobile smoke test** — resize browser to 375px, verify search → analysis → card flow doesn't overflow.

### P2 — Pick up on dev branch post-submission

- [ ] **Append chat to report** — `buildGeoScribeFallback` doesn't include the ChatPanel conversation. Add `chatMessages` to `agentContext.dataBundle` in `useExploreData.ts → generateReport` and parse it as a "GeoAnalyst Conversation" appendix.
- [ ] **GeoAnalyst context gap** — system prompt in `analyze/route.ts` omits newer fields: `solarResource`, `streamGauges`, `thermalLoad`. Audit and add.
- [ ] **Sentry verification** — verify error capture works.
- [ ] **Cerebras model migration** — `llama3.1-8b` is deprecated May 27, 2026. After that date, set `CEREBRAS_MODEL` to the replacement model ID in Vercel — no code change needed.
- [ ] **README update** — refresh demo screenshots / GIF to reflect current UI.
- [ ] **Keyboard navigation** — set explicit `tabIndex` and focus-visible ring styles across the workspace.

---

## Known Working Features (Verified Across Sessions)

- ✅ All 4 demo tours (Home Buyer, Data Center, Trail Scout, Solar Site) — anchored callout, scroll-into-view, Next/Back/dots
- ✅ Solar demo (Arizona) — solar-resource card appears, Energy & Solar lens wired
- ✅ Globe region rectangle gone — subtle outline only
- ✅ One-word-per-line streaming bug fixed — `whitespace-pre-wrap` removed
- ✅ Info popups (AQI, elevation) — legible background (solid `--background-elevated`)
- ✅ Compare button — prompts user to search second location when < 2 sites saved
- ✅ NOAA NWS weather alerts — US-only, wired into DisasterAlertsCard
- ✅ Back navigation — "← Back" button in header routes to `/`
- ✅ Deterministic report — full data tables from live geodata bundle

---

## File Map (Key Files for Contest Demo)

```
Landing page:          src/components/Landing/LandingPage.tsx
Demo runner:           src/components/Demo/DemoRunner.tsx
Globe:                 src/components/Globe/CesiumGlobe.tsx
ChatPanel (AI):        src/components/Analysis/ChatPanel.tsx
Report generation:     src/app/api/agents/[agentId]/route.ts → buildGeoScribeFallback
AI chat endpoint:      src/app/api/analyze/route.ts
Cerebras client:       src/lib/groq.ts
All workspace cards:   src/lib/workspace-cards.ts
Score engine:          src/lib/scoring.ts
```

---

## How to Verify the Chat Is Working

1. Open https://geosight-gspat.vercel.app
2. Pick any lens, search a real US city (e.g., "Austin, TX")
3. Wait for data to load (globe flies to location, score appears)
4. Click "Ask GeoSight" tab → type a question
5. Response should stream in within 2-4 seconds with `llama3.1-8b`

If it shows "Deterministic backup" badge → Cerebras key missing or quota exceeded.
Check Vercel dashboard → Functions → `/api/analyze` logs for the error.

**Cerebras quota check:**  
Go to cloud.cerebras.ai → Usage — if TPD is near 1M, wait for reset (midnight UTC) or create a second Cerebras account with a new API key and swap `CEREBRAS_API_KEY` in Vercel.
