import type { BirthDateSource, Prisma, PrismaClient } from "@prisma/client";
import { birthDateKey, toStoredBirthDate } from "@/lib/birth-date";
import { TERMS_OF_SERVICE_VERSION } from "@/lib/legal/terms-versions";
import { getRequestIp } from "@/lib/request-ip";

type BirthDateWriter = Prisma.TransactionClient | PrismaClient;

export async function recordBirthDateChange(
  tx: BirthDateWriter,
  input: {
    userId: string;
    previousValue: Date | null;
    newValue: Date | null;
    source: BirthDateSource;
    actorId?: string | null;
    createdAt?: Date;
    changedBy?: string;
    reason?: string | null;
  }
): Promise<void> {
  const previous = input.previousValue ? toStoredBirthDate(input.previousValue) : null;
  const next = input.newValue ? toStoredBirthDate(input.newValue) : null;
  if (birthDateKey(previous) === birthDateKey(next)) return;

  await tx.birthDateChangeLog.create({
    data: {
      userId: input.userId,
      previousValue: previous,
      newValue: next,
      source: input.source,
      actorId: input.actorId ?? null,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });

  if (next) {
    const ip = await getRequestIp().catch(() => "");
    await tx.birthdateHistory.create({
      data: {
        userId: input.userId,
        oldValue: previous,
        newValue: next,
        changedBy: input.changedBy ?? (input.source === "ADMIN" ? input.actorId ?? "admin" : "user"),
        reason: input.reason?.trim() || null,
        ipAddress: ip || null,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        ...(input.createdAt ? { changedAt: input.createdAt } : {}),
      },
    });
  }
}
