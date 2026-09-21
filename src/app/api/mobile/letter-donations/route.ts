import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getUserGemBalance } from "@/lib/gems/balance";
import { spendMocoOnLetterDonation } from "@/lib/gems/letter-donation";
import { LETTER_DONATION_MIN_MOCO } from "@/lib/chat-letter-donation";

/** POST /api/mobile/letter-donations — spend MOCO, deliver sealed letter in DM */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-letter-donation", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: {
    receiverId?: string;
    roomId?: string;
    moco?: number;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const receiverId = body.receiverId?.trim() ?? "";
  const roomId = body.roomId?.trim() ?? "";
  const message = typeof body.message === "string" ? body.message : "";
  const moco = typeof body.moco === "number" ? body.moco : Number.parseInt(String(body.moco ?? ""), 10);

  if (!receiverId || !roomId) {
    return NextResponse.json({ error: "받는 사람과 대화방이 필요합니다." }, { status: 400 });
  }
  if (!Number.isInteger(moco) || moco < LETTER_DONATION_MIN_MOCO) {
    return NextResponse.json(
      { error: `최소 ${LETTER_DONATION_MIN_MOCO} MOCO부터 보낼 수 있습니다.` },
      { status: 400 }
    );
  }

  const result = await spendMocoOnLetterDonation({
    fanId: auth.user.id,
    creatorId: receiverId,
    roomId,
    moco,
    message,
  });

  if ("error" in result) {
    if (result.error === "INSUFFICIENT_MOCO_BALANCE") {
      const balance = await getUserGemBalance(auth.user.id);
      return NextResponse.json(
        { error: "MOCO 잔액이 부족합니다. 지갑에서 충전해 주세요.", balance },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    tipId: result.tipId,
    moco: result.moco,
    balance: result.balance,
  });
}
