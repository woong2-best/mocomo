import { db } from "@/lib/db";
import { apickAccountRealname, apickTransfer1Won } from "@/lib/apick/client";
import { apickBankLabel, isApickBankCode, normalizeBankAccountNum } from "@/lib/apick/bank-codes";
import { bankHolderMatchesLegalName } from "@/lib/bank-name-match";
import {
  bankAccountFingerprint,
  codesEqual,
} from "@/lib/bank-account-fingerprint";
import {
  bankCodeIdentifier,
  bankPendingIdentifier,
  bankVerifyMemo,
  decodeBankPending,
  encodeBankPending,
  generateBankVerifyCode,
  maskBankAccount,
  parseVerifyCodeFromApickMemo,
} from "@/lib/bank-verification-tokens";
import { writeBankVerificationAudit } from "@/lib/bank-verification-audit";
import {
  checkBankSendRateLimit,
  checkBankVerifyAttemptLimit,
  clearBankVerifyFailures,
  recordBankVerifyFailure,
} from "@/lib/bank-verification-security";
import {
  attachKrBankToConnectAccount,
  createCustomConnectAccount,
} from "@/lib/stripe-connect";

const BANK_VERIFY_TTL_MS = 10 * 60 * 1000;

export const BANK_ALREADY_VERIFIED_MSG =
  "이 계정은 이미 계좌 인증이 완료된 상태입니다. 계정당 계좌는 하나만 등록할 수 있습니다.";

export const BANK_ONE_ACCOUNT_MSG =
  "이 계좌는 이미 다른 계정에 등록되어 있습니다. 계좌 하나당 계정 하나만 사용할 수 있습니다.";

export const BANK_PENDING_OTHER_MSG =
  "다른 계좌로 인증을 진행 중입니다. 기존 계좌로 완료하거나, 인증 만료 후 계좌를 변경해 주세요.";

export const BANK_LEGAL_NAME_MISMATCH_MSG =
  "예금주명이 로그인 실명과 일치하지 않습니다. 본인 명의 계좌만 등록할 수 있습니다.";

export const BANK_KR_ACCOUNT_ONLY_MSG = "국내(한국) 은행 계좌만 등록할 수 있습니다.";

export const BANK_EMAIL_REQUIRED_MSG =
  "계좌 인증 전에 이메일 인증을 완료해 주세요.";

export type BankVerificationUser = {
  id: string;
  name: string | null;
  countryCode: string;
  bankVerifiedAt: Date | null;
  settlementBankCode: string | null;
  settlementAccountLast4: string | null;
  stripeConnectAccountId: string | null;
  email: string | null;
  emailVerified?: Date | null;
};

export type BankVerificationOptions = {
  ip?: string;
  /** 판매자 온보딩·중고 정산 시에만 Stripe Connect 연동 */
  linkStripeConnect?: boolean;
};

export function isBankVerified(user: {
  bankVerifiedAt?: Date | null;
  phoneVerified?: Date | null;
}): boolean {
  return !!(user.bankVerifiedAt ?? user.phoneVerified);
}

async function readPendingBank(userId: string) {
  const row = await db.verificationToken.findFirst({
    where: { identifier: bankPendingIdentifier(userId) },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) return null;
  return decodeBankPending(row.token);
}

async function setPendingBank(
  userId: string,
  payload: import("@/lib/bank-verification-tokens").BankPendingPayload
) {
  const identifier = bankPendingIdentifier(userId);
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: encodeBankPending(payload),
      expires: new Date(Date.now() + BANK_VERIFY_TTL_MS),
    },
  });
}

async function clearPendingBank(userId: string) {
  await db.verificationToken.deleteMany({
    where: { identifier: bankPendingIdentifier(userId) },
  });
}

async function findBankRegisteredByOtherUser(accountFingerprint: string, currentUserId: string) {
  return db.user.findFirst({
    where: {
      settlementAccountHash: accountFingerprint,
      bankVerifiedAt: { not: null },
      id: { not: currentUserId },
    },
    select: { id: true },
  });
}

export async function getBankVerificationStatusForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      countryCode: true,
      name: true,
      bankVerifiedAt: true,
      phoneVerified: true,
      settlementBankCode: true,
      settlementAccountLast4: true,
      emailVerified: true,
    },
  });
  if (!user) return null;

  const verified = isBankVerified(user);
  const bankLabel = user.settlementBankCode
    ? apickBankLabel(user.settlementBankCode)
    : null;

  return {
    countryCode: user.countryCode,
    bankVerified: verified,
    emailVerified: !!user.emailVerified,
    displayAccount:
      verified && bankLabel && user.settlementAccountLast4
        ? `${bankLabel} ${maskBankAccount(user.settlementAccountLast4)}`
        : null,
    /** 중고거래 이용 자격 — KR 거주 + 계좌 인증 */
    usedMarketEligible: user.countryCode.toUpperCase() === "KR" && verified,
    /** @deprecated use usedMarketEligible */
    eligible: user.countryCode.toUpperCase() === "KR" && verified,
    legalName: user.name,
  };
}

