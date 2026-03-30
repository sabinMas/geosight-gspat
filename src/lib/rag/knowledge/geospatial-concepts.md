# GeoSight Geospatial Concepts

## FEMA flood zones in GeoSight

GeoSight reads FEMA NFHL flood-zone codes for US points and turns them into a plain-language label. `Zone X` is treated as minimal mapped flood hazard and scores highest in the deterministic flood factor. `Zone A`, `Zone AE`, `Zone AO`, `Zone AH`, `Zone V`, and `Zone VE` are Special Flood Hazard Area categories and receive the strongest penalty. `Zone B`, `Zone C`, and `Zone D` are lower-confidence or moderate-risk contexts and score in the middle. GeoSight does not interpret a missing FEMA result as safe; it labels it unavailable or unsupported.

## Air quality and AQI thresholds

GeoSight uses two related air-quality ideas. When OpenAQ station data is present, it classifies PM2.5 or PM10 into public-health bands such as `Good`, `Moderate`, `Unhealthy for Sensitive Groups`, `Unhealthy`, `Very Unhealthy`, and `Hazardous`. When OpenAQ is missing but Open-Meteo returns a current AQI value, GeoSight maps that number into the same broad health buckets. In the scoring layer, better air quality scores higher, while unhealthy categories degrade the factor sharply.

## Seismic context in GeoSight today

GeoSight now has two different seismic lenses:

- **Recent activity context** from the USGS earthquake feed, summarized as event count, strongest recent magnitude, and nearest event distance within 250 km over the last 30 days
- **Design-risk context** from USGS design maps, summarized as PGA, `Ss`, and `S1` for ASCE 7-22 screening in the US

The earthquake feed should be read as "recent activity nearby," not as formal code zoning. The design-map values should be read as first-pass structural screening, not as a replacement for engineering or geotechnical review.

## Elevation and terrain terminology

`Elevation` in GeoSight is a point sample in meters, usually from USGS EPQS in the US or OpenTopoData SRTM elsewhere. `Elevation profile` means a sampled transect across the active region, not a full slope raster. `Terrain buildability` is the residential and commercial interpretation that rewards lower, flatter terrain. `Terrain variety` is the hiking interpretation that rewards moderate relief and scenic variation rather than flatness. `Cooling terrain` is the data-center interpretation that rewards relatively lower, flatter sites because they tend to be easier to build and cool. None of these terrain terms claim parcel-grade engineering certainty; they are first-pass spatial signals.

## Subsurface context in GeoSight

GeoSight's current beneath-the-surface context is strongest in the United States and includes:

- groundwater level readings from nearby USGS wells
- soil drainage, hydrologic group, texture, bedrock depth, and water-table depth from NRCS SSURGO
- USGS design-map shaking values for seismic screening

These are screening tools, not parcel-specific geotechnical studies. Outside supported regions, GeoSight should say the source is unavailable rather than implying global equivalence.

## Provenance in the GeoSight context

In GeoSight, provenance means the user can tell where a conclusion came from, how fresh it is, whether it is direct or derived, and what region it truly covers. A provenance-aware card or answer should show the provider, source status (`live`, `derived`, `limited`, `unavailable`, or `demo`), freshness window, coverage statement, and a confidence note. Provenance is not just citation text. It is the combination of source metadata, fallback behavior, evidence kind, and honest disclosure when coverage is US-only or only approximate.
