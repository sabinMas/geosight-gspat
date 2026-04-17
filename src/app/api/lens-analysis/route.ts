import { NextRequest, NextResponse } from "next/server";
import { isProviderTimeoutError } from "@/lib/analysis-provider";
import { analyzeGeneralExplore } from "@/lib/analysis/generalExplore";
import { analyzeHuntPlanner } from "@/lib/analysis/huntPlanner";
import { analyzeLandQuickCheck } from "@/lib/analysis/landQuickCheck";
import { analyzeRoadTrip } from "@/lib/analysis/roadTrip";
import { resolveActiveGeometry } from "@/lib/analysis/shared";
import { analyzeTrailScout } from "@/lib/analysis/trailScout";
import { logAnalysisProviderFailure, runAnalysisWithFallback } from "@/lib/analysis-runner";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import { buildGeneralExplorePrompt } from "@/lib/prompts/generalExplore";
import { getProfileById } from "@/lib/profiles";
import { buildHuntPlannerPrompt } from "@/lib/prompts/huntPlanner";
import { buildLandQuickCheckPrompt } from "@/lib/prompts/landQuickCheck";
import { buildRoadTripPrompt } from "@/lib/prompts/roadTrip";
import { buildTrailScoutPrompt } from "@/lib/prompts/trailScout";
import {
  applyRateLimit,
  createRateLimitResponse,
  normalizeTextInput,
  rateLimitHeaders,
} from "@/lib/request-guards";
import {
  DrawnGeometryFeatureCollection,
  LensAnalysisRequestBody,
  LensAnalysisResult,
} from "@/types";

const EMPTY_GEOMETRY: DrawnGeometryFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function isFeatureCollection(value: unknown): value is DrawnGeometryFeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as { type?: string }).type === "FeatureCollection" &&
    "features" in value &&
    Array.isArray((value as { features?: unknown[] }).features)
  );
}

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, "lens-analysis", {
    windowMs: 60_000,
    maxRequests: 18,
  });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const body = rawBody as LensAnalysisRequestBody;
  const lens = typeof body.lensId === "string" ? getExplorerLensById(body.lensId) : null;
  if (!lens) {
    return NextResponse.json({ error: "Unsupported lens" }, { status: 400 });
  }

  if (
    ![
      "hunt-planner",
      "trail-scout",
      "land-quick-check",
      "road-trip",
      "general-explore",
    ].includes(lens.id)
  ) {
    return NextResponse.json({ error: "This lens is not yet wired for deterministic analysis." }, { status: 400 });
  }

  const geometry = isFeatureCollection(body.geometry) ? body.geometry : EMPTY_GEOMETRY;
  const location =
    body.location &&
    typeof body.location.lat === "number" &&
    typeof body.location.lng === "number"
      ? body.location
      : null;
  const locationName = normalizeTextInput(body.locationName, 180) ?? lens.label;
  const geometryContext = resolveActiveGeometry(geometry, body.selectedGeometryId ?? null, location);

  if (!geometryContext) {
    return NextResponse.json(
      { error: "Select a place or draw an area before running this lens." },
      { status: 400 },
    );
  }

  const profile = getProfileById(lens.profileId);
  const computation =
    lens.id === "hunt-planner"
      ? await analyzeHuntPlanner(geometryContext, locationName)
      : lens.id === "trail-scout"
        ? await analyzeTrailScout(geometryContext, locationName)
        : lens.id === "land-quick-check"
          ? await analyzeLandQuickCheck(geometryContext, locationName)
          : lens.id === "road-trip"
            ? await analyzeRoadTrip(geometryContext, locationName)
            : await analyzeGeneralExplore(geometryContext, locationName);

  const prompt =
    lens.id === "hunt-planner"
      ? buildHuntPlannerPrompt({
          locationName,
          geometrySource: body.geometrySource,
          metrics: computation.promptContext,
          activeLayerLabels: body.activeLayerLabels,
        })
      : lens.id === "trail-scout"
        ? buildTrailScoutPrompt({
            locationName,
            geometrySource: body.geometrySource,
            metrics: computation.promptContext,
            activeLayerLabels: body.activeLayerLabels,
          })
        : lens.id === "land-quick-check"
          ? buildLandQuickCheckPrompt({
              locationName,
              geometrySource: body.geometrySource,
              metrics: computation.promptContext,
              activeLayerLabels: body.activeLayerLabels,
            })
          : lens.id === "road-trip"
            ? buildRoadTripPrompt({
                locationName,
                geometrySource: body.geometrySource,
                metrics: computation.promptContext,
                activeLayerLabels: body.activeLayerLabels,
              })
            : buildGeneralExplorePrompt({
                locationName,
                geometrySource: body.geometrySource,
                metrics: computation.promptContext,
                activeLayerLabels: body.activeLayerLabels,
              });

  const narrative = await runAnalysisWithFallback(
    {
      profileId: profile.id,
      question: prompt,
      location: geometryContext.centroid,
      locationName,
      resultsMode: "analysis",
    },
    profile,
    {
      fallbackAnswer: computation.fallbackNarrative,
      onProviderFailure(provider, error) {
        logAnalysisProviderFailure("lens-analysis", provider, error);
      },
    },
  ).catch((error) => {
    if (isProviderTimeoutError(error)) {
      return NextResponse.json(
        {
          error: "Live lens analysis timed out before a provider returned a usable narrative. Please retry.",
          retryable: true,
          provider: error.provider,
        },
        {
          status: 504,
          headers: {
            ...rateLimitHeaders(rateLimit),
            "X-GeoSight-Mode": "timeout",
            "X-GeoSight-Retryable": "true",
          },
        },
      );
    }

    throw error;
  });

  if (narrative instanceof NextResponse) {
    return narrative;
  }

  const result: LensAnalysisResult = {
    lens: lens.id,
    geometrySource: body.geometrySource,
    title: computation.title,
    narrative: narrative.response,
    metrics: computation.metrics,
    generatedAt: new Date().toISOString(),
    attribution: computation.attribution,
    details: {
      ...computation.details,
      narrativeModel: narrative.model,
    },
  };

  return NextResponse.json(result, {
    headers: rateLimitHeaders(rateLimit),
  });
}
