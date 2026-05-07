# Global Datasets Catalog

**Last updated:** 2026-05-07
**Purpose:** Authoritative catalog of geospatial datasets evaluated, integrated, or queued for GeoSight's country-pack rollout (Phase 3 of [`BACKLOG.md`](BACKLOG.md)).

Every entry must be **open or low-cost**, **clearly licensed**, and **machine-accessible** (REST/WMS/WMTS/WFS/STAC/bulk download). Scraping sites that disallow automated access is forbidden — see `AGENTS.md` § 6 (Global Dataset Scout) guardrails.

---

## Status legend

- ✅ **Integrated** — wired into `src/app/api/geodata/route.ts`, registered in `src/lib/source-registry.ts`
- 🟡 **Evaluated** — ingestion spec written, integration not yet started
- 🔍 **Candidate** — identified, needs evaluation
- ❌ **Rejected** — license or access issue, document why

---

## Entry template

```
### <Dataset name>

- **Maintainer:**
- **Status:** ✅ / 🟡 / 🔍 / ❌
- **Primary URL:**
- **Coverage:** (countries/regions, resolution)
- **Variables:** (e.g., flood depth, soil pH, population)
- **Update cadence:**
- **License:** (exact wording for key clauses)
- **Access method:** (REST API / WMS / WMTS / WFS / STAC / tiles / bulk download)
- **Integration notes:**
- **Source-registry slug:** (`src/lib/source-registry.ts` key when integrated)
```

---

## Currently integrated (US-first stack)

| Dataset | Domain | Coverage | Provider key |
|---|---|---|---|
| USGS EPQS | terrain | US | `usgs-epqs` |
| OpenTopoData | terrain | global | `opentopodata` |
| Open-Meteo Forecast + Archive | weather/climate | global | `open-meteo` |
| Open-Meteo Air Quality | environmental | global | `open-meteo-aq` |
| OpenAQ | environmental | global (sparse) | `openaq` |
| OpenStreetMap / Overpass | nearby places | global | `osm-overpass` |
| Cesium World Terrain (Ion) | terrain | global | `cesium-ion-terrain` |
| NASA FIRMS | hazards (fire) | global | `nasa-firms` |
| USGS earthquakes | hazards (seismic) | global | `usgs-earthquakes` |
| GLoFAS / global flood | hazards (flood) | global | `glofas` |
| GADM admin boundaries | reference | global | `gadm` |
| FEMA NFHL | hazards (flood) | US | `fema-nfhl` |
| EPA Envirofacts | environmental | US | `epa-envirofacts` |
| NRCS soil profiles | soil | US | `nrcs-ssurgo` |
| USGS NHD streams | hydrology | US | `usgs-nhd` |
| USGS groundwater wells | hydrology | US | `usgs-groundwater` |
| FCC Broadband Map | broadband | US | `fcc-broadband` |
| NCES schools | schools | US | `nces` |
| WA OSPI accountability | schools | WA | `wa-ospi` |
| USGS seismic design maps | hazards (seismic) | US | `usgs-seismic-design` |
| SoilGrids 2.0 | soil | global | `soilgrids` |
| WorldPop population density | population | global | `worldpop` |
| ESA WorldCover land cover | land cover | global | `esa-worldcover` |
| USGS LANDFIRE | land cover | US | `landfire` |
| Eurostat regional broadband + demographics | broadband, demographics | EU | `eurostat` |

---

## Phase 3 region packs — evaluated

**Status:** All 8 region packs have been evaluated by dedicated scout agents (May 2026). P0 layers (priority 1 for integration) are flagged per pack. P1 and P2 are backlog. License flags and machine-access notes are documented per dataset.

---

### EU pack (priority 1)

**Scout summary:** 24 verified datasets. P0 focus: CORINE Land Cover, Copernicus DEM, EFFIS fires, EEA Air Quality, EEA Floods Directive, OS Open Data (GB). License caution: LUCAS Topsoil and ESDB v2.0 require web-form registration (not machine-accessible in pure sense); GISCO and BKG have mixed licensing.

