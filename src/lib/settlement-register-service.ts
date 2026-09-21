import { z } from "zod";
import { db } from "@/lib/db";

/** @deprecated Custom Connect 제거 — Express 온보딩 사용 */
export const registerSchema = z.object({
  countryCode: z.string().min(2).max(2),
  legalName: z.string().min(2).max(80),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthDay: z.coerce.number().int().min(1).max(31),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postalCode: z.string().min(2).max(20),
  accountNumber: z.string().min(4).max(34),
  accountHolderName: z.string().min(2).max(80),
  bankCode: z.string().max(10).optional(),
  routingNumber: z.string().max(20).optional(),
  taxAttestationAccepted: z.literal(true),
  ssn: z.string().max(20).optional(),
  requestCardPayments: z.boolean().optional(),
});

export type RegisterSettlementInput = z.infer<typeof registerSchema>;

/**
 * @deprecated Custom Connect 화이트라벨 등록은 제거됨.
 * POST /api/settlements/connect-account (Express) 사용.
 */
export async function registerCreatorSettlementForUser(
  _userId: string,
  _raw: RegisterSettlementInput,
  _meta?: { ip?: string; userAgent?: string }
) {
  void _userId;
  void _raw;
  void _meta;
  return {
    error:
      "앱 내 계좌 직접 등록(Custom Connect)은 더 이상 지원하지 않습니다. Stripe Express 온보딩을 이용해 주세요.",
    code: "CUSTOM_CONNECT_DEPRECATED" as const,
  };
}

export async function getCreatorSettlementStatusForUser(userId: string) {
  const empty = {
    registered: false,
    payoutsEnabled: false,
    hasConnectAccount: false,
    needsExpressMigration: false,
    taxReportingReady: false,
    taxRequirementsDue: false,
    connectAccountType: null as string | null,
    profile: null,
    settlementMocoPoints: 0,
    earnedMocoPoints: 0,
    earnedMocoTier: "SEED" as const,
    purchasedMocoPoints: 0,
    recentRewards: [] as Awaited<
      ReturnType<typeof db.creatorRewardPayoutBatch.findMany>
    >,
  };

  try {
    const profile = await db.creatorSettlementProfile.findUnique({
      where: { userId },
    });
    const userRow = await db.user.findUnique({
      where: { id: userId },
      select: {
        stripeOnboardingCompleted: true,
        stripeConnectAccountId: true,
      },
    });
    const [settlementMoco, userGems, userTier] = await Promise.all([
      db.platformWallet.findUnique({
        where: { userId },
        select: { settlementMocoPoints: true, mocoPoints: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { gemBalance: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { earnedMocoTier: true },
      }),
    ]);
    const recentRewards = await db.creatorRewardPayoutBatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    return {
      registered: !!profile?.registeredAt || !!userRow?.stripeConnectAccountId,
      payoutsEnabled: profile?.payoutsEnabled ?? userRow?.stripeOnboardingCompleted ?? false,
      hasConnectAccount: !!userRow?.stripeConnectAccountId,
      needsExpressMigration: profile?.needsExpressMigration ?? false,
      taxReportingReady: profile?.taxReportingReady ?? false,
      taxRequirementsDue: profile?.taxRequirementsDue ?? false,
      connectAccountType: profile?.connectAccountType ?? null,
      profile: profile
        ? {
            countryCode: profile.countryCode,
            legalName: profile.legalName,
            accountNumberLast4: profile.accountNumberLast4,
            accountHolderName: profile.accountHolderName,
            bankCode: profile.bankCode,
            taxFormType: profile.taxFormType,
            registeredAt: profile.registeredAt,
            connectAccountType: profile.connectAccountType,
            taxReportingReady: profile.taxReportingReady,
            needsExpressMigration: profile.needsExpressMigration,
          }
        : null,
      /** earnedMoco — 후원 수령·정산 대상 (월간 차감 후 이월) */
      settlementMocoPoints: settlementMoco?.settlementMocoPoints ?? 0,
      earnedMocoPoints: settlementMoco?.settlementMocoPoints ?? 0,
      earnedMocoTier: userTier?.earnedMocoTier ?? "SEED",
      /** purchasedMoco — 충전만으로는 정산 등급·출금 불가 */
      purchasedMocoPoints:
        (userGems?.gemBalance ?? 0) + (settlementMoco?.mocoPoints ?? 0),
      recentRewards,
    };
  } catch (e) {
    console.error("[getCreatorSettlementStatusForUser]", e);
    return empty;
  }
}
