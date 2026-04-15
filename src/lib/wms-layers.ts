export type WmsLayerDefinition = {
  id: string;
  name: string;
  url: string;
  layers: string;
  category: string;
  attribution: string;
  visible?: boolean;
  opacity?: number;
};

export const WMS_CATALOG: readonly WmsLayerDefinition[] = [
  {
    id: "usgs-topo",
    name: "USGS Topo Maps",
    url: "https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer",
    layers: "0",
    category: "basemap",
    attribution: "USGS",
  },
  {
    id: "usgs-imagery",
    name: "USGS High-Res Imagery",
    url: "https://basemap.nationalmap.gov/arcgis/services/USGSImageryOnly/MapServer/WMSServer",
    layers: "0",
    category: "imagery",
    attribution: "USGS",
  },
  {
    id: "fema-flood",
    name: "FEMA Flood Hazard Zones",
    url: "https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WMSServer",
    layers: "28",
    category: "hazard",
    attribution: "FEMA",
  },
  {
    id: "usgs-geology",
    name: "USGS Geologic Map",
    url: "https://mrdata.usgs.gov/services/sgmc2",
    layers: "0",
    category: "geology",
    attribution: "USGS",
  },
  {
    id: "noaa-radar",
    name: "NOAA Weather Radar",
    url: "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows",
    layers: "conus_bref_qcd",
    category: "weather",
    attribution: "NOAA",
  },
];

function coerceEndpointUrl(input: string) {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("Enter a WMS endpoint URL.");
  }

  const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(normalized);
}

function getDirectChildText(node: Element, localName: string) {
  for (const child of Array.from(node.children)) {
    if (child.localName.toLowerCase() === localName.toLowerCase()) {
      return child.textContent?.trim() ?? null;
    }
  }

  return null;
}

export function normalizeWmsEndpoint(url: string) {
  const parsedUrl = coerceEndpointUrl(url);

  for (const key of [
    "service",
    "request",
    "version",
    "layers",
    "styles",
    "bbox",
    "width",
    "height",
    "format",
    "transparent",
    "crs",
    "srs",
  ]) {
    parsedUrl.searchParams.delete(key);
  }

  return parsedUrl.toString();
}

export async function validateWmsEndpoint(
  url: string,
): Promise<{ valid: boolean; layers: string[] }> {
  try {
    const capabilitiesUrl = new URL(normalizeWmsEndpoint(url));
    capabilitiesUrl.searchParams.set("service", "WMS");
    capabilitiesUrl.searchParams.set("request", "GetCapabilities");

    const response = await fetch(capabilitiesUrl.toString(), {
      headers: {
        Accept: "application/xml,text/xml",
      },
    });

    if (!response.ok) {
      return { valid: false, layers: [] };
    }

    const xml = await response.text();
    const document = new DOMParser().parseFromString(xml, "application/xml");

    if (document.getElementsByTagName("parsererror").length > 0) {
      return { valid: false, layers: [] };
    }

    const layerNames = Array.from(document.getElementsByTagNameNS("*", "Layer"))
      .map((layer) => getDirectChildText(layer, "Name"))
      .filter((name): name is string => Boolean(name));

    const uniqueLayers = Array.from(new Set(layerNames));
    return {
      valid: uniqueLayers.length > 0,
      layers: uniqueLayers,
    };
  } catch {
    return { valid: false, layers: [] };
  }
}
