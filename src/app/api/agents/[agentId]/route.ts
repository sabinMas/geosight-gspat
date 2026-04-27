import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimit,
  createRateLimitResponse,
} from "@/lib/request-guards";
import {
  GeoSightContext,
  GeoSightUiContext,
  getAgentConfig,
  isAgentId,
} from "@/lib/agents/agent-config";
import { runAgentAnalysis } from "@/lib/groq";
import { buildFallbackAssessment, formatLocationLabel } from "@/lib/geosight-assistant";
import { getProfileById } from "@/lib/profiles";
import { formatUiAuditResult, runDeterministicUiAudit } from "@/lib/ux-audit";
import {
  AnalyzeRequestBody,
  AgentConversationMessage,
  DataTrend,
  GeodataResult,
  LandCoverBucket,
  NearbyPlace,
  ResultsMode,
  WorkspaceCardId,
  WorkspaceShellMode,
} from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseConversationMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: AgentConversationMessage[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const role = entry.role;
    const content = normalizeMessage(entry.content);
    if (
      !content ||
      (role !== "system" && role !== "user" && role !== "assistant")
    ) {
      continue;
    }

    normalized.push({
      role,
      content,
      createdAt: parseOptionalString(entry.createdAt),
    });
  }

  return normalized.slice(-16);
}

function parseOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseResultsMode(value: unknown): ResultsMode | undefined {
  return value === "analysis" || value === "nearby_places" ? value : undefined;
}

function parseWorkspaceCardIds(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((entry): entry is WorkspaceCardId => typeof entry === "string") as WorkspaceCardId[];
}

function parseShellMode(value: unknown) {
  if (value === "minimal" || value === "guided" || value === "board") {
    return value satisfies WorkspaceShellMode;
  }

  return undefined;
}

function parseUiContext(value: unknown): GeoSightUiContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const context: GeoSightUiContext = {
    currentRoute: parseOptionalString(value.currentRoute),
    viewportClass:
      value.viewportClass === "mobile" ||
      value.viewportClass === "tablet" ||
      value.viewportClass === "desktop"
        ? value.viewportClass
        : undefined,
    activeProfile: parseOptionalString(value.activeProfile),
    visiblePrimaryCardId:
      typeof value.visiblePrimaryCardId === "string"
        ? (value.visiblePrimaryCardId as WorkspaceCardId)
        : undefined,
    visibleWorkspaceCardIds: parseWorkspaceCardIds(value.visibleWorkspaceCardIds),
    visibleControlCount: parseOptionalNumber(value.visibleControlCount),
    visibleTextBlockCount: parseOptionalNumber(value.visibleTextBlockCount),
    shellMode: parseShellMode(value.shellMode),
    locationSelected: parseOptionalBoolean(value.locationSelected),
    geodataLoading: parseOptionalBoolean(value.geodataLoading),
    geodataLoaded: parseOptionalBoolean(value.geodataLoaded),
    reportOpen: parseOptionalBoolean(value.reportOpen),
  };

  return Object.values(context).some((entry) => entry !== undefined) ? context : undefined;
}

function parseGeoSightContext(value: unknown): GeoSightContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const context: GeoSightContext = {
    lat: parseOptionalNumber(value.lat),
    lng: parseOptionalNumber(value.lng),
    profile: parseOptionalString(value.profile),
    score: parseOptionalNumber(value.score),
    appMode: value.appMode === "explorer" || value.appMode === "pro" ? value.appMode : undefined,
    dataBundle: isRecord(value.dataBundle) ? value.dataBundle : undefined,
    uiContext: parseUiContext(value.uiContext),
  };

  return Object.values(context).some((entry) => entry !== undefined) ? context : undefined;
}

function getDataBundle(context?: GeoSightContext) {
  return context?.dataBundle && isRecord(context.dataBundle) ? context.dataBundle : undefined;
}

function buildAnalyzePayload(
  message: string,
  context?: GeoSightContext,
  messages?: AgentConversationMessage[],
): AnalyzeRequestBody {
  const dataBundle = getDataBundle(context);

  return {
    profileId: context?.profile ?? "data-center",
    question: message,
    messages: messages?.map(({ role, content }) => ({ role, content })),
    location:
      typeof context?.lat === "number" && typeof context?.lng === "number"
        ? { lat: context.lat, lng: context.lng }
        : undefined,
    locationName: parseOptionalString(dataBundle?.locationName),
    resultsMode: parseResultsMode(dataBundle?.resultsMode),
    geodata: isRecord(dataBundle?.geodata)
      ? (dataBundle.geodata as unknown as GeodataResult)
      : undefined,
    nearbyPlaces: Array.isArray(dataBundle?.nearbyPlaces)
      ? (dataBundle.nearbyPlaces as NearbyPlace[])
      : undefined,
    dataTrends: Array.isArray(dataBundle?.dataTrends)
      ? (dataBundle.dataTrends as DataTrend[])
      : undefined,
    imageSummary: parseOptionalString(dataBundle?.imageSummary),
    classification: Array.isArray(dataBundle?.classification)
      ? (dataBundle.classification as LandCoverBucket[])
      : undefined,
  };
}

