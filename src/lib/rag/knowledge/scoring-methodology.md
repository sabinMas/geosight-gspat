# GeoSight Scoring Methodology

## Deterministic scoring pipeline

GeoSight computes a deterministic mission score from live or derived geodata before any LLM interpretation happens. Every profile contains weighted factors in `src/lib/profiles.ts`, and `src/lib/scoring.ts` turns each factor into a `0-100` score. The final mission score is the rounded weighted sum of those factor scores. Factor rows also carry an evidence label so users can tell whether the score came from a direct live signal, a derived live analysis, or a proxy heuristic.

## How missing data behaves

GeoSight does not fabricate score inputs when providers are missing. Most functions degrade toward neutral values rather than zero so unsupported regions do not look falsely terrible. Typical null behavior is:

- distance factors return `50`
- climate factors return about `60`
- elevation factors return about `55`
- broadband, contamination, flood, groundwater, soil, and seismic helpers return near-neutral values when their source is unsupported or unavailable

## Data Center Cooling profile weights

- Cooling water access `0.26`
- Elevation and flatness `0.12`
- Power infrastructure `0.18`
- Climate suitability `0.13`
- Road transportation `0.07`
- Land classification `0.06`
- Broadband readiness `0.10`
- Flood risk `0.01`
- Contamination risk `0.01`
- Groundwater depth `0.02`
- Soil buildability `0.02`
- Seismic risk `0.02`

This profile favors live infrastructure readiness, hydrology, and buildability. Water access is a derived live score that blends mapped water proximity, nearest USGS stream-gauge distance, and discharge volume. The new subsurface factors slightly refine the score without overwhelming the core infrastructure story.

## Hiking and Recreation profile weights

- Terrain variety `0.23`
- Vegetation density `0.18`
- Water features nearby `0.19`
- Distance from urban areas `0.15`
- Trail access and road proximity `0.08`
- Climate and weather `0.09`
- Air quality `0.08`

This profile emphasizes terrain character and scenic context. Terrain variety and remoteness still contain heuristic logic, so their evidence labels matter.

## Residential Development profile weights

- School district proximity `0.15`
- Road and transit access `0.13`
- Terrain buildability `0.12`
- Flood risk `0.13`
- Commercial amenities nearby `0.09`
- Land classification `0.09`
- Broadband readiness `0.07`
- Air quality `0.08`
- Contamination risk `0.06`
- Groundwater depth `0.03`
- Soil buildability `0.03`
- Seismic risk `0.02`

This profile is an early due-diligence screen rather than a parcel-entitlement engine. It now includes beneath-the-surface factors for water-table depth, drainage and hydrologic group, and structural shaking context where those US-only sources are available.

## Commercial and Warehouse profile weights

- Traffic and population density `0.25`
- Highway and freight access `0.20`
- Existing commercial density `0.15`
- Land cost indicators `0.15`
- Utility infrastructure `0.15`
- Terrain flatness `0.10`

This profile remains intentionally more heuristic because GeoSight does not yet ingest parcel economics or detailed global traffic counts. Commercial demand, commercial density, and land-cost indicators should be read as first-pass proxy heuristics, not as direct measurements.

## Subsurface scoring additions

- **Groundwater depth**: favors deeper water tables for infrastructure and moderate depth bands for residential screening
- **Soil buildability**: translates soil drainage class and hydrologic group into a coarse foundation and drainage score
- **Seismic risk**: uses USGS peak ground acceleration as an inverse structural-risk score

These factors are only strong where the relevant US sources are supported. Outside those regions, they degrade toward neutral values rather than inventing global certainty.

## Deterministic scores versus LLM interpretation

The deterministic score answers, "How does this place rank under the current rule set?" The LLM layer answers, "How should a human interpret those results, the evidence mix, the coverage gaps, and the next diligence steps?" GeoSight keeps these separate on purpose. The score is reproducible because the formulas are fixed. The model is allowed to explain tradeoffs, sequence next checks, and translate technical evidence into plain language, but it is instructed not to invent live facts and not to hide whether a point came from a direct live signal, a derived live analysis, or a proxy heuristic.
