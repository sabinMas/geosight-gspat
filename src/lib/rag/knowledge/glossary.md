# GeoSight Glossary

## Mission profile
A mission profile is GeoSight's scoring and reasoning lens for a place. It decides which factors matter, how they are weighted, and how the assistant should talk about the place. Today the main mission profiles are data-center cooling, hiking and recreation, residential development, and commercial or warehouse analysis.

## Workspace card
A workspace card is a reusable unit of the GeoSight interface. Each card answers a specific question, declares what data it needs, shows its coverage and failure mode, and can be turned on or off inside the explore workspace. Examples include Mission score, Source awareness, School context, and Cooling water.

## Board
A board is GeoSight's saved workspace layout concept. In the type system it is a `SavedBoard`: a named set of visible cards, an active card, and the profile it belongs to. It is the seed of the future user-configurable dashboard experience.

## Lens
Lens is plain-language shorthand for the active mission profile or interpretation mode. Saying "look at this place through the residential lens" means "apply the residential scoring factors, prompts, and card defaults."

## Source registry
The source registry is GeoSight's map of which providers should be primary or fallback by domain and region. `src/lib/source-registry.ts` ranks providers for weather, hazards, schools, terrain, imagery, and other domains across scopes such as global, US, Washington, Europe, Japan, India, Latin America, Africa, and Australia/New Zealand.

## Trust signal
A trust signal is any UI cue that tells the user how much to trust a result. In GeoSight that usually means a source status badge, freshness statement, coverage note, fallback-provider list, or evidence-kind label such as direct live, derived live, or proxy heuristic.

## Provenance
Provenance is the trace of where an insight came from. In GeoSight it combines provider name, freshness, coverage, confidence note, and whether the result was direct data, derived analysis, or a demo overlay.

## Mission run
A mission run is a multi-step, judge-facing briefing built from a preset story. Each mission run has an objective, a list of step prompts, recommended supporting cards, a source summary, and a model trail. Current presets cover Columbia River infrastructure, Tokyo commercial analysis, and Washington residential due diligence.

## Deterministic score
A deterministic score is the repeatable numeric output from `src/lib/scoring.ts`. It does not depend on model creativity. The same geodata and the same profile produce the same weighted result every time.

## Factor evidence
Factor evidence is the label that explains what kind of input supported a score factor. GeoSight uses three main labels: direct live signal, derived live analysis, and proxy heuristic. This keeps users from confusing hard measurements with softer first-pass reasoning.
