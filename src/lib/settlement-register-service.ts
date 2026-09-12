import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  createCustomConnectAccount,
  pullAndSyncStripeConnectAccount,
  updateCustomConnectAccount,
} from "@/lib/stripe-connect";
import {
  isUsPersonCountry,
  maskSsnLast4,
  resolveTaxFormType,
  validateW9Ssn,
} from "@/lib/settlement-moco/tax";

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

async function clientMeta(override?: { ip?: string; userAgent?: string }) {
  if (override?.ip) {
    return { ip: override.ip, userAgent: override.userAgent };
  }
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const userAgent = h.get("user-agent") ?? undefined;
  return { ip, userAgent };
}

export async function registerCreatorSettlementForUser(
  userId: string,
  raw: RegisterSettlementInput,
  meta?: { ip?: string; userAgent?: string }
) {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const data = parsed.data;
  const countryCode = normalizeSellerCountry(data.countryCode).toUpperCase();
  const taxFormType = resolveTaxFormType(countryCode);
  const isUs = isUsPersonCountry(countryCode);

  if (isUs) {
    if (!data.ssn?.trim()) return { error: "미국 거주자는 SSN/ITIN을 입력해 주세요." };
    const ssnErr = validateW9Ssn(data.ssn);
    if (ssnErr) return { error: ssnErr };
  }

  if (countryCode === "KR" && !data.bankCode?.trim()) {
    return { error: "은행 코드를 선택해 주세요." };
  }
  if (countryCode === "US" && !data.routingNumber?.trim()) {
    return { error: "Routing Number를 입력해 주세요." };
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { stripeConnectAccountId: true, email: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  const { ip, userAgent } = await clientMeta(meta);
  const tosDate = Math.floor(Date.now() / 1000);
  const accountLast4 = data.accountNumber.replace(/\D/g, "").slice(-4);

  const connectInput = {
    userId,
    email: dbUser.email,
    countryCode,
    legalName: data.legalName.trim(),
    dateOfBirth: {
      year: data.birthYear,
      month: data.birthMonth,
      day: data.birthDay,
    },
    address: {
      line1: data.addressLine1.trim(),
      line2: data.addressLine2?.trim(),
      city: data.city.trim(),
      state: data.state?.trim(),
      postalCode: data.postalCode.trim(),
    },
    bank: {
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName.trim(),
      bankCode: data.bankCode,
      routingNumber: data.routingNumber,
    },
    taxFormType,
    ssn: data.ssn,
    tosAcceptance: { ip, date: tosDate },
    requestCardPayments: data.requestCardPayments ?? false,
  };

  const existing = await db.creatorSettlementProfile.findUnique({
    where: { userId },
  });

  let accountId = existing?.stripeConnectAccountId ?? dbUser.stripeConnectAccountId ?? null;

  if (accountId) {
    const updated = await updateCustomConnectAccount(accountId, connectInput);
    if ("error" in updated) return { error: updated.error };
  } else {
    const created = await createCustomConnectAccount(connectInput);
    if ("error" in created) return { error: created.error };
    accountId = created.accountId;
  }

  await db.$transaction(async (tx) => {
    await tx.creatorTaxAttestation.create({
      data: {
        userId,
        formType: taxFormType,
        accepted: true,
        ipAddress: ip,
        userAgent,
        stripeTosDate: tosDate,
      },
    });

    await tx.creatorSettlementProfile.upsert({
      where: { userId },
      create: {
        userId,
        countryCode,
        legalName: data.legalName.trim(),
        dateOfBirth: new Date(data.birthYear, data.birthMonth - 1, data.birthDay),
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2?.trim(),
        city: data.city.trim(),
        state: data.state?.trim(),
        postalCode: data.postalCode.trim(),
        bankCode: data.bankCode?.trim(),
        routingNumber: data.routingNumber?.trim(),
        accountNumberLast4: accountLast4,
        accountHolderName: data.accountHolderName.trim(),
        stripeConnectAccountId: accountId,
        taxFormType,
        ssnLast4: data.ssn ? maskSsnLast4(data.ssn) : null,
        registeredAt: new Date(),
      },
      update: {
        countryCode,
        legalName: data.legalName.trim(),
        dateOfBirth: new Date(data.birthYear, data.birthMonth - 1, data.birthDay),
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2?.trim(),
        city: data.city.trim(),
        state: data.state?.trim(),
        postalCode: data.postalCode.trim(),
        bankCode: data.bankCode?.trim(),
        routingNumber: data.routingNumber?.trim(),
        accountNumberLast4: accountLast4,
        accountHolderName: data.accountHolderName.trim(),
        stripeConnectAccountId: accountId,
        taxFormType,
        ssnLast4: data.ssn ? maskSsnLast4(data.ssn) : null,
        registeredAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: accountId },
    });
  });

  const snap = await pullAndSyncStripeConnectAccount(accountId);
  const payoutsEnabled = snap?.readyForPayouts ?? false;

  if (payoutsEnabled) {
    await db.user.update({
      where: { id: userId },
      data: {
        stripeOnboardingCompleted: true,
        stripeConnectOnboardedAt: new Date(),
      },
    });
    await db.creatorSettlementProfile.update({
      where: { userId },
      data: { payoutsEnabled: true },
    });
  }

  return {
    success: true as const,
    payoutsEnabled,
    accountId,
  };
}

export async function getCreatorSettlementStatusForUser(userId: string) {
  const empty = {
    registered: false,
    payoutsEnabled: false,
    hasConnectAccount: false,
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
      profile: profile
        ? {
            countryCode: profile.countryCode,
            legalName: profile.legalName,
            accountNumberLast4: profile.accountNumberLast4,
            accountHolderName: profile.accountHolderName,
            bankCode: profile.bankCode,
            taxFormType: profile.taxFormType,
            registeredAt: profile.registeredAt,
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
