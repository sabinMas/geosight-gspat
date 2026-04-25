import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { NwsAlertItem, NwsAlertSummary } from "@/types";

// NWS only covers the US — caller is responsible for checking isUS before calling.
const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

const SEVERITY_ORDER: Record<string, number> = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};

type NwsFeature = {
  id?: string;
  properties?: {
    event?: string | null;
    severity?: string | null;
    urgency?: string | null;
    areaDesc?: string | null;
    headline?: string | null;
    effective?: string | null;
    expires?: string | null;
    "@id"?: string | null;
  };
};

type NwsFeatureCollection = {
  type?: string;
  features?: NwsFeature[];
};

export async function fetchNwsAlerts(lat: number, lng: number): Promise<NwsAlertSummary> {
  const url = `${NWS_ALERTS_URL}?point=${lat.toFixed(4)},${lng.toFixed(4)}`;

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "GeoSight/1.0 (geosight-gspat.vercel.app)",
    },
    next: { revalidate: 300 }, // 5-min cache — alerts change fast
  }, EXTERNAL_TIMEOUTS.standard);

  if (!response.ok) {
    // NWS returns 404 for non-US coordinates; treat as no alerts
    return { totalAlerts: 0, extremeOrSevere: 0, alerts: [] };
  }

  const data = (await response.json()) as NwsFeatureCollection;
  const features = Array.isArray(data.features) ? data.features : [];

  const alerts: NwsAlertItem[] = features
    .map((f): NwsAlertItem | null => {
      const p = f.properties;
      if (!p?.event) return null;
      return {
        id: f.id ?? String(Math.random()),
        event: p.event,
        severity: p.severity ?? "Unknown",
        urgency: p.urgency ?? "Unknown",
        areaDesc: p.areaDesc ?? "",
        headline: p.headline ?? null,
        effective: p.effective ?? null,
        expires: p.expires ?? null,
        url: p["@id"] ?? null,
      };
    })
    .filter((a): a is NwsAlertItem => a !== null)
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0),
    )
    .slice(0, 10); // cap at 10 for display

  const extremeOrSevere = alerts.filter(
    (a) => a.severity === "Extreme" || a.severity === "Severe",
  ).length;

  return { totalAlerts: alerts.length, extremeOrSevere, alerts };
}
