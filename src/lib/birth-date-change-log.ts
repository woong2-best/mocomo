import type { BirthDateSource, Prisma, PrismaClient } from "@prisma/client";
import { birthDateKey, toStoredBirthDate } from "@/lib/birth-date";

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
}
