import { NextRequest, NextResponse } from "next/server";
import { toBoundingBox } from "@/lib/geospatial";
import { fetchNearbyInfrastructure } from "@/lib/overpass";
import { fetchElevation } from "@/lib/usgs";
import { GeodataResult } from "@/types";

function estimateLandClassification(lat: number): GeodataResult["landClassification"] {
  if (lat > 46.5) {
    return [
      { label: "Vegetation", value: 48, confidence: 0.75, color: "#5be49b" },
      { label: "Water", value: 12, confidence: 0.66, color: "#00e5ff" },
      { label: "Urban", value: 16, confidence: 0.61, color: "#a8b8c8" },
      { label: "Barren/Industrial", value: 24, confidence: 0.72, color: "#ffab00" },
    ];
  }

  return [
    { label: "Vegetation", value: 31, confidence: 0.72, color: "#5be49b" },
    { label: "Water", value: 14, confidence: 0.65, color: "#00e5ff" },
    { label: "Urban", value: 19, confidence: 0.58, color: "#a8b8c8" },
    { label: "Barren/Industrial", value: 36, confidence: 0.78, color: "#ffab00" },
  ];
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const bbox = toBoundingBox({ lat, lng }, 8);

  const [elevationResult, infrastructureResult, climateResult] = await Promise.allSettled([
    fetchElevation({ lat, lng }),
    fetchNearbyInfrastructure(bbox),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&daily=temperature_2m_mean,precipitation_sum&timezone=auto&forecast_days=3`,
      { next: { revalidate: 60 * 60 * 6 } },
    ).then((response) => response.json()),
  ]);

  const infrastructure =
    infrastructureResult.status === "fulfilled" ? infrastructureResult.value.elements ?? [] : [];
  const roads = infrastructure.filter((item) => item.tags?.highway);
  const power = infrastructure.filter((item) => item.tags?.power);
  const waterways = infrastructure.filter((item) => item.tags?.waterway || item.tags?.natural === "water");

  const geodata: GeodataResult = {
    elevationMeters: elevationResult.status === "fulfilled" ? elevationResult.value : null,
    nearestWaterBody: {
      name: waterways[0]?.tags?.name ?? "Nearby mapped waterway",
      distanceKm: waterways.length ? 1.2 : null,
    },
    nearestRoad: {
      name: roads[0]?.tags?.name ?? roads[0]?.tags?.highway ?? "Road network",
      distanceKm: roads.length ? 2.4 : null,
    },
    nearestPower: {
      name: power[0]?.tags?.name ?? "Transmission infrastructure",
      distanceKm: power.length ? 3.8 : null,
    },
    climate: {
      averageTempC:
        climateResult.status === "fulfilled"
          ? climateResult.value?.daily?.temperature_2m_mean?.[0] ?? null
          : null,
      coolingDegreeDays:
        climateResult.status === "fulfilled"
          ? Math.max((climateResult.value?.daily?.temperature_2m_mean?.[0] ?? 12) * 18, 0)
          : null,
      precipitationMm:
        climateResult.status === "fulfilled"
          ? climateResult.value?.daily?.precipitation_sum?.[0] ?? null
          : null,
    },
    landClassification: estimateLandClassification(lat),
    sourceNotes: [
      "USGS elevation via The National Map EPQS.",
      "Overpass OSM features for roads, power lines, and waterways.",
      "Open-Meteo current and daily climate snapshots.",
    ],
  };

  return NextResponse.json(geodata, {
    headers: {
      "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
    },
  });
}
