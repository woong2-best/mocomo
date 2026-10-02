import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { handleOnDemandWithdrawPost } from "@/lib/settlement-moco/on-demand-withdraw-route";

const bodySchema = z.object({
  withdrawMoco: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-settlement-on-demand-withdraw", 8);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "출금 MOCO 수량을 확인해 주세요." }, { status: 400 });
  }

  return handleOnDemandWithdrawPost(
    authResult.user.id,
    parsed.data.withdrawMoco,
    req.headers.get("X-Idempotency-Key"),
  );
}
