import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { handleOnDemandWithdrawPost } from "@/lib/settlement-moco/on-demand-withdraw-route";

const bodySchema = z.object({
  withdrawMoco: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-on-demand-withdraw", 8);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "출금 MOCO 수량을 확인해 주세요." }, { status: 400 });
  }

  return handleOnDemandWithdrawPost(
    session.user.id,
    parsed.data.withdrawMoco,
    req.headers.get("X-Idempotency-Key"),
  );
}
