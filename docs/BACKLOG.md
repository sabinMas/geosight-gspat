# GeoSight Backlog

This document is the current backlog and roadmap source of truth for GeoSight. It consolidates the product direction in `README.md`, the platform standards in `agents.md`, and the capabilities that are actually implemented in the repository today.

Priority lens: `competition-first`

## Backlog Schema

Each backlog item should use this structure so future planning stays consistent:

- `status`: `done`, `scaffolded`, or `next`
- `priority`: `P0`, `P1`, `P2`, or `shipped`
- `user question`
- `current implementation`
- `gap`
- `source coverage`
- `card contract readiness`
- `competition impact`

## Validation Basis

This backlog was reconciled against:

- `README.md`
- `agents.md`
- `src/components/Explore/ExploreWorkspace.tsx`
- `src/lib/workspace-cards.ts`
- `src/lib/source-registry.ts`
- `src/app/api/geodata/route.ts`

Engineering health at time of refresh:

- `npm run typecheck`: passing
- `npm run lint`: passing

## Done

### Core product shell

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can a user open GeoSight, choose a use case, search a place, and explore it on a live 3D globe?
- `current implementation`: Next.js App Router app with landing page, routed explore workspace, Cesium/Resium globe, demo entry paths, and search/current-location flows.
- `gap`: None for MVP shell; future work is about depth, not basic shell completion.
- `source coverage`: Global search/front door, with downstream data varying by provider.
- `card contract readiness`: Indirect; shell hosts cards but is not itself a card.
- `competition impact`: High. This is the base experience every judge and user sees first.

### Mission architecture

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can the same place be evaluated through different mission lenses instead of a single demo-only workflow?
- `current implementation`: Four wired mission profiles: data center, hiking, residential, and commercial.
- `gap`: More domains still need to be added, but the architecture exists and is live.
- `source coverage`: Mixed; profiles are global-minded but some underlying data paths remain US-first.
- `card contract readiness`: Partial. Profiles exist, but card behavior is not yet fully contract-driven.
- `competition impact`: High. This moves GeoSight beyond a single use-case demo.

### Live geodata pipeline

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can GeoSight assemble a meaningful live location snapshot from multiple public sources?
- `current implementation`: `api/geodata` aggregates elevation, climate, infrastructure, amenities, demographics, hazards, school context, and derived land classification.
- `gap`: More global fallbacks and richer hazard layers still needed.
- `source coverage`: Mixed global/US-first depending on source.
- `card contract readiness`: Partial. Data is structured enough to power cards, but not yet formalized into a universal card contract.
- `competition impact`: High. This is a core credibility layer.

### AI reasoning

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can users ask open-ended questions and get mission-aware, grounded answers instead of generic map UI outputs?
- `current implementation`: Groq-backed analysis route with mission-aware prompts and a local fallback assessment path.
- `gap`: Source-aware explanation and regional provider awareness should become more explicit in outputs.
- `source coverage`: Inherits whatever geodata coverage is available for the active location.
- `card contract readiness`: Partial. Chat is a card, but its answer contract is not yet standardized to the backlog schema.
- `competition impact`: High. This is a headline differentiator.

### Scoring and comparison

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can users compare places and understand which factors make one site stronger than another?
- `current implementation`: Deterministic scoring engine, score card, factor breakdown, saved sites, and comparison table.
- `gap`: Several factors still rely on proxies that need clearer labeling or stronger live replacements.
- `source coverage`: Depends on active profile and available geodata; strongest in current US-oriented flows.
- `card contract readiness`: Partial. Score and comparison are already card-shaped, but not yet expressed with the full future card contract.
- `competition impact`: High. This makes the product feel analytical rather than decorative.

### Workspace and card foundation

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can the workspace feel calmer and more configurable than a fixed wall of panels?
- `current implementation`: Card registry, profile defaults, board vs library views, persisted card visibility, and persisted active board focus.
- `gap`: No drag/drop layouting, saved workspaces, or contract-backed universal card model yet.
- `source coverage`: N/A platform capability.
- `card contract readiness`: Partial by design. The board system exists, but the full platform contract is not yet encoded.
- `competition impact`: High. This is a strong differentiator against ordinary dashboard layouts.