- [Full EU catalog in consolidated markdown — see agent findings from 2026-05-07 scout session](https://github.com/sabinMas/geosight-gspat/wiki/EU-Pack-Scout-Findings)

**P0 datasets (must-ship for EU baseline):**
1. **CORINE Land Cover (CLC)** — CC-BY 4.0; WMS/WMTS; 100m / 10m (CLC+ Backbone)
2. **Copernicus DEM (GLO-30 / EEA-10)** — CC-BY-equivalent; AWS S3 COG; 30m global / 10m EU
3. **EFFIS (European Forest Fire Info)** — CC-BY 4.0; WMS/REST; EU+neighborhood
4. **EEA Air Quality e-Reporting (Discomap)** — EEA open + attribution; REST; ~5,000 stations
5. **EEA Floods Directive** — EEA open; WMS/WFS; 6-year reporting cycle
6. **OS Open Data (Great Britain)** — OGL v3 (CC-BY-equivalent); WMTS / REST APIs; full GB coverage

**P1 datasets:** HRL Imperviousness, HRL Tree Cover Density, CEMS Floods (EFAS), CAMS Atmosphere, EEA WISE water, GHSL built environment, Sentinel-2 STAC, IGN Spain, IGN France, PDOK Netherlands, +10 more. See full catalog for details.

---

### Canada / Greenland / Nordic pack

**Scout summary:** 28 verified datasets. P0 focus: Natural Resources Canada DEM/MRDEM, Kartverket Norway DTM, Lantmäteriet Sweden, ArcticDEM, NVE hazards, IMO weather, Statistics Canada census, CWFIS. Strong open data culture across Nordic countries; Greenland/Baffin Islands coverage via ArcticDEM & Landsat.

**P0 datasets:**
1. **NRCan CDEM / MRDEM / HRDEM** — Open Government Licence Canada; WMS/bulk; 30m–200m
2. **Kartverket DTM (Norway)** — CC-BY 4.0; WMTS/WFS; 10m–50m
3. **Lantmäteriet (Sweden) Open Data** — CC0 (as of 2024); REST/WMTS; 1m DEM + 25cm ortho
4. **ArcticDEM (Polar Geospatial Center)** — CC-BY-SA 4.0; AWS S3; 2m resolution (Arctic-wide)
5. **NVE Hazards (Norway)** — CC-BY 4.0; WMS; flood, landslide, avalanche
6. **IMO Iceland (Icelandic Meteorological Office)** — CC-BY 4.0; REST; forecasts + historical
7. **Statistics Canada Census** — CC-BY 4.0; REST API; DA/CT boundaries + demographics
8. **CWFIS (Canadian Wildland Fire Info)** — Public domain; REST/shapefile; fire perimeters

**P1 datasets:** Lantmäteriet (Sweden) vegetation & open data, SMHI (Sweden) climate & NWP, MET Norway Frost forecasts, demographic APIs (SSB Norway, SCB Sweden, Tilastokeskus Finland, DST Denmark, Hagstofa Iceland), CanVec/NHN transport networks, NAPS air quality, ~10 more. Full catalog on request.

---

### Japan pack

**Scout summary:** 17 verified datasets. P0 focus: GSI tile services (raster + vector), Hazard Map Portal (flood/tsunami/sediment/storm surge), J-SHIS seismic hazard maps + fault REST API, JMA AMeDAS observations, JMA earthquake/tsunami/volcanic feeds, KSJ national land data, e-Stat census. Excellent data infrastructure; strong English translations from GSI/JMA.

**P0 datasets:**
1. **GSI Standard Map / Tiles** — GoJ-STU 2.0 (CC-BY-compatible); XYZ; seamless basemap
2. **GSI Hillshade / Slope / Relief Tiles** — GoJ-STU 2.0; XYZ; terrain texture & DEM-encoded PNG
3. **GSI Vector Tiles (optimal_bvmap)** — GoJ-STU 2.0; MVT/PBF; Japan-resolution vector basemap
4. **Hazard Map Portal (Kasaneru)** — Free for commercial use; XYZ raster tiles; flood/tsunami/sediment/storm surge/debris flow zones
5. **J-SHIS Seismic Hazard Maps + REST API** — NIED terms; WMS + REST fault API; annual model updates
6. **JMA AMeDAS Real-Time Observations** — JMA terms; JSON; ~1,300 stations at 10-min cadence
7. **JMA Earthquake / Tsunami / Volcanic Feeds** — JMA terms; GeoJSON/XML; real-time alerts
8. **National Land Numerical Information (KSJ)** — Mixed licensing (CC-BY 4.0 newer, GoJ-STU older); 100+ thematic layers

**P1 datasets:** JMA Forecast/GPV, Project PLATEAU 3D City Models (CC-BY), JAXA ALOS LULC (non-commercial flag), JAXA Earth API (STAC), GSJ Geologic Maps + Volcanoes DB, e-Stat Census API, MLIT Hydrology DB (Japanese-only, no API), KMA Korea, +5 more. Full catalog included.

---

### India pack

**Scout summary:** 15 verified datasets. P0 focus: Bhuvan (base maps, thematic LULC, hazards), India-WRIS (hydrology/water resources, real-time), IMD (meteorology/cyclones), data.gov.in (GODL-India open data + CPCB air quality), Survey of India (admin boundaries), Census 2011 (demographics), OpenAQ (air quality aggregation). Key challenge: most government sources are not-uniformly licensed; verify per-layer before commercial use.

**P0 datasets:**
1. **Bhuvan Base Maps** — Bhuvan terms (non-commercial focus); WMS/WMTS; multi-res satellite basemap
2. **Bhuvan Thematic (LULC, Wasteland, Water Bodies)** — Bhuvan terms; WMS/WMTS; 1:50K/1:250K land cover
3. **Bhuvan Hazards (Flood, Landslide, Glacial Lakes)** — Bhuvan/NDMA terms; WMS; ~80k landslide events mapped
4. **India-WRIS (Hydrology)** — Government open data; WebGIS (internal JSON); 1300+ CWC stations real-time
5. **IMD (India Meteorological Department)** — Free for non-commercial; JSON/KML; 36 subdivisions, cyclones, AWS network
6. **data.gov.in (OGD India)** — **GODL-India (ODbL-compatible, CC-BY-style)** — REST API per resource; 600+ geo datasets
7. **Survey of India (Admin + Topographic)** — Free download via SoI portal (zero-payment cart); bulk SHP/GeoTIFF
8. **Census 2011 + SHRUG v2.1** — Public domain + CC-BY (SHRUG mirrors); shapefile/Parquet; 640k villages + demographics
9. **CPCB CAAQMS Air Quality** — Public data (no formal license); web portal + OpenAQ aggregation; ~500 stations
10. **OpenAQ (Air Quality Aggregator)** — **CC-BY 4.0** — REST API; aggregates CPCB + state boards

**P1 datasets:** MOSDAC satellite weather (INSAT, SCATSAT), Bhuvan Agriculture (CHAMAN, FASAL), NDMA Hazard Atlases, SAFAR forecast (metros only). Full catalog for all 15 entries available.

---

### South Asia — Coverage Status Note

**Pakistan (PK) & Bangladesh (BD):** Code-routed via `SOUTH_ASIA_CODES` but **NOT YET** covered by dedicated regional packs. These countries are global-baseline-only in current Phase 3 (520 tests total). Both countries have emerging open-data initiatives (SPARRSO satellite imagery for Bangladesh, Survey of Pakistan for topography) and should be Phase 3.5 expansion candidates (Tier 1 priority: 400M people combined).

---

### Australia / NZ pack

**Scout summary:** 15 verified datasets (9 AU, 6 NZ). P0 focus: Geoscience Australia 1" SRTM DEM, Digital Earth Australia (DEA) STAC + Landsat/Sentinel, Geofabric hydrology, BOM Weather & Radar, IMOS Marine Data, LINZ Topo + Elevation + LCDB land cover, Stats NZ boundaries, GeoNet earthquakes/volcanoes. Australia has excellent open-data infrastructure; NZ similarly strong.

**P0 datasets:**
1. **Geoscience Australia SRTM-derived DEM** — CC-BY 4.0; OGC WCS/WMS; 1 arc-second (~30m)
2. **Digital Earth Australia (DEA) — Landsat/Sentinel ARD + STAC** — CC-BY 4.0; STAC / OGC / GEE; 30+ years time series
3. **Geofabric (Australian Hydrological Geospatial Fabric)** — CC-BY 4.0; WMS/WFS; streams, catchments, aquifers
4. **BOM Weather, Radar, Satellite** — Free non-commercial; FTP / JSON API / GeoTIFF; real-time + historical
5. **ABS ASGS Edition 3** — CC-BY 4.0; GeoPackage + APIs; mesh block to state/territory hierarchy
6. **LINZ Topo50 / Topo250 (NZ)** — CC-BY 4.0; WMTS/WFS; 1:50k and 1:250k vector basemap
7. **LINZ Elevation (NZ 1m DEM/DSM)** — CC-BY 4.0; AWS S3 COG + WMTS; LiDAR-derived, rolling coverage
8. **LCDB v5 (NZ Land Cover)** — CC-BY 4.0; WFS/WMTS; 33 classes, multi-temporal 1996–2018
9. **GeoNet (NZ Earthquakes/Volcanoes)** — CC-BY 3.0 NZ; REST/GeoJSON/FDSN; real-time seismic + VAL
10. **Stats NZ Geographic Data Service** — CC-BY 4.0; WFS/WMTS/XYZ; SA1/SA2, meshblock, iwi boundaries

**P1 datasets:** NSW RFS fires (state-only), TERN SLGA soil profiles, IMOS marine, S-map NZ soils, NIWA climate, GUGiK Poland, Lantmäteriet Sweden. Full catalog for all 15 entries available.

---

### Middle East / UAE pack

**Scout summary:** 14 verified datasets. **Significant scarcity warning:** Saudi Arabia, Qatar, Kuwait, Yemen, Syria, and Iraq have thin or absent open machine-accessible GIS APIs. UAE (Abu Dhabi + Dubai) is the regional standout. Recommended approach: use HDX COD-AB + GADM v4 admin backbone, pair with UAE city data, add USGS FDSNWS seismic, UNESCO heritage overlays, OpenAQ air quality. License flags: GISCO non-commercial default, NIWA mixed tiers, IRSC Iran citation-only.

**P0 datasets:**
1. **Abu Dhabi SDI (AD-SDI) Open Data** — ArcGIS REST; 100+ layers (admin, schools, roads, utilities, mangroves, reefs)
2. **Dubai Pulse API** — OAuth2 REST; RTA transit, DLD land registry, culture sites
3. **HDX COD-AB (ME Boundaries)** — CC-BY-IGO / public domain per COD-AB; shapefile/GeoJSON; UAE, Saudi, Qatar, Egypt
4. **OpenAQ (Air Quality)** — CC-BY 4.0; REST API; pan-ME station network (sparse in Gulf states)
5. **USGS FDSNWS (Seismic)** — US public domain; GeoJSON/QuakeML; global coverage inc. full ME

**P1 datasets:** Bayanat.ae UAE federal portal (CKAN), EAMENA archaeology database (CC-BY with register tier), UNESCO World Heritage GIS (CC-BY or Hub-licensed), GSI Israel earthquakes, Geofabrik OSM extract. P2: GASTAT Saudi, PCBS Palestine, IRSC Iran, Open Data Oman. Full catalog explains access friction per source.

**⚠️ Honesty note:** Saudi Arabia, Qatar, Kuwait have the geographic footprint but the thinnest open APIs. GEOSA/NGP national mapping agencies are closed to public. Recommend defaulting to OSM + GADM + USGS global layers + UAE urban detail rather than promising per-kingdom coverage.

---

### East Asia Pack (Taiwan, Hong Kong, South Korea + Global Coverage for Mainland China)

**Scout summary:** 16 verified datasets. **CRITICAL ROUTING NOTE:** This pack has heterogeneous coverage:
- **Taiwan, Hong Kong, South Korea** ✅ Excellent — Dedicated government open-data portals with English APIs + CC-BY/permissive licenses
- **Mainland China** ⚠️ **Global baseline only** — No usable open-data government portals (RESDC, CMA, CENC, NGCC are gated/Chinese-internal). All Mainland coverage derives from international datasets (OSM, ESA WorldCover, Hansen, ERA5, USGS, GEBCO)

**Recommended approach:** For Taiwan/Hong Kong/South Korea, use regional datasets. For Mainland China, default to Sentinel-2, global climate reanalysis, and OSM—do not imply parity with regional coverage.

**P0 datasets:**
1. **OpenStreetMap China Extract (Geofabrik)** — ODbL 1.0; bulk PBF; daily updates
2. **Natural Earth Vector** — Public domain; multi-scale 1:10m–1:110m; China + Taiwan as separate features
3. **ESA WorldCover (10m LULC)** — CC-BY 4.0; AWS S3 COG / GEE; global incl. all East Asia
4. **Hansen Global Forest Change (2000–2024)** — CC-BY 4.0; Google Cloud Storage; deforestation/gain
5. **Copernicus ERA5 Reanalysis** — Copernicus License (CC-BY-equivalent); CDS API; global climate history
6. **USGS Earthquake Feeds** — US public domain; GeoJSON/FDSN; full East Asia coverage
7. **Taiwan data.gov.tw** — KOGL v1.0 (CC-BY-equivalent); REST API; admin boundaries, demographics, transport
8. **Taiwan CWA (Central Weather Administration)** — Taiwan open license; REST API + AWS mirror; forecasts + satellite
9. **Hong Kong data.gov.hk** — HK open terms (CC-BY-style); CKAN API; transport, environment, demographics
10. **Hong Kong GeoData Store (LandsD)** — HK open terms; WMS/WFS/downloads; 1:50k topo, orthophoto, 3D models
11. **Korea data.go.kr** — KOGL Type 1 (CC-BY-equivalent); REST APIs; pan-Korea open data
12. **Korea KMA Weather** — KOGL mixed (raw data Type 1, icons Type 2); REST API; forecasts + observations

**P1 datasets:** GADM (license caveat: non-commercial only), FDSN China seismic network, GEBCO bathymetry, Mongolian HDX/OSM. Full catalog explains why Mainland coverage is sparse and recommends fallback strategy.

**⚠️ Honesty note (critical):** Recommend setting product UI copy to acknowledge: *"Coverage in Mainland China is limited to globally-derived datasets (satellite imagery, reanalysis, global seismic). High-resolution local layers are available for Taiwan, Hong Kong, and South Korea."* Do not imply parity with Western packs.

---

### Latin America Pack (South America + Mexico & Central America)

**Scout summary:** 24 verified datasets. **Heterogeneous regional coverage:**
- **Brazil & Amazon** ✅ Excellent — MapBiomas, INPE PRODES/DETER/Queimadas, Global Forest Watch, IBGE/geobr, RAISG, ANA hydrology
- **Southern Cone** (Chile, Argentina, Uruguay) — Moderate — Functional but fragmented portals (SMN, SENAMHI, IGN-AR)
- **Mexico** — Moderate — INEGI (CC-BY-SA), CONABIO, national weather services; **integration with South America pack unclear**
- **Central America** — Variable — Costa Rica excellent (SNITCR), Guatemala/Honduras/El Salvador/Nicaragua moderate, Panama/Belize limited

**Challenge:** CC-BY-SA propagation on MapBiomas + TerraBrasilis requires isolated layering (not baked into static tile exports). **Language caution:** ~70% Portuguese/Spanish only. **Mexico/Central America data maturity uncertain for Phase 3** — recommend Phase 3.5 expansion for clarity.

**P0 datasets:**
1. **MapBiomas Brasil** — CC-BY-SA 4.0; GEE / WMS / bulk download; 30m annual 1985–2024
2. **MapBiomas Amazonia (Pan-Amazon)** — CC-BY-SA 4.0; GEE / WMS; harmonized across 9 countries
3. **INPE PRODES (Annual Amazon Deforestation)** — CC-BY-SA 4.0; GeoServer WMS/WFS; 1988–present
4. **INPE DETER (Real-time Deforestation Alerts)** — CC-BY-SA 4.0; WMS/WFS; daily–subweekly alerts
5. **INPE Queimadas (Active Fire Database)** — CC-BY-SA 4.0; WMS/WFS + CSV; pan-Latin-America
6. **Global Forest Watch (Tree Cover Loss + GLAD/RADD)** — CC-BY 4.0; REST Data API + raster downloads; global
7. **IBGE Geoportal + geoFTP** — Brazilian open (free, bulk download zero-payment cart); bulk SHP/GeoPackage
8. **RAISG (Indigenous Lands + PAs)** — Per-source attribution (mostly open); WMS + shapefile; pan-Amazon
9. **data.gov.tw (Brazil Census 2011 + SHRUG v2.1)** — Public domain + CC-BY mirrors; shapefile/Parquet; 640k villages

**P1 datasets:** INDE Brazil SDI (catalog aggregator), ANA Hidroweb (hydrology real-time + historical), FUNAI (Indigenous lands Brazil-specific), ICMBio (federal PAs), TanDEM-X DEM (license caveat: non-commercial), IGN Argentina Argenmap, INEI Peru, DANE Colombia, SGC Colombia geohazards, CEMADEN disaster alerts, INMET BDMEP climate, SMN Argentina WRF, SENAMHI Peru PISCO, geobr R-package, GBIF, +more. Full catalog for all 24 entries available.

**⚠️ License caveat (critical):** MapBiomas, PRODES, DETER, Queimadas are all CC-BY-SA 4.0 (copyleft). Any GeoSight tile/map layer that incorporates these must either: (a) isolate as a runtime-fetched, non-cached layer, or (b) republish the entire derivative under CC-BY-SA. Do not bake into static tile pyramid without legal review. Recommend starting with Global Forest Watch (CC-BY, friendlier) as the primary deforestation layer and treating MapBiomas as a supplemental source for research.

---

## Rejected datasets

(Add as evaluations conclude — document the why so we don't re-evaluate.)

---

## Notes on integration pattern

When adding a country pack:

1. **Add provider module** in `src/lib/<provider-name>.ts` — fetch + normalize to internal schemas.
2. **Register in source registry** — `src/lib/source-registry.ts` with accurate `coverage`, `freshness`, `region` fields.
3. **Wire into geodata route** — `src/app/api/geodata/route.ts` — invoke provider when coordinates fall in its coverage.
4. **Update trust labels** — never silently substitute regional data for global; always label with provider.
5. **Test fixture** — add 5–10 representative coordinates to `tests/regional-coverage.test.ts`.
6. **Update this catalog** — flip status from 🔍 / 🟡 to ✅, fill in source-registry slug.
7. **Update README "Data Sources" table.**

---

## Scout protocol

When evaluating a candidate dataset, use the system prompt in `AGENTS.md` § 6 (Global Dataset Scout). For each candidate, fill out the entry template at the top of this doc and append to the right region section. Don't integrate without an evaluated entry here first.
