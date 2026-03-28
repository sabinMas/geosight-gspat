import { NextRequest, NextResponse } from "next/server";
import { fetchElevation, fetchElevationProfile } from "@/lib/usgs";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const lengthKm = Number(request.nextUrl.searchParams.get("lengthKm") ?? "12");
  const samples = Number(request.nextUrl.searchParams.get("samples") ?? "9");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const elevation = await fetchElevation({ lat, lng });
    const profileData = await fetchElevationProfile(
      { lat, lng },
      {
        lengthKm: Number.isFinite(lengthKm) ? Math.min(Math.max(lengthKm, 4), 24) : 12,
        samples: Number.isFinite(samples) ? Math.min(Math.max(samples, 5), 15) : 9,
      },
    );
    return NextResponse.json(
      { elevation, ...profileData },
      {
        headers: {
          "Cache-Control": "s-maxage=21600, stale-while-revalidate=43200",
        },
      },
    );
  } catch {
    return NextResponse.json({
      elevation: null,
      profile: [],
      summary: {
        lengthKm: 0,
        minElevation: null,
        maxElevation: null,
        elevationGain: null,
        elevationLoss: null,
      },
      note: "Elevation service unavailable.",
    });
  }
}
