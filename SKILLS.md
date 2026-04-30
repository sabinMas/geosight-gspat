# SKILLS

> Skills and operating rules for agentic AI collaborators working on GeoSight.

GeoSight is a Next.js 14 + React + TypeScript application with a Cesium globe, MapLibre 2D maps, a deterministic scoring engine, and a trust-labeled source registry pulling from 40+ live datasets (USGS, NOAA, NASA FIRMS, FEMA, EPA, OSM, etc.).[cite:3] It is deployed on Vercel with API routes orchestrating data fetching and AI reasoning via Cerebras and Gemini.[cite:3]

This document defines the skills, boundaries, and expectations for AI agents contributing to GeoSight.

---

## 1. Global Principles

- **Truth over fluency**  
  - Never fabricate data or signals; the trust model requires that gaps be acknowledged, not guessed.[cite:3]  
  - When unsure about a dataset, schema, or business rule, prefer to mark TODOs and surface clarifying questions in PR descriptions.

- **Deterministic first, AI second**  
  - All scores must be produced by deterministic logic from real source data. AI can summarize, explain, and suggest, but must not invent numeric scores.[cite:3]

- **Mission lens–driven UX**  
  - Always consider which mission lens (e.g. Hunt Planner, Trail Scout, Energy & Solar) is active and how it should shape relevance weights, copy, and UI layout.[cite:3]

- **Minimal breakage, maximal observability**  
  - Maintain type safety, tests, and logging. Prefer small, well-scoped changes.  
  - When adding new data sources or lenses, also add tests and basic instrumentation hooks.

- **Single source of truth**  
  - Consolidate business logic in shared libs: scoring, source registry, type definitions, and hooks in `src/lib`, `src/types`, and `src/hooks`.[cite:2][cite:3]  
  - UI components should consume these abstractions, not re-implement logic.

---

## 2. Skill Catalog Overview

Each skill below can be treated as a “capability module” an agent may own for a task or PR.

1. Frontend Architecture & Layout  
2. Cesium & Map Rendering  
3. Mission Lens System & UX Flows  
4. Scoring Engine & Trust Model  
5. GeoData API Integration  
6. Dataset Discovery & Ingestion  
7. Analytics & Telemetry  
8. Testing (Unit, Integration, Playwright)  
9. DevOps & Hosting (Vercel and beyond)  
10. AI Orchestration (GeoAnalyst & GeoScribe)  
11. Security, Privacy, and Secrets Hygiene  
12. Mobile & Device Responsiveness  
13. Documentation & Product Backlog Support

---

## 3. Skill Definitions

### 3.1 Frontend Architecture & Layout

**Purpose:** Implement and evolve the Next.js App Router frontend, keeping the Explore workspace, landing flows, and lens UIs clean, performant, and consistent.[cite:3]

- **Scope**
  - Work primarily in `src/app`, `src/components`, and related styling/config files.[cite:2][cite:3]
  - Implement new panels, cards, and controls in the Explore workspace (`ExploreWorkspace` and related components).[cite:3]
  - Optimize layout and sidebar behavior in globe view: collapsing sidebars, adding floating toolbars, and responsive adjustments.

- **Inputs**
  - Design or UX briefs (e.g., “shrink globe UI and float tools on-globe”).
  - Existing components and patterns in `src/components`.

- **Outputs**
  - New/updated components, hooks, and layout logic.
  - Accessible, responsive UI for desktop and mobile.

- **Constraints**
  - Preserve App Router conventions and filesystem routing.
  - Avoid embedding business logic in components; delegate to hooks/lib.

---

### 3.2 Cesium & Map Rendering

**Purpose:** Maintain and improve Cesium globe and MapLibre maps, including 3D terrain, drawing tools, and snapping behaviors.[cite:3]

- **Scope**
  - Ensure drawing tools snap to terrain/elevation and render “on the globe” (not below surface).
  - Manage Cesium Ion configuration, terrain provider, and visual layers (e.g., lidar overlays when implemented).
  - Implement shaders or visual effects such as solar paths or lighting that can be re-used by lenses (e.g. solar peak hours).

