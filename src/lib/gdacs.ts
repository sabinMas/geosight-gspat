import { calculateDistanceKm } from "@/lib/nearby-places";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates, GdacsAlertSummary, GdacsAlertSummaryItem } from "@/types";

type GdacsFeatureCollection = {
  type?: "FeatureCollection";
  features?: GdacsFeature[];
};

type GdacsFeature = {
  type?: "Feature";
  geometry?: {
    type?: "Point" | string;
    coordinates?: [number, number];
  };
  properties?: {
    eventtype?: string | null;
    eventid?: number | null;
    episodeid?: number | null;
    name?: string | null;
    description?: string | null;
    alertlevel?: string | null;
    alertscore?: number | null;
    iscurrent?: string | null;
    country?: string | null;
    fromdate?: string | null;
    todate?: string | null;
    datemodified?: string | null;
    source?: string | null;
    glide?: string | null;
    url?: {
      report?: string | null;
    } | null;
  };
};

type ParsedGdacsAlert = GdacsAlertSummaryItem & {
  alertSortKey: number;
  isCurrent: boolean;
};

const GDACS_EVENTS_URL = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/events4app";

const EVENT_TYPE_LABELS: Record<string, string> = {
  EQ: "Earthquake",
  FL: "Flood",
  DR: "Drought",
  TC: "Tropical cyclone",
  VO: "Volcano",
  WF: "Forest fire",
  EP: "Epidemic",
  LS: "Landslide",
  EX: "Extreme temperature",
};

function parseNullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isCurrentAlert(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function getEventLabel(eventType: string | null | undefined) {
  const normalized = parseNullableString(eventType)?.toUpperCase();
  if (!normalized) {
    return "Disaster";
  }

  return EVENT_TYPE_LABELS[normalized] ?? normalized;
}

function getAlertSortKey(alertLevel: string | null | undefined) {
  switch (alertLevel?.trim().toLowerCase()) {
    case "red":
      return 3;
    case "orange":
      return 2;
    case "green":
      return 1;
    default:
      return 0;
  }
}

function parseAlert(coords: Coordinates, feature: GdacsFeature): ParsedGdacsAlert | null {
  const properties = feature.properties;
  const coordinates = feature.geometry?.coordinates;

  const eventId = parseNullableNumber(properties?.eventid);
  const episodeId = parseNullableNumber(properties?.episodeid);
  const alertLevel = parseNullableString(properties?.alertlevel);
  const eventType = parseNullableString(properties?.eventtype);
  const country = parseNullableString(properties?.country);
  const description = parseNullableString(properties?.description) ?? parseNullableString(properties?.name);
  const isCurrent = isCurrentAlert(properties?.iscurrent);

  if (eventId === null || episodeId === null || !alertLevel || !eventType || !country || !description) {
    return null;
  }

  const distanceKm =
    Array.isArray(coordinates) &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number" &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
      ? Number(calculateDistanceKm(coords, { lat: coordinates[1], lng: coordinates[0] }).toFixed(1))
      : null;

  return {
    eventId,
    episodeId,
    eventType,
    eventLabel: getEventLabel(eventType),
    alertLevel,
    alertScore: parseNullableNumber(properties?.alertscore),
    country,
    description,
    distanceKm,
    fromDate: parseNullableString(properties?.fromdate),
    toDate: parseNullableString(properties?.todate),
    datemodified: parseNullableString(properties?.datemodified),
    reportUrl: parseNullableString(properties?.url?.report),
    alertSortKey: getAlertSortKey(alertLevel),
    isCurrent,
  };
}

function buildSummaryItem(alert: ParsedGdacsAlert): GdacsAlertSummaryItem {
  return {
    eventId: alert.eventId,
    episodeId: alert.episodeId,
    eventType: alert.eventType,
    eventLabel: alert.eventLabel,
    alertLevel: alert.alertLevel,
    alertScore: alert.alertScore,
    country: alert.country,
    description: alert.description,
    distanceKm: alert.distanceKm,
    fromDate: alert.fromDate,
    toDate: alert.toDate,
    datemodified: alert.datemodified,
    reportUrl: alert.reportUrl,
  };
}

function sortAlerts(left: ParsedGdacsAlert, right: ParsedGdacsAlert) {
  if (right.alertSortKey !== left.alertSortKey) {
    return right.alertSortKey - left.alertSortKey;
  }

  const leftScore = left.alertScore ?? 0;
  const rightScore = right.alertScore ?? 0;
  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  if (left.distanceKm !== null && right.distanceKm !== null && left.distanceKm !== right.distanceKm) {
    return left.distanceKm - right.distanceKm;
  }

  if (left.datemodified && right.datemodified && left.datemodified !== right.datemodified) {
    return Date.parse(right.datemodified) - Date.parse(left.datemodified);
  }

  return left.country.localeCompare(right.country);
}

export async function fetchGdacsAlertSummary(
  coords: Coordinates,
): Promise<GdacsAlertSummary | null> {
  try {
    const response = await fetchWithTimeout(
      GDACS_EVENTS_URL,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "GeoSight/1.0",
        },
        next: { revalidate: 60 * 15 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GdacsFeatureCollection;
    const currentAlerts = (payload.features ?? [])
      .map((feature) => parseAlert(coords, feature))
      .filter((alert): alert is ParsedGdacsAlert => alert !== null && alert.isCurrent);

    const sortedAlerts = [...currentAlerts].sort(sortAlerts);
    const elevatedAlerts = sortedAlerts.filter((alert) => alert.alertSortKey >= 2);
    const nearestAlert = [...sortedAlerts].sort((left, right) => {
      if (left.distanceKm === null && right.distanceKm === null) {
        return 0;
      }

      if (left.distanceKm === null) {
        return 1;
      }

      if (right.distanceKm === null) {
        return -1;
      }

      return left.distanceKm - right.distanceKm;
    })[0];

    return {
      totalCurrentAlerts: sortedAlerts.length,
      elevatedCurrentAlerts: elevatedAlerts.length,
      redCurrentAlerts: sortedAlerts.filter((alert) => alert.alertSortKey === 3).length,
      orangeCurrentAlerts: sortedAlerts.filter((alert) => alert.alertSortKey === 2).length,
      nearestAlert: nearestAlert ? buildSummaryItem(nearestAlert) : null,
      featuredAlerts: sortedAlerts.slice(0, 3).map(buildSummaryItem),
    };
  } catch {
    return null;
  }
}
