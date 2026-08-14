import { createHmac, timingSafeEqual } from "crypto";

function fingerprintSecret(): string {
  const key = process.env.BANK_FINGERPRINT_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!key) throw new Error("BANK_FINGERPRINT_SECRET_OR_AUTH_SECRET_REQUIRED");
  return key;
}

/** 계좌번호 원문은 DB에 저장하지 않고 HMAC 지문만 보관 */
export function bankAccountFingerprint(bankCode: string, accountNum: string): string {
  const digits = accountNum.replace(/\D/g, "");
  const payload = `${bankCode.trim()}:${digits}`;
  return createHmac("sha256", fingerprintSecret()).update(payload).digest("hex");
}

export function ipFingerprint(ip: string): string {
  const normalized = ip.trim() || "unknown";
  return createHmac("sha256", fingerprintSecret()).update(`ip:${normalized}`).digest("hex").slice(0, 32);
}

export function codesEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a.trim().toUpperCase());
  const bb = Buffer.from(b.trim().toUpperCase());
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}
