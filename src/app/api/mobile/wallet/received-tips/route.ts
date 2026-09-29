import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { ledgerCentsToMoco } from "@/lib/gems/display";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-wallet-received-tips", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const tips = await db.tip.findMany({
    where: { receiverId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      amount: true,
      message: true,
      createdAt: true,
      sender: { select: { username: true, name: true } },
    },
  });

  return NextResponse.json({
    tips: tips.map((t) => ({
      id: t.id,
      amountCents: t.amount,
      moco: ledgerCentsToMoco(t.amount),
      message: t.message,
      createdAt: t.createdAt.toISOString(),
      sender: t.sender,
    })),
  });
}