### Trust and provenance basics

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can users inspect where the data came from and how trustworthy it is?
- `current implementation`: Source metadata objects, source-awareness UI, provider registry scaffolding, source notes, freshness text, and confidence text.
- `gap`: Provenance and confidence are still concentrated in dedicated views rather than being surfaced in every result-producing card.
- `source coverage`: Mirrors current source integrations and registry context.
- `card contract readiness`: Partial. The metadata exists, but not every card consumes it as a first-class contract field.
- `competition impact`: High. This is essential for trust and for surviving skeptical judging.

### Extra analysis tools

- `status`: `done`
- `priority`: `shipped`
- `user question`: Can users go beyond a single score and inspect terrain, nearby places, imagery, and elevation context?
- `current implementation`: Nearby places, elevation profile, terrain controls, image upload, and land classification panels.
- `gap`: These tools are useful, but some remain more like feature panels than fully normalized cards.
- `source coverage`: Mixed global/US-first depending on tool and provider.
- `card contract readiness`: Partial.
- `competition impact`: Medium-high. These add depth and exploration value.

### Engineering health

- `status`: `done`
- `priority`: `shipped`
- `user question`: Is the current codebase in a stable enough state to keep building on confidently?
- `current implementation`: Typecheck and lint both pass at the time of this refresh.
- `gap`: No automated test suite or milestone validation checklist is encoded yet.
- `source coverage`: N/A
- `card contract readiness`: N/A
- `competition impact`: Medium. Mostly affects shipping confidence.

## Scaffolded / Partial

### Trust + Wow

#### Provenance and confidence everywhere

- `status`: `scaffolded`
- `priority`: `P0`
- `user question`: Can a user trust each headline insight without opening a separate source panel?
- `current implementation`: Source-awareness card, source metadata, status badges, freshness strings, and confidence strings exist.
- `gap`: Not every headline metric, trend, recommendation, or AI answer exposes source/freshness/confidence inline.
- `source coverage`: Same as current geodata sources.
- `card contract readiness`: Partial. Inputs exist but are not universally required per card.
- `competition impact`: Very high. This is a judge-facing trust gap.

#### Hazard intelligence

- `status`: `scaffolded`
- `priority`: `P0`
- `user question`: Can GeoSight explain real place risk with memorable live hazard context?
- `current implementation`: Recent earthquake summary plus simple hazard proxy scoring.
- `gap`: No mature wildfire, flood, weather alert, heat-risk, smoke, or broader resilience stack.
- `source coverage`: Earthquakes are global; overall hazard model is not.
- `card contract readiness`: Low-partial. No mature hazard card family yet.
- `competition impact`: Very high. Hazards are one of the clearest “wow plus utility” opportunities.

#### Scoring transparency

- `status`: `scaffolded`
- `priority`: `P0`
- `user question`: Can users tell which scores are direct measurements versus heuristic proxies?
- `current implementation`: Factor breakdown and descriptions are present.
- `gap`: Proxy-heavy factors are still blended into the score experience without a stronger direct-versus-derived framing standard.
- `source coverage`: Mixed by factor.
- `card contract readiness`: Partial.
- `competition impact`: High. This affects product honesty.

### Card Platform

#### Universal card contract

- `status`: `scaffolded`
- `priority`: `P1`
- `user question`: Can every analysis surface become a reusable, composable GeoSight card?
- `current implementation`: Registry-driven cards with categories, sizing, visibility, and supported profiles.
- `gap`: Missing contract fields for questions answered, required inputs, source list, freshness window, confidence model, region coverage, failure mode, and next actions.
- `source coverage`: N/A platform capability.
- `card contract readiness`: Partial foundation only.
- `competition impact`: High. This is how GeoSight becomes a platform rather than a one-off app.

