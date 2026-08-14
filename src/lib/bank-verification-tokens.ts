import { randomBytes } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 입금통장메모용 4자리 인증코드 */
export function generateBankVerifyCode(): string {
  let code = "";
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
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

/** Apick 입금통장메모에서 사용자 입력용 인증코드 추출 (예: WXR-7487 → 7487, MoCoMo-AB12 → AB12) */
export function parseVerifyCodeFromApickMemo(memo: string): string {
  const trimmed = memo.trim();
  const tail = (trimmed.includes("-") ? trimmed.split("-").pop() : trimmed) ?? trimmed;
  const alnum = tail.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (alnum.length >= 4) return alnum.slice(-4);
  return alnum;
}

export function maskBankAccount(accountNum: string): string {
  const digits = accountNum.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `****${digits.slice(-4)}`;
}
