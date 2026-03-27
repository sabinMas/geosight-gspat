import { NextRequest, NextResponse } from "next/server";
import { calculateSiteScore } from "@/lib/scoring";
import { GeodataResult } from "@/types";

export async function POST(request: NextRequest) {
  const geodata = (await request.json()) as GeodataResult;
  const score = calculateSiteScore(geodata);
  return NextResponse.json(score);
}
