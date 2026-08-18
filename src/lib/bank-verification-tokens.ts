import { randomBytes } from "crypto";

/** 입금통장메모용 4자리 숫자 인증코드 */
export function generateBankVerifyCode(): string {
  const n = randomBytes(2).readUInt16BE(0) % 10000;
  return n.toString().padStart(4, "0");
}

/** Apick memo 최대 14자 — "MoCoMo-XXXX" 형식 */
export function bankVerifyMemo(code: string): string {
  return `MoCoMo-${code}`.slice(0, 14);
}

export function bankPendingIdentifier(userId: string): string {
  return `bank-pending:${userId}`;
}

export function bankCodeIdentifier(bankCode: string, accountFingerprint: string): string {
  return `bank-code:${bankCode}:${accountFingerprint}`;
}

export type BankPendingPayload = {
  bankCode: string;
  accountFingerprint: string;
  accountLast4: string;
  holderName: string;
  verifyCode: string;
  memo: string;
};

export function encodeBankPending(payload: BankPendingPayload): string {
  return JSON.stringify(payload);
}

export function decodeBankPending(token: string): BankPendingPayload | null {
  try {
    const parsed = JSON.parse(token) as BankPendingPayload;
    if (
      !parsed.bankCode ||
      !parsed.accountFingerprint ||
      !parsed.accountLast4 ||
      !parsed.verifyCode ||
      !parsed.holderName ||
      !parsed.memo
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Apick 입금통장메모에서 사용자 입력용 4자리 숫자 추출 */
export function parseVerifyCodeFromApickMemo(memo: string): string {
  const digits = memo.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return digits.padStart(4, "0");
}

export function maskBankAccount(accountNum: string): string {
  const digits = accountNum.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `****${digits.slice(-4)}`;
}
