import { db } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import {
  getBankVerificationStatusForUser,
  startBankVerificationForUser,
  verifyBankCodeForUser,
  type BankVerificationUser,
  type BankVerificationOptions,
} from "@/lib/bank-verification";

export async function getUsedMarketBankStatusForUser(userId: string) {
  return getBankVerificationStatusForUser(userId);
}

export async function getAccountBankStatusForUser(userId: string) {
  return getBankVerificationStatusForUser(userId);
}

async function withIp(opts: BankVerificationOptions = {}): Promise<BankVerificationOptions> {
  const ip = opts.ip ?? (await getRequestIp());
  return { ...opts, ip };
}

export async function sendUsedMarketBankVerificationForUser(
  user: BankVerificationUser,
  bankCode: string,
  accountNum: string,
  opts?: BankVerificationOptions
) {
  return startBankVerificationForUser(
    user,
    bankCode,
    accountNum,
    await withIp({ ...opts, linkStripeConnect: true })
  );
}

export async function verifyUsedMarketBankCodeForUser(
  user: BankVerificationUser,
  bankCode: string,
  accountNum: string,
  code: string,
  opts?: BankVerificationOptions
) {
  return verifyBankCodeForUser(
    user,
    bankCode,
    accountNum,
    code,
    await withIp({ ...opts, linkStripeConnect: true })
  );
}

export async function sendAccountBankVerificationForUser(
  user: BankVerificationUser,
  bankCode: string,
  accountNum: string,
  opts?: BankVerificationOptions
) {
  return startBankVerificationForUser(
    user,
    bankCode,
    accountNum,
    await withIp({ ...opts, linkStripeConnect: false })
  );
}

export async function verifyAccountBankCodeForUser(
  user: BankVerificationUser,
  bankCode: string,
  accountNum: string,
  code: string,
  opts?: BankVerificationOptions
) {
  return verifyBankCodeForUser(
    user,
    bankCode,
    accountNum,
    code,
    await withIp({ ...opts, linkStripeConnect: false })
  );
}

/** Mobile API — user slice loader */
export async function loadBankVerificationUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      countryCode: true,
      bankVerifiedAt: true,
      settlementBankCode: true,
      settlementAccountLast4: true,
      stripeConnectAccountId: true,
      email: true,
      emailVerified: true,
    },
  });
}
