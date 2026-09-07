import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentIntentType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import {
  GEM_TOPUP_PACKAGES,
  GEM_PURCHASE_TERMS_COPY,
} from "@/lib/gems/constants";
import { getUserGemBalance } from "@/lib/gems/balance";
import { payCheckoutWithGems } from "@/lib/gems/checkout-pay";
import { processRefundRequest } from "@/lib/gems/refund";
import { safeReturnPath } from "@/lib/donation-metadata";

function gemPayRedirectPath(type: PaymentIntentType, metadata: Record<string, unknown>): string {
  if (type === "TIP") {
    const channelId = typeof metadata.channelId === "string" ? metadata.channelId : undefined;
    if (channelId) return `/voice/${channelId}`;
    const username = typeof metadata.username === "string" ? metadata.username : undefined;
    const returnPath = typeof metadata.returnPath === "string" ? metadata.returnPath : undefined;
    return safeReturnPath(returnPath, username ? `/u/${username}` : "/support");
  }
  if (type === "POST_MEDIA") {
    const postId = typeof metadata.postId === "string" ? metadata.postId : undefined;
    if (postId) return `/post/${postId}`;
    const username = typeof metadata.username === "string" ? metadata.username : undefined;
    return username ? `/u/${username}?paid=1` : "/";
  }
  return "/wallet";
}

/** GET — gem balance + packages */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const [balance, purchases] = await Promise.all([
    getUserGemBalance(auth.user.id),
    db.gemPurchase.findMany({
      where: { fanId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        gems: true,
        remainingGems: true,
        krwAmount: true,
        refunded: true,
        refundedUsd: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    balance,
    packages: GEM_TOPUP_PACKAGES,
    termsCopy: GEM_PURCHASE_TERMS_COPY,
    purchases: purchases.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

const topupSchema = z.object({
  action: z.literal("topup"),
  gems: z.number().int().positive(),
  purchaseTermsAccepted: z.literal(true),
});

const paySchema = z.object({
  action: z.literal("pay"),
  type: z.enum(["TIP", "POST_MEDIA"]),
  amount: z.number().int().positive(),
  metadata: z.record(z.unknown()).default({}),
});

const refundSchema = z.object({
  action: z.literal("refund"),
  gemPurchaseId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("action", [topupSchema, paySchema, refundSchema]);

/** POST — topup / pay / refund */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems-write", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

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

  const data = parsed.data;

  if (data.action === "topup") {
    const pack = GEM_TOPUP_PACKAGES.find((p) => p.gems === data.gems);
    if (!pack) {
      return NextResponse.json({ error: "유효하지 않은 패키지입니다." }, { status: 422 });
    }
    const dbUser = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true },
    });
    const result = await createStripeCheckoutForUser({
      userId: auth.user.id,
      email: dbUser?.email,
      type: "GEM_TOPUP",
      amount: pack.usdCents,
      orderName: pack.label,
      metadata: { gemAmount: pack.gems },
      platform: "mobile",
      purchaseTermsAccepted: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  if (data.action === "pay") {
    const result = await payCheckoutWithGems({
      userId: auth.user.id,
      type: data.type,
      amountUsdCents: data.amount,
      metadata: data.metadata,
    });
    if ("error" in result && result.error) {
      const messages: Record<string, string> = {
        INSUFFICIENT_GEMS_BALANCE: "젬 잔액이 부족합니다.",
      };
      return NextResponse.json(
        { error: messages[result.error] ?? result.error },
        { status: 422 }
      );
    }
    if ("success" in result && result.success) {
      return NextResponse.json({
        success: true,
        type: data.type,
        redirectPath: gemPayRedirectPath(data.type, data.metadata),
        balance: "balance" in result ? result.balance : undefined,
      });
    }
    return NextResponse.json({ error: "결제에 실패했습니다." }, { status: 500 });
  }

  const refund = await processRefundRequest(data.gemPurchaseId, auth.user.id);
  if ("error" in refund && refund.error) {
    const code = refund.error;
    const messages: Record<string, string> = {
      UNAUTHORIZED: "환불 권한이 없습니다.",
      ALREADY_REFUNDED: "이미 환불되었습니다.",
      NO_REMAINING_GEMS_TO_REFUND: "환불 가능한 젬이 없습니다.",
      REFUND_WINDOW_EXPIRED: "환불 기한이 지났습니다.",
    };
    return NextResponse.json({ error: messages[code] ?? code }, { status: 422 });
  }

  return NextResponse.json({ success: true, ...refund });
}