#### Dashboard personalization

- `status`: `scaffolded`
- `priority`: `P1`
- `user question`: Can users build and save their own analysis workspace instead of using profile defaults only?
- `current implementation`: Card visibility and active-card state persist locally by profile.
- `gap`: No user-authored layouts, saved named workspaces, multi-workspace model, or drag/drop composition.
- `source coverage`: N/A platform capability.
- `card contract readiness`: Partial.
- `competition impact`: Medium-high. Strong platform signal if completed.

### Global Coverage

#### International source registry

- `status`: `scaffolded`
- `priority`: `P1`
- `user question`: Can GeoSight choose the right provider for the region instead of quietly falling back to US-first assumptions?
- `current implementation`: Source provider registry includes global and regional candidates across domains.
- `gap`: Most non-US fallbacks are cataloged only and not yet integrated into live routes.
- `source coverage`: Registry covers global, US, Europe, UK, Japan, India, Australia/NZ, Latin America, and Africa at the metadata level.
- `card contract readiness`: Partial. Context exists but is not consistently surfaced in cards and reasoning.
- `competition impact`: High. This is central to the “works anywhere” promise.

#### Global product positioning

- `status`: `scaffolded`
- `priority`: `P1`
- `user question`: Does the product actually work globally, not just market itself that way?
- `current implementation`: Global search, globally oriented landing copy, and several global-capable providers.
- `gap`: Demographics, school context, and some terrain/hazard paths remain US-first or WA-enhanced.
- `source coverage`: Mixed.
- `card contract readiness`: Partial.
- `competition impact`: Very high. This is one of the main skeptical-judge pressure points.

#### School intelligence

- `status`: `scaffolded`
- `priority`: `P1`
- `user question`: Can GeoSight provide defensible school context for residential decisions outside the current strongest US pathways?
- `current implementation`: NCES baseline with Washington OSPI enhancement and a dedicated school context card.
- `gap`: Explicitly US public K-12 first, with strongest support in Washington.
- `source coverage`: US public K-12 only, with Washington official accountability enhancement.
- `card contract readiness`: Partial.
- `competition impact`: Medium. Important for residential value, but still a coverage gap.

## Next Up

### P0: Trust + Wow

#### Richer live hazard and weather layers

- `status`: `next`
- `priority`: `P0`
- `user question`: What live risks or atmospheric conditions make this place memorable and immediately understandable on click?
- `current implementation`: Basic climate snapshot and recent earthquake context.
- `gap`: Need a stronger live risk story with higher visual and decision-support value.
- `source coverage`: Current weather is global; mature hazard stack still missing.
- `card contract readiness`: Needs new card family and shared source/provenance treatment.
- `competition impact`: Very high. Best near-term opportunity for visible product lift.

#### Inline provenance in headline insights

- `status`: `next`
- `priority`: `P0`
- `user question`: Can users see source, freshness, and confidence exactly where they read the answer or metric?
- `current implementation`: Separate source-awareness surfaces exist.
- `gap`: Headline cards and analysis outputs need embedded trust signals.
- `source coverage`: All live and derived data paths.
- `card contract readiness`: Should become a hard requirement for all result cards.
- `competition impact`: Very high. This directly improves trust and polish.

#### Clear direct-versus-derived scoring language

- `status`: `next`
- `priority`: `P0`
- `user question`: Which parts of the recommendation are measured, and which are GeoSight inference?
- `current implementation`: Descriptive factor text and source metadata.
- `gap`: Need a standardized direct/derived/proxy labeling pattern in scores and analysis.
- `source coverage`: All scoring factors.
- `card contract readiness`: Should be encoded in future score and factor card contracts.
- `competition impact`: High. This protects credibility.

### P1: Card Platform

#### Formal card contract

