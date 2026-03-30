import { BoundingBox, Coordinates, NearbyPlace, NearbyPlaceCategory } from "@/types";
import {
  calculateDistanceKm,
  describeRelativeLocation,
  shortLocationLabel,
} from "@/lib/nearby-places";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type AmenitySignals = {
  schoolCount: number;
  healthcareCount: number;
  foodAndDrinkCount: number;
  transitStopCount: number;
  parkCount: number;
  trailheadCount: number;
  commercialCount: number;
};

const CATEGORY_QUERIES: Record<NearbyPlaceCategory, { radiusMeters: number; body: string }> = {
  trail: {
    radiusMeters: 18000,
    body: `
      node["highway"="trailhead"](around:RADIUS,LAT,LNG);
      way["highway"="path"]["name"](around:RADIUS,LAT,LNG);
      way["route"="hiking"]["name"](around:RADIUS,LAT,LNG);
      relation["route"="hiking"]["name"](around:RADIUS,LAT,LNG);
    `,
  },
  hike: {
    radiusMeters: 22000,
    body: `
      relation["route"="hiking"]["name"](around:RADIUS,LAT,LNG);
      way["route"="hiking"]["name"](around:RADIUS,LAT,LNG);
      node["tourism"="viewpoint"]["name"](around:RADIUS,LAT,LNG);
      node["natural"="peak"]["name"](around:RADIUS,LAT,LNG);
      node["waterway"="waterfall"]["name"](around:RADIUS,LAT,LNG);
    `,
  },
  restaurant: {
    radiusMeters: 8000,
    body: `
      node["amenity"~"restaurant|cafe|fast_food|bar|pub"]["name"](around:RADIUS,LAT,LNG);
      way["amenity"~"restaurant|cafe|fast_food|bar|pub"]["name"](around:RADIUS,LAT,LNG);
    `,
  },
  landmark: {
    radiusMeters: 16000,
    body: `
      node["tourism"~"attraction|viewpoint|museum"]["name"](around:RADIUS,LAT,LNG);
      way["tourism"~"attraction|museum"]["name"](around:RADIUS,LAT,LNG);
      node["historic"]["name"](around:RADIUS,LAT,LNG);
      node["leisure"="park"]["name"](around:RADIUS,LAT,LNG);
      way["leisure"="park"]["name"](around:RADIUS,LAT,LNG);
    `,
  },
};

function clampCoordinate(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeBoundingBox(bbox: BoundingBox) {
  return {
    south: clampCoordinate(bbox.south, -90, 90),
    north: clampCoordinate(bbox.north, -90, 90),
    west: clampCoordinate(bbox.west, -180, 180),
    east: clampCoordinate(bbox.east, -180, 180),
  };
}

function buildNearbyQuery(category: NearbyPlaceCategory, center: Coordinates) {
  const template = CATEGORY_QUERIES[category];
  return `
    [out:json][timeout:20];
    (
      ${template.body
        .replaceAll("RADIUS", String(template.radiusMeters))
        .replaceAll("LAT", center.lat.toFixed(6))
        .replaceAll("LNG", center.lng.toFixed(6))}
    );
    out tags center 30;
  `;
}

export function getElementCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return {
      lat: element.lat,
      lng: element.lon,
    };
  }

  if (element.center) {
    return {
      lat: element.center.lat,
      lng: element.center.lon,
    };
  }

  return null;
}