- **Inputs**
  - Cesium configuration (tokens, terrain providers) from env and config.
  - Lens-specific rendering requirements (Hunting, Solar, etc.).

- **Outputs**
  - Utility functions and hooks for terrain sampling, snapping, and layer toggling.
  - Stable APIs for other modules to ask for terrain height, visibility, or shading data.

- **Constraints**
  - Never hard-code secrets; use environment variables as defined in `.env.example`.[cite:1]
  - Do not block the UI thread with heavy computation; use async operations and memoization.

---

### 3.3 Mission Lens System & UX Flows

**Purpose:** Design, extend, and maintain the mission lens system and associated flows (guided tours, lens-specific copy, and presets).[cite:3]

- **Scope**
  - Manage lens definitions (weights, labels, icons, descriptions).
  - Implement new lenses for specific personas: Hunting, In-Field Research, Sales/Pest/Solar, Hiking/Driving, etc.
  - Ensure first-run guided tours and lens onboarding remain coherent.

- **Inputs**
  - Product notes describing new lens personas and feature sets.
  - Existing lens metadata and UX flows from `README` and components.[cite:3]

- **Outputs**
  - Lens configuration objects and mapping to scoring weights.
  - Copy and UI adjustments that reflect each lens’ priorities.

- **Constraints**
  - Each lens must map cleanly onto deterministic scoring inputs; do not invent signals.
  - Preserve consistency with the 9 existing lenses and their naming/behavior.[cite:3]

---

### 3.4 Scoring Engine & Trust Model

**Purpose:** Maintain and extend the deterministic scoring and trust metadata system.[cite:3]

- **Scope**
  - Work primarily in `src/lib/scoring.ts`, `src/lib/source-registry.ts`, and related types.[cite:3]
  - Add or modify factor scores when new signals or lenses are introduced.
  - Maintain trust labels (`live`, `derived`, `limited`, `unavailable`, `cached`) and ensure every signal has a clear provenance path.[cite:3]

- **Inputs**
  - New datasets and their schemas.
  - Lens requirements (e.g., how much weight to give elevation, hazards, connectivity).

- **Outputs**
  - Pure, deterministic scoring functions with clear inputs/outputs.
  - Updated trust metadata entries and documentation.

- **Constraints**
  - No AI-generated numbers in scoring; AI can only describe or explain scores.
  - Preserve backward compatibility where possible; version scores if necessary.

---

### 3.5 GeoData API Integration

**Purpose:** Integrate external geospatial APIs and government datasets into a unified geodata API.[cite:3]

- **Scope**
  - Extend `src/app/api/geodata/route.ts` and related routes to call terrain, hazards, hydrology, soil, connectivity, schools, and environment APIs.[cite:3]
  - Normalize and merge responses into a consistent internal schema consumed by the scoring engine and UI.
  - Manage rate limiting and caching strategies (e.g., Upstash Redis).[cite:3]

- **Inputs**
  - External API docs (USGS, NOAA, NASA FIRMS, FEMA, EPA, etc.).[cite:3]
  - Internal data models.

- **Outputs**
  - New or improved API route handlers.
  - Strongly typed adapters and mappers for new sources.

- **Constraints**
  - Handle errors gracefully; propagate trust labels and failure states instead of failing hard.
  - Never expose raw secrets to the client; keep secrets server-side.

---

### 3.6 Dataset Discovery & Ingestion

**Purpose:** Discover, evaluate, and onboard new datasets (including global coverage beyond US-first signals).[cite:3]

- **Scope**
  - Implement and maintain a web-scraper/data-hunting agent (conceptually) that identifies candidate datasets: global hazard layers, lidar, oil/mineral maps, demographic and migration data, etc.
  - Propose ingestion plans (APIs vs bulk downloads vs tilesets) and note licensing/usage constraints.
  - Maintain documentation about what datasets are in use and where.

