import type { AccountStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function expireTemporarySuspensionIfNeeded(user: {
  id: string;
  accountStatus: AccountStatus;
  suspensionExpiresAt?: Date | null;
}): Promise<boolean> {
  if (user.accountStatus !== "TEMP_SUSPENDED") return false;
  if (!user.suspensionExpiresAt || user.suspensionExpiresAt > new Date()) return false;

  await db.user.update({
    where: { id: user.id },
    data: {
      accountStatus: "ACTIVE",
      isBanned: false,
      suspensionReason: null,
      suspendedAt: null,
      suspendedById: null,
      suspensionExpiresAt: null,
      banReason: null,
      bannedUntil: null,
    },
  });
  return true;
}
