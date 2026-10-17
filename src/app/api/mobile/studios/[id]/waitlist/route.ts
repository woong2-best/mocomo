import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { joinStudioWaitlist } from "@/lib/creator-studio";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const limited = await rateLimitPublicApi(req, "mobile-studio-waitlist", 20);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const result = await joinStudioWaitlist(auth.user.id, id);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
