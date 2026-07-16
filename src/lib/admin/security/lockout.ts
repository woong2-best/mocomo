import { db } from "@/lib/db";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function getAdminLockout(userId: string) {
  return db.adminAuthLockout.findUnique({ where: { userId } });
}

export async function assertNotLocked(userId: string): Promise<
  { ok: true } | { error: string; lockedUntil: Date }
> {
  const row = await db.adminAuthLockout.findUnique({ where: { userId } });
  if (!row?.lockedUntil) return { ok: true };
  if (row.lockedUntil.getTime() > Date.now()) {
    return {
      error: `로그인 실패가 많아 ${LOCK_MINUTES}분간 잠겼습니다. 잠금 해제 시각: ${row.lockedUntil.toISOString()}`,
      lockedUntil: row.lockedUntil,
    };
  }
  // auto unlock
  await db.adminAuthLockout.update({
    where: { userId },
    data: { failCount: 0, lockedUntil: null, unlockedById: null },
  });
  return { ok: true };
}

export async function recordAdminLoginFailure(userId: string) {
  const row = await db.adminAuthLockout.upsert({
    where: { userId },
    create: { userId, failCount: 1 },
    update: { failCount: { increment: 1 } },
  });
  const failCount = row.failCount;
  if (failCount >= MAX_FAILS) {
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    await db.adminAuthLockout.update({
      where: { userId },
      data: { lockedUntil },
    });
    return { locked: true as const, lockedUntil, failCount };
  }
  return { locked: false as const, failCount, remaining: MAX_FAILS - failCount };
}

export async function clearAdminLoginFailures(userId: string) {
  await db.adminAuthLockout.upsert({
    where: { userId },
    create: { userId, failCount: 0 },
    update: { failCount: 0, lockedUntil: null },
  });
}

export async function unlockAdminAccount(userId: string, unlockedById: string) {
  await db.adminAuthLockout.upsert({
    where: { userId },
    create: { userId, failCount: 0, unlockedById },
    update: { failCount: 0, lockedUntil: null, unlockedById },
  });
}
