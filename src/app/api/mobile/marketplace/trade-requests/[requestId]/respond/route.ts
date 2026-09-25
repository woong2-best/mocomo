import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { respondMobileUsedTradeRequest } from "@/lib/used-market-mobile";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-used-trade-respond", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "dm" });
  if ("error" in auth) return auth.error;

  const { requestId } = await params;
  if (!requestId || requestId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const result = await respondMobileUsedTradeRequest(
    auth.user.id,
    requestId,
    parsed.data.action
  );
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