function buildGeoGuideFallback(message: string, context?: GeoSightContext) {
  const normalized = message.toLowerCase();
  const uiContext = context?.uiContext;
  const dataBundle = getDataBundle(context);
  const profile = getProfileById(context?.profile ?? "data-center");
  const supportingViews = uiContext?.visibleWorkspaceCardIds?.length
    ? uiContext.visibleWorkspaceCardIds.join(", ")
    : "none open yet";
  const hasLoadedLocationContext = Boolean(
    uiContext?.locationSelected ||
      uiContext?.geodataLoaded ||
      context?.lat !== undefined ||
      context?.lng !== undefined ||
      parseOptionalString(dataBundle?.locationName),
  );

  if (!hasLoadedLocationContext) {
    return `Start by focusing a place on the globe or with the search bar, then ask your question through the ${profile.name} lens. GeoSight stays in a calmer ${uiContext?.shellMode ?? "minimal"} shell until a location is selected, so the next useful step is to choose a place first.`;
  }

  if (
    normalized.includes("source") ||
    normalized.includes("trust") ||
    normalized.includes("ground") ||
    normalized.includes("provenance")
  ) {
    return "Open the Source awareness view to inspect live providers, freshness, coverage, and fallback notes for the current place. That is the fastest way to understand what is directly grounded versus still limited in the current analysis.";
  }

  if (
    normalized.includes("score") ||
    normalized.includes("factor") ||
    normalized.includes("breakdown")
  ) {
    return "Use Mission score for the headline fit and Factor breakdown for the weighted reasoning behind it. If those panels are not already open, use Add panel to reveal them one at a time instead of switching the whole workspace into workbench mode.";
  }

  if (normalized.includes("compare")) {
    return "Use the Compare panel after you have saved at least two candidate sites from the current mission profile. GeoSight keeps comparison tucked away until you need it so the default workspace stays focused on one place first.";
  }

  return `You are currently in ${uiContext?.shellMode ?? "minimal"} mode with ${uiContext?.visiblePrimaryCardId ?? "the main location panel"} as the primary panel and supporting panels ${supportingViews}. Stay in the current shell for one-place reasoning, or open Add panel if you want to reveal a specific supporting panel without cluttering the workbench.`;
}

function fmt(val: number | null | undefined, unit: string, decimals = 1) {
  if (val === null || val === undefined) return "—";
  return `${val.toFixed(decimals)} ${unit}`;
}

function fmtInt(val: number | null | undefined, unit = "") {
  if (val === null || val === undefined) return "—";
  return unit ? `${Math.round(val).toLocaleString()} ${unit}` : Math.round(val).toLocaleString();
}