- `status`: `next`
- `priority`: `P1`
- `user question`: Can every current and future panel be described as a reusable contract-backed card?
- `current implementation`: Registry and presentation model only.
- `gap`: Need contract fields for question, inputs, outputs, sources, freshness, confidence, coverage, failure mode, and next actions.
- `source coverage`: N/A platform capability.
- `card contract readiness`: This work creates readiness.
- `competition impact`: High. Converts GeoSight into a true extensible system.

#### Refactor special-case panels into contract-backed cards

- `status`: `next`
- `priority`: `P1`
- `user question`: Can cards share a common substrate instead of each panel inventing its own shape?
- `current implementation`: Several panels are card-like but still hand-wired.
- `gap`: Need normalization of current workspace panels under the formal card model.
- `source coverage`: N/A platform capability.
- `card contract readiness`: Blocked on formal contract.
- `competition impact`: Medium-high. More important for scale than first impression, but foundational.

#### Saved dashboard layouts and workspace compositions

- `status`: `next`
- `priority`: `P1`
- `user question`: Can users save repeatable workflows for different kinds of spatial work?
- `current implementation`: Local visibility/preferences only.
- `gap`: Need named saved boards, layout management, and reusable workspace states.
- `source coverage`: N/A platform capability.
- `card contract readiness`: Depends on contract-backed cards.
- `competition impact`: Medium-high.

### P1: Global Coverage

#### Live non-US provider integrations

- `status`: `next`
- `priority`: `P1`
- `user question`: Can GeoSight stay useful when the location is outside the US?
- `current implementation`: Candidate providers are listed in the registry.
- `gap`: Need real route integration for terrain, demographics, hazards, weather enrichments, and nearby-place fallbacks.
- `source coverage`: Intended global expansion.
- `card contract readiness`: New providers should plug into card/source contracts immediately.
- `competition impact`: Very high. This is core to the product claim.

#### Regional provider selection in reasoning and UI

- `status`: `next`
- `priority`: `P1`
- `user question`: Does GeoSight explain which provider is active for this region and why?
- `current implementation`: Registry context influences metadata scaffolding.
- `gap`: Need explicit provider selection surfaced in reasoning, cards, and fallback behavior.
- `source coverage`: All domains with multiple regional providers.
- `card contract readiness`: Should become a standard contract field.
- `competition impact`: High.

### P1: High-Value Domains

#### Travel and trip planning cards

- `status`: `next`
- `priority`: `P1`
- `user question`: Can GeoSight help plan a route, trip stop, or destination decision in a way maps alone do not?
- `current implementation`: Landing/use-case framing exists, but no dedicated trip-planning card family.
- `gap`: Need route-aware and travel-aware card experiences.
- `source coverage`: To be defined from open routing/travel/weather/POI sources.
- `card contract readiness`: Should be built natively as contract-backed cards.
- `competition impact`: High. Broadens everyday usefulness.

#### Development and infrastructure cards

- `status`: `next`
- `priority`: `P1`
- `user question`: Can a planner or developer quickly understand buildability and infrastructure context?
- `current implementation`: Related signals exist across scoring, sources, and cards, but not as a cohesive card family.
- `gap`: Need explicit development/buildability/infrastructure cards.
- `source coverage`: Mixed current support; more sources needed.
- `card contract readiness`: Good candidate for early contract-based card design.
- `competition impact`: High.

#### Research-grade hazard and resilience cards

- `status`: `next`
- `priority`: `P1`
- `user question`: Can GeoSight support more serious risk analysis, not just light context?
- `current implementation`: Only limited hazard baseline today.
- `gap`: Need multi-hazard, provenance-rich, confidence-aware resilience views.
- `source coverage`: To expand from current earthquake-only baseline.
- `card contract readiness`: Should be first-class contract-backed cards.
- `competition impact`: Very high.

#### Broadband and utilities cards

- `status`: `next`
- `priority`: `P1`
- `user question`: Can GeoSight explain connectivity and utility readiness for a place?
- `current implementation`: Power proximity exists; broadband sources are cataloged only.
- `gap`: Need integrated broadband and utility-readiness experiences.
- `source coverage`: US and global candidates identified but mostly not integrated.
- `card contract readiness`: Needs new domain cards.
- `competition impact`: High, especially for development and infrastructure use cases.

