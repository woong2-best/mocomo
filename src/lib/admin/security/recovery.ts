import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { adminHash } from "@/lib/admin/security/crypto";

const CODE_COUNT = 10;

function formatRecoveryCode(): string {
  // XXXX-XXXX-XXXX style
  const raw = randomBytes(9).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export async function generateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, () => formatRecoveryCode());
  await db.adminRecoveryCode.deleteMany({ where: { userId } });
  await db.adminRecoveryCode.createMany({
    data: codes.map((code) => ({
      userId,
      codeHash: adminHash(code.replace(/-/g, "").toUpperCase()),
    })),
  });
  return codes;
}

export async function consumeRecoveryCode(
  userId: string,
  code: string
): Promise<boolean> {
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  if (normalized.length < 8) return false;
  const hash = adminHash(normalized);
  const row = await db.adminRecoveryCode.findFirst({
    where: { userId, codeHash: hash, usedAt: null },
  });
  if (!row) return false;
  await db.adminRecoveryCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export async function listRecoveryCodeStatus(userId: string) {
  const rows = await db.adminRecoveryCode.findMany({
    where: { userId },
    select: { id: true, usedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return {
    total: rows.length,
    unused: rows.filter((r) => !r.usedAt).length,
    used: rows.filter((r) => r.usedAt).length,
    codes: rows.map((r, i) => ({
      index: i + 1,
      used: !!r.usedAt,
      usedAt: r.usedAt,
      createdAt: r.createdAt,
    })),
  };
}
