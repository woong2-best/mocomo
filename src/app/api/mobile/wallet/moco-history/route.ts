import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listMocoTransactionHistory } from "@/lib/moco/transaction-history";

/** GET — MOCO Burn 원장 (광고·경매 페널티 등) */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-moco-history", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const take = Math.min(
    Number.parseInt(req.nextUrl.searchParams.get("take") ?? "50", 10) || 50,
    100
  );

  const rows = await listMocoTransactionHistory(auth.user.id, take);

  return NextResponse.json({
    history: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