### P2: Advanced Spatial Tools

#### Polygon drawing and spatial editing

- `status`: `next`
- `priority`: `P2`
- `user question`: Can users define their own study area instead of only clicking points or preset regions?
- `current implementation`: Region selection and point selection exist.
- `gap`: No drawing tools or editing workflow.
- `source coverage`: N/A interaction capability.
- `card contract readiness`: Should feed future cards as a structured geometry input.
- `competition impact`: Medium-high.

#### LiDAR and National Map layers

- `status`: `next`
- `priority`: `P2`
- `user question`: Can GeoSight expose more serious terrain and observational data than basic elevation alone?
- `current implementation`: Elevation point lookup and terrain viewer only.
- `gap`: No LiDAR/National Map layer integration yet.
- `source coverage`: Expected to begin US-first.
- `card contract readiness`: Can power terrain and analysis cards once integrated.
- `competition impact`: High for research and judging wow factor.

#### Mineral and subsurface overlays

- `status`: `next`
- `priority`: `P2`
- `user question`: Can GeoSight say something meaningful about geology, mineral signals, or subsurface opportunity?
- `current implementation`: No dedicated subsurface layer today.
- `gap`: Entire domain is still unbuilt.
- `source coverage`: To be researched.
- `card contract readiness`: Needs new domain contract.
- `competition impact`: Medium-high because it is distinctive.

#### Multi-region benchmarking beyond PNW demos

- `status`: `next`
- `priority`: `P2`
- `user question`: Can users compare candidate places across regions rather than staying near the original showcase geography?
- `current implementation`: Comparison exists, but demo storytelling is still anchored in PNW roots.
- `gap`: Need stronger benchmarking stories and datasets across multiple regions.
- `source coverage`: Mixed; depends on global data expansion.
- `card contract readiness`: Can reuse score/comparison card patterns.
- `competition impact`: High.

#### Better image-based land cover inference

- `status`: `next`
- `priority`: `P2`
- `user question`: Can uploaded imagery produce stronger, more defensible land-cover interpretation?
- `current implementation`: Current imagery flow uses client-side MVP estimation and mapped-data-derived classification.
- `gap`: Need stronger model-backed inference.
- `source coverage`: Potentially global, depending on model/data choice.
- `card contract readiness`: Existing imagery cards can evolve into this.
- `competition impact`: Medium.

#### Exportable reports

- `status`: `next`
- `priority`: `P2`
- `user question`: Can GeoSight package findings into something shareable for due diligence or presentation?
- `current implementation`: No export/report workflow yet.
- `gap`: Need report generation and artifact design.
- `source coverage`: Would summarize all currently available data domains.
- `card contract readiness`: Report sections should map cleanly from card outputs.
- `competition impact`: Medium-high.

## Milestone Buckets

### Trust + Wow

- Richer live hazard and weather layers
- Inline provenance in headline insights
- Clear direct-versus-derived scoring language

### Card Platform

- Formal card contract
- Refactor special-case panels into contract-backed cards
- Saved dashboard layouts and workspace compositions

### Global Coverage

- Live non-US provider integrations
- Regional provider selection in reasoning and UI
- Stronger school and demographic coverage beyond current US-first pathways

### High-Value Domains

- Travel and trip planning cards
- Development and infrastructure cards
- Research-grade hazard and resilience cards
- Broadband and utilities cards

### Advanced Spatial Tools

- Polygon drawing and spatial editing
- LiDAR and National Map layers
- Mineral and subsurface overlays
- Multi-region benchmarking beyond PNW demos
- Better image-based land cover inference
- Exportable reports

## Definition Of Ready For New Backlog Items

Before adding a new item to this backlog, capture:

- The exact user question
- The live or derived source
- Region coverage
- Freshness/update cadence
- Failure states
- Confidence communication
- Whether it can become a reusable card
- Why it helps GeoSight stand out