- **Inputs**
  - Product roadmap for target regions and themes (e.g., China, India, Nordic, Amazon, migration patterns).
  - Existing list of sources from README and backlog.[cite:3]

- **Outputs**
  - Structured dataset proposals (name, URL, coverage, resolution, license, integration path).
  - Ingestion scripts or API call patterns (where approved).

- **Constraints**
  - Respect licensing and usage limits; flag any non-open licenses.
  - Avoid committing large raw datasets into the repo; use external storage or tilesets.

---

### 3.7 Analytics & Telemetry

**Purpose:** Define and implement metrics that actually matter for GeoSight usage, performance, and product learning.

- **Scope**
  - Instrument key flows: lens selection, site searches, saved sites, report exports, AI queries, and time-to-first-briefing.
  - Configure Sentry and any client/server instrumentation (`instrumentation.ts`, `instrumentation-client.ts`).[cite:1][cite:2]
  - Define event schemas and naming conventions.

- **Inputs**
  - Product questions (e.g., “which lenses get the most repeat use?”).
  - Existing telemetry configuration.

- **Outputs**
  - Clear set of events with documented semantics.
  - Dashboards or queries (even if external to repo) referenced in docs.

- **Constraints**
  - No collection of sensitive PII beyond what’s necessary; follow privacy guidelines.
  - Ensure analytics code does not significantly degrade performance.

---

### 3.8 Testing (Unit, Integration, Playwright)

**Purpose:** Ensure stability via automated tests: unit tests (Jest), integration tests, and end-to-end Playwright flows.[cite:1]

- **Scope**
  - Write and maintain Jest tests for core libs (scoring, source registry, hooks).
  - Author Playwright tests in `tests` to cover critical flows: landing, guided tours, lens switching, site analysis, saving sites, and report generation.[cite:1]
  - Use Playwright trace/recording to bootstrap scenarios, then refactor for maintainability.

- **Inputs**
  - Playwright and Jest config (`playwright.config.ts`, `jest.config.ts`).[cite:1]
  - Feature specifications and user journeys.

- **Outputs**
  - Test files with clear arrange/act/assert patterns.
  - CI-ready test commands (`npm run test`, `npm run test:e2e`, etc., aligned with existing scripts).[cite:1]

- **Constraints**
  - Tests should be deterministic and fast; avoid real external API calls where possible by mocking.
  - E2E tests should target dev/staging environments, not production credentials.

---

### 3.9 DevOps & Hosting (Vercel and Beyond)

**Purpose:** Keep deployments healthy on Vercel and plan for eventual migration as the project grows.[cite:3]

- **Scope**
  - Maintain `vercel.json` and environment variable configuration.[cite:1]
  - Suggest and document thresholds for “outgrowing Vercel” (API latency, cold starts, rate limits, memory/edge constraints).
  - Propose migration strategies (e.g., containerized backend + managed Postgres/Redis, or hybrid edge + long-running services).

- **Inputs**
  - Current deployment setup from README and Vercel dashboard.[cite:3]
  - Future features requiring heavier compute or storage.

- **Outputs**
  - Hosting guidelines and runbooks (scale-up plan, migration plan).
  - Environment variable matrices per environment (dev/stage/prod).

- **Constraints**
  - No environment-specific secrets committed to the repo.
  - Changes must not break existing Vercel deployment unless a migration is intentionally being executed.

---

### 3.10 AI Orchestration (GeoAnalyst & GeoScribe)

**Purpose:** Manage AI reasoning and report generation flows while keeping them strictly grounded in the deterministic data bundle.[cite:3]

- **Scope**
  - Interface with Cerebras for GeoAnalyst (location-specific reasoning) and Gemini for GeoScribe (report generation).[cite:3]
  - Ensure prompts and flows always condition on the current site’s data bundle and trust metadata.
  - Design “inferred question” workflows where AI is explicitly instructed to reason from topography and available signals only, and to clearly disclose uncertainty.

