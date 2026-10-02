import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { ATM_LETTER_MESSAGE_MAX } from "@/lib/chat-atm-letter";
import { MAX_PEER_TRANSFER_MOCO, transferPurchasedMocoToUser } from "@/lib/moco/peer-transfer";
import { stripeAccountNotReadyPayload } from "@/lib/creator-payout-ready";

const bodySchema = z.object({
  username: z.string().trim().min(1).max(32),
  amount: z.number().int().positive().max(MAX_PEER_TRANSFER_MOCO),
  message: z.string().max(ATM_LETTER_MESSAGE_MAX).optional(),
});

/** 보유(결제) MOCO → 상대 정산 MOCO. 상대 보유 잔액에는 넣지 않는다. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "moco-peer-transfer", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { checkRateLimit, apiLimiter } = await import("@/lib/ratelimit");
  const userLimited = await checkRateLimit(apiLimiter, `moco-transfer:${auth.user.id}`);
  if (!userLimited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a moment." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.path[0] === "message");
    return NextResponse.json(
      {
        error: tooLong
          ? `편지는 ${ATM_LETTER_MESSAGE_MAX}자까지 적을 수 있습니다.`
          : "아이디와 보낼 MOCO 수량을 확인해 주세요.",
      },
      { status: 400 }
    );
  }

  const result = await transferPurchasedMocoToUser({
    senderId: auth.user.id,
    senderUsername: auth.user.username,
    recipientUsername: parsed.data.username,
    amount: parsed.data.amount,
    message: parsed.data.message,
  });
  if ("error" in result) {
    if ("code" in result && result.code === "STRIPE_ACCOUNT_NOT_READY") {
      return NextResponse.json(stripeAccountNotReadyPayload(), { status: 422 });
    }
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }
  return NextResponse.json(result);
}