export async function startBankVerificationForUser(
  user: BankVerificationUser,
  rawBankCode: string,
  rawAccountNum: string,
  opts: BankVerificationOptions = {}
) {
  const ip = opts.ip?.trim() || "unknown";

  if (!user.emailVerified) {
    return { error: BANK_EMAIL_REQUIRED_MSG };
  }

  const bankCode = rawBankCode.trim();
  const accountNum = normalizeBankAccountNum(rawAccountNum);
  if (!isApickBankCode(bankCode)) {
    return { error: BANK_KR_ACCOUNT_ONLY_MSG };
  }
  if (accountNum.length < 8 || accountNum.length > 16) {
    return { error: "올바른 계좌번호를 입력해 주세요." };
  }

  const accountFingerprint = bankAccountFingerprint(bankCode, accountNum);
  const accountLast4 = accountNum.slice(-4);

  if (user.bankVerifiedAt) {
    const label = user.settlementBankCode ? apickBankLabel(user.settlementBankCode) : "은행";
    const masked = user.settlementAccountLast4
      ? `${label} ${maskBankAccount(user.settlementAccountLast4)}`
      : "등록된 계좌";
    return {
      message: `이미 인증된 계좌입니다. (${masked})`,
      alreadyVerified: true as const,
      displayAccount: masked,
    };
  }

  const legalName = user.name?.trim();
  if (!legalName) {
    return {
      error:
        "실명 정보가 없습니다. 네이버 로그인 또는 프로필 이름 설정 후 다시 시도해 주세요.",
    };
  }

  const pending = await readPendingBank(user.id);
  if (pending && pending.accountFingerprint !== accountFingerprint) {
    const label = apickBankLabel(pending.bankCode) ?? pending.bankCode;
    return {
      error: `${BANK_PENDING_OTHER_MSG} (${label} ${maskBankAccount(pending.accountLast4)})`,
    };
  }

  const conflict = await findBankRegisteredByOtherUser(accountFingerprint, user.id);
  if (conflict) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "send_fail",
      bankCode,
      ip,
      meta: { reason: "account_taken" },
    });
    return { error: BANK_ONE_ACCOUNT_MSG };
  }

  const rate = await checkBankSendRateLimit({
    userId: user.id,
    accountFingerprint,
    ip,
  });
  if (!rate.ok) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "send_fail",
      bankCode,
      ip,
      meta: { reason: "rate_limit" },
    });
    return { error: rate.error };
  }

  await writeBankVerificationAudit({
    userId: user.id,
    action: "send_start",
    bankCode,
    ip,
  });

  const realname = await apickAccountRealname({ bankCode, accountNum });
  if (!realname.ok) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "send_fail",
      bankCode,
      ip,
      meta: { reason: "realname", apick: realname.error },
    });
    return { error: realname.error };
  }

  if (!bankHolderMatchesLegalName(realname.holderName, legalName)) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "send_fail",
      bankCode,
      ip,
      meta: { reason: "name_mismatch" },
    });
    return { error: BANK_LEGAL_NAME_MISMATCH_MSG };
  }

  const requestMemo = bankVerifyMemo(generateBankVerifyCode());
  const transfer = await apickTransfer1Won({ bankCode, accountNum, memo: requestMemo });
  if (!transfer.ok) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "send_fail",
      bankCode,
      ip,
      meta: { reason: "transfer", apick: transfer.error },
    });
    return { error: transfer.error };
  }

  const verifyCode = parseVerifyCodeFromApickMemo(transfer.memo);
  if (verifyCode.length !== 4) {
    return { error: "입금통장메모에서 인증코드를 확인할 수 없습니다. 다시 시도해 주세요." };
  }

  const payload = {
    bankCode,
    accountFingerprint,
    accountLast4,
    holderName: realname.holderName,
    verifyCode,
    memo: transfer.memo,
  };

  const identifier = bankCodeIdentifier(bankCode, accountFingerprint);
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: verifyCode,
      expires: new Date(Date.now() + BANK_VERIFY_TTL_MS),
    },
  });
  await setPendingBank(user.id, payload);
  await clearBankVerifyFailures(user.id, accountFingerprint);

  await writeBankVerificationAudit({
    userId: user.id,
    action: "send_success",
    bankCode,
    ip,
    meta: { last4: accountLast4 },
  });

  const bankLabel = apickBankLabel(bankCode) ?? bankCode;
  return {
    message: transfer.dev
      ? `개발 모드: 입금통장메모 ${transfer.memo} (실서비스는 1원 송금)`
      : `${bankLabel} 계좌로 1원을 보냈습니다. 입금통장메모의 4자리 코드를 입력해 주세요.`,
    devCode: transfer.dev ? verifyCode : undefined,
    displayAccount: `${bankLabel} ${maskBankAccount(accountLast4)}`,
    holderName: realname.holderName,
    sendsRemaining: rate.remaining,
  };
}

