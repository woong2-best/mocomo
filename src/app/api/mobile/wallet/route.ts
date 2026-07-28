import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getWalletSummary } from "@/lib/settlement";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-wallet", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const summary = await getWalletSummary(auth.user.id);
  return NextResponse.json({
    availableBalance: summary.availableBalance,
    totalEarned: summary.totalEarned,
    totalWithdrawn: summary.totalWithdrawn,
    pendingPayout: summary.pendingPayout,
    bank: summary.bank
      ? {
          bankName: summary.bank.bankName,
          accountMasked: summary.bank.accountNumber
            ? `****${String(summary.bank.accountNumber).slice(-4)}`
            : null,
          holderName: summary.bank.holderName ?? null,
        }
      : null,
    recent: (summary.recent ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      memo: e.memo ?? null,
      createdAt:
        e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
    })),
  });
}
