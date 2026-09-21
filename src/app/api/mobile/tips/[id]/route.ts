import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { MOCO_USD_CENTS } from "@/lib/gems/constants";
import { LETTER_DONATION_GIFT_SOURCE } from "@/lib/gems/letter-donation";

/** GET /api/mobile/tips/[id] — letter envelope payload (Bearer) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-tip-letter-get", 120);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const tip = await db.tip.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      message: true,
      receiverId: true,
      senderId: true,
      createdAt: true,
      sender: { select: { username: true, name: true } },
    },
  });
  if (!tip) {
    return NextResponse.json({ error: "후원을 찾을 수 없습니다." }, { status: 404 });
  }

  const viewerId = auth.user.id;
  if (viewerId !== tip.receiverId && viewerId !== tip.senderId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const moco = Math.max(0, Math.floor(tip.amount / MOCO_USD_CENTS));
  const giftEvent = await db.giftEvent.findFirst({
    where: {
      source: LETTER_DONATION_GIFT_SOURCE,
      contentId: tip.id,
    },
    select: { id: true },
  });
  const claimed = giftEvent
    ? !!(await db.platformWalletLedger.findFirst({
        where: {
          referenceType: "letter_donation_open",
          referenceId: tip.id,
          delta: { gt: 0 },
        },
        select: { id: true },
      }))
    : true;

  return NextResponse.json({
    tip: {
      id: tip.id,
      amount: tip.amount,
      moco,
      message: tip.message ?? "",
      senderName: tip.sender.name || tip.sender.username,
      senderUsername: tip.sender.username,
      createdAt: tip.createdAt.toISOString(),
      claimable: !!giftEvent && viewerId === tip.receiverId && !claimed,
      claimed,
    },
  });
}
