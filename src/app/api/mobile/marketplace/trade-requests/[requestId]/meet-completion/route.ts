import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { respondMobileUsedTradeMeetCompletion } from "@/lib/used-market-mobile";

const bodySchema = z.object({
  action: z.enum(["confirm", "decline"]),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, "mobile-used-trade-meet-completion", 30);
  if (limited) return limited;

  const { requestId } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await respondMobileUsedTradeMeetCompletion(
    auth.user.id,
    requestId,
    parsed.data.action
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
