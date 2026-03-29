# Methodology and Source Sheet

GeoSight should be presented as a grounded spatial reasoning system. The core rule is simple: if the app references a signal, the source or derivation should be visible.

## Source Hierarchy

- Direct live source data
- Derived analysis from live source data
- Demo overlay seed data
- Prohibited in normal flows: fabricated places, invented hazards, or unlabeled guesses

## Competition Demo Sources

- Elevation: USGS National Map EPQS
- Infrastructure and nearby context: OpenStreetMap via Overpass
- Weather and air quality: Open-Meteo
- Hazards: USGS earthquake summaries
- Demographics: FCC area lookup plus US Census ACS
- School context: NCES baseline plus Washington OSPI where available

## How GeoSight Scores Places

- Each mission profile uses a deterministic score model
- Factor labels should be read with their evidence kind: direct live, derived live, or proxy
- Proxy factors are acceptable only when they are clearly labeled

## Competition Talking Points

- GeoSight is honest about uncertainty
- GeoSight works across mission profiles and more than one geography
- GeoSight keeps the AI grounded in live geospatial context
- GeoSight remains useful even when a provider fails, because fallback paths are built in
