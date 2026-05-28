import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export type ResolvedUser = {
  id: string;
  email: string | null;
  username: string;
  emailVerified: Date | null;
  passwordHash: string | null;
  role: string;
};

const userEmailSelect = {
  id: true,
  email: true,
  username: true,
  emailVerified: true,
  passwordHash: true,
  role: true,
} as const;

/** Prisma insensitive 실패 시에도 DB에서 이메일 계정 찾기 */
export async function resolveUserByEmail(email: string): Promise<ResolvedUser | null> {
  const normalized = email.trim().toLowerCase();

  let user = await db.user.findUnique({
    where: { email: normalized },
    select: userEmailSelect,
  });
  if (user) return user;

  user = await db.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: userEmailSelect,
  });
  if (user) return user;

  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User"
      WHERE email IS NOT NULL AND LOWER(TRIM(email)) = ${normalized}
      LIMIT 1
    `;
    if (rows[0]?.id) {
      return db.user.findUnique({
        where: { id: rows[0].id },
        select: userEmailSelect,
      });
    }
  } catch (e) {
    console.error("[resolveUserByEmail]", e);
  }

  return null;
}

export function isEmailVerified(user: { emailVerified: Date | null }) {
  return user.emailVerified != null;
}

export async function dedupeUnverifiedEmailAccounts(normalizedEmail: string, keepUserId: string) {
  const dupes = await db.user.findMany({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      emailVerified: null,
      id: { not: keepUserId },
    },
    select: { id: true },
  });
  for (const d of dupes) {
    await db.user.delete({ where: { id: d.id } }).catch(() => undefined);
  }

  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User"
      WHERE email IS NOT NULL
        AND LOWER(TRIM(email)) = ${normalizedEmail}
        AND "emailVerified" IS NULL
        AND id <> ${keepUserId}
    `;
    for (const row of rows) {
      await db.user.delete({ where: { id: row.id } }).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}

export async function releaseUsernameFromStaleAccount(
  owner: ResolvedUser,
  signupEmail: string,
  platformUsername: string
) {
  if (owner.email?.trim().toLowerCase() === signupEmail) return true;
  if (isEmailVerified(owner)) return false;
  if (owner.role === "ADMIN" || owner.role === "MODERATOR") return false;
  if (owner.username.toLowerCase() === platformUsername) return false;

  const archived = `archived_${randomBytes(6).toString("hex")}`;
  await db.user.update({
    where: { id: owner.id },
    data: { username: archived },
  });
  return true;
}

export async function findUserByUsernameInsensitive(username: string) {
  return db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerified: true,
      passwordHash: true,
      role: true,
    },
  });
}

export async function ensureUsernameFreeForSignup(
  username: string,
  signupEmail: string,
  exceptUserId: string | undefined,
  platformUsername: string
) {
  let taken = await findUserByUsernameInsensitive(username);
  let guard = 0;
  while (taken && taken.id !== exceptUserId && guard < 10) {
    guard += 1;
    if (isEmailVerified(taken)) {
      return {
        ok: false as const,
        error: `닉네임 "${username}"은(는) 이미 사용 중입니다. 다른 닉네임을 입력해 주세요.`,
      };
    }
    const released = await releaseUsernameFromStaleAccount(taken, signupEmail, platformUsername);
    if (!released) {
      return {
        ok: false as const,
        error: `닉네임 "${username}"은(는) 이미 사용 중입니다. 다른 닉네임을 입력해 주세요.`,
      };
    }
    taken = await findUserByUsernameInsensitive(username);
  }
  return { ok: true as const };
}

export async function collapseUnverifiedEmailRows(normalizedEmail: string): Promise<string | null> {
  try {
    const rows = await db.$queryRaw<{ id: string; createdAt: Date }[]>`
      SELECT id, "createdAt" FROM "User"
      WHERE email IS NOT NULL
        AND LOWER(TRIM(email)) = ${normalizedEmail}
        AND "emailVerified" IS NULL
      ORDER BY "createdAt" DESC
    `;
    if (rows.length <= 1) return rows[0]?.id ?? null;
    const [keep, ...rest] = rows;
    for (const row of rest) {
      await db.user.delete({ where: { id: row.id } }).catch(() => undefined);
    }
    return keep.id;
  } catch {
    return null;
  }
}

export async function updateUserByResolvedEmail(
  email: string,
  data: { emailVerified?: Date; passwordHash?: string; email?: string }
) {
  const user = await resolveUserByEmail(email);
  if (!user) return null;
  return db.user.update({
    where: { id: user.id },
    data: { ...data, email: data.email ?? email.trim().toLowerCase() },
  });
}
export function signupBlockMessage(user: ResolvedUser) {
  if (!user.passwordHash) {
    return "이 이메일은 이미 등록되어 있습니다. Google 또는 Discord로 로그인하거나, 비밀번호 찾기를 이용해 주세요.";
  }
  return "이 이메일은 이미 가입되어 있습니다. 로그인하거나 비밀번호 찾기를 이용하세요.";
}
