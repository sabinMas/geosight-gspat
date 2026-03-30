# GeoSight Mission Profiles

## Data Center Cooling (`data-center`)

This profile is for infrastructure teams, utilities, and judges evaluating GeoSight's original Columbia River cooling story. It answers questions such as: "Can this site support cooling-intensive compute infrastructure?", "How close is it to power and water?", and "What subsurface or hazard conditions could complicate development?" It draws from Overpass for roads, power, waterways, land use, and activity context; USGS Water Services for stream gauges and discharge; USGS groundwater wells for water-table depth; NRCS SSURGO for soil drainage and bedrock context; USGS design maps for seismic design values; USGS EPQS or OpenTopoData for elevation; Open-Meteo for weather; Open-Meteo Historical Archive for climate trends; FCC Broadband Map for US connectivity; FEMA NFHL for flood risk; and EPA Envirofacts for contamination screening.

Current factor weights:

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

## Hiking and Recreation (`hiking`)

This profile is for hikers, travelers, trail planners, and judges testing whether GeoSight can answer everyday place questions as well as technical ones. It answers questions such as: "Does this area feel scenic or rugged?", "Are there water features nearby?", "How remote is it from urban activity?", and "Is the weather and air quality supportive for outdoor use?" It uses Overpass for trailheads, paths, viewpoints, peaks, waterfalls, parks, and tourism features; Open-Meteo for current and forecast weather plus AQI fallback; OpenAQ for station-based PM2.5 and PM10 context; Open-Meteo Historical Archive for decade-scale temperature and precipitation trends; and elevation from USGS or OpenTopoData.

Current factor weights:

- Terrain variety `0.23`
- Vegetation density `0.18`
- Water features nearby `0.19`
- Distance from urban areas `0.15`
- Trail access and road proximity `0.08`
- Climate and weather `0.09`
- Air quality `0.08`

## Residential Development (`residential`)

This profile is for homebuyers, planners, and neighborhood-scale development analysis. It answers questions such as: "Does this area look promising for a new neighborhood?", "What access and amenity signals are strong?", "How much risk stands out?", and "What beneath-the-surface conditions affect buildability?" It uses NCES EDGE for nearby public-school geography, Washington OSPI data for official accountability in Washington, Overpass for roads, transit, parks, food, and land use, FEMA NFHL for flood zones, FCC Broadband Map for US broadband, OpenAQ and Open-Meteo for air quality, EPA Envirofacts for contamination screening, USGS groundwater wells, NRCS soil profile, USGS seismic design maps, and elevation from USGS or OpenTopoData.

Current factor weights:

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

## Commercial and Warehouse (`commercial`)

This profile is for retail, logistics, and corridor analysis rather than formal market appraisal. It answers questions such as: "Does this area appear commercially active?", "How strong is freight access?", "Is there nearby utility infrastructure?", and "What signals suggest a workable warehouse or retail corridor?" It relies heavily on Overpass for road access, mapped activity, shops, offices, and commercial POIs; elevation from USGS or OpenTopoData; Open-Meteo for climate context; source-aware demographics from FCC plus ACS in the US and World Bank national indicators outside the US; and the same flood, contamination, groundwater, soil, and seismic context where those sources are regionally supported.

Current factor weights:

- Traffic and population density `0.25`
- Highway and freight access `0.20`
- Existing commercial density `0.15`
- Land cost indicators `0.15`
- Utility infrastructure `0.15`
- Terrain flatness `0.10`

## General exploration note

The landing experience exposes a `General Exploration (Residential Lens)` entry point. It currently maps to the `residential` profile through `GENERAL_EXPLORATION_PROFILE_ID` in `src/lib/landing.ts`, so open-ended exploration still inherits residential-style access, hazard, amenity, and school-context framing until GeoSight grows a dedicated general-exploration profile.