function buildGeoScribeFallback(message: string, context?: GeoSightContext) {
  const payload = buildAnalyzePayload(message, context);
  const profile = getProfileById(payload.profileId);
  const locationLabel = formatLocationLabel(payload);
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const scoreVal = typeof context?.score === "number" ? context.score : null;
  const scoreStr = scoreVal !== null ? `${Math.round(scoreVal)}/100` : "—";

  // Pull live geodata from the context bundle if available.
  const bundle = context?.dataBundle;
  const geo = (bundle?.geodata ?? null) as GeodataResult | null;
  const c = geo?.climate ?? null;
  const h = geo?.hazards ?? null;
  const d = geo?.demographics ?? null;
  const am = geo?.amenities ?? null;
  const aq = geo?.airQuality ?? null;
  const fl = geo?.floodZone ?? null;
  const sr = geo?.solarResource ?? null;

  const lat = context?.lat ?? geo?.coordinates?.lat;
  const lng = context?.lng ?? geo?.coordinates?.lng;
  const coordStr = (lat !== undefined && lng !== undefined)
    ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    : "—";

  const lines: string[] = [
    `# GeoSight Site Report — ${locationLabel}`,
    `*Generated ${now} · ${profile.name} profile · Score ${scoreStr}*`,
    "",
    "---",
    "",
    "## Executive Summary",
    buildFallbackAssessment(payload, profile),
    "",
    "---",
    "",
    "## Location Overview",
    `| Field | Value |`,
    `|---|---|`,
    `| Coordinates | ${coordStr} |`,
    `| Mission profile | ${profile.name} |`,
    `| GeoSight score | ${scoreStr} |`,
    `| Elevation | ${fmt(geo?.elevationMeters ?? null, "m", 0)} |`,
    geo?.nearestRoad?.name ? `| Nearest road | ${geo.nearestRoad.name} (${fmt(geo.nearestRoad.distanceKm, "km")}) |` : "",
    geo?.nearestWaterBody?.name ? `| Nearest water | ${geo.nearestWaterBody.name} (${fmt(geo.nearestWaterBody.distanceKm, "km")}) |` : "",
    geo?.nearestPower?.name ? `| Nearest power | ${geo.nearestPower.name} (${fmt(geo.nearestPower.distanceKm, "km")}) |` : "",
  ].filter(l => l !== "");

  if (c) {
    lines.push("", "---", "", "## Climate & Weather");
    lines.push(`| Signal | Value |`, `|---|---|`);
    if (c.currentTempC !== null) lines.push(`| Current temperature | ${fmt(c.currentTempC, "°C")} |`);
    if (c.dailyHighTempC !== null) lines.push(`| Daily high | ${fmt(c.dailyHighTempC, "°C")} |`);
    if (c.dailyLowTempC !== null) lines.push(`| Daily low | ${fmt(c.dailyLowTempC, "°C")} |`);
    if (c.precipitationMm !== null) lines.push(`| Precipitation | ${fmt(c.precipitationMm, "mm")} |`);
    if (c.windSpeedKph !== null) lines.push(`| Wind speed | ${fmt(c.windSpeedKph, "km/h")} |`);
    if (c.coolingDegreeDays !== null) lines.push(`| Cooling degree days | ${fmtInt(c.coolingDegreeDays)} CDD |`);
    if (c.weatherRiskSummary) lines.push("", `> ${c.weatherRiskSummary}`);
  }

  if (aq) {
    lines.push("", "---", "", "## Air Quality");
    lines.push(`| Signal | Value |`, `|---|---|`);
    if (aq.pm25 !== null) lines.push(`| PM2.5 | ${fmt(aq.pm25, "µg/m³")} |`);
    if (aq.pm10 !== null) lines.push(`| PM10 | ${fmt(aq.pm10, "µg/m³")} |`);
    if (aq.aqiCategory) lines.push(`| AQI category | ${aq.aqiCategory} |`);
    if (aq.stationName) lines.push(`| Nearest station | ${aq.stationName} (${fmt(aq.distanceKm, "km")}) |`);
  }

  if (h) {
    lines.push("", "---", "", "## Natural Hazards");
    lines.push(`| Signal | Value |`, `|---|---|`);
    if (h.earthquakeCount30d !== null) lines.push(`| Earthquakes (30 d) | ${fmtInt(h.earthquakeCount30d)} |`);
    if (h.strongestEarthquakeMagnitude30d !== null) lines.push(`| Strongest quake | M${fmt(h.strongestEarthquakeMagnitude30d, "")} |`);
    if (h.nearestEarthquakeKm !== null) lines.push(`| Nearest quake | ${fmt(h.nearestEarthquakeKm, "km")} |`);
    if (h.activeFireCount7d !== null) lines.push(`| Active fires (7 d) | ${fmtInt(h.activeFireCount7d)} |`);
    if (h.nearestFireKm !== null) lines.push(`| Nearest fire | ${fmt(h.nearestFireKm, "km")} |`);
    if (fl?.floodZone) lines.push(`| Flood zone | ${fl.label ?? fl.floodZone} |`);
  }

  if (sr) {
    lines.push("", "---", "", "## Solar Resource");
    lines.push(`| Signal | Value |`, `|---|---|`);
    if (sr.annualGhiKwhM2Day) lines.push(`| Daily GHI | ${fmt(sr.annualGhiKwhM2Day, "kWh/m²/day")} |`);
    if (sr.peakSunHours) lines.push(`| Peak sun hours | ${fmt(sr.peakSunHours, "hrs/day")} |`);
    if (sr.clearnessIndex) lines.push(`| Clearness index | ${fmt(sr.clearnessIndex, "", 2)} |`);
    if (sr.bestMonth) lines.push(`| Best month | ${sr.bestMonth} |`);
    if (sr.worstMonth) lines.push(`| Worst month | ${sr.worstMonth} |`);
  }

  if (d) {
    lines.push("", "---", "", "## Demographics & Context");
    lines.push(`| Signal | Value |`, `|---|---|`);
    if (d.countyName) lines.push(`| County | ${d.countyName}${d.stateCode ? `, ${d.stateCode}` : ""} |`);
    if (d.population) lines.push(`| Population | ${fmtInt(d.population)} |`);
    if (d.medianHouseholdIncome) lines.push(`| Median household income | $${fmtInt(d.medianHouseholdIncome)} |`);
    if (d.medianHomeValue) lines.push(`| Median home value | $${fmtInt(d.medianHomeValue)} |`);
  }

  if (am) {
    lines.push("", "---", "", "## Nearby Amenities");
    lines.push(`| Category | Count |`, `|---|---|`);
    if (am.schoolCount !== null) lines.push(`| Schools | ${fmtInt(am.schoolCount)} |`);
    if (am.healthcareCount !== null) lines.push(`| Healthcare | ${fmtInt(am.healthcareCount)} |`);
    if (am.foodAndDrinkCount !== null) lines.push(`| Food & drink | ${fmtInt(am.foodAndDrinkCount)} |`);
    if (am.transitStopCount !== null) lines.push(`| Transit stops | ${fmtInt(am.transitStopCount)} |`);
    if (am.parkCount !== null) lines.push(`| Parks | ${fmtInt(am.parkCount)} |`);
    if (am.trailheadCount !== null) lines.push(`| Trailheads | ${fmtInt(am.trailheadCount)} |`);
  }

  lines.push(
    "", "---", "",
    "## Data Coverage",
    "- Report mode: **deterministic** — structured from live GeoSight data bundle",
    "- Method: direct synthesis of fetched signals and deterministic scoring",
    "- Use posture: screening and briefing depth, not final engineering or regulatory diligence",
    "- For source freshness and coverage detail, open the Source awareness card",
    "", "---", "",
    "## Limitations",
    "- Proxy heuristics and limited-coverage signals are flagged in the score factor breakdown",
    "- This report does not substitute for site survey, regulatory review, or professional diligence",
    "- Verify all values against primary data sources before any capital commitment",
  );

  return lines.join("\n");
}