export async function verifyBankCodeForUser(
  user: BankVerificationUser,
  rawBankCode: string,
  rawAccountNum: string,
  rawCode: string,
  opts: BankVerificationOptions = {}
) {
  const ip = opts.ip?.trim() || "unknown";

  if (!user.emailVerified) {
    return { error: BANK_EMAIL_REQUIRED_MSG };
  }

  const bankCode = rawBankCode.trim();
  const accountNum = normalizeBankAccountNum(rawAccountNum);
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!isApickBankCode(bankCode)) return { error: BANK_KR_ACCOUNT_ONLY_MSG };
  if (code.length !== 4) return { error: "입금통장메모 4자리 코드를 입력해 주세요." };

  const accountFingerprint = bankAccountFingerprint(bankCode, accountNum);
  const accountLast4 = accountNum.slice(-4);

  if (user.bankVerifiedAt) {
    const label = user.settlementBankCode ? apickBankLabel(user.settlementBankCode) : "은행";
    const masked = user.settlementAccountLast4
      ? `${label} ${maskBankAccount(user.settlementAccountLast4)}`
      : "등록된 계좌";
    return { success: true as const, displayAccount: masked };
  }

  const pending = await readPendingBank(user.id);
  if (!pending) {
    return { error: "인증이 만료되었습니다. 다시 1원 인증을 요청해 주세요." };
  }
  if (pending.bankCode !== bankCode || pending.accountFingerprint !== accountFingerprint) {
    return { error: BANK_PENDING_OTHER_MSG };
  }

  const attempt = await checkBankVerifyAttemptLimit(user.id, accountFingerprint);
  if (!attempt.ok) {
    await writeBankVerificationAudit({
      userId: user.id,
      action: "verify_locked",
      bankCode,
      ip,
    });
    return { error: attempt.error };
  }

  const identifier = bankCodeIdentifier(bankCode, accountFingerprint);
  const row = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) {
    return { error: "인증코드가 만료되었습니다. 다시 요청해 주세요." };
  }
  if (!codesEqual(row.token, code)) {
    await recordBankVerifyFailure(user.id, accountFingerprint);
    await writeBankVerificationAudit({
      userId: user.id,
      action: "verify_fail",
      bankCode,
      ip,
      meta: { remaining: attempt.remaining - 1 },
    });
    return { error: "인증코드가 일치하지 않습니다." };
  }

  const conflict = await findBankRegisteredByOtherUser(accountFingerprint, user.id);
  if (conflict) return { error: BANK_ONE_ACCOUNT_MSG };

  const bankLabel = apickBankLabel(bankCode) ?? bankCode;
  const now = new Date();

  let connectAccountId = user.stripeConnectAccountId;

  try {
    await db.$transaction(async (tx) => {
      const already = await tx.user.findUnique({
        where: { id: user.id },
        select: { bankVerifiedAt: true },
      });
      if (already?.bankVerifiedAt) throw new Error("ALREADY_VERIFIED");

      await tx.user.update({
        where: { id: user.id },
        data: {
          bankVerifiedAt: now,
          phoneVerified: now,
          settlementBankCode: bankCode,
          settlementAccountLast4: accountLast4,
          settlementAccountHolder: pending.holderName,
          settlementAccountHash: accountFingerprint,
        },
      });

      await tx.verificationToken.deleteMany({
        where: {
          OR: [{ identifier }, { identifier: bankPendingIdentifier(user.id) }],
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_VERIFIED") {
      return { error: BANK_ALREADY_VERIFIED_MSG };
    }
    throw e;
  }

  await clearBankVerifyFailures(user.id, accountFingerprint);
  await writeBankVerificationAudit({
    userId: user.id,
    action: "verify_success",
    bankCode,
    ip,
    meta: { last4: accountLast4, stripe: !!opts.linkStripeConnect },
  });

  if (opts.linkStripeConnect) {
    if (!connectAccountId) {
      const created = await createCustomConnectAccount({
        userId: user.id,
        email: user.email,
        legalName: pending.holderName,
      });
      if ("accountId" in created && created.accountId) {
        connectAccountId = created.accountId;
        await db.user.update({
          where: { id: user.id },
          data: { stripeConnectAccountId: connectAccountId },
        });
      }
    }

    if (connectAccountId) {
      await attachKrBankToConnectAccount({
        accountId: connectAccountId,
        bankCode,
        accountNum,
        holderName: pending.holderName,
      });
    }
  }

  return {
    success: true as const,
    displayAccount: `${bankLabel} ${maskBankAccount(accountLast4)}`,
    stripeConnectAccountId: opts.linkStripeConnect ? connectAccountId : undefined,
  };
}

export async function clearBankVerificationPending(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bankVerifiedAt: true, phoneVerified: true },
  });
  if (!user) return { error: "UNAUTHORIZED" };
  if (isBankVerified(user)) return { error: BANK_ALREADY_VERIFIED_MSG };
  await clearPendingBank(userId);
  return { ok: true as const };
}