function buildAttributes(category: NearbyPlaceCategory, tags: Record<string, string>) {
  const attributes: string[] = [];

  if (category === "restaurant") {
    if (tags.cuisine) {
      attributes.push(tags.cuisine.replaceAll(";", ", "));
    }
    if (tags.amenity) {
      attributes.push(tags.amenity.replaceAll("_", " "));
    }
    if (tags.outdoor_seating === "yes") {
      attributes.push("Outdoor seating");
    }
  } else if (category === "trail" || category === "hike") {
    if (tags.route) {
      attributes.push(tags.route.replaceAll("_", " "));
    }
    if (tags.highway) {
      attributes.push(tags.highway.replaceAll("_", " "));
    }
    if (tags.surface) {
      attributes.push(tags.surface.replaceAll("_", " "));
    }
    if (tags.sac_scale) {
      attributes.push(`SAC ${tags.sac_scale}`);
    }
  } else {
    if (tags.tourism) {
      attributes.push(tags.tourism.replaceAll("_", " "));
    }
    if (tags.leisure) {
      attributes.push(tags.leisure.replaceAll("_", " "));
    }
    if (tags.historic) {
      attributes.push(tags.historic.replaceAll("_", " "));
    }
  }

  if (tags.website) {
    attributes.push("Has website");
  }

  return attributes.slice(0, 3);
}

function buildSummary(
  category: NearbyPlaceCategory,
  tags: Record<string, string>,
  locationName: string,
) {
  const locationLabel = shortLocationLabel(locationName);
  const nameParts: string[] = [];

  if (category === "restaurant") {
    nameParts.push("Nearby dining option");
  } else if (category === "trail") {
    nameParts.push("Mapped trail or trailhead");
  } else if (category === "hike") {
    nameParts.push("Outdoor destination with hike-oriented appeal");
  } else {
    nameParts.push("Local landmark or attraction");
  }

  if (tags.cuisine) {
    nameParts.push(`Cuisine: ${tags.cuisine.replaceAll(";", ", ")}`);
  }
  if (tags.description) {
    nameParts.push(tags.description);
  } else if (tags.tourism) {
    nameParts.push(`Tagged in OSM as ${tags.tourism.replaceAll("_", " ")}`);
  } else if (tags.amenity) {
    nameParts.push(`Tagged in OSM as ${tags.amenity.replaceAll("_", " ")}`);
  }

  nameParts.push(`Anchored to ${locationLabel}.`);
  return nameParts.join(". ");
}

export async function fetchNearbyInfrastructure(bbox: BoundingBox) {
  const safeBox = sanitizeBoundingBox(bbox);
  const query = `
    [out:json][timeout:20];
    (
      node["highway"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["highway"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["power"~"line|minor_line"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["power"~"line|minor_line"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["waterway"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["waterway"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["waterway"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["natural"~"water|wood|scrub|wetland|grassland|heath|bare_rock|beach|sand"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["natural"~"water|wood|scrub|wetland|grassland|heath|bare_rock|beach|sand"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["natural"~"water|wood|scrub|wetland|grassland|heath|bare_rock|beach|sand"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["landuse"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["landuse"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["landuse"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["amenity"~"school|college|university|kindergarten|hospital|clinic|doctors|pharmacy|restaurant|cafe|fast_food|bar|pub|bus_station|ferry_terminal"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["amenity"~"school|college|university|kindergarten|hospital|clinic|doctors|pharmacy|restaurant|cafe|fast_food|bar|pub|bus_station|ferry_terminal"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["amenity"~"school|college|university|kindergarten|hospital|clinic|doctors|pharmacy|restaurant|cafe|fast_food|bar|pub|bus_station|ferry_terminal"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["shop"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["shop"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["shop"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["office"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["office"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["office"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["public_transport"~"platform|station|stop_position"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["public_transport"~"platform|station"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["public_transport"~"platform|station"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["railway"~"station|halt|tram_stop|subway_entrance"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["highway"="bus_stop"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["highway"="trailhead"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["leisure"="park"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["leisure"="park"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      relation["leisure"="park"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      way["tourism"~"museum|gallery|attraction"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
      node["tourism"~"museum|gallery|attraction"](${safeBox.south},${safeBox.west},${safeBox.north},${safeBox.east});
    );
    out tags center;
  `;

  const response = await fetchWithTimeout(OVERPASS_ENDPOINT, {
    method: "POST",
    body: query,
    next: { revalidate: 60 * 60 * 6 },
  }, EXTERNAL_TIMEOUTS.standard);

  if (!response.ok) {
    throw new Error("Overpass request failed.");
  }

  return (await response.json()) as {
    elements?: OverpassElement[];
  };
}

