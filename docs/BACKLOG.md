# GeoSight Backlog

This document is the living roadmap source of truth for GeoSight. It is grounded in the current repository state and organized around three buckets:

- **Shipped foundation**: capabilities that are already live
- **Current gaps**: visible weaknesses or partial systems
- **Next highest-value milestones**: work that most directly improves trust, usefulness, or competition strength

Priority lens: `competition-first`

## Validation Basis

This backlog was reconciled against:

- `README.md`
- `agents.md`
- `src/app/api/geodata/route.ts`
- `src/lib/profiles.ts`
- `src/lib/scoring.ts`
- `src/lib/scoring-methodology.ts`
- `src/lib/workspace-cards.ts`
- `src/lib/source-registry.ts`
- `src/lib/demos/registry.ts`
- `src/lib/agents/agent-registry.ts`

## Shipped Foundation

### Core product shell

- **User question**: Can a user open GeoSight, choose a use case, search a place, and explore it on a live 3D globe?
- **Current implementation**: Next.js App Router app with a landing page, routed explore workspace, Cesium/Resium globe, demo entry paths, search, coordinate entry, and current-location flows.
- **Competition impact**: High.

### Mission architecture

- **User question**: Can the same place be evaluated through different mission lenses instead of a single demo-only workflow?
- **Current implementation**: Four wired mission profiles: data center, hiking, residential, and commercial. The landing page also exposes a General Exploration entry that is honestly labeled as using the residential lens today.
- **Competition impact**: High.

### Live geodata and trust stack

- **User question**: Can GeoSight assemble a meaningful live location bundle and explain where it came from?
- **Current implementation**: `api/geodata` now aggregates elevation, infrastructure, amenities, climate, demographics, hazards, school context, broadband, flood zones, stream gauges, groundwater wells, soil profile, seismic design values, climate history, air quality, contamination screening, and derived land classification, plus source metadata and registry-aware notes.
- **Competition impact**: High.

### Scoring, evidence, and comparison

- **User question**: Can users compare places and understand why one site scores better than another?
- **Current implementation**: Deterministic scoring engine, methodology notes, factor evidence labels, saved sites, and comparison table.
- **Competition impact**: High.

### Card and board substrate

- **User question**: Can the workspace feel configurable and card-based instead of like a fixed stack of panels?
- **Current implementation**: Registry-driven workspace cards with profile defaults, board and library behavior, local persistence, and card metadata such as question answered, region coverage, failure mode, and next actions.
- **Competition impact**: High.

### Agent and report layer

- **User question**: Can GeoSight produce both conversational analysis and a structured written deliverable from the same live context?
- **Current implementation**: GeoAnalyst powers mission-aware analysis; GeoScribe generates structured site assessment reports in-product.
- **Competition impact**: High.

### Demo hardening

- **User question**: Can the product tell a strong live story and still stay demo-safe when providers are slow?
- **Current implementation**: Demo registry, mission-run presets, fallback screenshot fields, and a dismissible live-loading banner for slower demo loads.
- **Competition impact**: High.

## Current Gaps

### Inline provenance is not universal yet

- Source-awareness is strong, but headline cards and AI/report outputs still do not all surface provider, freshness, and confidence inline.

### Hazard stack is still early

- GeoSight has earthquakes, fire detections, FEMA flood zones, and weather risk summary, but not yet a mature multi-hazard resilience stack.

### Regional provider switching is scaffolded more than fully operational

- The source registry knows about regional candidates, but many non-US alternatives are still cataloged rather than actively wired into live routes.

### User-authored dashboard composition is still limited

- Cards and local persistence exist, but there are no named saved workspaces, drag-and-drop layouting, or multi-board composition flows.

### Proxy-heavy factors still need stronger direct replacements

- Commercial demand, land-cost indicators, remoteness, and similar factors still rely on proxy heuristics even though they are now labeled honestly.

### Global coverage is still uneven by domain

- Broadband, flood zones, EPA screening, groundwater, soil profile, seismic design values, and school intelligence remain mostly US-first.

## Next Highest-Value Milestones

### P0: Trust + Wow

- Richer live hazard and resilience layers
- Inline provenance in headline outputs
- Standardized `direct live` / `derived live` / `proxy heuristic` language across score, cards, chat, and reports

### P1: Card Platform

- Formal universal card contract
- Saved dashboard layouts and multi-workspace composition

### P1: Global Coverage

- Live non-US provider integrations
- Regional provider selection in reasoning and UI

### P1: High-Value Domain Expansion

- Travel and trip-planning cards
- Development and infrastructure card families
- Research-grade hazard and resilience cards

### P2: Advanced Spatial Tools

- Polygon drawing and spatial editing
- LiDAR and National Map layers
- Deeper subsurface and geology overlays
- Stronger export and share workflows beyond the current GeoScribe panel

## Definition Of Ready For New Backlog Items

Before adding a new item to this backlog, capture:

- the exact user question
- the live or derived source
- region coverage
- freshness and update cadence
- failure states
- confidence communication
- whether it can become a reusable card
- why it helps GeoSight stand out
