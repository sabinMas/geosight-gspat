/**
 * Registry of public WFS (Web Feature Service) endpoints.
 * Users can explore these or add custom WFS URLs for vector data discovery.
 */
export interface WFSEndpoint {
  id: string;
  name: string;
  url: string;
  organization: string;
  description: string;
  category: "usgs" | "noaa" | "un-agencies" | "opendata" | "research" | "other";
  region: "global" | "us" | "eu" | "asia";
}

export const PUBLIC_WFS_ENDPOINTS: WFSEndpoint[] = [
  // USGS services
  {
    id: "usgs-nhd",
    name: "USGS National Hydrography Dataset",
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydrography_WFS/MapServer",
    organization: "USGS",
    description: "Comprehensive national water features, streams, and waterbodies",
    category: "usgs",
    region: "us",
  },
  {
    id: "usgs-gnis",
    name: "USGS Geographic Names Information System",
    url: "https://gniswebservices.usgs.gov/gnis/services",
    organization: "USGS",
    description: "Official geographic place names and feature locations",
    category: "usgs",
    region: "us",
  },
  {
    id: "usgs-protected-lands",
    name: "USGS Protected Lands and Waters",
    url: "https://www.usgs.gov/faqs/how-do-i-access-protected-lands-and-waters-spatial-data",
    organization: "USGS",
    description: "National parks, forests, wildlife refuges, and conservation areas",
    category: "usgs",
    region: "us",
  },

  // NOAA services
  {
    id: "noaa-marine",
    name: "NOAA Marine and Coastal Features",
    url: "https://nowcoast.noaa.gov/wfs",
    organization: "NOAA",
    description: "Coastal boundaries, marine features, and maritime zones",
    category: "noaa",
    region: "us",
  },

  // UN and International agencies
  {
    id: "wfp-vulnerabilities",
    name: "WFP Food Security and Vulnerability",
    url: "https://gis.wfp.org/",
    organization: "UN World Food Programme",
    description: "Food security assessments and vulnerability mapping",
    category: "un-agencies",
    region: "global",
  },
  {
    id: "unhcr-refugees",
    name: "UNHCR Refugee Populations",
    url: "https://data.humdata.org/",
    organization: "UN Refugee Agency",
    description: "Refugee and displaced population data",
    category: "un-agencies",
    region: "global",
  },

  // Open Data initiatives
  {
    id: "openstreetmap-overpass",
    name: "OpenStreetMap Overpass API",
    url: "https://overpass-api.de/",
    organization: "OpenStreetMap Foundation",
    description: "Real-time OSM features: roads, buildings, amenities, natural features",
    category: "opendata",
    region: "global",
  },
  {
    id: "opendata-eu",
    name: "European Open Data Portal",
    url: "https://www.europeandataportal.eu/",
    organization: "EU",
    description: "European public datasets with geographic components",
    category: "opendata",
    region: "eu",
  },

  // Research and specialized
  {
    id: "gbif-biodiversity",
    name: "GBIF Global Biodiversity Information Facility",
    url: "https://www.gbif.org/",
    organization: "GBIF",
    description: "Species occurrence records and biodiversity observations",
    category: "research",
    region: "global",
  },
  {
    id: "iucn-protected-areas",
    name: "IUCN World Database of Protected Areas",
    url: "https://www.protectedplanet.net/",
    organization: "IUCN",
    description: "Global protected areas and conservation sites",
    category: "research",
    region: "global",
  },
];

/**
 * Get WFS endpoint by ID.
 */
export function getWFSEndpoint(id: string): WFSEndpoint | undefined {
  return PUBLIC_WFS_ENDPOINTS.find((ep) => ep.id === id);
}

/**
 * Filter WFS endpoints by category or region.
 */
export function filterWFSEndpoints(
  filters?: Partial<{
    category: WFSEndpoint["category"];
    region: WFSEndpoint["region"];
    query: string;
  }>,
): WFSEndpoint[] {
  let result = [...PUBLIC_WFS_ENDPOINTS];

  if (filters?.category) {
    result = result.filter((ep) => ep.category === filters.category);
  }

  if (filters?.region) {
    result = result.filter((ep) => ep.region === filters.region);
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (ep) =>
        ep.name.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.organization.toLowerCase().includes(q),
    );
  }

  return result;
}
