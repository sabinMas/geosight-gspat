# GeoSight — Submission Handoff

**Last updated:** 2026-04-24  
**Contest deadline:** HandshakeAI / Codex Creator  
**Deployed at:** https://geosight-gspat.vercel.app  
**Branch:** `main` (auto-deploys to Vercel on push)

---

## What Was Shipped This Session

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
  → Cerebras qwen-3-235b-a22b-instruct-2507
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
- `CEREBRAS_API_KEY` — ChatPanel only (free tier: ~60 RPM, 1M TPD per account)
- `GEMINI_API_KEY` — optional, only needed if `RAG_ENABLED=true`
- `NASA_FIRMS_MAP_KEY` — fire data (optional, fallback works without it)
- `NPS_API_KEY` — national parks data
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — shared rate limiting

**Cerebras rate limits (from docs):**
- qwen-3-235b: 30 RPM, 60K TPM, 1M TPD (free tier)
- Rate limiting at `/api/analyze`: 15 req/min per IP, 200 req/day per IP

---

## Remaining Items Before Submission

### P0 — Must fix before submitting

- [ ] **Verify ChatPanel is actually working** — with agents no longer burning quota, the chat should now respond. Test with `CEREBRAS_API_KEY` set in Vercel. If still failing, check Vercel function logs for error codes.
- [ ] **NASA_FIRMS_MAP_KEY** — was flagged as "Needs Attention" in Vercel. Re-paste the key.
- [ ] **Demo end-to-end test** — run all 3 demos (Home Buyer, Data Center, Trail Scout) on the deployed preview. Verify callout positions correctly and "Next" button is always visible.

### P1 — High value, tight effort

- [ ] **Append chat to report** — the report builder (`buildGeoScribeFallback`) doesn't yet include the ChatPanel conversation thread. The hook `generateReport` in `useExploreData.ts` sends `agentContext` to geo-scribe; add the `chatMessages` array to `agentContext.dataBundle` and parse it in the report builder to add a "GeoAnalyst Conversation" appendix section.
- [ ] **Mobile smoke test** — resize browser to 375px, verify search → analysis → card flow doesn't overflow. Known risk: the left sidebar and right panel stack vertically.
- [ ] **Sentry verification** — hit a 500 error intentionally (remove API key briefly), verify Sentry captures it at sentry.io.

### P2 — Nice to have

- [ ] **Cerebras model migration** — both `llama3.1-8b` and `qwen-3-235b-a22b-instruct-2507` are deprecated May 27, 2026. Set `CEREBRAS_MODEL=qwen-3-235b-a22b-instruct-2507` in Vercel env (already done per earlier session). After May 27, check Cerebras docs for replacement model name — set the new ID via env var without code change.
- [ ] **README update** — update the demo GIF / screenshots to reflect current UI (the demo button, the clean workspace without bottom AI bar).
- [ ] **"Generate report" UX** — currently shows a blank panel while the deterministic report assembles instantly. Remove the loading spinner delay since there's no async wait.

---

## Known Working Features (Verified This Session)

- ✅ All 3 demo tours (Home Buyer, Data Center, Trail Scout) — anchored callout, scroll-into-view, Next/Back/dots
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
5. Response should stream in within 2-4 seconds with `qwen-3-235b`

If it shows "Deterministic backup" badge → Cerebras key missing or quota exceeded.
Check Vercel dashboard → Functions → `/api/analyze` logs for the error.

**Cerebras quota check:**  
Go to cloud.cerebras.ai → Usage — if TPD is near 1M, wait for reset (midnight UTC) or create a second Cerebras account with a new API key and swap `CEREBRAS_API_KEY` in Vercel.