function buildAgentFallback(agentId: string, message: string, context?: GeoSightContext) {
  if (agentId === "geo-guide") {
    return buildGeoGuideFallback(message, context);
  }

  const payload = buildAnalyzePayload(message, context);
  const profile = getProfileById(payload.profileId);

  if (agentId === "geo-scribe") {
    return buildGeoScribeFallback(message, context);
  }

  return [
    "# GeoAnalyst",
    "GeoAnalyst is currently using GeoSight's structured fallback analysis because a live model provider is unavailable.",
    "",
    buildFallbackAssessment(payload, profile),
  ].join("\n\n");
}


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId: rawAgentId } = await context.params;
  if (!isAgentId(rawAgentId)) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 10) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rateLimit = await applyRateLimit(request, `agents:${rawAgentId}`, {
    windowMs: 60_000,
    maxRequests: 20,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const daily = await applyRateLimit(request, "agents:daily", {
    windowMs: 86_400_000,
    maxRequests: 250,
  });
  if (!daily.allowed) {
    return createRateLimitResponse(daily);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isRecord(rawBody)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = normalizeMessage(rawBody.message);
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  // Parse conversation messages — kept for potential future use (appending to reports)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _messages = parseConversationMessages(rawBody.messages);

  const requestContext = parseGeoSightContext(rawBody.context);

  // geo-usability: fully deterministic UI audit — no AI call needed
  if (rawAgentId === "geo-usability") {
    const audit = runDeterministicUiAudit(requestContext?.uiContext);
    const deterministicAudit = formatUiAuditResult(audit);
    return new Response(deterministicAudit, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-GeoSight-Mode": "deterministic",
      },
    });
  }

  // geo-analyst, geo-guide, geo-scribe: attempt live Cerebras call; fall back on any error.
  const agentConfig = getAgentConfig(rawAgentId);

  let responseText: string;
  let mode: "live" | "fallback";
  let fallbackReason: string | undefined;

  try {
    const result = await runAgentAnalysis(agentConfig, message, requestContext ?? {});
    responseText = result.response;
    mode = "live";
  } catch (err) {
    const errName = err instanceof Error ? err.name : "unknown";
    const errMsg = err instanceof Error ? err.message : String(err);
    fallbackReason = `${errName}: ${errMsg.slice(0, 200)}`;
    console.warn(
      `[agents:${rawAgentId}] cerebras failed, using fallback. reason=${fallbackReason}`,
    );
    responseText = buildAgentFallback(rawAgentId, message, requestContext);
    mode = "fallback";
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-GeoSight-Mode": mode,
  };
  if (fallbackReason) {
    responseHeaders["X-GeoSight-Fallback-Reason"] = fallbackReason;
  }

  return new Response(responseText, { headers: responseHeaders });
}
