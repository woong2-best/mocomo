import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import {
  GEM_PURCHASE_TERMS_COPY,
  MIN_MOCO_TOPUP_COUNT,
} from "@/lib/gems/constants";
import { getUserGemBalance } from "@/lib/gems/balance";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import { processRefundRequest } from "@/lib/gems/refund";
import { joinMoco } from "@/lib/moco/decimal-amount";

/** GET — gem balance + packages (balance = web/mobile 동일 availableMoco) */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-gems", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const [snap, gemOnly, purchases] = await Promise.all([
    getMocoBalanceSnapshot(auth.user.id),
    getUserGemBalance(auth.user.id),
    db.gemPurchase.findMany({
      where: { fanId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        gems: true,
        remainingGems: true,
        remainingTenths: true,
        krwAmount: true,
        refunded: true,
        refundedUsd: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    /** Canonical MOCO total — same as web getMocoBalanceSnapshot.availableMocoBalance */
    balance: snap.availableMocoBalance,
    gemBalance: gemOnly,
    mocoPointsBalance: snap.mocoPointsBalance,
    availableMocoBalance: snap.availableMocoBalance,
    minTopupMoco: MIN_MOCO_TOPUP_COUNT,
    termsCopy: GEM_PURCHASE_TERMS_COPY,
    purchases: purchases.map(({ remainingTenths, remainingGems, ...p }) => ({
      ...p,
      remainingGems: joinMoco(remainingGems, remainingTenths),
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

const topupSchema = z.object({
  action: z.literal("topup"),
  moco: z.number().int().positive(),
  purchaseTermsAccepted: z.literal(true),
});

const paySchema = z.object({
  action: z.literal("pay"),
  orderId: z.string().min(1).max(64),
  purchaseTermsAccepted: z.literal(true),
});

const refundSchema = z.object({
  action: z.literal("refund"),
  gemPurchaseId: z.string().min(1),
});

const topupSavedSchema = z.object({
  action: z.literal("topupSavedCard"),
  moco: z.number().int().positive(),
  paymentMethodId: z.string().min(1),
  purchaseTermsAccepted: z.literal(true),
});

const bodySchema = z.discriminatedUnion("action", [
  topupSchema,
  topupSavedSchema,
  paySchema,
  refundSchema,
]);

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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "topup" || data.action === "topupSavedCard") {
    return NextResponse.json(
      { error: "MOCO can be purchased only on the website." },
      { status: 403 }
    );
  }

  if (data.action === "pay") {
    return NextResponse.json(
      { error: "Not found." },
      { status: 403 }
    );
  }

  const refund = await processRefundRequest(data.gemPurchaseId, auth.user.id);
  const code = "error" in refund ? refund.error : "REFUND_NOT_ALLOWED";
  const messages: Record<string, string> = {
    UNAUTHORIZED: "You don't have permission to do that.",
    REFUND_NOT_ALLOWED: "Not found.",
  };
  return NextResponse.json({ error: messages[code] ?? code }, { status: 422 });
}
