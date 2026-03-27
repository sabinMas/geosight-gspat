import { NextRequest, NextResponse } from "next/server";
import { fetchElevation } from "@/lib/usgs";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const elevation = await fetchElevation({ lat, lng });
    return NextResponse.json({ elevation });
  } catch {
    return NextResponse.json({ elevation: null, note: "Elevation service unavailable." });
  }
}
