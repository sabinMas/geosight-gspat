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

## Phase 3 region packs — to integrate

### EU pack (priority 1)

#### Copernicus Land Monitoring — Corine Land Cover (CLC)

- **Maintainer:** European Environment Agency (EEA)
- **Status:** 🔍 Candidate
- **Primary URL:** https://land.copernicus.eu/pan-european/corine-land-cover
- **Coverage:** EU + EEA member states, ~100m resolution
- **Variables:** 44 land cover classes
- **Update cadence:** Every 6 years (latest: CLC 2018; CLC 2024 in production)
- **License:** Open access via CC-BY 4.0
- **Access method:** WMS, WMTS, bulk download
- **Integration notes:** Could supplement / replace ESA WorldCover for EU coordinates with finer class taxonomy

#### Copernicus High Resolution Layer — Tree Cover Density

- **Status:** 🔍 Candidate
- **Primary URL:** https://land.copernicus.eu/pan-european/high-resolution-layers/forests
- **Coverage:** EU, 10m resolution
- **License:** Open / CC-BY 4.0
- **Access method:** WMS, bulk download
- **Integration notes:** Higher resolution than WorldCover for EU forest cover scoring

#### EFFIS — European Forest Fire Information System

- **Status:** 🔍 Candidate
- **Primary URL:** https://effis.jrc.ec.europa.eu/
- **Coverage:** EU + neighborhood
- **Variables:** Active fire detections, burned area, fire danger
- **License:** EFFIS data policy (open for non-commercial; verify before use)
- **Access method:** WMS, REST
- **Integration notes:** Complement to NASA FIRMS for EU-specific fire intelligence

#### EU-DEM v1.1

- **Status:** 🔍 Candidate
- **Primary URL:** https://land.copernicus.eu/imagery-in-situ/eu-dem
- **Coverage:** EU + neighbors, 25m resolution
- **License:** Open
- **Access method:** WMS, bulk download
- **Integration notes:** Higher resolution than OpenTopoData for EU terrain

---

### Canada / Greenland / Nordic pack

#### Natural Resources Canada — CanVec

- **Status:** 🔍 Candidate
- **Primary URL:** https://natural-resources.canada.ca/maps-tools-and-publications/maps/topographic-maps/canvec
- **Coverage:** Canada
- **Variables:** Topographic features, hydrography, transport
- **License:** Open Government Licence – Canada
- **Access method:** WMS, bulk download

#### Statistics Norway — regional grid layers

- **Status:** 🔍 Candidate
- **Primary URL:** https://www.ssb.no/en/statbank/
- **Coverage:** Norway
- **License:** CC-BY 4.0
- **Access method:** REST API

(Add more as scout pass progresses)

---

### Japan pack

#### GSI (Geospatial Information Authority) base maps

- **Status:** 🔍 Candidate
- **Primary URL:** https://maps.gsi.go.jp/
- **Coverage:** Japan
- **Variables:** Topographic, hazard, land use
- **License:** GSI Tile Terms of Use
- **Access method:** Tile services, WMTS

#### J-SHIS — Japan Seismic Hazard Information Station

- **Status:** 🔍 Candidate
- **Primary URL:** https://www.j-shis.bosai.go.jp/en/
- **Coverage:** Japan
- **Variables:** PGA, PGV, intensity probability
- **License:** Open for academic / public use
- **Access method:** REST + bulk download

---

### India pack

#### Bhuvan (ISRO) — geoportal

- **Status:** 🔍 Candidate
- **Primary URL:** https://bhuvan.nrsc.gov.in/
- **Coverage:** India
- **Variables:** Land use, forest cover, water bodies
- **License:** Bhuvan terms (verify per layer)
- **Access method:** WMS, REST

#### India Meteorological Department (IMD)

- **Status:** 🔍 Candidate
- **Primary URL:** https://mausam.imd.gov.in/
- **Coverage:** India
- **License:** Verify per dataset
- **Access method:** REST (limited)

---

### Australia / NZ pack

#### Geoscience Australia — National Map

- **Status:** 🔍 Candidate
- **Primary URL:** https://nationalmap.gov.au/
- **License:** CC-BY 4.0 (most layers)
- **Access method:** WMS, WFS

#### LINZ Data Service (NZ)

- **Status:** 🔍 Candidate
- **Primary URL:** https://data.linz.govt.nz/
- **License:** CC-BY 4.0
- **Access method:** WMS, WFS, REST

---

### South America (Amazon focus) pack

#### MapBiomas

- **Status:** 🔍 Candidate
- **Primary URL:** https://mapbiomas.org/
- **Coverage:** Brazil (national); Pan-Amazon collection in progress
- **Variables:** Land cover/use, deforestation, fire scars
- **License:** CC-BY-SA 4.0
- **Access method:** WMS, GEE asset, bulk download

#### INPE PRODES / DETER

- **Status:** 🔍 Candidate
- **Primary URL:** http://terrabrasilis.dpi.inpe.br/
- **Coverage:** Brazilian Amazon
- **Variables:** Deforestation alerts, annual deforestation
- **License:** Open access
- **Access method:** WMS, bulk download

---

### Middle East / UAE pack

#### Dubai Pulse

- **Status:** 🔍 Candidate
- **Primary URL:** https://www.dubaipulse.gov.ae/
- **Coverage:** Dubai emirate
- **Variables:** Government open data — varied
- **License:** Per-dataset (verify)

---

### China pack (license-permitting)

> ⚠️ China geodata is heavily restricted. Many layers require Chinese-domestic API access only. Document licensing carefully.

#### GADM admin boundaries (already integrated)

- **Status:** ✅ Integrated globally
- **Notes:** Admin level 1 + 2 boundaries for China. No license issues.

(Other China sources to evaluate per-PR; Phase 3 China pack is lowest priority.)

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