export async function fetchNearbyPlaces(
  coords: Coordinates,
  locationName: string,
  category: NearbyPlaceCategory,
) {
  const query = buildNearbyQuery(category, coords);
  const response = await fetchWithTimeout(OVERPASS_ENDPOINT, {
    method: "POST",
    body: query,
    next: { revalidate: 60 * 30 },
  }, EXTERNAL_TIMEOUTS.standard);

  if (!response.ok) {
    throw new Error("Nearby places request failed.");
  }

  const json = (await response.json()) as { elements?: OverpassElement[] };
  const elements = json.elements ?? [];

  const mappedPlaces: Array<NearbyPlace | null> = elements
    .map((element) => {
      const elementCoords = getElementCoordinates(element);
      const tags = element.tags ?? {};

      if (!elementCoords || !tags.name) {
        return null;
      }

      const distanceKm = Number(calculateDistanceKm(coords, elementCoords).toFixed(1));
      return {
        id: `${category}-${element.type}-${element.id}`,
        name: tags.name,
        category,
        distanceKm,
        relativeLocation: describeRelativeLocation(coords, elementCoords),
        summary: buildSummary(category, tags, locationName),
        attributes: buildAttributes(category, tags),
        source: "live" as const,
      };
    })
    ;

  const livePlaces = mappedPlaces
    .filter((place): place is NearbyPlace => place !== null)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .filter(
      (place, index, all) =>
        all.findIndex((candidate) => candidate.name === place.name) === index,
    )
    .slice(0, 8);

  if (livePlaces.length > 0) {
    return livePlaces;
  }

  return [];
}

export function buildAmenitySignals(elements: OverpassElement[]): AmenitySignals {
  const counts: AmenitySignals = {
    schoolCount: 0,
    healthcareCount: 0,
    foodAndDrinkCount: 0,
    transitStopCount: 0,
    parkCount: 0,
    trailheadCount: 0,
    commercialCount: 0,
  };

  const seen = new Set<string>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const key = `${element.type}-${element.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const amenity = tags.amenity ?? "";
    const railway = tags.railway ?? "";
    const publicTransport = tags.public_transport ?? "";
    const shop = tags.shop ?? "";
    const leisure = tags.leisure ?? "";
    const highway = tags.highway ?? "";
    const tourism = tags.tourism ?? "";

    if (["school", "college", "university", "kindergarten"].includes(amenity)) {
      counts.schoolCount += 1;
    }

    if (["hospital", "clinic", "doctors", "pharmacy"].includes(amenity)) {
      counts.healthcareCount += 1;
    }

    if (["restaurant", "cafe", "fast_food", "bar", "pub"].includes(amenity)) {
      counts.foodAndDrinkCount += 1;
    }

    if (
      amenity === "bus_station" ||
      amenity === "ferry_terminal" ||
      highway === "bus_stop" ||
      ["platform", "station", "stop_position"].includes(publicTransport) ||
      ["station", "halt", "tram_stop", "subway_entrance"].includes(railway)
    ) {
      counts.transitStopCount += 1;
    }

    if (leisure === "park") {
      counts.parkCount += 1;
    }

    if (
      highway === "trailhead" ||
      tourism === "trailhead" ||
      tourism === "viewpoint" ||
      tags.route === "hiking"
    ) {
      counts.trailheadCount += 1;
    }

    if (
      shop ||
      tags.office ||
      ["commercial", "retail"].includes(tags.landuse ?? "") ||
      ["marketplace", "mall"].includes(tags.shop ?? "") ||
      ["attraction", "museum", "gallery"].includes(tags.tourism ?? "")
    ) {
      counts.commercialCount += 1;
    }
  }

  return counts;
}
