# GeoSight Agent System

## Purpose

This document defines the operating personas, responsibilities, and working mechanics for GeoSight as it evolves from a strong geospatial demo into a universal location-intelligence platform.

GeoSight's ambition is not "map plus chatbot." It is a spatial reasoning system that can answer serious questions about any place on Earth for both experts and everyday people. It should feel as fluid and exploratory as Google Earth, as useful as a GIS workstation, as approachable as a consumer planning tool, and as rigorous as a research assistant.

It is also already becoming a dashboard canvas built from reusable workspace cards. The current board system, card registry, factor-evidence model, source-awareness patterns, and report workflow are the foundation for a more composable product rather than a one-off demo shell.

## Source Of Truth Reviewed

This agent model is grounded in the repository state, not an abstract wishlist.

- Current product narrative: [README.md](C:\Users\mason\Documents\GitHub\geosight-gspat\README.md)
- Current backlog and milestone inventory: [docs/BACKLOG.md](C:\Users\mason\Documents\GitHub\geosight-gspat\docs\BACKLOG.md)
- Primary application workspace: [src/components/Explore/ExploreWorkspace.tsx](C:\Users\mason\Documents\GitHub\geosight-gspat\src\components\Explore\ExploreWorkspace.tsx)
- Mission profile system: [src/lib/profiles.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\profiles.ts)
- Scoring engine: [src/lib/scoring.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\scoring.ts)
- Scoring methodology reference: [src/lib/scoring-methodology.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\scoring-methodology.ts)
- Workspace card registry: [src/lib/workspace-cards.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\workspace-cards.ts)
- Live geodata route: [src/app/api/geodata/route.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\app\api\geodata\route.ts)
- Source registry: [src/lib/source-registry.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\source-registry.ts)
- Landing and routing model: [src/lib/landing.ts](C:\Users\mason\Documents\GitHub\geosight-gspat\src\lib\landing.ts)

## Current Reality Snapshot

### GeoSight already has meaningful foundations

- Next.js App Router application with a Cesium 3D globe (imperative API) and MapLibre 2D flat-map toggle
- Refactored explore workspace with dedicated state and data hooks instead of a single monolith
- 9 explorer lenses: Hunt Planner, Trail Scout, Road Trip, Land Quick-Check, General Explore, Energy & Solar, Agriculture & Land, Emergency Response, Field Research
- Deterministic scoring with factor evidence labels and methodology explanations
- 23+ registry-driven workspace cards with profile defaults, multi-card board mode, drag-reorder, named layouts, and cloud sync via Upstash Redis
- GeoAnalyst and GeoScribe agent flows with streaming output, persistent AI bar, and Cmd+K command palette
- QGIS-style drawing tools: polygon, marker, measure, radius circle — with snap-to-vertex, snap-to-grid, vertex drag-editing, undo/redo, GeoJSON export, and named pin labels
- 3D drive mode (WASD/arrow keys), topographic capture overlay, and analyst export bundle (GeoJSON + CSV + PNG)
- Live integrations with USGS, NRCS, FEMA, EPA, FCC, Open-Meteo, NASA POWER, NASA FIRMS, GDACS, Overpass/OSM, NCES, Washington OSPI, Eurostat NUTS2, and Cesium Ion
- Subsurface and climate-history integrations: groundwater, soil profile, seismic design, 10-year historical climate trends, drought risk, wildfire risk, thermal load, disaster alerts
- Source-awareness UI with freshness, coverage, confidence, and registry-aware fallback-provider context
- Auth.js OAuth (Google + GitHub) with optional Upstash Redis cloud site sync

### GeoSight still has major platform gaps

- No true cross-region provider switching in most live routes yet, even though the source registry scaffolding exists
- Some scoring logic still relies on proxy heuristics where direct live signals do not yet exist
- Important domains such as LiDAR overlays, aviation context, Doppler-style weather, and global school or demographic coverage remain incomplete
- Non-US broadband, flood, soil, seismic, and school data still rely on US-first sources; global replacements are cataloged in the source registry but not yet wired

## North Star

GeoSight should become the cleanest, most modern way to ask and answer location-based questions using live data from many sources, regions, and languages.

It must support:

- researchers who need provenance, confidence, and methodological transparency
- planners, developers, and analysts who need decision support
- travelers and everyday users who need clarity, not GIS jargon
- power users who want composable cards, saved dashboards, and repeatable workflows

## Non-Negotiable Product Rules

1. No fabricated live results.
Only demo overlays may contain hardcoded starter data. Normal product flows should show direct live data, derived live data, clearly labeled proxy heuristic outputs, or explicit unavailable states.

2. Provenance must be visible.
Every meaningful insight should be attributable to a source, source class, or derived method.

3. Global by design.
Do not build new features that only work in the Pacific Northwest unless they are explicitly demo overlays.

4. Expert-grade under the hood, civilian-grade at the surface.
The interface should be simple enough for non-technical users without dumbing down rigor.

5. Composability over one-off panels.
Every new data experience should move the platform toward user-configurable cards and dashboards.

6. Modern interaction quality matters.
This product should feel alive, fluid, spatial, and premium, not like a pile of data widgets.

7. Free and open data first.
Prefer free, public, and open data sources. Paid APIs are exceptions, not defaults.

8. No competition language, ever.
GeoSight is a product, not a competition entry. Do not use "judges", "judged", "judge mode", "judgeMode", "competition", "competition demo", "competition strength", "competition-first", or any related framing in code, tests, docs, comments, or agent prompts. The verb "judge" meaning "to assess" is allowed in normal English. Demo overlays and demo registries are not affected by this rule.

## Data Truth Hierarchy

All agents must follow this hierarchy when shaping features:

- Tier 1: Direct live source data
- Tier 2: Derived live analysis from live source data
- Tier 3: Demo overlay seed data
- Tier 4: Prohibited in normal flows

Tier 4 includes:

- invented nearby places
- fake hazard values
- fabricated demographic indicators
- unlabeled smart guesses presented as facts

## Card Standard

Every future dashboard card or analysis panel should eventually declare:

- card id
- user question(s) it helps answer
- geography granularity
- required inputs
- source list
- freshness window
- confidence model
- region coverage
- failure mode
- actions the user can take next

The current workspace card registry already captures much of this shape. New cards should extend that contract instead of inventing bespoke panel rules.

## Immediate Direction For The Team

Based on the current codebase, the next major evolution should focus on:

- live non-US provider integrations for flood, soil, seismic, and school data (GloFAS, ISRIC, GEM OpenQuake)
- GeoAnalyst context completeness — newer geodata fields (solarResource, streamGauges, thermalLoad) not yet in the AI system prompt
- structured JSON output for GeoScribe (currently markdown prose — JSON would enable PDF export and section-level regeneration)
- LiDAR / National Map tile overlays in the globe viewer
- shareable self-contained HTML or PDF analysis snapshots

## Final Standard

GeoSight should become the universal mapping and spatial reasoning application:

- beautiful enough to impress
- rigorous enough for research
- simple enough for everyday people
- modular enough for custom dashboards
- global enough to matter
- live enough to be trusted

Every agent in this document exists to push the product toward that standard.
