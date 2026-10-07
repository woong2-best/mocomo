import { db } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import { TERMS_OF_SERVICE_VERSION } from "@/lib/legal/terms-versions";
import { birthDateKey, toStoredBirthDate } from "@/lib/birth-date";

export async function insertBirthdateHistory(input: {
  userId: string;
  oldValue: Date | null;
  newValue: Date;
  changedBy: string;
  reason?: string | null;
  termsVersion?: string | null;
}): Promise<void> {
  const oldValue = input.oldValue ? toStoredBirthDate(input.oldValue) : null;
  const newValue = toStoredBirthDate(input.newValue);
  if (birthDateKey(oldValue) === birthDateKey(newValue)) return;

  const ip = await getRequestIp().catch(() => "");
  await db.birthdateHistory.create({
    data: {
      userId: input.userId,
      oldValue,
      newValue,
      changedBy: input.changedBy,
      reason: input.reason?.trim() || null,
      ipAddress: ip || null,
      termsVersion: input.termsVersion ?? TERMS_OF_SERVICE_VERSION,
    },
  });
}

export async function listBirthdateHistory(userId: string) {
  return db.birthdateHistory.findMany({
    where: { userId },
    orderBy: { changedAt: "asc" },
  });
}
