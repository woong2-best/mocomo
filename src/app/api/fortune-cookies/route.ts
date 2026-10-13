import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMyFortuneCookies } from "@/lib/fortune-cookie/service";
import { rateLimitPublicApi } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "fortune-cookies", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw != null ? Number(limitRaw) : undefined;

  const data = await listMyFortuneCookies(session.user.id, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
