# Methodology and Source Sheet

GeoSight should be presented as a grounded spatial reasoning system. The core rule is simple: if the app references a signal, the source or derivation should be visible.

## Evidence Hierarchy

- **Direct live**: a current source reading or nearest-feature lookup
- **Derived live**: a normalized score or summary computed from one or more live sources
- **Proxy heuristic**: a first-pass inference used only where no direct signal exists yet
- **Demo overlay**: visual or narrative scaffolding used only for prepared demo entry paths
- **Prohibited in normal flows**: fabricated places, invented hazards, fake nearby results, or unlabeled guesses

## Current Competition Demo Sources

- Elevation: USGS National Map EPQS in the US, OpenTopoData fallback globally
- Infrastructure and amenities: OpenStreetMap via Overpass
- Weather snapshot: Open-Meteo
- Climate history: Open-Meteo Historical Archive
- Earthquakes: USGS Earthquake Catalog
- Fire detections: NASA FIRMS when `NASA_FIRMS_MAP_KEY` is configured
- Stream gauges: USGS Water Services
- Groundwater wells: USGS Groundwater Levels
- Soil profile: NRCS Soil Data Access (SSURGO)
- Seismic design values: USGS Design Maps (ASCE 7-22)
- Demographics: FCC area lookup plus US Census ACS in the US; World Bank national indicators outside the US
- Broadband: FCC Broadband Map for US locations
- Flood zones: FEMA NFHL for US locations
- School context: NCES baseline plus Washington OSPI where matched
- Contamination screening: EPA Envirofacts for US locations

## How GeoSight Scores Places

- Each mission profile uses a deterministic score model before any LLM interpretation happens.
- Factor labels should be read with their evidence kind: direct live, derived live, or proxy heuristic.
- Methodology notes explain how each factor is calibrated and how missing data degrades toward neutral values instead of inventing certainty.
- Subsurface factors now include groundwater depth, soil buildability, and seismic risk where those sources are supported.

## How GeoSight Handles Uncertainty

- Unsupported regions are labeled explicitly instead of treated as safe or empty by default.
- Missing providers degrade to limited or unavailable states, not fabricated values.
- The source-awareness card explains provider, freshness, confidence, access type, and regional fallback logic.
- GeoScribe and GeoAnalyst preserve the same trust model when turning data into prose.

## Competition Talking Points

- GeoSight is honest about uncertainty.
- GeoSight combines live source data, deterministic scoring, and grounded AI instead of choosing only one.
- GeoSight now answers not just surface questions, but beneath-the-surface questions through groundwater, soils, and seismic design context.
- GeoSight remains useful even when a provider is slow because fallback paths, deterministic evidence, and backup demo assets are already built into the experience.
