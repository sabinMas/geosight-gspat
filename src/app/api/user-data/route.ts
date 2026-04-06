import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSites, putUserSites, StoredSite } from "@/lib/user-storage";
import { applyRateLimit, createRateLimitResponse } from "@/lib/request-guards";

const RATE_LIMIT_CONFIG = { windowMs: 60_000, maxRequests: 60 };
const MAX_SITES = 20;

export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request, "user-data", RATE_LIMIT_CONFIG);
  if (!rl.allowed) return createRateLimitResponse(rl);

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");
  if (type !== "saved-sites") {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const sites = await getUserSites(session.user.email);
  return NextResponse.json({ sites });
}

export async function PUT(request: NextRequest) {
  const rl = await applyRateLimit(request, "user-data", RATE_LIMIT_CONFIG);
  if (!rl.allowed) return createRateLimitResponse(rl);

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { type: string; sites: StoredSite[] };
  try {
    body = (await request.json()) as { type: string; sites: StoredSite[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.type !== "saved-sites") {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  if (!Array.isArray(body.sites)) {
    return NextResponse.json({ error: "sites must be an array" }, { status: 400 });
  }

  const capped = body.sites.slice(0, MAX_SITES);
  await putUserSites(session.user.email, capped);

  return NextResponse.json({ ok: true });
}
