import * as OTPAuth from "otpauth";
import { adminDecrypt, adminEncrypt } from "@/lib/admin/security/crypto";

const ISSUER = "MoCoMo Admin";

export function generateTotpSecret(accountName: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return {
    secretBase32: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export function encryptTotpSecret(secretBase32: string) {
  return adminEncrypt(secretBase32);
}

export function decryptTotpSecret(blob: {
  encryptedSecret: string;
  encryptionIv: string;
  encryptionAuthTag: string;
}): string {
  return adminDecrypt({
    ciphertext: blob.encryptedSecret,
    iv: blob.encryptionIv,
    authTag: blob.encryptionAuthTag,
  });
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  window = 1
): boolean {
  const trimmed = code.trim().replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: trimmed, window });
  return delta !== null;
}
