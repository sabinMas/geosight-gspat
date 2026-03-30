# GeoSight Data Sources

## OpenStreetMap via Overpass

Endpoint: `https://overpass-api.de/api/interpreter`. GeoSight uses Overpass for infrastructure, land-use, amenities, nearby places, recreation context, and commercial activity patterns. Coverage is global, but completeness depends on local mapper density. GeoSight treats Overpass as direct mapped context, not as a source of business quality or operating hours.

## Nominatim geocoding and reverse geocoding

Endpoints: `https://nominatim.openstreetmap.org/search` and `https://nominatim.openstreetmap.org/reverse`. GeoSight uses Nominatim for place search and reverse lookup, and for non-US country-code discovery before requesting World Bank indicators. Coverage is global.

## USGS elevation and OpenTopoData fallback

Endpoints: `https://epqs.nationalmap.gov/v1/json` and `https://api.opentopodata.org/v1/srtm90m`. GeoSight uses USGS EPQS first for likely US coordinates, then falls back to OpenTopoData SRTM for global coverage. It returns point elevation and sampled transects for the elevation profile tool.

## Open-Meteo forecast and air-quality context

Endpoints: `https://api.open-meteo.com/v1/forecast` and `https://air-quality-api.open-meteo.com/v1/air-quality`. GeoSight requests current temperature, weather, wind, precipitation context, cooling-demand context, and AQI fallback values. Coverage is global, with AQI quality varying by region.

## Open-Meteo Historical Archive

Endpoint: `https://archive-api.open-meteo.com/v1/archive`. GeoSight aggregates daily data into yearly summaries for 2015-2024 and derives baseline versus recent temperature comparisons plus a warming, cooling, or stable trend label. Coverage is global.

## OpenAQ station readings

Endpoint family: `https://api.openaq.org/v3/locations` and `https://api.openaq.org/v3/locations/{id}/latest`. GeoSight uses nearby station searches and latest PM2.5/PM10 values when a monitoring station exists within range. Coverage is global where public OpenAQ stations exist; GeoSight falls back to Open-Meteo AQI context when no station reading is available.

## FCC Area API, US Census ACS, and World Bank fallback

Endpoints: `https://geo.fcc.gov/api/census/area`, `https://api.census.gov/data/2022/acs/acs5`, and `https://api.worldbank.org/v2/country/{country}/indicator/{indicator}`. GeoSight uses the FCC Area API plus ACS 5-year estimates for US county demographics, and World Bank national indicators outside the US after reverse-geocoding a country code. The non-US path is national-scale context, not parcel or city analysis.

## USGS Earthquake Catalog

Endpoint: `https://earthquake.usgs.gov/fdsnws/event/1/query.geojson`. GeoSight asks for events within 250 km over the last 30 days and summarizes event count, strongest magnitude, and nearest event distance. Coverage is global. This is recent-event context, not a full seismic hazard model.

## NASA FIRMS

Endpoint family: `https://firms.modaps.eosdis.nasa.gov`. GeoSight summarizes near-real-time VIIRS fire detections when `NASA_FIRMS_MAP_KEY` is configured. Coverage is global. If the key is missing, GeoSight makes that unavailable state explicit rather than inventing fire data.

## FEMA National Flood Hazard Layer

Endpoints: FEMA NFHL ArcGIS query services. GeoSight queries a point against FEMA flood-zone layers and returns the zone code, Special Flood Hazard Area flag, and a plain-language label. Coverage is United States only.

## FCC Broadband Map

Endpoint family: FCC broadband availability endpoints. GeoSight summarizes provider count, peak download and upload speeds, technology mix, and fiber presence. Coverage is United States only.

## USGS Water Services

Endpoints: `https://waterservices.usgs.gov/nwis/iv/` and related site metadata endpoints. GeoSight requests active stream gauges with live discharge values and recovers expanded metadata where available. Coverage is the United States gauge network only.

## USGS Groundwater Levels

Endpoint family: USGS groundwater services with a modern fallback path inside GeoSight's adapter. GeoSight returns nearby monitoring wells, latest depth-to-water reading, and well count. Coverage is United States only, and results are bounded to recent readings.

## NRCS Soil Data Access (SSURGO)

Endpoint: `https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest`. GeoSight queries the mapped soil unit at a point and returns map-unit name, drainage class, hydrologic group, depth to water table, depth to bedrock, dominant texture, k-factor, and available water storage. Coverage is United States mapped soil-survey areas.

## USGS Seismic Design Maps

Endpoint: `https://earthquake.usgs.gov/ws/designmaps/asce7-22.json`. GeoSight returns site-specific design values such as PGA, `Ss`, and `S1` for ASCE 7-22 screening. Coverage is United States only.

## EPA Envirofacts

Endpoint families: `https://data.epa.gov/efservice/...` and `https://data.epa.gov/dmapservice/...`. GeoSight uses EPA Superfund and TRI datasets to count nearby screened facilities and identify the nearest Superfund site. Coverage is United States only and should be treated as contamination screening, not parcel-history certainty.

## NCES EDGE and Washington OSPI

Endpoints: NCES ArcGIS public-school layers plus Washington Socrata datasets. GeoSight uses NCES for nearby public-school geography nationwide and augments Washington schools with OSPI enrollment and assessment data when matches are found. Coverage is US public K-12 baseline with stronger official support in Washington.

## Cesium Ion geocoder and imagery

Provider: Cesium Ion. GeoSight uses the Cesium geocoder as a secondary search path and Cesium/Bing imagery as the globe's basemap layer. Coverage is global according to Cesium service availability.

## Groq and Gemini analysis providers

These are not geospatial data sources, but they are the model providers that turn GeoSight context into natural-language analysis and structured reports. GeoSight falls from Groq to Gemini and then to deterministic fallback text if both model providers fail.
