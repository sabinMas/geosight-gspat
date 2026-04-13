# GeoSight Release Runbook

## AI Environment Setup

Set these environment variables in Vercel before promoting a release that depends on live AI:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`

## Post-Deploy Validation

1. Open `/api/ai-status` and confirm `liveAnalysisAvailable: true`.
2. Ask a question in the main GeoSight chat and confirm the response is not marked as fallback mode.
3. Open `Ask GeoSight` and test:
   - `GeoAnalyst`
   - `GeoGuide`
   - `GeoScribe`
4. Ask a follow-up question in both chat surfaces and confirm prior context is preserved.
5. Check that the agent popup opens and closes correctly on desktop and mobile widths.

## Fallback Sanity Check

If the release is intentionally deployed without live AI keys:

- `/api/ai-status` should report degraded availability
- the main chat should show a fallback-mode badge
- agent replies should show fallback or deterministic mode explicitly
- no chat surface should fail silently
