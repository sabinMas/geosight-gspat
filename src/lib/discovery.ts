import { fetchNearbyPlaces } from "@/lib/overpass";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { getProfileById } from "@/lib/profiles";
import { calculateProfileScore } from "@/lib/scoring";
import {
  Coordinates,
  DiscoveryCandidate,
  DiscoveryResponse,
  GeodataResult,
  LocationSearchResult,
  MissionProfile,
  NearbyPlaceCategory,
} from "@/types";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country_code?: string;
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    suburb?: string;
    neighbourhood?: string;
    borough?: string;
    quarter?: string;
    city_district?: string;
    hamlet?: string;
    national_park?: string;
  };
};

type DiscoveryModeConfig =
  | {
      mode: "nearby_places";
      profileId: string;
      category: NearbyPlaceCategory;
    }
  | {
      mode: "scored_regions";
      profileId: string;
    };

type ScoredRegionCandidate = Omit<DiscoveryCandidate, "score" | "distanceKm"> & {
  score: number;
  distanceKm: number;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function inferDiscoveryMode(query: string, preferredProfileId?: string): DiscoveryModeConfig {
  const normalized = normalizeQuery(query);

  if (
    /\b(restaurant|restaurants|food|coffee|cafe|dining|eat|lunch|dinner)\b/.test(normalized)
  ) {
    return {
      mode: "nearby_places",
      profileId: "commercial",
      category: "restaurant",
    };
  }

  if (/\b(hike|hikes|trail|trails|trailhead|beginner hikes?)\b/.test(normalized)) {
    return {
      mode: "nearby_places",
      profileId: "hiking",
      category: normalized.includes("trail") ? "trail" : "hike",
    };
  }

  if (/\b(landmark|museum|attraction|things to do|park|viewpoint)\b/.test(normalized)) {
    return {
      mode: "nearby_places",
      profileId: preferredProfileId ?? "hiking",
      category: "landmark",
    };
  }

  if (
    /\b(data center|datacenter|cooling|substation|power|broadband|infrastructure|hyperscale)\b/.test(
      normalized,
    )
  ) {
    return { mode: "scored_regions", profileId: "data-center" };
  }

  if (/\b(warehouse|logistics|industrial|commercial corridor|retail|market)\b/.test(normalized)) {
    return { mode: "scored_regions", profileId: "commercial" };
  }

  if (
    /\b(family|families|homebuyer|homebuyers|children|young children|school|schools|neighborhood|neighbourhood|housing|residential)\b/.test(
      normalized,
    )
  ) {
    return { mode: "scored_regions", profileId: "home-buying" };
  }

  return { mode: "scored_regions", profileId: preferredProfileId ?? "home-buying" };
}

function parseRadiusKm(query: string) {
  const match = query.match(
    /\bwithin\s+(\d+(?:\.\d+)?)\s*(mile|miles|mi|km|kilometer|kilometers)\b/i,
  );
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();
  return unit.startsWith("mile") || unit === "mi" ? value * 1.60934 : value;
}

function cleanAnchorQuery(anchor: string) {
  return anchor
    .replace(/\bschool district\b/gi, "")
    .replace(/\bmetro area\b/gi, "")
    .replace(/\bcounty\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function extractAnchorQuery(query: string) {
  const matchers = [
    /\bwithin\s+\d+(?:\.\d+)?\s*(?:mile|miles|mi|km|kilometer|kilometers)\s+of\s+(.+)$/i,
    /\bnear\s+(.+?)(?:\s+for\b|\s+with\b|\s+that\b|\s+using\b|$)/i,
    /\baround\s+(.+?)(?:\s+for\b|\s+with\b|\s+that\b|\s+using\b|$)/i,
    /\bin\s+(.+?)(?:\s+for\b|\s+with\b|\s+that\b|\s+using\b|$)/i,
  ];

  for (const matcher of matchers) {
    const match = query.match(matcher);
    if (match?.[1]) {
      const cleaned = cleanAnchorQuery(match[1]);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  return cleanAnchorQuery(query);
}

function toLocationSearchResult(result: NominatimResult): LocationSearchResult {
  const locality =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality;
  const district =
    result.address?.neighbourhood ??
    result.address?.suburb ??
    result.address?.borough ??
    result.address?.quarter ??
    result.address?.city_district ??
    result.address?.hamlet ??
    result.address?.national_park ??
    result.address?.county;

  return {
    name: result.display_name,
    shortName: locality ?? result.display_name.split(",")[0]?.trim() ?? result.display_name,
    fullName: result.display_name,
    coordinates: {
      lat: Number(result.lat),
      lng: Number(result.lon),
    },
    countryCode: result.address?.country_code?.toUpperCase(),
    countryName: result.address?.country,
    locality,
    district,
  };
}

async function geocodeQuery(query: string) {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": "GeoSight discovery",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    throw new Error("GeoSight could not geocode the discovery anchor.");
  }

  const payload = (await response.json()) as NominatimResult[];
  const firstMatch = payload
    .map(toLocationSearchResult)
    .find(
      (result) =>
        Number.isFinite(result.coordinates.lat) &&
        Number.isFinite(result.coordinates.lng),
    );

  if (!firstMatch) {
    throw new Error("GeoSight could not resolve the place in this discovery prompt yet.");
  }

  return firstMatch;
}

async function reverseGeocodeCoordinates(coords: Coordinates) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", coords.lat.toFixed(6));
  url.searchParams.set("lon", coords.lng.toFixed(6));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": "GeoSight discovery",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as NominatimResult;
  return toLocationSearchResult(payload);
}

async function fetchGeodataForCandidate(origin: string, coords: Coordinates) {
  const url = new URL("/api/geodata", origin);
  url.searchParams.set("lat", coords.lat.toFixed(6));
  url.searchParams.set("lng", coords.lng.toFixed(6));

  const response = await fetchWithTimeout(
    url,
    {
      cache: "no-store",
    },
    25_000,
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GeodataResult;
}

function buildRegionHighlights(profile: MissionProfile, geodata: GeodataResult, score: number) {
  const broadband = geodata.broadband;

  switch (profile.id) {
    case "home-buying":
      return [
        geodata.schoolContext?.score !== null && geodata.schoolContext?.score !== undefined
          ? `Schools ${geodata.schoolContext.score}/100`
          : geodata.schoolContext?.coverageStatus === "outside_us"
            ? "Schools limited"
            : `${geodata.amenities.schoolCount} schools mapped`,
        geodata.floodZone?.label ?? "Flood context unavailable",
        geodata.climate.airQualityIndex !== null && geodata.climate.airQualityIndex !== undefined
          ? `AQI ${geodata.climate.airQualityIndex}`
          : "AQI unavailable",
      ];
    case "site-development":
      return [
        geodata.schoolContext?.score !== null && geodata.schoolContext?.score !== undefined
          ? `Schools ${geodata.schoolContext.score}/100`
          : geodata.schoolContext?.coverageStatus === "outside_us"
            ? "Schools limited"
            : `${geodata.amenities.schoolCount} schools mapped`,
        geodata.floodZone?.label ?? "Flood context unavailable",
        geodata.climate.airQualityIndex !== null && geodata.climate.airQualityIndex !== undefined
          ? `AQI ${geodata.climate.airQualityIndex}`
          : "AQI unavailable",
      ];
    case "data-center":
      return [
        geodata.nearestPower.distanceKm !== null && geodata.nearestPower.distanceKm !== undefined
          ? `Power ${geodata.nearestPower.distanceKm.toFixed(1)} km`
          : "Power unavailable",
        geodata.nearestWaterBody.distanceKm !== null &&
        geodata.nearestWaterBody.distanceKm !== undefined
          ? `Water ${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`
          : "Water unavailable",
        broadband && broadband.maxDownloadSpeed > 0
          ? `${broadband.maxDownloadSpeed.toLocaleString()} Mbps`
          : `${score}/100 overall`,
      ];
    case "commercial":
      return [
        geodata.nearestRoad.distanceKm !== null && geodata.nearestRoad.distanceKm !== undefined
          ? `Road ${geodata.nearestRoad.distanceKm.toFixed(1)} km`
          : "Road unavailable",
        `${geodata.amenities.commercialCount ?? 0} commercial venues`,
        broadband && broadband.providerCount > 0
          ? `${broadband.providerCount} broadband providers`
          : `${score}/100 overall`,
      ];
    case "hiking":
      return [
        geodata.elevationMeters !== null && geodata.elevationMeters !== undefined
          ? `${geodata.elevationMeters} m elevation`
          : "Elevation unavailable",
        geodata.nearestWaterBody.distanceKm !== null &&
        geodata.nearestWaterBody.distanceKm !== undefined
          ? `Water ${geodata.nearestWaterBody.distanceKm.toFixed(1)} km`
          : "Water unavailable",
        geodata.climate.airQualityIndex !== null && geodata.climate.airQualityIndex !== undefined
          ? `AQI ${geodata.climate.airQualityIndex}`
          : `${score}/100 overall`,
      ];
    default:
      return [`${score}/100 overall`];
  }
}

function buildRegionSummary(profile: MissionProfile, geodata: GeodataResult) {
  switch (profile.id) {
    case "home-buying":
      return geodata.schoolContext?.explanation ??
        "GeoSight sampled this nearby subarea for schools, amenities, neighborhood access, and early risk signals.";
    case "site-development":
      return geodata.schoolContext?.explanation ??
        "GeoSight sampled this nearby subarea for access, schools, hazards, and general neighborhood readiness.";
    case "data-center":
      return "GeoSight sampled this nearby subarea for water access, power adjacency, climate, and broadband readiness.";
    case "commercial":
      return "GeoSight sampled this nearby subarea for corridor access, commercial density, and infrastructure posture.";
    case "hiking":
      return "GeoSight sampled this nearby subarea for terrain character, water features, and recreation comfort.";
    default:
      return "GeoSight sampled this nearby subarea using the selected scoring lens.";
  }
}

async function buildNearbyPlaceCandidates(
  anchor: LocationSearchResult,
  category: NearbyPlaceCategory,
  profile: MissionProfile,
  radiusKm: number | null,
) {
  const places = await fetchNearbyPlaces(anchor.coordinates, anchor.name, category);
  const filteredPlaces =
    radiusKm && radiusKm > 0
      ? places.filter((place) => (place.distanceKm ?? Number.POSITIVE_INFINITY) <= radiusKm)
      : places;

  return filteredPlaces.slice(0, 6).map<DiscoveryCandidate>((place) => ({
    id: place.id,
    title: place.name,
    subtitle:
      place.distanceKm === null
        ? `${place.category} near ${anchor.shortName ?? anchor.name}`
        : `${place.distanceKm.toFixed(1)} km - ${place.relativeLocation}`,
    summary: place.summary,
    locationQuery: `${place.coordinates.lat.toFixed(6)}, ${place.coordinates.lng.toFixed(6)}`,
    locationLabel: place.name,
    profileId: profile.id,
    score: null,
    distanceKm: place.distanceKm,
    highlights: place.attributes.length ? place.attributes : [place.category],
  }));
}

function buildDirectionalOffsets(anchor: Coordinates, radiusKm: number | null) {
  const localRadiusKm = Math.min(Math.max(radiusKm ?? 10, 6), 18);
  const latOffset = (localRadiusKm * 0.35) / 111;
  const lngOffset = latOffset / Math.max(Math.cos((anchor.lat * Math.PI) / 180), 0.35);

  return [
    { id: "center", label: "Central area", coordinates: anchor },
    {
      id: "north",
      label: "North area",
      coordinates: { lat: anchor.lat + latOffset, lng: anchor.lng },
    },
    {
      id: "east",
      label: "East area",
      coordinates: { lat: anchor.lat, lng: anchor.lng + lngOffset },
    },
    {
      id: "south",
      label: "South area",
      coordinates: { lat: anchor.lat - latOffset, lng: anchor.lng },
    },
  ];
}

async function buildScoredRegionCandidates(
  origin: string,
  anchor: LocationSearchResult,
  profile: MissionProfile,
  radiusKm: number | null,
) {
  const candidates = await Promise.all(
    buildDirectionalOffsets(anchor.coordinates, radiusKm).map(async (candidate) => {
      const [reverse, geodata] = await Promise.all([
        reverseGeocodeCoordinates(candidate.coordinates),
        fetchGeodataForCandidate(origin, candidate.coordinates),
      ]);

      if (!geodata) {
        return null;
      }

      const score = calculateProfileScore(geodata, profile);
      const reverseTitle =
        reverse?.district ??
        reverse?.locality ??
        reverse?.shortName ??
        candidate.label;
      const reverseSubtitle =
        reverse?.locality && reverseTitle !== reverse.locality
          ? `${reverse.locality}${reverse.countryName ? `, ${reverse.countryName}` : ""}`
          : reverse?.countryName ?? anchor.countryName ?? "Local candidate";

      return {
        id: `${profile.id}-${candidate.id}`,
        title: reverseTitle,
        subtitle: reverseSubtitle,
        summary: buildRegionSummary(profile, geodata),
        locationQuery: `${candidate.coordinates.lat.toFixed(6)}, ${candidate.coordinates.lng.toFixed(6)}`,
        locationLabel:
          reverse?.fullName ??
          [reverseTitle, reverseSubtitle].filter(Boolean).join(", "),
        profileId: profile.id,
        score: score.total,
        distanceKm: Number(calculateDistanceKm(anchor.coordinates, candidate.coordinates).toFixed(1)),
        highlights: buildRegionHighlights(profile, geodata, score.total),
      } satisfies ScoredRegionCandidate;
    }),
  );

  return candidates
    .filter((candidate): candidate is ScoredRegionCandidate => candidate !== null)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 4);
}

export async function runDiscoveryQuery(
  query: string,
  preferredProfileId: string | undefined,
  origin: string,
): Promise<DiscoveryResponse> {
  const config = inferDiscoveryMode(query, preferredProfileId);
  const profile = getProfileById(config.profileId);
  const anchorQuery = extractAnchorQuery(query);
  const radiusKm = parseRadiusKm(query);
  const anchor = await geocodeQuery(anchorQuery);

  const candidates =
    config.mode === "nearby_places"
      ? await buildNearbyPlaceCandidates(anchor, config.category, profile, radiusKm)
      : await buildScoredRegionCandidates(origin, anchor, profile, radiusKm);

  if (!candidates.length) {
    throw new Error(
      config.mode === "nearby_places"
        ? `GeoSight could not find mapped ${config.category.replace("_", " ")} candidates near ${anchor.shortName ?? anchor.name} yet.`
        : `GeoSight could not build a scored shortlist near ${anchor.shortName ?? anchor.name} yet.`,
    );
  }

  return {
    intent: {
      rawQuery: query,
      profileId: profile.id,
      profileName: profile.name,
      anchorQuery,
      anchorName: anchor.shortName ?? anchor.name,
      mode: config.mode,
      title:
        config.mode === "nearby_places"
          ? `Discovery candidates near ${anchor.shortName ?? anchor.name}`
          : `Shortlisted nearby areas around ${anchor.shortName ?? anchor.name}`,
      summary:
        config.mode === "nearby_places"
          ? `GeoSight translated this prompt into ${config.category.replace("_", " ")} discovery around ${anchor.shortName ?? anchor.name}.`
          : `GeoSight translated this prompt into nearby subarea scoring using the ${profile.name} lens around ${anchor.shortName ?? anchor.name}.`,
    },
    candidates,
    limitations:
      config.mode === "nearby_places"
        ? [
            "Discovery candidates depend on OpenStreetMap completeness and category tagging.",
            "Open a candidate in Explore to inspect full source context, hazards, and scoring before making a decision.",
          ]
        : [
            "GeoSight is sampling a small set of nearby subareas, not every neighborhood in the wider metro.",
            "Use this shortlist as a starting point, then open a candidate in Explore for full cards, provenance, and deeper due diligence.",
          ],
  };
}
