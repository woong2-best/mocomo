import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { listMocoTransactionHistory } from "@/lib/moco/transaction-history";

/** GET — MOCO Burn 원장 (웹 지갑) */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "wallet-moco-history", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const take = Math.min(
    Number.parseInt(req.nextUrl.searchParams.get("take") ?? "50", 10) || 50,
    100
  );

  const rows = await listMocoTransactionHistory(session.user.id, take);

  return NextResponse.json({
    history: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