- **Inputs**
  - AI provider SDKs and environment variables (`CEREBRAS_API_KEY`, `GEMINI_API_KEY`).[cite:3]
  - Structured data bundle for the active site.

- **Outputs**
  - Prompt templates, orchestration modules, and error handling paths.
  - New AI-powered capabilities (e.g., anthropological/topographic analysis) that respect the trust model.

- **Constraints**
  - AI must never invent datasets or hard numbers; it should reason over existing fields and label speculation as such.
  - Be mindful of cost; design calls to be batched and cached where appropriate.

---

### 3.11 Security, Privacy, and Secrets Hygiene

**Purpose:** Protect user data, API keys, and system integrity.

- **Scope**
  - Enforce use of `.env.local` with variables listed in `.env.example`; keep secrets out of repo and client bundles.[cite:1]
  - Implement basic auth/role checks where applicable (see `src/auth.ts`).[cite:2]
  - Review third-party dependencies for security posture.

- **Inputs**
  - Environment variable templates, authentication strategy, and any compliance requirements.

- **Outputs**
  - Hardened auth flows, secret management patterns, and secure API endpoints.
  - Security notes in docs for any newly introduced external services.

- **Constraints**
  - Do not log secrets or sensitive user information.
  - Ensure CORS and rate limiting are configured for public endpoints where needed.

---

### 3.12 Mobile & Device Responsiveness

**Purpose:** Ensure GeoSight works well on phones and tablets, and support future native/hybrid mobile clients.

- **Scope**
  - Optimize current UI for smaller screens (collapsing panels, touch-friendly interactions).
  - Define patterns that will later be reused or wrapped for native Android/iOS apps (e.g., 3D terrain view, in-field note-taking, offline-ready maps).
  - Prioritize features for in-field use (Hunting, In-Field Research, Hiking/Driving lenses) in responsive layouts.

- **Inputs**
  - Device constraints (e.g., Galaxy Note 9, iPhone 14) and mobile product requirements.

- **Outputs**
  - Responsive layouts and breakpoints.
  - Interface contracts that can be reused by mobile clients.

- **Constraints**
  - No platform-specific code in core modules; keep platform differences isolated.
  - Avoid introducing heavy, mobile-hostile dependencies.

---

### 3.13 Documentation & Product Backlog Support

**Purpose:** Keep the project understandable and navigable for humans and agents.

- **Scope**
  - Update `README.md`, `USABILITY_LENS_AUDIT.md`, `docs/BACKLOG.md`, and `agents.md` when functionality changes or new lenses/features are added.[cite:1][cite:3]
  - Write mini-specs for new features (one-page problem/solution/constraints).

- **Inputs**
  - Product decisions, user feedback, and roadmap.

- **Outputs**
  - Clear, concise documentation that matches the current codebase.
  - Backlog entries with enough detail for agents to implement without guesswork.

- **Constraints**
  - Documentation changes should be part of the same PR as code changes when possible.
  - Keep docs honest—document gaps and limitations explicitly.

---

## 4. Working Agreements for Agents

- **Small, focused PRs**  
  - Each PR should ideally touch one skill area and one main feature/change.
  
- **Respect ownership boundaries**  
  - If a change spans multiple skills (e.g., scoring + UI), coordinate via tasks or sub-PRs to avoid conflicting edits.

- **Explain decisions**  
  - PR description must include:
    - What was changed
    - Why it was changed (product motivation)
    - Any tradeoffs or TODOs

- **Tests and docs are part of the work**  
  - Any non-trivial change should include at least one test update and, when relevant, an update to docs or backlog.

---

## 5. How to Add a New Skill

When a new domain becomes important (e.g., “Global Demographics Modeling”):

1. Add a new numbered section under **Skill Definitions**.  
2. Include purpose, scope, inputs, outputs, constraints.  
3. Reference any core files or directories the skill owns.  
4. Link relevant issues in the backlog for concrete starting points.